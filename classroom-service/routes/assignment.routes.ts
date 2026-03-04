import express from "express";
import {
  createAssignment,
  createExam,
  createProblem,
  getClassroomAssignments,
  getClassroomExams,
  getAssignmentDetails,
  getExamDetails,
  submitAssignment,
  submitExam,
  getAssignmentSubmissions,
  getExamSubmissions,
  getProblems,
} from "../controller/assignment.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const assignmentRoutes = express.Router();

// Problem management
assignmentRoutes.post("/problem", authenticate, createProblem);
assignmentRoutes.get("/problems", authenticate, getProblems);

// Assignment management
assignmentRoutes.post(
  "/:classroomId/assignment",
  authenticate,
  createAssignment,
);
assignmentRoutes.get(
  "/:classroomId/assignments",
  authenticate,
  getClassroomAssignments,
);
assignmentRoutes.get(
  "/assignment/:assignmentId",
  authenticate,
  getAssignmentDetails,
);
assignmentRoutes.post(
  "/assignment/:assignmentId/submit",
  authenticate,
  submitAssignment,
);
assignmentRoutes.get(
  "/assignment/:assignmentId/submissions",
  authenticate,
  getAssignmentSubmissions,
);

// Exam management
assignmentRoutes.post(
  "/:classroomId/exam",
  authenticate,
  createExam,
);
assignmentRoutes.get("/:classroomId/exams", authenticate, getClassroomExams);
assignmentRoutes.get("/exam/:examId", authenticate, getExamDetails);
assignmentRoutes.post("/exam/:examId/submit", authenticate, submitExam);
assignmentRoutes.get(
  "/exam/:examId/submissions",
  authenticate,
  getExamSubmissions,
);

export default assignmentRoutes;
