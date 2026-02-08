import { Router } from "express";
import {
  getDashboard,
  getHeatmap,
  getTopics,
  getEfficiency,
  headToHead,
  skillGap,
  catchUp,
  problemStats,
  getRank,
} from "../controllers/stats.controllers.js";

const router = Router();

// ========================
// SELF-REFLECTION (Feature 1)
// ========================

// Full dashboard (heatmap + radar + efficiency + streaks)
router.get("/dashboard/:userId", getDashboard);

// Individual endpoints for lazy loading
router.get("/heatmap/:userId", getHeatmap);
router.get("/topics/:userId", getTopics);
router.get("/efficiency/:userId", getEfficiency);
router.get("/rank/:userId", getRank);

// ========================
// RIVALRY ENGINE (Feature 2)
// ========================

// Head-to-Head comparison (speed, memory, attempts)
router.post("/compare/head-to-head", headToHead);

// Skill gap analysis (side-by-side topic strengths)
router.post("/compare/skill-gap", skillGap);

// Catch-up list (problems rival solved but you haven't)
router.post("/compare/catch-up", catchUp);

// ========================
// PROBLEM ANALYTICS
// ========================

// Problem-specific stats (acceptance rate, avg time)
router.get("/problem/:problemId", problemStats);

export default router;
