import { Router } from "express";
import { createSubmission } from "../controllers/submission.controller";

const router = Router();

router.post("/", createSubmission);
export default router;
