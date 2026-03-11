import { Request, Response } from "express";
import { CreateSubmissionSchema, RunCodeSchema } from "../dtos/submission.dto";
import { submissionQueue } from "../queues/submission.queue";
import { prisma } from "@codexa/db";
import { executeBatch } from "../services/judge0.services";
import { isRedisConnected } from "../config/redis.js";

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
    if (isRedisConnected()) {
      await submissionQueue.add("process-code", {
        submissionId: submission.id,
        userId: validatedData.userId,
        problemId: validatedData.problemId,
        code: validatedData.code,
        languageId: validatedData.languageId,
      });
    } else {
      // In development without Redis, update status to indicate queue unavailable
      if (process.env.NODE_ENV === "development") {
        await prisma.submission.update({
          where: { id: submission.id },
          data: { 
            status: "ERROR",
            stderr: "Job queue unavailable (Redis not connected)"
          },
        });
        return res.status(503).json({
          message: "Job queue unavailable - Redis not connected",
          submissionId: submission.id,
        });
      }
      throw new Error("Redis not connected");
    }
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
        code: true,
        language: true,
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

// GET /submissions?userId=...&problemId=...&status=...&languageIds=...&includeUser=...
// Used for History and Public Submissions
export const getAllSubmissions = async (req: Request, res: Response) => {
  const { userId, problemId, status, languageIds, includeUser } = req.query;

  try {
    // Dynamic Filter Object
    // We only add filters if they are present in the query params
    const whereClause: any = {};
    if (userId) whereClause.userId = String(userId);
    if (problemId) whereClause.problemId = String(problemId);
    if (status) whereClause.status = String(status);
    
    // Handle multiple language IDs (comma-separated or array)
    if (languageIds) {
      const langIds = typeof languageIds === 'string' 
        ? languageIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        : Array.isArray(languageIds) 
          ? languageIds.map(id => parseInt(String(id))).filter(id => !isNaN(id))
          : [];
      
      if (langIds.length > 0) {
        whereClause.languageId = { in: langIds };
      }
    }

    const submissions = await prisma.submission.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" }, // Newest first
      take: 100, // Increased limit for public submissions
      select: {
        id: true,
        status: true,
        time: true,
        memory: true,
        createdAt: true,
        languageId: true,
        language: true,
        userId: true,
        // Include user information if requested
        ...(includeUser === 'true' && {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }),
        // We DON'T select 'code' here to keep the response light for list view
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
  try {
    //1. validate schema
    const validatedData = RunCodeSchema.parse(req.body);
    
    //2. Fetch problem (for reference, but we don't need metadata for wrapping anymore)
    const problem = await prisma.problem.findUnique({
      where: { id: validatedData.problemId },
      select: {
        id: true,
      },
    });

    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    //3. Create payload for judge0 (no wrapping needed - users write complete programs)
    const payload = [
      {
        language_id: validatedData.languageId,
        source_code: validatedData.code,  // Use user's code directly
        stdin: validatedData.stdin || "",  // Plain text input
        expected_output: "", //for custom inputs(we dont know the output)
      },
    ];

    //4. call judge 0 directly
    const response = await executeBatch(payload);
    const result = response[0];
    //5. return response
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
    if (error.name === "ZodError") {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error("Error running code:", error.message || error);
    console.error("Full error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};