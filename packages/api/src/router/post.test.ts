import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter, createTRPCContext } from "@fastbuild/api";
import { prisma } from "@fastbuild/db";

describe("postRouter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("all", () => {
    it("应该返回最新的10篇帖子", async () => {
      const mockPosts = [
        {
          id: "ckm1q2w3e4r5t6y7u8i9o0p1",
          title: "First Post",
          content: "First content",
          userId: "user-1",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          user: { id: "user-1", name: "User 1", email: "user1@example.com" }
        },
        {
          id: "ckm1q2w3e4r5t6y7u8i9o0p2",
          title: "Second Post",
          content: "Second content",
          userId: "user-2",
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date("2024-01-02"),
          user: { id: "user-2", name: "User 2", email: "user2@example.com" }
        }
      ];

      vi.spyOn(prisma.post, "findMany").mockResolvedValue(mockPosts);

      const caller = appRouter.createCaller({
        ...(await createTRPCContext({
          headers: new Headers(),
          auth: {
            api: {
              getSession: vi.fn().mockResolvedValue(null),
            },
          },
        })),
      } as never);

      const result = await caller.post.all();

      expect(result.posts).toEqual(mockPosts);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
      expect(prisma.post.findMany).toHaveBeenCalledWith(expect.objectContaining({
        orderBy: { createdAt: 'desc' },
        take: 11,
        include: { user: true },
      }));
    });
  });

  describe("byId", () => {
    it("应该返回指定ID的帖子", async () => {
      const mockPost = {
        id: "ckm1q2w3e4r5t6y7u8i9o0p3",
        title: "Test Post",
        content: "Test content",
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: "user-1", name: "User 1", email: "user1@example.com" }
      };

      vi.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost);

      const caller = appRouter.createCaller({
        ...(await createTRPCContext({
          headers: new Headers(),
          auth: {
            api: {
              getSession: vi.fn().mockResolvedValue(null),
            },
          },
        })),
      } as never);

      const post = await caller.post.byId({ id: "ckm1q2w3e4r5t6y7u8i9o0p3" });

      expect(post).toEqual(mockPost);
      expect(prisma.post.findUnique).toHaveBeenCalledWith({
        where: { id: "ckm1q2w3e4r5t6y7u8i9o0p3" },
        include: { user: true },
      });
    });

    it("应该拒绝无效的CUID格式", async () => {
      const caller = appRouter.createCaller({
        ...(await createTRPCContext({
          headers: new Headers(),
          auth: {
            api: {
              getSession: vi.fn().mockResolvedValue(null),
            },
          },
        })),
      } as never);

      await expect(caller.post.byId({ id: "invalid-id" })).rejects.toThrow();
    });
  });

  describe("create", () => {
    it("已登录用户可以创建帖子", async () => {
      const mockUser = { id: "user-1", name: "Test User", email: "test@example.com" };
      const mockPost = {
        id: "ckm1q2w3e4r5t6y7u8i9o0p4",
        title: "New Post",
        content: "New content",
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
      };

      vi.spyOn(prisma.post, "create").mockResolvedValue(mockPost);

      const caller = appRouter.createCaller({
        ...(await createTRPCContext({
          headers: new Headers(),
          auth: {
            api: {
              getSession: vi.fn().mockResolvedValue({
                user: mockUser,
              }),
            },
          },
        })),
        user: mockUser,
      } as never);

      const post = await caller.post.create({
        title: "New Post",
        content: "New content",
      });

      expect(post.userId).toBe("user-1");
      expect(prisma.post.create).toHaveBeenCalledWith(expect.objectContaining({
        data: {
          title: "New Post",
          content: "New content",
          userId: "user-1",
        },
        include: { user: true },
      }));
    });

    it("未登录用户不能创建帖子", async () => {
      const caller = appRouter.createCaller({
        ...(await createTRPCContext({
          headers: new Headers(),
          auth: {
            api: {
              getSession: vi.fn().mockResolvedValue(null),
            },
          },
        })),
      } as never);

      await expect(caller.post.create({
        title: "New Post",
        content: "New content",
      })).rejects.toThrow("UNAUTHORIZED");
    });
  });

  describe("delete", () => {
    it("用户可以删除自己的帖子", async () => {
      const mockUser = { id: "user-1", name: "Test User", email: "test@example.com" };
      const mockPost = {
        id: "ckm1q2w3e4r5t6y7u8i9o0p5",
        title: "Test Post",
        content: "Test content",
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost);
      vi.spyOn(prisma.post, "delete").mockResolvedValue(mockPost);

      const caller = appRouter.createCaller({
        ...(await createTRPCContext({
          headers: new Headers(),
          auth: {
            api: {
              getSession: vi.fn().mockResolvedValue({
                user: mockUser,
              }),
            },
          },
        })),
        user: mockUser,
      } as never);

      const result = await caller.post.delete({ id: "ckm1q2w3e4r5t6y7u8i9o0p5" });

      expect(result).toEqual(mockPost);
      expect(prisma.post.delete).toHaveBeenCalledWith({
        where: { id: "ckm1q2w3e4r5t6y7u8i9o0p5" },
      });
    });

    it("用户不能删除他人的帖子", async () => {
      const mockUser = { id: "user-1", name: "Test User", email: "test@example.com" };
      const mockPost = {
        id: "ckm1q2w3e4r5t6y7u8i9o0p6",
        title: "Test Post",
        content: "Test content",
        userId: "user-2", // 不同的用户ID
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost);

      const caller = appRouter.createCaller({
        ...(await createTRPCContext({
          headers: new Headers(),
          auth: {
            api: {
              getSession: vi.fn().mockResolvedValue({
                user: mockUser,
              }),
            },
          },
        })),
        user: mockUser,
      } as never);

      await expect(caller.post.delete({ id: "ckm1q2w3e4r5t6y7u8i9o0p6" })).rejects.toThrow("You can only delete your own posts");
    });

    it("删除不存在的帖子应该抛出错误", async () => {
      const mockUser = { id: "user-1", name: "Test User", email: "test@example.com" };

      vi.spyOn(prisma.post, "findUnique").mockResolvedValue(null);

      const caller = appRouter.createCaller({
        ...(await createTRPCContext({
          headers: new Headers(),
          auth: {
            api: {
              getSession: vi.fn().mockResolvedValue({
                user: mockUser,
              }),
            },
          },
        })),
        user: mockUser,
      } as never);

      await expect(caller.post.delete({ id: "ckm1q2w3e4r5t6y7u8i9o0missing" })).rejects.toThrow(/Post with identifier/);
    });
  });
});
