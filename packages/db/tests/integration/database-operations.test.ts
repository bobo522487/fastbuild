import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { prisma } from "../prisma";
import type { User, Post, Session, Account } from "@prisma/client";

describe("Database Operations Integration Tests", () => {
  let createdUsers: User[] = [];
  let createdPosts: Post[] = [];
  let createdSessions: Session[] = [];
  let createdAccounts: Account[] = [];

  beforeAll(() => {
    // Clean up any existing test data
    return cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await cleanupDatabase();
  });

  afterEach(() => {
    // Clear arrays
    createdUsers = [];
    createdPosts = [];
    createdSessions = [];
    createdAccounts = [];
  });

  async function cleanupDatabase() {
    await prisma.post.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    await prisma.verification.deleteMany();
  }

  // Helper functions
  function createTestUser(overrides: Partial<User> = {}): Omit<User, "id" | "createdAt" | "updatedAt"> {
    return {
      name: "Test User",
      email: `test-${Date.now()}@example.com`,
      emailVerified: false,
      image: null,
      ...overrides,
    };
  }

  function createTestPost(userId: string, overrides: Partial<Post> = {}): Omit<Post, "id" | "createdAt" | "updatedAt"> {
    return {
      title: "Test Post",
      content: "This is test content",
      userId,
      ...overrides,
    };
  }

  function createTestSession(userId: string, overrides: Partial<Session> = {}): Omit<Session, "id" | "createdAt" | "updatedAt"> {
    return {
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      token: `test-token-${Date.now()}`,
      ipAddress: "127.0.0.1",
      userAgent: "Test User Agent",
      userId,
      ...overrides,
    };
  }

  function createTestAccount(userId: string, overrides: Partial<Account> = {}): Omit<Account, "id" | "createdAt" | "updatedAt"> {
    return {
      accountId: `account-${Date.now()}`,
      providerId: "github",
      userId,
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      idToken: "test-id-token",
      accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      scope: "user:email",
      password: null,
      ...overrides,
    };
  }

  describe("User Operations", () => {
    it("should create a user with all fields", async () => {
      const userData = createTestUser({
        name: "John Doe",
        email: "john.doe@example.com",
        emailVerified: true,
        image: "https://example.com/avatar.jpg",
      });

      const user = await prisma.user.create({ data: userData });
      createdUsers.push(user);

      expect(user.id).toBeDefined();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.emailVerified).toBe(userData.emailVerified);
      expect(user.image).toBe(userData.image);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it("should enforce unique email constraint", async () => {
      const userData = createTestUser({
        email: "unique.test@example.com",
      });

      const user1 = await prisma.user.create({ data: userData });
      createdUsers.push(user1);

      await expect(
        prisma.user.create({ data: userData })
      ).rejects.toThrow();
    });

    it("should support partial updates", async () => {
      const userData = createTestUser();
      const user = await prisma.user.create({ data: userData });
      createdUsers.push(user);

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: "Updated Name",
          emailVerified: true,
        },
      });

      expect(updatedUser.name).toBe("Updated Name");
      expect(updatedUser.emailVerified).toBe(true);
      expect(updatedUser.email).toBe(userData.email); // Should remain unchanged
    });

    it("should support complex queries with filtering", async () => {
      // Create multiple users
      const usersData = [
        createTestUser({ name: "Alice", emailVerified: true }),
        createTestUser({ name: "Bob", emailVerified: false }),
        createTestUser({ name: "Charlie", emailVerified: true }),
      ];

      for (const userData of usersData) {
        const user = await prisma.user.create({ data: userData });
        createdUsers.push(user);
      }

      // Query verified users
      const verifiedUsers = await prisma.user.findMany({
        where: { emailVerified: true },
        orderBy: { name: "asc" },
      });

      expect(verifiedUsers).toHaveLength(2);
      expect(verifiedUsers[0].name).toBe("Alice");
      expect(verifiedUsers[1].name).toBe("Charlie");
    });

    it("should handle soft delete patterns", async () => {
      const userData = createTestUser();
      const user = await prisma.user.create({ data: userData });
      createdUsers.push(user);

      // In this schema, we don't have soft delete, but we can test deletion behavior
      await prisma.user.delete({ where: { id: user.id } });

      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(deletedUser).toBeNull();
    });
  });

  describe("Post Operations", () => {
    beforeEach(async () => {
      // Create a test user for post operations
      const userData = createTestUser();
      const user = await prisma.user.create({ data: userData });
      createdUsers.push(user);
    });

    it("should create a post with user relationship", async () => {
      const user = createdUsers[0]!;
      const postData = createTestPost(user.id, {
        title: "My First Post",
        content: "This is the content of my first post",
      });

      const post = await prisma.post.create({
        data: postData,
        include: { user: true },
      });

      createdPosts.push(post);

      expect(post.id).toBeDefined();
      expect(post.title).toBe(postData.title);
      expect(post.content).toBe(postData.content);
      expect(post.userId).toBe(user.id);
      expect(post.user).toBeDefined();
      expect(post.user.id).toBe(user.id);
    });

    it("should enforce foreign key constraints", async () => {
      const postData = createTestPost("non-existent-user-id");

      await expect(
        prisma.post.create({ data: postData })
      ).rejects.toThrow();
    });

    it("should support complex post queries with relationships", async () => {
      const user = createdUsers[0]!;

      // Create multiple posts
      const postsData = [
        createTestPost(user.id, { title: "Post 1", content: "Content 1" }),
        createTestPost(user.id, { title: "Post 2", content: "Content 2" }),
        createTestPost(user.id, { title: "Post 3", content: "Content 3" }),
      ];

      for (const postData of postsData) {
        const post = await prisma.post.create({ data: postData });
        createdPosts.push(post);
      }

      // Query posts with user relationship, ordered by creation date
      const postsWithUser = await prisma.post.findMany({
        where: { userId: user.id },
        include: { user: true },
        orderBy: { createdAt: "desc" },
      });

      expect(postsWithUser).toHaveLength(3);
      expect(postsWithUser[0].user.name).toBe(user.name);
      expect(postsWithUser.every(post => post.user.id === user.id)).toBe(true);
    });

    it("should support pagination for posts", async () => {
      const user = createdUsers[0]!;

      // Create many posts
      const postsData = Array.from({ length: 15 }, (_, i) =>
        createTestPost(user.id, {
          title: `Post ${i + 1}`,
          content: `Content ${i + 1}`,
        })
      );

      for (const postData of postsData) {
        const post = await prisma.post.create({ data: postData });
        createdPosts.push(post);
      }

      // First page
      const firstPage = await prisma.post.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: true },
      });

      expect(firstPage).toHaveLength(5);

      // Second page using cursor (simulated with skip)
      const secondPage = await prisma.post.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip: 5,
        take: 5,
        include: { user: true },
      });

      expect(secondPage).toHaveLength(5);

      // Ensure pages are different
      const firstPageIds = firstPage.map(p => p.id);
      const secondPageIds = secondPage.map(p => p.id);
      const overlap = firstPageIds.filter(id => secondPageIds.includes(id));
      expect(overlap).toHaveLength(0);
    });
  });

  describe("Session Operations", () => {
    beforeEach(async () => {
      // Create a test user for session operations
      const userData = createTestUser();
      const user = await prisma.user.create({ data: userData });
      createdUsers.push(user);
    });

    it("should create a session with user relationship", async () => {
      const user = createdUsers[0]!;
      const sessionData = createTestSession(user.id, {
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        token: "secure-session-token-123",
      });

      const session = await prisma.session.create({
        data: sessionData,
        include: { user: true },
      });

      createdSessions.push(session);

      expect(session.id).toBeDefined();
      expect(session.token).toBe(sessionData.token);
      expect(session.userId).toBe(user.id);
      expect(session.user).toBeDefined();
      expect(session.user.id).toBe(user.id);
    });

    it("should enforce unique token constraint", async () => {
      const user = createdUsers[0]!;
      const sessionData = createTestSession(user.id, {
        token: "unique-session-token",
      });

      const session1 = await prisma.session.create({ data: sessionData });
      createdSessions.push(session1);

      await expect(
        prisma.session.create({ data: sessionData })
      ).rejects.toThrow();
    });

    it("should support session expiration queries", async () => {
      const user = createdUsers[0]!;
      const now = new Date();

      // Create expired session
      const expiredSessionData = createTestSession(user.id, {
        expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
        token: "expired-session-token",
      });

      // Create valid session
      const validSessionData = createTestSession(user.id, {
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 1 day from now
        token: "valid-session-token",
      });

      const expiredSession = await prisma.session.create({ data: expiredSessionData });
      const validSession = await prisma.session.create({ data: validSessionData });

      createdSessions.push(expiredSession, validSession);

      // Query only valid sessions
      const validSessions = await prisma.session.findMany({
        where: {
          expiresAt: { gt: now },
        },
      });

      expect(validSessions).toHaveLength(1);
      expect(validSessions[0].token).toBe("valid-session-token");
    });
  });

  describe("Account Operations", () => {
    beforeEach(async () => {
      // Create a test user for account operations
      const userData = createTestUser();
      const user = await prisma.user.create({ data: userData });
      createdUsers.push(user);
    });

    it("should create an OAuth account with user relationship", async () => {
      const user = createdUsers[0]!;
      const accountData = createTestAccount(user.id, {
        providerId: "github",
        accountId: "github-account-123",
        accessToken: "github-access-token",
        scope: "user:email user:profile",
      });

      const account = await prisma.account.create({
        data: accountData,
        include: { user: true },
      });

      createdAccounts.push(account);

      expect(account.id).toBeDefined();
      expect(account.providerId).toBe(accountData.providerId);
      expect(account.accountId).toBe(accountData.accountId);
      expect(account.userId).toBe(user.id);
      expect(account.user).toBeDefined();
      expect(account.user.id).toBe(user.id);
    });

    it("should enforce unique provider-account constraint", async () => {
      const user = createdUsers[0]!;
      const accountData = createTestAccount(user.id, {
        providerId: "github",
        accountId: "unique-github-account",
      });

      const account1 = await prisma.account.create({ data: accountData });
      createdAccounts.push(account1);

      await expect(
        prisma.account.create({ data: accountData })
      ).rejects.toThrow();
    });

    it("should support multiple providers for same user", async () => {
      const user = createdUsers[0]!;

      const githubAccount = await prisma.account.create({
        data: createTestAccount(user.id, {
          providerId: "github",
          accountId: "github-account-123",
        }),
      });

      const googleAccount = await prisma.account.create({
        data: createTestAccount(user.id, {
          providerId: "google",
          accountId: "google-account-456",
        }),
      });

      createdAccounts.push(githubAccount, googleAccount);

      const accounts = await prisma.account.findMany({
        where: { userId: user.id },
      });

      expect(accounts).toHaveLength(2);
      expect(accounts.map(a => a.providerId)).toContain("github");
      expect(accounts.map(a => a.providerId)).toContain("google");
    });
  });

  describe("Complex Operations", () => {
    it("should handle user deletion with cascading deletes", async () => {
      const userData = createTestUser();
      const user = await prisma.user.create({ data: userData });
      createdUsers.push(user);

      // Create related data
      const session = await prisma.session.create({
        data: createTestSession(user.id),
      });
      createdSessions.push(session);

      const post = await prisma.post.create({
        data: createTestPost(user.id),
      });
      createdPosts.push(post);

      const account = await prisma.account.create({
        data: createTestAccount(user.id),
      });
      createdAccounts.push(account);

      // Delete user (should cascade delete related records)
      await prisma.user.delete({ where: { id: user.id } });

      // Verify cascading deletion
      const remainingUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(remainingUser).toBeNull();

      const remainingSession = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(remainingSession).toBeNull();

      const remainingPost = await prisma.post.findUnique({
        where: { id: post.id },
      });
      expect(remainingPost).toBeNull();

      const remainingAccount = await prisma.account.findUnique({
        where: { id: account.id },
      });
      expect(remainingAccount).toBeNull();
    });

    it("should support complex aggregation queries", async () => {
      // Create multiple users with posts
      const users = [];
      for (let i = 0; i < 3; i++) {
        const userData = createTestUser({
          name: `User ${i + 1}`,
          email: `user${i + 1}@example.com`,
        });
        const user = await prisma.user.create({ data: userData });
        users.push(user);
        createdUsers.push(user);

        // Create varying number of posts for each user
        const postCount = i + 1;
        for (let j = 0; j < postCount; j++) {
          const post = await prisma.post.create({
            data: createTestPost(user.id, {
              title: `Post ${j + 1} by User ${i + 1}`,
            }),
          });
          createdPosts.push(post);
        }
      }

      // Aggregate posts per user
      const postsPerUser = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          _count: {
            select: {
              posts: true,
            },
          },
        },
      });

      expect(postsPerUser).toHaveLength(3);
      expect(postsPerUser[0]._count.posts).toBe(1);
      expect(postsPerUser[1]._count.posts).toBe(2);
      expect(postsPerUser[2]._count.posts).toBe(3);
    });

    it("should support full-text search patterns", async () => {
      const user = await prisma.user.create({
        data: createTestUser(),
      });
      createdUsers.push(user);

      // Create posts with searchable content
      const posts = [
        createTestPost(user.id, { title: "JavaScript Tutorial", content: "Learn JavaScript programming" }),
        createTestPost(user.id, { title: "TypeScript Guide", content: "TypeScript for JavaScript developers" }),
        createTestPost(user.id, { title: "React Components", content: "Building reusable React components" }),
      ];

      for (const postData of posts) {
        const post = await prisma.post.create({ data: postData });
        createdPosts.push(post);
      }

      // Search for posts containing "JavaScript"
      const jsPosts = await prisma.post.findMany({
        where: {
          OR: [
            { title: { contains: "JavaScript" } },
            { content: { contains: "JavaScript" } },
          ],
        },
      });

      expect(jsPosts).toHaveLength(2);

      // Search for posts with "TypeScript"
      const tsPosts = await prisma.post.findMany({
        where: {
          OR: [
            { title: { contains: "TypeScript" } },
            { content: { contains: "TypeScript" } },
          ],
        },
      });

      expect(tsPosts).toHaveLength(1);
      expect(tsPosts[0].title).toBe("TypeScript Guide");
    });
  });

  describe("Data Consistency", () => {
    it("should maintain referential integrity", async () => {
      const userData = createTestUser();
      const user = await prisma.user.create({ data: userData });
      createdUsers.push(user);

      const postData = createTestPost(user.id);
      const post = await prisma.post.create({
        data: postData,
        include: { user: true },
      });
      createdPosts.push(post);

      // Verify relationship integrity
      expect(post.userId).toBe(user.id);
      expect(post.user?.id).toBe(user.id);

      // Update user and verify relationship persists
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { name: "Updated User Name" },
      });

      const postWithUpdatedUser = await prisma.post.findUnique({
        where: { id: post.id },
        include: { user: true },
      });

      expect(postWithUpdatedUser?.user?.name).toBe("Updated User Name");
    });

    it("should handle concurrent modifications gracefully", async () => {
      const userData = createTestUser();
      const user = await prisma.user.create({ data: userData });
      createdUsers.push(user);

      // Simulate concurrent updates
      const updatePromises = [
        prisma.user.update({
          where: { id: user.id },
          data: { name: "Name 1" },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { image: "https://example.com/avatar.jpg" },
        }),
      ];

      await Promise.all(updatePromises);

      // Verify final state
      const finalUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(finalUser?.name).toBe("Name 1"); // Last update wins
      expect(finalUser?.emailVerified).toBe(true);
      expect(finalUser?.image).toBe("https://example.com/avatar.jpg");
    });
  });
});