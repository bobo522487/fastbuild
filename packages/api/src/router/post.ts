import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { prisma, CreatePostSchema } from "@acme/db";
import { postCache, createCacheKey, createCacheMiddleware } from "../utils/cache";
import { NotFoundError, ForbiddenError, BusinessRuleError, asyncHandler } from "../utils/errors";
import { apiLogger } from "../utils/logger";
import { logging } from "../middleware/logger";

import { protectedProcedure, publicProcedure } from "../trpc";

// Create procedures with logging middleware
const loggedPublicProcedure = publicProcedure.use(logging());
const loggedProtectedProcedure = protectedProcedure.use(logging());

export const postRouter = {
  all: loggedPublicProcedure
    .input(z.object({
      cursor: z.string().cuid().optional(),
      limit: z.number().min(1).max(50).default(10),
      userId: z.string().cuid().optional(),
    }).optional())
    .query(async ({ input = {} }) => {
      const { cursor, limit = 10, userId } = input;

      const where = userId ? { userId } : {};

      const posts = await prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1, // Take one extra to check if there's a next page
        include: { user: true },
        ...(cursor && {
          cursor: { id: cursor },
          skip: 1,
        }),
      });

      const hasMore = posts.length > limit;
      if (hasMore) {
        posts.pop(); // Remove the extra item
      }

      return {
        posts,
        nextCursor: hasMore ? posts[posts.length - 1]?.id : null,
        hasMore,
      };
    }),

  byId: loggedPublicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .use(createCacheMiddleware(
      postCache,
      (input) => createCacheKey('post', 'byId', input.id),
      10 * 60 * 1000 // 10 minutes TTL
    ))
    .query(async ({ input }) => {
      return prisma.post.findUnique({
        where: { id: input.id },
        include: { user: true },
      });
    }),

  create: loggedProtectedProcedure
    .input(CreatePostSchema)
    .mutation(async ({ ctx, input }) => {
      const post = await prisma.post.create({
        data: {
          ...input,
          userId: ctx.user.id,
        },
        include: { user: true },
      });

      // Invalidate relevant caches
      postCache.delete(createCacheKey('post', 'all'));
      postCache.delete(createCacheKey('post', 'byUser', ctx.user.id));

      return post;
    }),

  delete: loggedProtectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(asyncHandler(async ({ ctx, input }) => {
      apiLogger.info({
        userId: ctx.user.id,
        postId: input.id,
      }, 'User attempting to delete post');

      // First check if the post exists and belongs to the user
      const post = await prisma.post.findUnique({
        where: { id: input.id },
      });

      if (!post) {
        throw new NotFoundError('Post', input.id);
      }

      if (post.userId !== ctx.user.id) {
        apiLogger.warn({
          userId: ctx.user.id,
          postId: input.id,
          postOwnerId: post.userId,
        }, 'Unauthorized delete attempt');
        throw new ForbiddenError("You can only delete your own posts");
      }

      const deletedPost = await prisma.post.delete({
        where: { id: input.id },
      });

      // Invalidate relevant caches
      postCache.delete(createCacheKey('post', 'byId', input.id));
      postCache.delete(createCacheKey('post', 'all'));
      postCache.delete(createCacheKey('post', 'byUser', ctx.user.id));
      postCache.delete(createCacheKey('post', 'byUser', post.userId));

      apiLogger.info({
        userId: ctx.user.id,
        postId: input.id,
      }, 'Post deleted successfully');

      return deletedPost;
    })),
} satisfies TRPCRouterRecord;
