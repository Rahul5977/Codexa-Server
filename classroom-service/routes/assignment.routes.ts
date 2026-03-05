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
  getMySubmission,
  getAssignmentSubmissions,
  getExamSubmissions,
  getProblems,
  saveDraft,
  getDraft,
  getAssignmentDrafts,
  deleteAssignmentDrafts,
} from "../controller/assignment.controller.js";
import { authenticate, isTeacher } from "../middleware/auth.middleware.js";

const assignmentRoutes = express.Router();

// Problem management
assignmentRoutes.post("/problem", authenticate, isTeacher, createProblem);
assignmentRoutes.get("/problems", authenticate, getProblems);

// Assignment management
assignmentRoutes.post(
  "/:classroomId/assignment",
  authenticate,
  isTeacher,
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
  "/assignment/:assignmentId/my-submission",
  authenticate,
  getMySubmission,
);
assignmentRoutes.get(
  "/assignment/:assignmentId/submissions",
  authenticate,
  isTeacher,
  getAssignmentSubmissions,
);

// Assignment draft management
assignmentRoutes.post(
  "/assignment/:assignmentId/draft",
  authenticate,
  saveDraft,
);
assignmentRoutes.get(
  "/assignment/:assignmentId/problem/:problemId/draft",
  authenticate,
  getDraft,
);
assignmentRoutes.get(
  "/assignment/:assignmentId/drafts",
  authenticate,
  getAssignmentDrafts,
);
assignmentRoutes.delete(
  "/assignment/:assignmentId/drafts",
  authenticate,
  deleteAssignmentDrafts,
);

// Exam management
assignmentRoutes.post(
  "/:classroomId/exam",
  authenticate,
  isTeacher,
  createExam,
);
assignmentRoutes.get("/:classroomId/exams", authenticate, getClassroomExams);
assignmentRoutes.get("/exam/:examId", authenticate, getExamDetails);
assignmentRoutes.post("/exam/:examId/submit", authenticate, submitExam);
assignmentRoutes.get(
  "/exam/:examId/submissions",
  authenticate,
  isTeacher,
  getExamSubmissions,
);

export default assignmentRoutes;
