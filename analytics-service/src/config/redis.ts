import { Redis } from "ioredis";
import { env } from "./env.js";

export const redisConnection = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

redisConnection.on("connect", () => {
  console.log(`🔌 Redis connected at ${env.REDIS_HOST}:${env.REDIS_PORT}`);
});

redisConnection.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});
