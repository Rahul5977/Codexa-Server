import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const isDevelopment = process.env.NODE_ENV === "development";

let isConnected = false;

console.log(`Connecting to Redis at ${redisHost}:${redisPort}`);

export const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    if (isDevelopment && times > 5) {
      console.warn("⚠️  Redis connection failed (max retries reached in development mode)");
      return null; // Stop retrying
    }
    return Math.min(times * 50, 2000);
  },
  enableReadyCheck: true,
  lazyConnect: false, // Connect immediately
});

export async function connectRedis(): Promise<boolean> {
  try {
    // Test connection with a ping
    await redisClient.ping();
    isConnected = true;
    console.log("✅ Redis client connected successfully");
    return true;
  } catch (error: any) {
    if (isDevelopment) {
      console.warn("⚠️  Redis connection failed (continuing without Redis in development mode)");
      console.warn("   Error:", error.message);
      console.warn("   Start Redis with: docker run -d -p 6379:6379 --name codexa-redis redis:7-alpine");
      return false;
    }
    throw error;
  }
}

redisClient.on("connect", () => {
  isConnected = true;
  console.log("✅ Redis client connected");
});

redisClient.on("error", (err) => {
  if (!isDevelopment) {
    console.error("❌ Redis connection error:", err.message);
  }
});

redisClient.on("close", () => {
  isConnected = false;
});

export function isRedisConnected(): boolean {
  return isConnected;
}
