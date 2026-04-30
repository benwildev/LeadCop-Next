import Redis from "ioredis";
import { logger } from "./logger";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 3000);
    return delay;
  },
  lazyConnect: false,
});

redis.on("connect", () => {
  logger.info("Redis connected");
});

redis.on("error", (err) => {
  logger.error({ err }, "Redis connection error");
});

/**
 * Check if an API key has exceeded its rate limit.
 * Uses Redis INCR + EXPIRE for atomic counter per key per minute window.
 * @returns true if within limit, false if exceeded
 */
export async function checkRateLimit(
  key: string,
  limitPerMinute: number,
): Promise<boolean> {
  const redisKey = `rl:${key}`;
  try {
    const current = await redis.incr(redisKey);
    if (current === 1) {
      // First request in this window — set 60s TTL
      await redis.expire(redisKey, 60);
    }
    return current <= limitPerMinute;
  } catch {
    // If Redis is down, allow the request (fail-open)
    return true;
  }
}

export async function getRedisClient() {
  if (!redis.status || redis.status === "end") {
    await redis.connect();
  }
  return redis;
}
