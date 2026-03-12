import type { Request, Response } from "express";
import {
  getSelfReflectionDashboard,
  getActivityHeatmap,
  getTopicStrengths,
  getEfficiencyMetrics,
  getHeadToHead,
  getSkillGap,
  getCatchUpList,
  getGlobalRank,
  getProblemStats,
} from "../services/stats.services.js";

// ================================================================
// FEATURE 1: SELF-REFLECTION DASHBOARD
// ================================================================

/**
 * GET /api/analytics/dashboard/:userId
 * Full self-reflection dashboard
 */
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const dashboard = await getSelfReflectionDashboard(userId);
    
    // Return empty state for new users instead of 404
    if (!dashboard) {
      return res.json({
        success: true,
        data: {
          overview: {
            totalSolved: 0,
            totalAttempted: 0,
            successRate: 0,
            easySolved: 0,
            mediumSolved: 0,
            hardSolved: 0,
          },
          streaks: {
            current: 0,
            max: 0,
            lastActive: null,
          },
          activityHeatmap: {},
          topicStrengths: [],
          efficiencyStats: {},
          languageStats: {},
          globalRank: null,
        },
      });
    }

    const rank = await getGlobalRank(userId);

    return res.json({
      success: true,
      data: { ...dashboard, globalRank: rank },
    });
  } catch (error: any) {
    console.error("Dashboard error:", error.message);
    return res.status(500).json({ error: "Failed to fetch dashboard" });
  }
};

/**
 * GET /api/analytics/heatmap/:userId
 * Activity heatmap for the past year
 */
export const getHeatmap = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const heatmap = await getActivityHeatmap(userId);
    return res.json({ success: true, data: heatmap });
  } catch (error: any) {
    console.error("Heatmap error:", error.message);
    return res.status(500).json({ error: "Failed to fetch heatmap" });
  }
};

/**
 * GET /api/analytics/topics/:userId
 * Radar chart topic strength data
 */
export const getTopics = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const topics = await getTopicStrengths(userId);
    return res.json({ success: true, data: topics });
  } catch (error: any) {
    console.error("Topics error:", error.message);
    return res.status(500).json({ error: "Failed to fetch topic strengths" });
  }
};

/**
 * GET /api/analytics/efficiency/:userId?language=python
 * Efficiency metrics + percentile ranking
 */
export const getEfficiency = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const language = req.query.language as string | undefined;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const metrics = await getEfficiencyMetrics(userId, language);
    return res.json({ success: true, data: metrics });
  } catch (error: any) {
    console.error("Efficiency error:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to fetch efficiency metrics" });
  }
};

// ================================================================
// FEATURE 2: RIVALRY ENGINE
// ================================================================

/**
 * POST /api/analytics/compare/head-to-head
 * Body: { userAId, userBId }
 */
export const headToHead = async (req: Request, res: Response) => {
  try {
    const { userAId, userBId } = req.body;
    if (!userAId || !userBId) {
      return res
        .status(400)
        .json({ error: "Both userAId and userBId are required" });
    }
    if (userAId === userBId) {
      return res
        .status(400)
        .json({ error: "Cannot compare a user with themselves" });
    }

    const result = await getHeadToHead(userAId, userBId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Head-to-head error:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to generate head-to-head comparison" });
  }
};

/**
 * POST /api/analytics/compare/skill-gap
 * Body: { userAId, userBId }
 */
export const skillGap = async (req: Request, res: Response) => {
  try {
    const { userAId, userBId } = req.body;
    if (!userAId || !userBId) {
      return res
        .status(400)
        .json({ error: "Both userAId and userBId are required" });
    }

    const result = await getSkillGap(userAId, userBId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Skill gap error:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to generate skill gap analysis" });
  }
};

/**
 * POST /api/analytics/compare/catch-up
 * Body: { userAId, userBId }
 * Returns problems userB solved but userA hasn't attempted
 */
export const catchUp = async (req: Request, res: Response) => {
  try {
    const { userAId, userBId } = req.body;
    if (!userAId || !userBId) {
      return res
        .status(400)
        .json({ error: "Both userAId and userBId are required" });
    }

    const result = await getCatchUpList(userAId, userBId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Catch-up error:", error.message);
    return res.status(500).json({ error: "Failed to generate catch-up list" });
  }
};

/**
 * GET /api/analytics/problem/:problemId
 * Problem-specific analytics (acceptance rate, avg time, etc.)
 */
export const problemStats = async (req: Request, res: Response) => {
  try {
    const problemId = req.params.problemId as string;
    if (!problemId)
      return res.status(400).json({ error: "problemId is required" });

    const stats = await getProblemStats(problemId);
    if (!stats) {
      return res
        .status(404)
        .json({ error: "No analytics found for this problem" });
    }

    return res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error("Problem stats error:", error.message);
    return res.status(500).json({ error: "Failed to fetch problem stats" });
  }
};

/**
 * GET /api/analytics/rank/:userId
 * Global rank + percentile
 */
export const getRank = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const rank = await getGlobalRank(userId);
    return res.json({ success: true, data: rank });
  } catch (error: any) {
    console.error("Rank error:", error.message);
    return res.status(500).json({ error: "Failed to fetch rank" });
  }
};
