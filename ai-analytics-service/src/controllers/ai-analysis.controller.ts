import type { Request, Response } from "express";
import { prisma } from "@codexa/db";
import {
  generateAIAnalysis,
  getCachedAnalysis,
} from "../services/ai-analysis.service.js";

/**
 * GET /api/analytics/analysis/:submissionId
 * Retrieve (or generate) an AI analysis report for a submission.
 */
export const getAnalysis = async (req: Request, res: Response) => {
  const submissionId = req.params.submissionId as string;
  if (!submissionId) {
    return res.status(400).json({ error: "submissionId is required" });
  }

  try {
    // 1. Check cache first (fast path)
    const cached = await getCachedAnalysis(submissionId);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    // 2. Fetch submission from DB
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        problem: {
          select: {
            title: true,
            difficulty: true,
          },
        },
      },
    });

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    // 3. Only analyse completed submissions
    if (
      submission.status === "PENDING" ||
      submission.status === "PROCESSING"
    ) {
      return res.status(202).json({
        success: false,
        error: "Submission is still processing",
      });
    }

    if (!submission.code) {
      return res
        .status(400)
        .json({ error: "No code found for this submission" });
    }

    // 4. Generate analysis (also caches internally)
    const report = await generateAIAnalysis({
      submissionId: submission.id,
      code: submission.code,
      language: submission.language || "unknown",
      status: submission.status,
      executionTimeMs: submission.executionTimeMs ?? 0,
      memoryKb: submission.memory ?? 0,
      problemTitle: submission.problem?.title,
      difficulty: submission.problem?.difficulty,
    });

    return res.json({ success: true, data: report });
  } catch (error: any) {
    console.error("AI Analysis error:", error.message);
    return res.status(500).json({ error: `Failed to generate analysis: ${error.message}` });
  }
};

/**
 * DELETE /api/analytics/analysis/:submissionId
 * Force-invalidate a cached analysis (so it regenerates next time).
 */
export const invalidateAnalysis = async (req: Request, res: Response) => {
  const submissionId = req.params.submissionId as string;
  if (!submissionId) {
    return res.status(400).json({ error: "submissionId is required" });
  }
  try {
    const { redisConnection } = await import("../config/redis.js");
    await redisConnection.del(`analysis:${submissionId}`);
    return res.json({ success: true, message: "Cache invalidated" });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to invalidate cache" });
  }
};

/**
 * POST /api/analytics/analysis/custom
 * Generate AI analysis for arbitrary code/runtime context (no submission required).
 * Used by teacher grading flow when running student code on hidden test cases.
 */
export const generateCustomAnalysis = async (req: Request, res: Response) => {
  const {
    code,
    language,
    status,
    executionTimeMs,
    memoryKb,
    problemTitle,
    difficulty,
  } = req.body || {};

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "code is required" });
  }

  if (!language || typeof language !== "string") {
    return res.status(400).json({ error: "language is required" });
  }

  try {
    const report = await generateAIAnalysis({
      // Use a unique synthetic ID to avoid colliding with real submission cache keys.
      submissionId: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      code,
      language,
      status: typeof status === "string" ? status : "ACCEPTED",
      executionTimeMs: Number(executionTimeMs) || 0,
      memoryKb: Number(memoryKb) || 0,
      problemTitle: typeof problemTitle === "string" ? problemTitle : undefined,
      difficulty: typeof difficulty === "string" ? difficulty : undefined,
    });

    return res.json({ success: true, data: report });
  } catch (error: any) {
    console.error("Custom AI Analysis error:", error.message);
    return res.status(500).json({ error: `Failed to generate analysis: ${error.message}` });
  }
};
