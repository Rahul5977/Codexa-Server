import { Worker, Job } from "bullmq";
import { redisClient } from "../config/redis";
import { SubmissionJobData } from "../queues/submission.queue";
import { prisma } from "@codexa/db";
import { executeBatch } from "../services/judge0.services";

const processSubmission = async (job: Job<SubmissionJobData>) => {
  const { submissionId, problemId, code, languageId } = job.data;

  try {
    // 1. Fetch Test Cases from DB
    // In production, we would CACHE this in Redis to avoid hitting DB 1000 times/sec
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { testcases: true },
    });

    if (!problem || !problem.testcases) {
      throw new Error("Test cases missing");
    }

    // Cast the JSON type safely (assuming your DB has [{input: "...", output: "..."}])
    const testCases = problem.testcases as Array<{
      input: string;
      output: string;
    }>;

    // 2. Prepare Batch Payload for Judge0
    // We map every test case to a submission object
    const batchPayload = testCases.map((tc) => ({
      language_id: languageId,
      source_code: code,
      stdin: tc.input,
      expected_output: tc.output,
    }));

    // 3. Update Status to PROCESSING
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "PROCESSING" },
    });

    // 4. Call Judge0 (The Heavy Operation)
    const results = await executeBatch(batchPayload);

    // 5. Aggregate Results
    // We need to determine: Did ALL pass? If not, which one failed first?
    let finalStatus = "ACCEPTED";
    let maxTime = 0.0;
    let maxMemory = 0;
    let failedReason = null;

    for (const res of results) {
      // Judge0 Status ID 3 means "Accepted"
      if (res.status.id !== 3) {
        finalStatus = res.status.description.toUpperCase().replace(" ", "_"); // e.g. WRONG_ANSWER
        failedReason =
          res.stderr || res.compile_output || `Failed on input: ${res.stdin}`;
        break; // Stop checking after first failure (Optimization)
      }

      // Track max resource usage across all test cases
      if (parseFloat(res.time) > maxTime) maxTime = parseFloat(res.time);
      if (res.memory > maxMemory) maxMemory = res.memory;
    }

    // 6. Save Final Result to DB
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: finalStatus as any, // Cast to Enum
        time: maxTime.toString(),
        memory: maxMemory,
        stderr: failedReason,
        stdout: results[0]?.stdout, // Save first stdout for debugging
      },
    });

    console.log(`✅ Submission ${submissionId} processed: ${finalStatus}`);
  } catch (error: any) {
    console.error(`❌ Job Failed for ${submissionId}:`, error.message);

    // Mark as Internal Error so user isn't stuck in "Pending" forever
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
    concurrency: 5, // Handle 5 submissions in parallel
  },
);
