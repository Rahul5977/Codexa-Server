import { Router } from "express";
import {
  addProblem,
  updateProblem,
  getProblems,
  getProblemById,
  getProblemTestCases,
  deleteProblem,
  getProblemStats,
} from "../controller/problem.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.get("/", getProblems);
router.get("/stats", getProblemStats);
router.get("/:id", getProblemById);

// Protected routes (teacher only)
router.get(
  "/:id/testcases",
  authenticate,
  authorize("ADMIN", "TEACHER"),
  getProblemTestCases,
);

// Protected routes (admin/teacher only)
router.post("/", authenticate, authorize("ADMIN", "TEACHER"), addProblem);
router.put("/:id", authenticate, authorize("ADMIN", "TEACHER"), updateProblem);
router.delete("/:id", authenticate, authorize("ADMIN", "TEACHER"), deleteProblem);

export default router;
