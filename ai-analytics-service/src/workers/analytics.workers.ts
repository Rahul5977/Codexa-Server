//Responsibility: Listen to BullMQ and call the handler.
import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { handleSubmissionCompleted } from "../events/submissionHandler.js";

export const analyticsWorker = new Worker(
  "analytics-update-queue",
  async (job) => {
    console.log(`📊 Processing analytics job ${job.id} | Type: ${job.name}`);
    // Pass the job data to our logic handler
    await handleSubmissionCompleted(job.data);
  },
  {
    connection: redisConnection, // Use the shared connection
    concurrency: 3,
  },
);

analyticsWorker.on("completed", (job) => {
  console.log(`✅ Analytics job ${job.id} completed`);
});

analyticsWorker.on("failed", (job, err) => {
  console.error(`❌ Analytics job ${job?.id} failed: ${err.message}`);
});

console.log("👂 Analytics Worker listening on queue: analytics-update-queue");
