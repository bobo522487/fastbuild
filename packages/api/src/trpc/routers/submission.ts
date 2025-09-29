import { router, publicProcedure, protectedProcedure, adminProcedure, formProcedure } from '../trpc';
import { prisma } from '@workspace/database';
import { validateFormData } from '@workspace/schema-compiler';
import { z } from 'zod';
import type { Context } from '../context';

/**
 * Submission Router - 表单提交管理路由
 * 提供表单提交的创建、查询、更新和删除功能
 */

export const submissionRouter = router({
  // 提交表单数据
  create: formProcedure
    .input(z.object({
      formId: z.string(),
      data: z.record(z.string(), z.unknown()),
    }))
    .mutation(async ({ input, ctx }) => {
      // 检查表单是否存在
      const form = await ctx.prisma.form.findUnique({
        where: { id: input.formId },
      });

      if (!form) {
        throw new Error('FORM_NOT_FOUND');
      }

      // 使用 schema-compiler 包验证数据
      const validation = validateFormData(input.data, form.metadata as any);
      if (!validation.success) {
        return {
          submissionId: null,
          message: 'Form data validation failed',
          validationErrors: validation.errors,
        };
      }

      // 创建提交记录
      const submission = await ctx.prisma.submission.create({
        data: {
          formId: input.formId,
          data: input.data as any,
          submittedById: ctx.user?.id,
        },
        include: {
          submittedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          form: {
            select: {
              id: true,
              name: true,
              metadata: true,
            },
          },
        },
      });

      return {
        submissionId: submission.id,
        message: '表单提交成功',
        validationErrors: undefined,
      };
    }),

  // 获取提交详情
  getById: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const submission = await ctx.prisma.submission.findUnique({
        where: { id: input.id },
        include: {
          submittedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          form: {
            select: {
              id: true,
              name: true,
              metadata: true,
              createdById: true,
              createdBy: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      if (!submission) {
        throw new Error('NOT_FOUND');
      }

      // 权限检查：只有提交者、表单创建者或管理员可以查看提交详情
      if (ctx.user) {
        const isSubmitter = submission.submittedById === ctx.user.id;
        const isFormCreator = submission.form.createdById === ctx.user.id;
        const isAdmin = ctx.user.role === 'ADMIN';

        if (!isSubmitter && !isFormCreator && !isAdmin) {
          throw new Error('FORBIDDEN');
        }
      }

      return submission;
    }),

  // 获取表单的所有提交
  getByFormId: publicProcedure
    .input(z.object({
      formId: z.string(),
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().nullish(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { formId, limit, cursor, startDate, endDate } = input;

      // 检查表单是否存在
      const form = await ctx.prisma.form.findUnique({
        where: { id: formId },
      });

      if (!form) {
        throw new Error('FORM_NOT_FOUND');
      }

      // 权限检查：只有表单创建者或管理员可以查看所有提交
      if (ctx.user) {
        const isFormCreator = form.createdById === ctx.user.id;
        const isAdmin = ctx.user.role === 'ADMIN';

        if (!isFormCreator && !isAdmin) {
          throw new Error('FORBIDDEN');
        }
      } else {
        throw new Error('UNAUTHORIZED');
      }

      const where: any = {
        formId,
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [items, total] = await Promise.all([
        ctx.prisma.submission.findMany({
          where,
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          skip: cursor ? 1 : 0,
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
        ctx.prisma.submission.count({ where }),
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

  // 更新提交 (管理员操作)
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: z.record(z.string(), z.unknown()).optional(),
      status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('UNAUTHORIZED');
      }

      const submission = await ctx.prisma.submission.findUnique({
        where: { id: input.id },
        include: {
          form: {
            select: {
              createdById: true,
              createdBy: true,
            },
          },
        },
      });

      if (!submission) {
        throw new Error('NOT_FOUND');
      }

      // 权限检查：只有表单创建者或管理员可以更新提交
      const isFormCreator = submission.form.createdById === ctx.user.id;
      const isAdmin = ctx.user.role === 'ADMIN';

      if (!isFormCreator && !isAdmin) {
        throw new Error('FORBIDDEN');
      }

      const updateData: any = {};
      if (input.data !== undefined) updateData.data = input.data as any;

      const updatedSubmission = await ctx.prisma.submission.update({
        where: { id: input.id },
        data: updateData,
        include: {
          submittedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          form: {
            select: {
              id: true,
              name: true,
              metadata: true,
            },
          },
        },
      });

      return updatedSubmission;
    }),

  // 删除提交
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('UNAUTHORIZED');
      }

      const submission = await ctx.prisma.submission.findUnique({
        where: { id: input.id },
        include: {
          form: {
            select: {
              createdById: true,
              createdBy: true,
            },
          },
        },
      });

      if (!submission) {
        throw new Error('NOT_FOUND');
      }

      // 权限检查：只有提交者、表单创建者或管理员可以删除提交
      const isSubmitter = submission.submittedById === ctx.user.id;
      const isFormCreator = submission.form.createdById === ctx.user.id;
      const isAdmin = ctx.user.role === 'ADMIN';

      if (!isSubmitter && !isFormCreator && !isAdmin) {
        throw new Error('FORBIDDEN');
      }

      await ctx.prisma.submission.delete({
        where: { id: input.id },
      });

      return {
        success: true,
        message: '提交删除成功',
      };
    }),

  // 获取提交统计信息
  getStats: publicProcedure
    .input(z.object({
      formId: z.string().optional(),
      days: z.number().min(1).max(365).default(30),
    }))
    .query(async ({ input, ctx }) => {
      const { formId, days } = input;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where: any = {
        createdAt: {
          gte: startDate,
        },
      };

      if (formId) {
        where.formId = formId;
      }

      // 权限检查
      if (formId && ctx.user) {
        const form = await ctx.prisma.form.findUnique({
          where: { id: formId },
          select: { createdById: true },
        });

        if (form) {
          const isFormCreator = form.createdById === ctx.user.id;
          const isAdmin = ctx.user.role === 'ADMIN';

          if (!isFormCreator && !isAdmin) {
            throw new Error('FORBIDDEN');
          }
        }
      } else if (formId && !ctx.user) {
        throw new Error('UNAUTHORIZED');
      }

      const [totalSubmissions, recentSubmissions, submissions] = await Promise.all([
        ctx.prisma.submission.count({ where }),
        ctx.prisma.submission.count({
          where: {
            ...where,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 最近7天
            },
          },
        }),
        ctx.prisma.submission.findMany({
          where,
          select: {
            createdAt: true,
            // TODO: 添加状态字段到提交模型
            // status: true,
          },
        }),
      ]);

      // 简化的统计信息
      const statusDistribution = {
        total: totalSubmissions,
        recent: recentSubmissions,
      };

      return {
        totalSubmissions,
        recentSubmissions,
        averageProcessingTime: 0, // 暂时返回0，需要添加处理时间字段
        statusDistribution,
      };
    }),

  // 批量删除提交
  bulkDelete: protectedProcedure
    .input(z.object({
      submissionIds: z.array(z.string()).min(1).max(100),
      reason: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('UNAUTHORIZED');
      }

      if (ctx.user.role !== 'ADMIN') {
        throw new Error('FORBIDDEN');
      }

      const { submissionIds } = input;

      // 检查所有提交是否存在
      const submissions = await ctx.prisma.submission.findMany({
        where: {
          id: {
            in: submissionIds,
          },
        },
      });

      if (submissions.length !== submissionIds.length) {
        const foundIds = submissions.map(s => s.id);
        const failedIds = submissionIds.filter(id => !foundIds.includes(id));

        return {
          success: false,
          deletedCount: 0,
          failedIds,
        };
      }

      // 批量删除提交
      const deleteResult = await ctx.prisma.submission.deleteMany({
        where: {
          id: {
            in: submissionIds,
          },
        },
      });

      return {
        success: true,
        deletedCount: deleteResult.count,
        failedIds: [],
      };
    }),
});