import { Router } from "express";
import {
  createSubmission,
  getAllSubmissions,
  getSubmissionById,
  runCode,
} from "../controllers/submission.controller";

const router = Router();

// Order matters
router.post("/run", runCode); // POST /submissions/run (Dry Run)
router.post("/", createSubmission); // POST /submissions (Queue)
router.get("/", getAllSubmissions); // GET /submissions (History)
router.get("/:id", getSubmissionById); // GET /submissions/:id (Poll)
export default router;
