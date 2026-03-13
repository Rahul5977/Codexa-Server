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
    // 1. Fetch Test Cases (visible + hidden) from DB
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        testcases: true,
        hiddenTestcases: true,
        difficulty: true,
        tags: true,
      },
    });

    if (!problem || !problem.testcases) {
      throw new Error("Test cases missing");
    }

    const visibleTestCases = problem.testcases as Array<{
      input: string;
      output: string;
    }>;

    const hiddenTestCases = (problem.hiddenTestcases || []) as Array<{
      input: string;
      output: string;
    }>;

    // Combine all test cases for submission evaluation
    const allTestCases = [...visibleTestCases, ...hiddenTestCases];

    // 3. Count attempt number for this user+problem
    const attemptCount = await prisma.submission.count({
      where: { userId, problemId },
    });

    // 4. Prepare Batch Payload for Judge0 (users write complete programs, no wrapping needed)
    const batchPayload = allTestCases.map((tc) => ({
      language_id: languageId,
      source_code: code, // Use user's code directly, no wrapping
      stdin: tc.input, // Plain text input (e.g., "4 9\n2 7 11 15")
      expected_output: tc.output.trim(), // Plain text expected output (e.g., "0 1")
    }));

    // 5. Update Status to PROCESSING
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "PROCESSING" },
    });

    // 6. Call Judge0
    const results = await executeBatch(batchPayload);

    // 7. Aggregate Results
    let finalStatus = "ACCEPTED";
    let maxTime = 0.0;
    let maxMemory = 0;
    let failedReason = null;
    let passedCount = 0;
    let totalCount = allTestCases.length;

    for (let i = 0; i < results.length; i++) {
      const res = results[i];

      // Update max time and memory
      if (res.time && parseFloat(res.time) > maxTime)
        maxTime = parseFloat(res.time);
      if (res.memory > maxMemory) maxMemory = res.memory;

      // Check if test case passed (status 3 = Accepted in Judge0)
      if (res.status.id === 3) {
        passedCount++;
      } else {
        // Only set failure details if we haven't already
        if (finalStatus === "ACCEPTED") {
          const testCaseType =
            i < visibleTestCases.length ? "visible" : "hidden";
          const testCaseNumber =
            i < visibleTestCases.length
              ? i + 1
              : i - visibleTestCases.length + 1;

          // Map Judge0 status to our status enum
          if (res.status.id === 4) finalStatus = "WRONG_ANSWER";
          else if (res.status.id === 5) finalStatus = "TIME_LIMIT_EXCEEDED";
          else if (res.status.id === 6) finalStatus = "COMPILATION_ERROR";
          else if (
            res.status.id === 7 ||
            res.status.id === 8 ||
            res.status.id === 9 ||
            res.status.id === 10 ||
            res.status.id === 11 ||
            res.status.id === 12
          )
            finalStatus = "ERROR";
          else
            finalStatus = res.status.description
              .toUpperCase()
              .replace(/ /g, "_");

          failedReason =
            res.stderr ||
            res.compile_output ||
            `Failed on ${testCaseType} test case ${testCaseNumber}`;
        }
      }
    }

    const language = LANGUAGE_MAP[languageId] || `lang_${languageId}`;
    const executionTimeMs = maxTime * 1000; // Convert seconds to ms

    // 8. Save Final Result to DB
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: finalStatus as any,
        time: maxTime.toString(),
        memory: maxMemory,
        stderr: failedReason,
        stdout: `Passed ${passedCount}/${totalCount} test cases`,
        language,
        executionTimeMs,
        attemptNumber: attemptCount,
      },
    });

    // 9. Send analytics event via BullMQ (includes code for AI analysis)
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
      code, // Passed through for background AI analysis in analytics-service
    });

    console.log(
      `✅ Submission ${submissionId} processed: ${finalStatus} (${passedCount}/${totalCount} test cases)`,
    );
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
