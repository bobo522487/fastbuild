import { TRPCError } from '@trpc/server';

type RateLimitRecord = {
  count: number;
  resetTime: number;
};

export interface RateLimiterStore {
  get(key: string): RateLimitRecord | null | Promise<RateLimitRecord | null>;
  set(key: string, value: RateLimitRecord): void | Promise<void>;
  delete?(key: string): void | Promise<void>;
  sweep?(now: number): void | Promise<void>;
}

class InMemoryRateLimiterStore implements RateLimiterStore {
  private readonly store = new Map<string, RateLimitRecord>();

  get(key: string): RateLimitRecord | null {
    return this.store.get(key) ?? null;
  }

  set(key: string, value: RateLimitRecord): void {
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  sweep(now: number = Date.now()): void {
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

type IdentifierResolver<TRouterContext> = (ctx: TRouterContext) => string | null | undefined;

export interface RateLimitOptions<TRouterContext = any> {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  identifier?: string | IdentifierResolver<TRouterContext>; // Custom identifier (default: IP / request id)
  store?: RateLimiterStore;
}

function resolveIdentifier<TRouterContext extends { request?: { ip: string | null; requestId: string }; session?: { user?: { id?: string } } }>(
  ctx: TRouterContext,
  identifier?: string | IdentifierResolver<TRouterContext>,
): string {
  if (typeof identifier === 'string') {
    return identifier;
  }

  if (typeof identifier === 'function') {
    const resolved = identifier(ctx);
    if (resolved) return resolved;
  }

  if (ctx.session?.user?.id) {
    return ctx.session.user.id;
  }

  if (ctx.request?.ip) {
    return ctx.request.ip;
  }

  return ctx.request?.requestId ?? 'anonymous';
}

export function createRateLimiter<TRouterContext = any>(
  options: RateLimitOptions<TRouterContext> & { windowMs: number; maxRequests: number },
) {
  const store = options.store ?? new InMemoryRateLimiterStore();

  const middleware = async ({ ctx, next }: { ctx: TRouterContext; next: () => Promise<unknown> }) => {
    const now = Date.now();

    if (typeof store.sweep === 'function') {
      await store.sweep(now);
    }

    const identifier = resolveIdentifier(ctx, options.identifier);
    const key = `rate-limit:${identifier}`;

    const current = await store.get(key);

    if (!current || now > current.resetTime) {
      await store.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return next();
    }

    if (current.count >= options.maxRequests) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Maximum ${options.maxRequests} requests per ${options.windowMs / 1000} seconds.`,
      });
    }

    await store.set(key, {
      count: current.count + 1,
      resetTime: current.resetTime,
    });

    return next();
  };

  return Object.assign(middleware, { store });
}

// Predefined rate limiters for different use cases
export const strictRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
});

export const normalRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
});

export const lenientRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
});

export { InMemoryRateLimiterStore };
