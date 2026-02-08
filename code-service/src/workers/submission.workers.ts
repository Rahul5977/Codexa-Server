import { Worker, Job } from "bullmq";
import { redisClient } from "../config/redis.js";
import { SubmissionJobData } from "../queues/submission.queue.js";
import { analyticsQueue } from "../queues/analytics.queue.js";
import { prisma } from "@codexa/db";
import { executeBatch } from "../services/judge0.services.js";

// Map common Judge0 language IDs to language names
const LANGUAGE_MAP: Record<number, string> = {
  50: "c",
  54: "cpp",
  62: "java",
  63: "javascript",
  71: "python",
  72: "ruby",
  73: "rust",
  74: "typescript",
  78: "kotlin",
  60: "go",
};

const processSubmission = async (job: Job<SubmissionJobData>) => {
  const { submissionId, problemId, code, languageId, userId } = job.data;

  try {
    // 1. Fetch Test Cases + Problem metadata from DB
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { testcases: true, difficulty: true, tags: true },
    });

    if (!problem || !problem.testcases) {
      throw new Error("Test cases missing");
    }

    const testCases = problem.testcases as Array<{
      input: string;
      output: string;
    }>;

    // 2. Count attempt number for this user+problem
    const attemptCount = await prisma.submission.count({
      where: { userId, problemId },
    });

    // 3. Prepare Batch Payload for Judge0
    const batchPayload = testCases.map((tc) => ({
      language_id: languageId,
      source_code: code,
      stdin: tc.input,
      expected_output: tc.output,
    }));

    // 4. Update Status to PROCESSING
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "PROCESSING" },
    });

    // 5. Call Judge0
    const results = await executeBatch(batchPayload);

    // 6. Aggregate Results
    let finalStatus = "ACCEPTED";
    let maxTime = 0.0;
    let maxMemory = 0;
    let failedReason = null;

    for (const res of results) {
      if (res.status.id !== 3) {
        finalStatus = res.status.description.toUpperCase().replace(/ /g, "_");
        failedReason =
          res.stderr || res.compile_output || `Failed on input: ${res.stdin}`;
        break;
      }

      if (parseFloat(res.time) > maxTime) maxTime = parseFloat(res.time);
      if (res.memory > maxMemory) maxMemory = res.memory;
    }

    const language = LANGUAGE_MAP[languageId] || `lang_${languageId}`;
    const executionTimeMs = maxTime * 1000; // Convert seconds to ms

    // 7. Save Final Result to DB
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: finalStatus as any,
        time: maxTime.toString(),
        memory: maxMemory,
        stderr: failedReason,
        stdout: results[0]?.stdout,
        language,
        executionTimeMs,
        attemptNumber: attemptCount,
      },
    });

    // 8. Send analytics event via BullMQ
    await analyticsQueue.add("update-stats", {
      userId,
      problemId,
      submissionId,
      status: finalStatus,
      difficulty: problem.difficulty,
      topics: problem.tags || [],
      language,
      executionTimeMs,
      memoryKb: maxMemory,
      attemptNumber: attemptCount,
      createdAt: new Date().toISOString(),
    });

    console.log(`✅ Submission ${submissionId} processed: ${finalStatus}`);
  } catch (error: any) {
    console.error(`❌ Job Failed for ${submissionId}:`, error.message);

    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "ERROR", stderr: "System execution failed." },
    });
  }
};

// Start the Worker
export const submissionWorker = new Worker<SubmissionJobData>(
  "submission-queue",
  processSubmission,
  {
    connection: redisClient,
    concurrency: 5,
  },
);

submissionWorker.on("completed", (job) => {
  console.log(`✅ Worker completed job ${job.id}`);
});

submissionWorker.on("failed", (job, err) => {
  console.error(`❌ Worker job ${job?.id} failed: ${err.message}`);
});
