import { Worker, Job } from "bullmq";
import { SubmissionJobData } from "../queues/submission.queue";
import { redisClient } from "../config/redis";

export const processSubmission = async (job: Job<SubmissionJobData>) => {
  console.log(
    `Processing submission job ${job.id} for submissionId: ${job.data.submissionId}`,
  );
  // TODO : Calling juge0
  // TODO : Update submission status in DB

  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(`✅ Finished processing ${job.data.submissionId}`);
};

export const submissionWorker = new Worker<SubmissionJobData>(
  "submission-queue",
  processSubmission,
  {
    connection: redisClient,
    concurrency: 5,
  },
);

submissionWorker.on("completed", (job) => {
  console.log(`🎉 Job ${job.id} has been completed`);
});

submissionWorker.on("failed", (job, err) => {
  console.log(`❌ Job ${job?.id} has failed with error ${err.message}`);
});
