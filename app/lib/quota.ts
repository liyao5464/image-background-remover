type RateRecord = { count: number; resetAt: number };

const globalStore = globalThis as typeof globalThis & {
  __userRateLimitStore?: Map<string, RateRecord>;
};

const rateLimitStore = globalStore.__userRateLimitStore ?? new Map<string, RateRecord>();
globalStore.__userRateLimitStore = rateLimitStore;

export const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 5);
export const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW ?? 60 * 60 * 24);

export function getQuotaKey(userId: string) {
  return `user:${userId}`;
}

export function getQuotaState(userId: string) {
  const key = getQuotaKey(userId);
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt < now) {
    return {
      used: 0,
      remaining: RATE_LIMIT_MAX,
      resetAt: now + RATE_LIMIT_WINDOW * 1000,
      limit: RATE_LIMIT_MAX,
    };
  }

  return {
    used: existing.count,
    remaining: Math.max(0, RATE_LIMIT_MAX - existing.count),
    resetAt: existing.resetAt,
    limit: RATE_LIMIT_MAX,
  };
}

export function consumeQuota(userId: string) {
  const key = getQuotaKey(userId);
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt < now) {
    const next = { count: 1, resetAt: now + RATE_LIMIT_WINDOW * 1000 };
    rateLimitStore.set(key, next);
    return {
      allowed: true,
      used: 1,
      remaining: Math.max(0, RATE_LIMIT_MAX - 1),
      resetAt: next.resetAt,
      limit: RATE_LIMIT_MAX,
    };
  }

  if (existing.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      used: existing.count,
      remaining: 0,
      resetAt: existing.resetAt,
      limit: RATE_LIMIT_MAX,
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return {
    allowed: true,
    used: existing.count,
    remaining: Math.max(0, RATE_LIMIT_MAX - existing.count),
    resetAt: existing.resetAt,
    limit: RATE_LIMIT_MAX,
  };
}
