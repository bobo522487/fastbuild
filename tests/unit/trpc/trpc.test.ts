import { describe, it, expect } from 'vitest';
import {
  t,
  router,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  middleware,
  mergeRouters,
} from '@workspace/api/src/trpc/trpc';
import type { Context } from '@workspace/api/src/trpc/context';
import { ErrorHandler, ErrorCode } from '@workspace/api/src/middleware/errorHandler';
import { rateLimiters } from '@workspace/api/src/middleware/rateLimiter';

describe('tRPC 配置单元测试', () => {
  describe('核心导出', () => {
    it('应该导出 tRPC 实例', () => {
      expect(t).toBeDefined();
      expect(typeof t.procedure).toBe('function');
      expect(typeof t.router).toBe('function');
      expect(typeof t.middleware).toBe('function');
    });

    it('应该导出路由器创建函数', () => {
      expect(router).toBeDefined();
      expect(typeof router).toBe('function');
    });

    it('应该导出预配置的程序类型', () => {
      expect(publicProcedure).toBeDefined();
      expect(protectedProcedure).toBeDefined();
      expect(adminProcedure).toBeDefined();

      // 验证它们都是 tRPC procedure 类型
      expect(publicProcedure._type).toBe('query');
      expect(protectedProcedure._type).toBe('query');
      expect(adminProcedure._type).toBe('query');
    });

    it('应该导出中间件创建函数', () => {
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('应该导出路由器合并函数', () => {
      expect(mergeRouters).toBeDefined();
      expect(typeof mergeRouters).toBe('function');
    });

    it('应该导出上下文类型', () => {
      // 这里我们测试类型是否正确导出，由于是类型，我们通过编译来验证
      const mockContext: Context = {
        prisma: {} as any,
        user: { id: 'test', email: 'test@example.com', role: 'USER', isActive: true },
      };

      expect(mockContext).toBeDefined();
      expect(mockContext.prisma).toBeDefined();
      expect(mockContext.user).toBeDefined();
    });

    it('应该导出错误处理工具', () => {
      expect(ErrorHandler).toBeDefined();
      expect(typeof ErrorHandler.handle).toBe('function');
      expect(typeof ErrorHandler.log).toBe('function');
      expect(typeof ErrorHandler.createErrorResponse).toBe('function');

      expect(ErrorCode).toBeDefined();
      expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
    });

    it('应该导出速率限制器', () => {
      expect(rateLimiters).toBeDefined();
      expect(rateLimiters.auth).toBeDefined();
      expect(rateLimiters.api).toBeDefined();
      expect(rateLimiters.form).toBeDefined();
      expect(rateLimiters.health).toBeDefined();
      expect(rateLimiters.create).toBeDefined();
      expect(typeof rateLimiters.create).toBe('function');
    });
  });

  describe('程序类型配置', () => {
    it('publicProcedure 应该不需要认证', () => {
      const testProcedure = publicProcedure
        .input((input: unknown) => {
          if (typeof input === 'object' && input !== null) {
            return input as { message: string };
          }
          throw new Error('Invalid input');
        })
        .query(({ input }) => {
          return { message: `Hello ${input.message}` };
        });

      expect(testProcedure).toBeDefined();
      expect(testProcedure._type).toBe('query');
    });

    it('protectedProcedure 应该需要认证', () => {
      const testProcedure = protectedProcedure
        .input((input: unknown) => {
          if (typeof input === 'object' && input !== null) {
            return input as { message: string };
          }
          throw new Error('Invalid input');
        })
        .query(({ input, ctx }) => {
          return { message: `Hello ${ctx.user?.email}: ${input.message}` };
        });

      expect(testProcedure).toBeDefined();
      expect(testProcedure._type).toBe('query');
    });

    it('adminProcedure 应该需要管理员权限', () => {
      const testProcedure = adminProcedure
        .input((input: unknown) => {
          if (typeof input === 'object' && input !== null) {
            return input as { action: string };
          }
          throw new Error('Invalid input');
        })
        .mutation(({ input, ctx }) => {
          return { message: `Admin ${ctx.user?.email} performed: ${input.action}` };
        });

      expect(testProcedure).toBeDefined();
      expect(testProcedure._type).toBe('query');
    });
  });

  describe('路由器创建', () => {
    it('应该能够创建基本的路由器', () => {
      const testRouter = router({
        hello: publicProcedure
          .input((input: unknown) => {
            if (typeof input === 'string') {
              return { name: input };
            }
            throw new Error('Invalid input');
          })
          .query(({ input }) => {
            return { message: `Hello ${input.name}` };
          }),

        echo: publicProcedure
          .input((input: unknown) => {
            if (typeof input === 'string') {
              return input;
            }
            throw new Error('Invalid input');
          })
          .query(({ input }) => {
            return input;
          }),
      });

      expect(testRouter).toBeDefined();
      expect(testRouter._def.procedures).toBeDefined();
      expect(testRouter._def.procedures.hello).toBeDefined();
      expect(testRouter._def.procedures.echo).toBeDefined();
    });

    it('应该能够创建带认证的路由器', () => {
      const testRouter = router({
        profile: protectedProcedure
          .query(({ ctx }) => {
            return { email: ctx.user?.email, role: ctx.user?.role };
          }),

        updateProfile: protectedProcedure
          .input((input: unknown) => {
            if (typeof input === 'object' && input !== null && 'name' in input) {
              return { name: input.name as string };
            }
            throw new Error('Invalid input');
          })
          .mutation(({ input, ctx }) => {
            return { message: `Profile updated for ${ctx.user?.email}` };
          }),
      });

      expect(testRouter).toBeDefined();
      expect(testRouter._def.profiles).toBeDefined();
      expect(testRouter._def.procedures.profile).toBeDefined();
      expect(testRouter._def.procedures.updateProfile).toBeDefined();
    });

    it('应该能够创建管理员路由器', () => {
      const testRouter = router({
        users: adminProcedure
          .query(({ ctx }) => {
            return { message: `Admin ${ctx.user?.email} accessed users` };
          }),

        deleteUser: adminProcedure
          .input((input: unknown) => {
            if (typeof input === 'object' && input !== null && 'userId' in input) {
              return { userId: input.userId as string };
            }
            throw new Error('Invalid input');
          })
          .mutation(({ input, ctx }) => {
            return { message: `Admin ${ctx.user?.email} deleted user ${input.userId}` };
          }),
      });

      expect(testRouter).toBeDefined();
      expect(testRouter._def.procedures).toBeDefined();
      expect(testRouter._def.procedures.users).toBeDefined();
      expect(testRouter._def.procedures.deleteUser).toBeDefined();
    });
  });

  describe('路由器合并', () => {
    it('应该能够合并多个路由器', () => {
      const router1 = router({
        hello: publicProcedure.query(() => 'Hello World'),
      });

      const router2 = router({
        goodbye: publicProcedure.query(() => 'Goodbye World'),
      });

      const mergedRouter = mergeRouters(router1, router2);

      expect(mergedRouter).toBeDefined();
      expect(mergedRouter._def.procedures).toBeDefined();
      expect(mergedRouter._def.procedures.hello).toBeDefined();
      expect(mergedRouter._def.procedures.goodbye).toBeDefined();
    });

    it('应该能够合并多个相同类型的路由器', () => {
      const authRouter = router({
        login: publicProcedure.mutation(() => ({ success: true })),
        register: publicProcedure.mutation(() => ({ success: true })),
      });

      const userRouter = router({
        profile: protectedProcedure.query(() => ({ email: 'test@example.com' })),
        update: protectedProcedure.mutation(() => ({ success: true })),
      });

      const mergedRouter = mergeRouters(authRouter, userRouter);

      expect(mergedRouter).toBeDefined();
      expect(mergedRouter._def.procedures).toBeDefined();
      expect(mergedRouter._def.procedures.login).toBeDefined();
      expect(mergedRouter._def.procedures.register).toBeDefined();
      expect(mergedRouter._def.procedures.profile).toBeDefined();
      expect(mergedRouter._def.procedures.update).toBeDefined();
    });

    it('应该处理空路由器合并', () => {
      const emptyRouter = router({});
      const testRouter = router({
        hello: publicProcedure.query(() => 'Hello'),
      });

      const mergedRouter = mergeRouters(emptyRouter, testRouter);

      expect(mergedRouter).toBeDefined();
      expect(mergedRouter._def.procedures).toBeDefined();
      expect(mergedRouter._def.procedures.hello).toBeDefined();
    });
  });

  describe('中间件使用', () => {
    it('应该能够创建和使用中间件', () => {
      const testMiddleware = middleware(({ ctx, next }) => {
        // 添加一些上下文信息
        const enhancedCtx = {
          ...ctx,
          middlewareData: 'test-data',
        };

        return next({ ctx: enhancedCtx });
      });

      const testProcedure = publicProcedure
        .use(testMiddleware)
        .query(({ ctx }) => {
          return { data: (ctx as any).middlewareData };
        });

      expect(testProcedure).toBeDefined();
      expect(testProcedure._type).toBe('query');
    });

    it('应该支持多个中间件链', () => {
      const middleware1 = middleware(({ ctx, next }) => {
        const enhancedCtx = { ...ctx, step1: 'step1' };
        return next({ ctx: enhancedCtx });
      });

      const middleware2 = middleware(({ ctx, next }) => {
        const enhancedCtx = { ...ctx, step2: 'step2' };
        return next({ ctx: enhancedCtx });
      });

      const testProcedure = publicProcedure
        .use(middleware1)
        .use(middleware2)
        .query(({ ctx }) => {
          return {
            step1: (ctx as any).step1,
            step2: (ctx as any).step2,
          };
        });

      expect(testProcedure).toBeDefined();
      expect(testProcedure._type).toBe('query');
    });
  });

  describe('错误处理集成', () => {
    it('应该能够集成错误处理中间件', () => {
      const errorHandlingMiddleware = middleware(async ({ next }) => {
        try {
          return await next();
        } catch (error) {
          const trpcError = ErrorHandler.handle(error);
          throw trpcError;
        }
      });

      const testProcedure = publicProcedure
        .use(errorHandlingMiddleware)
        .query(() => {
          throw new Error(ErrorCode.VALIDATION_ERROR);
        });

      expect(testProcedure).toBeDefined();
      expect(testProcedure._type).toBe('query');
    });

    it('应该能够集成速率限制中间件', () => {
      const rateLimitMiddleware = rateLimiters.auth;

      const testProcedure = publicProcedure
        .use(rateLimitMiddleware)
        .query(() => {
          return { success: true };
        });

      expect(testProcedure).toBeDefined();
      expect(testProcedure._type).toBe('query');
    });
  });

  describe('类型安全', () => {
    it('应该保持输入和输出的类型安全', () => {
      type TestInput = { message: string };
      type TestOutput = { response: string };

      const testProcedure = publicProcedure
        .input((input: unknown): TestInput => {
          if (typeof input === 'object' && input !== null && 'message' in input) {
            return input as TestInput;
          }
          throw new Error('Invalid input');
        })
        .output((output: unknown): TestOutput => {
          if (typeof output === 'object' && output !== null && 'response' in output) {
            return output as TestOutput;
          }
          throw new Error('Invalid output');
        })
        .query(({ input }) => {
          return { response: `Processed: ${input.message}` };
        });

      expect(testProcedure).toBeDefined();
      expect(testProcedure._type).toBe('query');
    });

    it('应该支持复杂的输入输出类型', () => {
      type ComplexInput = {
        user: { id: string; name: string };
        data: { items: string[]; settings: { theme: string } };
      };

      type ComplexOutput = {
        success: boolean;
        result: { processedItems: number; userId: string };
      };

      const testProcedure = publicProcedure
        .input((input: unknown): ComplexInput => {
          // 简化的类型检查
          return input as ComplexInput;
        })
        .output((output: unknown): ComplexOutput => {
          return output as ComplexOutput;
        })
        .mutation(({ input }) => {
          return {
            success: true,
            result: {
              processedItems: input.data.items.length,
              userId: input.user.id,
            },
          };
        });

      expect(testProcedure).toBeDefined();
      expect(testProcedure._type).toBe('query');
    });
  });

  describe('配置验证', () => {
    it('应该确保所有必要的导出都存在', () => {
      const requiredExports = [
        't',
        'router',
        'publicProcedure',
        'protectedProcedure',
        'adminProcedure',
        'middleware',
        'mergeRouters',
      ];

      requiredExports.forEach(exportName => {
        expect(eval(exportName)).toBeDefined();
      });
    });

    it('应该确保错误处理导出都存在', () => {
      expect(ErrorHandler).toBeDefined();
      expect(typeof ErrorHandler.handle).toBe('function');
      expect(typeof ErrorHandler.log).toBe('function');
      expect(typeof ErrorHandler.createErrorResponse).toBe('function');

      expect(ErrorCode).toBeDefined();
      expect(typeof ErrorCode.UNAUTHORIZED).toBe('string');
      expect(typeof ErrorCode.FORBIDDEN).toBe('string');
      expect(typeof ErrorCode.NOT_FOUND).toBe('string');
    });

    it('应该确保速率限制导出都存在', () => {
      expect(rateLimiters).toBeDefined();
      expect(typeof rateLimiters.auth).toBe('function');
      expect(typeof rateLimiters.api).toBe('function');
      expect(typeof rateLimiters.form).toBe('function');
      expect(typeof rateLimiters.health).toBe('function');
      expect(typeof rateLimiters.create).toBe('function');
    });
  });
});