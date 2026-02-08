import { Queue } from "bullmq";
import { redisClient } from "../config/redis.js";

// Queue to send analytics events to the analytics-service worker
export const analyticsQueue = new Queue("analytics-update-queue", {
  connection: redisClient,
});

analyticsQueue.on("waiting", (jobId) => {
  console.log(`📊 Analytics job ${jobId} queued`);
});
