import { afterEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

import {
  createRateLimiter,
  InMemoryRateLimiterStore,
} from "../../middleware/rate-limiter";

type TestContext = {
  request: {
    ip: string | null;
    requestId: string;
  };
  session?: {
    user?: {
      id: string;
    };
  };
};

describe("rate limiter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("enforces maximum requests per identifier", async () => {
    const store = new InMemoryRateLimiterStore();
    const limiter = createRateLimiter<TestContext>({
      windowMs: 1_000,
      maxRequests: 2,
      store,
    });

    const ctx: TestContext = {
      request: {
        ip: "127.0.0.1",
        requestId: "req-1",
      },
      session: {
        user: {
          id: "user-1",
        },
      },
    };

    const next = vi.fn().mockResolvedValue("ok");

    await expect(limiter({ ctx, next })).resolves.toBe("ok");
    await expect(limiter({ ctx, next })).resolves.toBe("ok");
    await expect(limiter({ ctx, next })).rejects.toBeInstanceOf(TRPCError);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("resets counters after the window expires", async () => {
    vi.useFakeTimers();

    const store = new InMemoryRateLimiterStore();
    const limiter = createRateLimiter<TestContext>({
      windowMs: 500,
      maxRequests: 1,
      store,
    });

    const ctx: TestContext = {
      request: {
        ip: null,
        requestId: "req-2",
      },
    };

    const next = vi.fn().mockResolvedValue("ok");

    await expect(limiter({ ctx, next })).resolves.toBe("ok");
    await expect(limiter({ ctx, next })).rejects.toBeInstanceOf(TRPCError);

    vi.advanceTimersByTime(600);

    await expect(limiter({ ctx, next })).resolves.toBe("ok");
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("supports custom identifier resolvers", async () => {
    const store = new InMemoryRateLimiterStore();
    const limiter = createRateLimiter<TestContext>({
      windowMs: 1_000,
      maxRequests: 1,
      store,
      identifier: (ctx) => ctx.request.ip,
    });

    const next = vi.fn().mockResolvedValue("ok");

    const ctxA: TestContext = {
      request: { ip: "10.0.0.1", requestId: "req-a" },
    };

    const ctxB: TestContext = {
      request: { ip: "10.0.0.2", requestId: "req-b" },
    };

    await expect(limiter({ ctx: ctxA, next })).resolves.toBe("ok");
    await expect(limiter({ ctx: ctxA, next })).rejects.toBeInstanceOf(TRPCError);
    await expect(limiter({ ctx: ctxB, next })).resolves.toBe("ok");
    expect(next).toHaveBeenCalledTimes(2);
  });
});
