import { Router } from "express";
import {
  addProblem,
  updateProblem,
  getProblems,
  getProblemById,
  deleteProblem,
} from "../controller/problem.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.get("/", getProblems);
router.get("/:id", getProblemById);

// Protected routes (admin/teacher only)
router.post("/", authenticate, authorize("ADMIN", "TEACHER"), addProblem);
router.put("/:id", authenticate, authorize("ADMIN", "TEACHER"), updateProblem);
router.delete("/:id", authenticate, authorize("ADMIN", "TEACHER"), deleteProblem);

export default router;
