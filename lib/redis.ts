import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}
export const redis :Redis = globalThis.__redis ?? new Redis(redisUrl);

if(process.env.NODE_ENV !== "production") globalThis.__redis = redis;