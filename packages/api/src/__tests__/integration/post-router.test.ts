import { describe, it, expect, beforeEach, afterAll } from "vitest";

import type { Auth } from "@acme/auth";
import { appRouter, createTRPCContext } from "@acme/api";
import { prisma } from "@acme/db";

import { ForbiddenError, NotFoundError } from "../../utils/errors";

type SessionUser = {
  id: string;
  name: string | null;
  email: string;
};

async function createCaller(sessionUser?: SessionUser) {
  const auth = {
    api: {
      getSession: async () => (sessionUser ? { user: sessionUser } : null),
    },
  } as unknown as Auth;

  const baseContext = await createTRPCContext({
    headers: new Headers(),
    auth,
  });

  return appRouter.createCaller({
    ...baseContext,
    ...(sessionUser && { user: sessionUser }),
  } as never);
}

async function createTestUser(overrides: Partial<SessionUser> = {}) {
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const user = await prisma.user.create({
    data: {
      name: overrides.name ?? `Test User ${unique}`,
      email: overrides.email ?? `user-${unique}@example.com`,
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  } satisfies SessionUser;
}

describe("Post Router Integration Tests", () => {
  beforeEach(async () => {
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Complete Post Lifecycle", () => {
    it("creates, reads, lists, and deletes posts", async () => {
      const user = await createTestUser();
      const caller = await createCaller(user);

      const createdPost = await caller.post.create({
        title: "Integration Test Post",
        content: "This is a post created during integration tests.",
      });

      expect(createdPost.userId).toBe(user.id);
      expect(createdPost.user?.id).toBe(user.id);

      const fetchedById = await caller.post.byId({ id: createdPost.id });
      expect(fetchedById?.id).toBe(createdPost.id);
      expect(fetchedById?.user?.id).toBe(user.id);

      const list = await caller.post.all();
      expect(list.posts.some((post) => post.id === createdPost.id)).toBe(true);

      const deleted = await caller.post.delete({ id: createdPost.id });
      expect(deleted.id).toBe(createdPost.id);

      const afterDelete = await prisma.post.findUnique({ where: { id: createdPost.id } });
      expect(afterDelete).toBeNull();
    });

    it("supports cursor based pagination", async () => {
      const user = await createTestUser();

      const timestamps = Array.from({ length: 15 }, (_, index) =>
        new Date(Date.now() - index * 1000),
      );

      const createdPosts = await Promise.all(
        timestamps.map((createdAt, index) =>
          prisma.post.create({
            data: {
              title: `Post ${index}`,
              content: `Content ${index}`,
              createdAt,
              user: {
                connect: { id: user.id },
              },
            },
          }),
        ),
      );

      // Ensure we have deterministic ordering by createdAt desc
      createdPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const caller = await createCaller();

      const firstPage = await caller.post.all({ limit: 10 });
      expect(firstPage.posts).toHaveLength(10);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).toBe(firstPage.posts[9]?.id ?? null);

      const secondPage = await caller.post.all({
        limit: 10,
        cursor: firstPage.nextCursor ?? undefined,
      });

      expect(secondPage.posts).toHaveLength(5);
      expect(secondPage.hasMore).toBe(false);
      expect(secondPage.posts.every((post) => !firstPage.posts.some((p) => p.id === post.id))).toBe(true);
    });

    it("filters posts by user", async () => {
      const owner = await createTestUser();
      const otherUser = await createTestUser();

      await prisma.post.createMany({
        data: [
          { title: "Owner 1", content: "Owned", userId: owner.id },
          { title: "Owner 2", content: "Owned", userId: owner.id },
          { title: "Other", content: "Other", userId: otherUser.id },
        ],
      });

      const caller = await createCaller();
      const list = await caller.post.all({ userId: owner.id });

      expect(list.posts).toHaveLength(2);
      expect(list.posts.every((post) => post.userId === owner.id)).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("prevents unauthenticated creation", async () => {
      const caller = await createCaller();

      await expect(
        caller.post.create({
          title: "Guarded",
          content: "Must be signed in",
        }),
      ).rejects.toThrow(/UNAUTHORIZED/);
    });

    it("prevents deleting posts you do not own", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const caller = await createCaller(other);

      const post = await prisma.post.create({
        data: {
          title: "Owner only",
          content: "Private",
          userId: owner.id,
        },
      });

      await expect(caller.post.delete({ id: post.id })).rejects.toThrow(/You can only delete your own posts/);
    });

    it("throws NotFoundError for missing posts", async () => {
      const user = await createTestUser();
      const caller = await createCaller(user);

      await expect(caller.post.delete({ id: "ckm1q2w3e4r5t6y7u8i9o0missing" })).rejects.toThrow(/Post with identifier/);
    });
  });
});
