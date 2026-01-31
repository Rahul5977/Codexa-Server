import { Queue } from "bullmq";
import { redisClient } from "../config/redis";

// 1. Define the shape of the data inside the job
export interface SubmissionJobData {
  submissionId: string;
  userId: string;
  problemId: string;
  code: string;
  languageId: number;
}

// 2. Create the Queue
// This is what the Controller imports to .add() jobs
export const submissionQueue = new Queue<SubmissionJobData>(
  "submission-queue",
  {
    connection: redisClient,
  },
);

// 3.Add a listener to log when jobs are added
submissionQueue.on("waiting", (jobId) => {
  console.log(`Job ${jobId} added to the queue 📥`);
});
