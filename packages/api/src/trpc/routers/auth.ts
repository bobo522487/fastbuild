import { router, publicProcedure, protectedProcedure, adminProcedure, authProcedure } from '../trpc';
import { prisma } from '@workspace/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { Context } from '../context';

/**
 * Auth Router - 用户认证路由
 * 提供注册、登录、令牌管理等认证功能
 */

const UserRoleSchema = z.enum(['ADMIN', 'USER']);

/**
 * 生成 JWT 令牌
 */
function generateAccessToken(userId: string, email: string, role: string): string {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: '15m' }
  );
}

/**
 * 生成刷新令牌
 */
function generateRefreshToken(): string {
  return jwt.sign(
    { type: 'refresh' },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: '7d' }
  );
}

/**
 * 哈希密码
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * 验证密码
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const authRouter = router({
  // 用户登录
  login: authProcedure
    .input(z.object({
      email: z.string().email('Please enter a valid email address'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      rememberMe: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const { email, password, rememberMe } = input;

      // 查找用户
      const user = await ctx.prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.passwordHash) {
        throw new Error('INVALID_CREDENTIALS');
      }

      if (!user.isActive) {
        throw new Error('ACCOUNT_LOCKED');
      }

      // 验证密码
      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('INVALID_CREDENTIALS');
      }

      // 生成令牌
      const accessToken = generateAccessToken(user.id, user.email, user.role);
      const refreshToken = generateRefreshToken();

      // 计算令牌过期时间
      const accessTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15分钟
      const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天

      // 创建会话
      await ctx.prisma.userSession.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: refreshTokenExpiresAt,
          isActive: true,
          lastUsedAt: new Date(),
        },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        accessToken,
        refreshToken,
        expiresAt: accessTokenExpiresAt,
      };
    }),

  // 用户注册
  register: authProcedure
    .input(z.object({
      email: z.string().email('Please enter a valid email address'),
      password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password cannot exceed 100 characters'),
      name: z.string().min(1, 'Name cannot be empty').max(50, 'Name cannot exceed 50 characters'),
    }))
    .mutation(async ({ input, ctx }) => {
      const { email, password, name } = input;

      // 检查邮箱是否已存在
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new Error('USER_ALREADY_EXISTS');
      }

      // 哈希密码
      const passwordHash = await hashPassword(password);

      // 创建用户
      const user = await ctx.prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: 'USER',
        },
      });

      // 生成令牌
      const accessToken = generateAccessToken(user.id, user.email, user.role);
      const refreshToken = generateRefreshToken();

      const accessTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // 创建会话
      await ctx.prisma.userSession.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: refreshTokenExpiresAt,
          isActive: true,
          lastUsedAt: new Date(),
        },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        accessToken,
        refreshToken,
        expiresAt: accessTokenExpiresAt,
      };
    }),

  // 刷新令牌
  refreshToken: authProcedure
    .input(z.object({
      refreshToken: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { refreshToken } = input;

      // 查找会话
      const session = await ctx.prisma.userSession.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!session || !session.isActive) {
        throw new Error('TOKEN_INVALID');
      }

      if (session.expiresAt < new Date()) {
        throw new Error('TOKEN_EXPIRED');
      }

      if (!session.user.isActive) {
        throw new Error('ACCOUNT_LOCKED');
      }

      // 验证刷新令牌
      try {
        jwt.verify(refreshToken, process.env.JWT_SECRET || 'default-secret');
      } catch (error) {
        throw new Error('TOKEN_INVALID');
      }

      // 生成新的访问令牌
      const newAccessToken = generateAccessToken(
        session.user.id,
        session.user.email,
        session.user.role
      );
      const newRefreshToken = generateRefreshToken();

      const accessTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // 更新会话
      await ctx.prisma.userSession.update({
        where: { id: session.id },
        data: {
          token: newRefreshToken,
          expiresAt: refreshTokenExpiresAt,
          lastUsedAt: new Date(),
        },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: accessTokenExpiresAt,
      };
    }),

  // 获取当前用户信息
  me: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new Error('UNAUTHORIZED');
      }

      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      return user;
    }),

  // 更新用户信息
  updateProfile: publicProcedure
    .input(z.object({
      name: z.string().min(1).max(50).optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('UNAUTHORIZED');
      }

      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.email !== undefined) {
        // 检查邮箱是否已被其他用户使用
        const existingUser = await ctx.prisma.user.findUnique({
          where: { email: input.email },
        });

        if (existingUser && existingUser.id !== ctx.user.id) {
          throw new Error('EMAIL_ALREADY_EXISTS');
        }
        updateData.email = input.email;
      }

      const user = await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    }),

  // 修改密码
  changePassword: publicProcedure
    .input(z.object({
      currentPassword: z.string().min(1, 'Current password cannot be empty'),
      newPassword: z.string().min(6, 'New password must be at least 6 characters').max(100, 'New password cannot exceed 100 characters'),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('UNAUTHORIZED');
      }

      // 获取用户当前密码哈希
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { passwordHash: true },
      });

      if (!user || !user.passwordHash) {
        throw new Error('USER_NOT_FOUND');
      }

      // 验证当前密码
      const isValidCurrentPassword = await verifyPassword(input.currentPassword, user.passwordHash);
      if (!isValidCurrentPassword) {
        throw new Error('INVALID_CREDENTIALS');
      }

      // 哈希新密码
      const newPasswordHash = await hashPassword(input.newPassword);

      // 更新密码
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { passwordHash: newPasswordHash },
      });

      // 撤销所有现有会话（强制重新登录）
      await ctx.prisma.userSession.updateMany({
        where: { userId: ctx.user.id },
        data: { isActive: false },
      });

      return {
        success: true,
        message: 'Password changed successfully, please log in again',
      };
    }),

  // 登出
  logout: publicProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.user) {
        throw new Error('UNAUTHORIZED');
      }

      // 撤销当前用户的所有会话
      await ctx.prisma.userSession.updateMany({
        where: { userId: ctx.user.id },
        data: { isActive: false },
      });

      return {
        success: true,
        message: 'Logout successful',
      };
    }),

  // 管理员：创建用户
  createUser: publicProcedure
    .input(z.object({
      email: z.string().email('Please enter a valid email address'),
      name: z.string().min(1, 'Name cannot be empty').max(50, 'Name cannot exceed 50 characters'),
      role: UserRoleSchema.default('USER'),
      password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user || ctx.user.role !== 'ADMIN') {
        throw new Error('UNAUTHORIZED');
      }

      // 检查邮箱是否已存在
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new Error('USER_ALREADY_EXISTS');
      }

      // 哈希密码（如果提供）
      let passwordHash = null;
      if (input.password) {
        passwordHash = await hashPassword(input.password);
      }

      // 创建用户
      const user = await ctx.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          role: input.role,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    }),

  // 管理员：获取用户列表
  listUsers: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().nullish(),
      search: z.string().optional(),
      role: UserRoleSchema.optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user || ctx.user.role !== 'ADMIN') {
        throw new Error('UNAUTHORIZED');
      }

      const { limit, cursor, search, role, isActive } = input;

      const where: any = {};

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (role) where.role = role;
      if (isActive !== undefined) where.isActive = isActive;

      const [items, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          skip: cursor ? 1 : 0,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        ctx.prisma.user.count({ where }),
      ]);

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        total,
        page: Math.floor((cursor ? 1 : 0) + items.length / limit),
        pageSize: limit,
        hasNext: !!nextCursor,
      };
    }),
});