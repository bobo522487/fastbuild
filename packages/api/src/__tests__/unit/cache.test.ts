import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SimpleCache,
  createCacheKey,
  createCacheMiddleware,
} from "../../utils/cache";

describe("cache utilities", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reuses cached values for identical inputs", async () => {
    const cache = new SimpleCache<string>(5_000);
    const middleware = createCacheMiddleware<{ id: string }, string>(
      cache,
      (input) => createCacheKey("test", input.id),
    );

    const next = vi.fn().mockResolvedValue("value-1");

    const first = await middleware({ input: { id: "1" }, next });
    expect(first).toBe("value-1");
    expect(next).toHaveBeenCalledTimes(1);

    next.mockResolvedValue("value-2");

    const second = await middleware({ input: { id: "1" }, next });
    expect(second).toBe("value-1");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("expires cached entries after ttl", async () => {
    vi.useFakeTimers();

    const cache = new SimpleCache<string>(1_000);
    const middleware = createCacheMiddleware<{ id: string }, string>(
      cache,
      (input) => createCacheKey("resource", input.id),
    );

    const next = vi.fn().mockResolvedValue("initial");

    await middleware({ input: { id: "42" }, next });
    expect(next).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1_100);

    next.mockResolvedValue("refreshed");

    const refreshed = await middleware({ input: { id: "42" }, next });
    expect(refreshed).toBe("refreshed");
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("builds stable cache keys", () => {
    const key = createCacheKey("post", "byId", undefined, "123");
    expect(key).toBe("post:byId:123");
  });
});
