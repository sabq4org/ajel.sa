/**
 * Redis client — caching, rate limiting, real-time features
 */

import Redis from "ioredis";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }

  _redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });

  _redis.on("error", (err) => {
    console.error("[redis]", err.message);
  });

  return _redis;
}

// =====================================================
// CACHE HELPERS
// =====================================================

const DEFAULT_TTL = 60 * 5; // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const r = getRedis();
    const v = await r.get(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
  try {
    const r = getRedis();
    await r.set(key, JSON.stringify(value), "EX", ttl);
  } catch {
    // Silently fail caching
  }
}

export async function cacheDelete(...keys: string[]): Promise<void> {
  try {
    if (keys.length === 0) return;
    const r = getRedis();
    await r.del(...keys);
  } catch {
    // ignore
  }
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  try {
    const r = getRedis();
    const keys = await r.keys(pattern);
    if (keys.length) await r.del(...keys);
  } catch {
    // ignore
  }
}

// memo helper: get or compute and cache
export async function cacheRemember<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const fresh = await fn();
  await cacheSet(key, fresh, ttl);
  return fresh;
}

// =====================================================
// VIEW COUNTING (debounced via session hash)
// =====================================================

export async function trackPageView(articleId: string, sessionHash: string): Promise<boolean> {
  try {
    const r = getRedis();
    const key = `view:${articleId}:${sessionHash}`;
    const result = await r.set(key, "1", "EX", 3600, "NX");
    if (result === "OK") {
      await r.incr(`views:${articleId}`);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
