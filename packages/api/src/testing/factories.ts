import { faker } from "@faker-js/faker";
import type { Post, User } from "@prisma/client";
import { expect } from "vitest";

import { prisma } from "@acme/db";

export interface TestUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestPost {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: TestUser;
}

export function createUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    emailVerified: true,
    image: faker.image.avatar(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

export function createPost(userId: string, overrides: Partial<TestPost> = {}): TestPost {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraph(),
    userId,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

export function createPostWithUser(
  overrides: Partial<TestPost & { user?: TestUser }> = {},
): TestPost & { user: TestUser } {
  const user = createUser();
  const post = createPost(user.id, overrides);

  return {
    ...post,
    user,
    ...overrides,
  };
}

export function createPosts(count: number, userId: string): TestPost[] {
  return Array.from({ length: count }, () => createPost(userId));
}

export function createPostsWithDates(count: number, userId: string): TestPost[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.now() - index * 1000);
    return createPost(userId, {
      id: `post-${index}`,
      createdAt: date,
      updatedAt: date,
    });
  });
}

export function createAuthContext(user?: TestUser | null, headers: Record<string, string> = {}) {
  return {
    headers: new Headers(headers),
    auth: {
      api: {
        getSession: async () => (user ? { user } : null),
      },
    },
  };
}

export async function createMockCaller(user?: TestUser | null) {
  const { appRouter, createTRPCContext } = await import("@acme/api");

  return appRouter.createCaller({
    ...(await createTRPCContext(createAuthContext(user))),
    ...(user && { user }),
  } as never);
}

export async function setupTestDatabase() {
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
}

export async function cleanupTestDatabase() {
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.$disconnect();
}

export const TestDataBuilders = {
  userSession: (overrides: Partial<TestUser> = {}) => ({
    user: createUser(overrides),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }),
  paginatedPosts: (userId: string, count: number = 25) => ({
    posts: createPostsWithDates(count, userId),
    pageSize: 10,
    expectedPages: Math.ceil(count / 10),
  }),
  errorScenarios: {
    notFound: () => new Error("Post not found"),
    unauthorized: () => new Error("Unauthorized"),
    forbidden: () => new Error("Access forbidden"),
    validation: () => new Error("Validation failed"),
  },
};

export const MockResponses = {
  success: <T>(data: T) => ({ success: true, data }),
  error: (message: string, code?: string) => ({ success: false, error: { message, code } }),
  postList: (posts: TestPost[], hasMore: boolean = false, nextCursor?: string) => ({
    posts,
    hasMore,
    nextCursor,
  }),
};

export const expectValidPost = (post: TestPost) => {
  expect(post).toHaveProperty("id");
  expect(post).toHaveProperty("title");
  expect(post).toHaveProperty("content");
  expect(post).toHaveProperty("userId");
  expect(post).toHaveProperty("createdAt");
  expect(post).toHaveProperty("updatedAt");
  expect(typeof post.id).toBe("string");
  expect(typeof post.title).toBe("string");
  expect(typeof post.content).toBe("string");
  expect(typeof post.userId).toBe("string");
  expect(post.createdAt).toBeInstanceOf(Date);
  expect(post.updatedAt).toBeInstanceOf(Date);
};

export const expectValidUser = (user: TestUser) => {
  expect(user).toHaveProperty("id");
  expect(user).toHaveProperty("name");
  expect(user).toHaveProperty("email");
  expect(user).toHaveProperty("emailVerified");
  expect(user).toHaveProperty("createdAt");
  expect(user).toHaveProperty("updatedAt");
  expect(typeof user.id).toBe("string");
  expect(typeof user.name).toBe("string");
  expect(typeof user.email).toBe("string");
  expect(typeof user.emailVerified).toBe("boolean");
  expect(user.createdAt).toBeInstanceOf(Date);
  expect(user.updatedAt).toBeInstanceOf(Date);
};

export type { Post, User };
