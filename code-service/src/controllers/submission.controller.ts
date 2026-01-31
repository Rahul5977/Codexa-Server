import { Request, Response } from "express";
import { CreateSubmissionSchema } from "../dtos/submission.dto";
import { Prisma } from "@codexa/db";
import { submissionQueue } from "../queues/submission.queue";
import { prisma } from "@codexa/db";

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
