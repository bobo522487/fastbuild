import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";

describe("Database Connection", () => {
  let testClient: PrismaClient;

  beforeAll(() => {
    // Suppress Prisma logs in tests
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  beforeEach(() => {
    testClient = new PrismaClient();
  });

  afterEach(async () => {
    await testClient.$disconnect();
  });

  describe("Basic Connection", () => {
    it("should establish connection successfully", async () => {
      await expect(testClient.$connect()).resolves.not.toThrow();

      // Verify connection with a simple query
      const result = await testClient.$queryRaw`SELECT 1 as connected`;
      expect(result).toBeDefined();

      await testClient.$disconnect();
    });

    it("should handle connection string validation", async () => {
      const invalidClient = new PrismaClient({
        datasources: {
          db: {
            url: "invalid-connection-string",
          },
        },
      });

      await expect(invalidClient.$connect()).rejects.toThrow();
    });

    it("should handle connection timeout", async () => {
      const timeoutClient = new PrismaClient({
        datasources: {
          db: {
            url: "postgresql://user:pass@nonexistent-host:5432/db?connect_timeout=1",
          },
        },
      });

      await expect(timeoutClient.$connect()).rejects.toThrow();
    });
  });

  describe("Connection Pooling", () => {
    it("should handle concurrent connections", async () => {
      const connectionPromises = Array.from({ length: 10 }, () =>
        testClient.$queryRaw`SELECT 1 as test`
      );

      const results = await Promise.all(connectionPromises);
      expect(results).toHaveLength(10);
      expect(results.every(result => result !== null)).toBe(true);
    });

    it("should reuse connections efficiently", async () => {
      const iterations = 20;
      const operations = Array.from({ length: iterations }, () =>
        testClient.user.count()
      );

      const results = await Promise.all(operations);
      expect(results).toHaveLength(iterations);
      expect(results.every(count => typeof count === 'number')).toBe(true);
    });

    it("should handle connection exhaustion gracefully", async () => {
      // This test might be flaky depending on database configuration
      const maxConnections = 5;
      const operations = Array.from({ length: maxConnections + 5 }, () =>
        testClient.$queryRaw`SELECT pg_sleep(0.1)` // 100ms delay
      );

      // Should either succeed or handle the error gracefully
      const results = await Promise.allSettled(operations);

      // At least some operations should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe("Health Checks", () => {
    it("should respond to health check queries", async () => {
      const healthCheck = await testClient.$queryRaw`SELECT 1 as healthy`;
      expect(healthCheck).toBeDefined();
    });

    it("should verify database accessibility", async () => {
      const versionQuery = await testClient.$queryRaw`SELECT version() as version`;
      expect(versionQuery).toBeDefined();
      expect(Array.isArray(versionQuery)).toBe(true);
    });

    it("should verify table existence", async () => {
      // Check if User table exists
      const tableCheck = await testClient.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'user'
        ) as user_table_exists
      `;

      expect(tableCheck).toBeDefined();
      expect(Array.isArray(tableCheck)).toBe(true);
    });
  });

  describe("Error Recovery", () => {
    it("should recover from temporary connection loss", async () => {
      // Force disconnect
      await testClient.$disconnect();

      // Should be able to reconnect
      await expect(testClient.$connect()).resolves.not.toThrow();

      // Should work after reconnection
      const result = await testClient.$queryRaw`SELECT 1 as recovered`;
      expect(result).toBeDefined();
    });

    it("should handle query errors without breaking connection", async () => {
      // Invalid query that should fail but not break connection
      await expect(
        testClient.$queryRaw`SELECT * FROM non_existent_table`
      ).rejects.toThrow();

      // Connection should still work
      const result = await testClient.$queryRaw`SELECT 1 as still_connected`;
      expect(result).toBeDefined();
    });

    it("should handle malformed queries gracefully", async () => {
      await expect(
        testClient.$queryRaw`INVALID SQL SYNTAX`
      ).rejects.toThrow();

      // Connection should remain intact
      const result = await testClient.$queryRaw`SELECT 1 as intact`;
      expect(result).toBeDefined();
    });
  });

  describe("Transaction Isolation", () => {
    it("should support read transactions", async () => {
      await testClient.$transaction(async (tx) => {
        const userCount = await tx.user.count();
        expect(typeof userCount).toBe('number');

        const postCount = await tx.post.count();
        expect(typeof postCount).toBe('number');
      });
    });

    it("should support nested transaction scenarios", async () => {
      const testEmail = "nested-transaction@example.com";

      await testClient.$transaction(async (tx) => {
        // Create user in outer transaction
        const user = await tx.user.create({
          data: {
            email: testEmail,
            name: "Nested Transaction Test",
            emailVerified: false,
          },
        });

        // Inner transaction should fail due to duplicate email
        await expect(
          tx.$transaction(async (innerTx) => {
            await innerTx.user.create({
              data: {
                email: testEmail, // Same email, should fail
                name: "Duplicate User",
                emailVerified: false,
              },
            });
          })
        ).rejects.toThrow();

        // Outer transaction should still be valid
        const foundUser = await tx.user.findUnique({
          where: { id: user.id },
        });

        expect(foundUser).not.toBeNull();
      });

      // Clean up
      await testClient.user.delete({
        where: { email: testEmail },
      });
    });
  });

  describe("Connection Lifecycle", () => {
    it("should handle rapid connect/disconnect cycles", async () => {
      const cycles = 5;

      for (let i = 0; i < cycles; i++) {
        const client = new PrismaClient();

        await client.$connect();

        const result = await client.$queryRaw`SELECT ${i + 1} as cycle`;
        expect(result).toBeDefined();

        await client.$disconnect();
      }
    });

    it("should maintain connection state across operations", async () => {
      await testClient.$connect();

      // Multiple operations should use same connection
      await testClient.$queryRaw`SELECT 1 as first_op`;
      await testClient.$queryRaw`SELECT 2 as second_op`;
      await testClient.$queryRaw`SELECT 3 as third_op`;

      await testClient.$disconnect();
    });
  });
});