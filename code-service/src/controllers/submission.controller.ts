import { Request, Response } from "express";
import { CreateSubmissionSchema, RunCodeSchema } from "../dtos/submission.dto";
import { submissionQueue } from "../queues/submission.queue";
import { prisma } from "@codexa/db";
import { executeBatch } from "../services/judge0.services";

export const createSubmission = async (req: Request, res: Response) => {
  try {
    //1. validate the request body
    const validatedData = CreateSubmissionSchema.parse(req.body);
    //2. check if the problemId exists
    const problem = await prisma.problem.findUnique({
      where: { id: validatedData.problemId },
    });
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }
    //3. create a new submission with status 'pending' for dataconsistency
    const submission = await prisma.submission.create({
      data: {
        userId: validatedData.userId,
        problemId: validatedData.problemId,
        code: validatedData.code,
        languageId: validatedData.languageId,
        status: "PENDING",
      },
    });

    // 4. Add to BullMQ (The Heavy Lifting Queue)
    await submissionQueue.add("process-code", {
      submissionId: submission.id,
      userId: validatedData.userId,
      problemId: validatedData.problemId,
      code: validatedData.code,
      languageId: validatedData.languageId,
    });
    // 5. Return Success immediately (202 Accepted)
    return res.status(202).json({
      message: "Submission queued successfully",
      submissionId: submission.id,
    });
  } catch (error) {
    console.error("Error creating submission:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//GET submission/:id
//Used for Polling: Checks if the specific job is finished.
export const getSubmissionById = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Ensure id is a string
  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Invalid submission ID" });
  }

  try {
    const submission = await prisma.submission.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        stdout: true,
        stderr: true,
        time: true,
        memory: true,
        createdAt: true,
        languageId: true,
      },
    });
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }
    return res.status(200).json({
      message: "Submission fetched successfully",
      submission,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching submission",
    });
  }
};

// GET /submissions?userId=...&problemId=...
// Used for History
export const getAllSubmissions = async (req: Request, res: Response) => {
  const { userId, problemId } = req.query;

  try {
    // Dynamic Filter Object
    // We only add filters if they are present in the query params
    const whereClause: any = {};
    if (userId) whereClause.userId = String(userId);
    if (problemId) whereClause.problemId = String(problemId);

    const submissions = await prisma.submission.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" }, // Newest first
      take: 20, // Limit to 20 to prevent fetching 10,000 records
      select: {
        id: true,
        status: true,
        time: true,
        memory: true,
        createdAt: true,
        languageId: true,
        // We DON'T select 'code' here to keep the response light
      },
    });

    return res.status(200).json(submissions);
  } catch (error) {
    console.error("Get History Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

//POST /run
// Dry Run: Executes code against custom input immediately.
// Does NOT save to database.
export const runCode = async (req: Request, res: Response) => {
  //1. validate schema
  const validatedData = RunCodeSchema.parse(req.body);
  try {
    //2. create payload for judge0
    //treated as batch of 1
    const payload = [
      {
        language_id: validatedData.languageId,
        source_code: validatedData.code,
        stdin: validatedData.stdin || "",
        expected_output: "", //for custom inputs(we dont know the output)
      },
    ];

    //3. call judge 0 directly
    const response = await executeBatch(payload);
    const result = response[0];
    //4. return response
    return res.status(200).json({
      status: result.status.description,
      stdout: result.stdout,
      stderr: result.stderr,
      compile_output: result.compile_output,
      time: result.time,
      memory: result.memory,
    });
  } catch (error: any) {
    //Zod error
    if (error.name == "ZodError") {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error("Error running code:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
