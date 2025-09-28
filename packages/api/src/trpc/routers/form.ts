import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc';
import { prisma } from '@workspace/database';
import { z } from 'zod';
import type { Context } from '../context';

/**
 * Form Router - 表单管理路由
 * 提供 CRUD 操作和表单提交管理
 */

const FormFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['text', 'number', 'select', 'date', 'checkbox', 'textarea']),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })).optional(),
  condition: z.object({
    fieldId: z.string(),
    operator: z.enum(['equals', 'not_equals']),
    value: z.any(),
  }).optional(),
  defaultValue: z.any().optional(),
});

const FormMetadataSchema = z.object({
  version: z.string(),
  fields: z.array(FormFieldSchema),
});

/**
 * 创建表单
 * 需要用户认证
 */
export const formRouter = router({
  // 获取表单列表
  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().nullish(),
      search: z.string().optional(),
      createdBy: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { limit, cursor, search, createdBy } = input;

      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (createdBy) {
        where.createdById = createdBy;
      }

      const [items, total] = await Promise.all([
        ctx.prisma.form.findMany({
          where,
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          skip: cursor ? 1 : 0,
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        ctx.prisma.form.count({ where }),
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

  // 获取表单详情
  getById: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const form = await ctx.prisma.form.findUnique({
        where: { id: input.id },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!form) {
        throw new Error('FORM_NOT_FOUND');
      }

      return form;
    }),

  // 创建表单
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      metadata: FormMetadataSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('UNAUTHORIZED');
      }

      const form = await ctx.prisma.form.create({
        data: {
          name: input.name,
          metadata: input.metadata as any,
          createdById: ctx.user.id,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return form;
    }),

  // 更新表单
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(200).optional(),
      metadata: FormMetadataSchema.optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('UNAUTHORIZED');
      }

      const existingForm = await ctx.prisma.form.findUnique({
        where: { id: input.id },
      });

      if (!existingForm) {
        throw new Error('FORM_NOT_FOUND');
      }

      // 只有创建者或管理员可以更新表单
      if (existingForm.createdById !== ctx.user.id && ctx.user.role !== 'ADMIN') {
        throw new Error('FORBIDDEN');
      }

      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.metadata !== undefined) updateData.metadata = input.metadata as any;

      const form = await ctx.prisma.form.update({
        where: { id: input.id },
        data: updateData,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return form;
    }),

  // 删除表单
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('UNAUTHORIZED');
      }

      const existingForm = await ctx.prisma.form.findUnique({
        where: { id: input.id },
      });

      if (!existingForm) {
        throw new Error('FORM_NOT_FOUND');
      }

      // 只有创建者或管理员可以删除表单
      if (existingForm.createdById !== ctx.user.id && ctx.user.role !== 'ADMIN') {
        throw new Error('FORBIDDEN');
      }

      await ctx.prisma.form.delete({
        where: { id: input.id },
      });

      return {
        success: true,
        message: '表单删除成功',
      };
    }),

  // 获取表单的所有提交
  getSubmissions: publicProcedure
    .input(z.object({
      formId: z.string(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const [items, total] = await Promise.all([
        ctx.prisma.submission.findMany({
          where: { formId: input.formId },
          take: input.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            submittedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        ctx.prisma.submission.count({
          where: { formId: input.formId },
        }),
      ]);

      return {
        items,
        total,
      };
    }),
});