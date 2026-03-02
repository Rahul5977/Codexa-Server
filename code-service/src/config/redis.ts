import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const isDevelopment = process.env.NODE_ENV === "development";

export const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    if (isDevelopment && times > 3) {
      console.warn("⚠️  Redis connection failed (max retries reached in development mode)");
      return null; // Stop retrying
    }
    return Math.min(times * 100, 3000);
  },
  lazyConnect: true, // Don't connect immediately
});

let isConnected = false;

console.log(`Connecting to Redis at ${redisHost}:${redisPort}`);

export async function connectRedis(): Promise<boolean> {
  try {
    await redisClient.connect();
    isConnected = true;
    console.log("✅ Redis client connected");
    return true;
  } catch (error) {
    if (isDevelopment) {
      console.warn("⚠️  Redis connection failed (continuing without Redis in development mode)");
      console.warn("   Start Redis with: docker-compose up -d redis");
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
