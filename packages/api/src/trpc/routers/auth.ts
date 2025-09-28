import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc';
import { prisma } from '@workspace/database';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Context } from '../context';

/**
 * User Management Router - 用户管理路由
 * 由于使用Auth.js处理认证，此路由专注于用户数据管理
 */

const UserRoleSchema = z.enum(['ADMIN', 'USER']);

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
  // 获取当前用户信息
  me: protectedProcedure
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
          // @ts-ignore
          image: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // 获取OAuth账户信息
          accounts: {
            select: {
              provider: true,
              providerAccountId: true,
              type: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      return user;
    }),

  // 更新用户信息
  updateProfile: protectedProcedure
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
          // @ts-ignore
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    }),

  // 设置/修改密码（仅适用于有密码的用户）
  setPassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1, 'Current password cannot be empty').optional(),
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

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // 如果用户已有密码，需要验证当前密码
      if (user.passwordHash) {
        if (!input.currentPassword) {
          throw new Error('CURRENT_PASSWORD_REQUIRED');
        }

        const isValidCurrentPassword = await verifyPassword(input.currentPassword, user.passwordHash);
        if (!isValidCurrentPassword) {
          throw new Error('INVALID_CREDENTIALS');
        }
      }

      // 哈希新密码
      const newPasswordHash = await hashPassword(input.newPassword);

      // 更新密码
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { passwordHash: newPasswordHash },
      });

      return {
        success: true,
        message: 'Password updated successfully',
      };
    }),

  // 获取用户会话信息
  sessions: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new Error('UNAUTHORIZED');
      }

      // @ts-ignore
      const sessions = await ctx.prisma.session.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          sessionToken: true,
          expires: true,
          createdAt: true,
        },
      });

      return sessions;
    }),

  // 撤销特定会话
  revokeSession: protectedProcedure
    .input(z.object({
      sessionToken: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('UNAUTHORIZED');
      }

      // @ts-ignore
      const session = await ctx.prisma.session.findFirst({
        where: {
          sessionToken: input.sessionToken,
          userId: ctx.user.id,
        },
      });

      if (!session) {
        throw new Error('SESSION_NOT_FOUND');
      }

      // @ts-ignore
      await ctx.prisma.session.delete({
        where: { sessionToken: input.sessionToken },
      });

      return {
        success: true,
        message: 'Session revoked successfully',
      };
    }),

  // 管理员：创建用户
  createUser: adminProcedure
    .input(z.object({
      email: z.string().email('Please enter a valid email address'),
      name: z.string().min(1, 'Name cannot be empty').max(50, 'Name cannot exceed 50 characters'),
      role: UserRoleSchema.default('USER'),
      password: z.string().min(6, 'Password must be at least 6 characters').optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const { email, name, role, password, isActive } = input;

      // 检查邮箱是否已存在
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new Error('USER_ALREADY_EXISTS');
      }

      // 哈希密码（如果提供）
      let passwordHash = null;
      if (password) {
        passwordHash = await hashPassword(password);
      }

      // 创建用户
      const user = await ctx.prisma.user.create({
        data: {
          email,
          name,
          role,
          passwordHash,
          isActive,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          isActive: true,
          // @ts-ignore
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    }),

  // 管理员：获取用户列表
  listUsers: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().nullish(),
      search: z.string().optional(),
      role: UserRoleSchema.optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ input, ctx }) => {
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
            // @ts-ignore
          image: true,
            createdAt: true,
            updatedAt: true,
            // 包含账户信息
            accounts: {
              select: {
                provider: true,
                type: true,
                createdAt: true,
              },
            },
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

  // 管理员：更新用户状态
  updateUserStatus: adminProcedure
    .input(z.object({
      userId: z.string(),
      isActive: z.boolean(),
      role: UserRoleSchema.optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { userId, isActive, role } = input;

      const updateData: any = { isActive };
      if (role !== undefined) updateData.role = role;

      const user = await ctx.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      return user;
    }),

  // 管理员：删除用户
  deleteUser: adminProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { userId } = input;

      // 检查是否尝试删除自己
      if (userId === ctx.user?.id) {
        throw new Error('CANNOT_DELETE_SELF');
      }

      // 删除用户相关的所有数据
      await ctx.prisma.user.delete({
        where: { id: userId },
      });

      return {
        success: true,
        message: 'User deleted successfully',
      };
    }),
});