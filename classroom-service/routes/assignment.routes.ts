import express from "express";
import {
  createAssignment,
  updateAssignmentDeadline,
  createExam,
  createProblem,
  getClassroomAssignments,
  getClassroomExams,
  getAssignmentDetails,
  getExamDetails,
  submitAssignment,
  submitExam,
  getMySubmission,
  getStudentSubmission,
  getAssignmentSubmissions,
  gradeAssignmentSubmission,
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
assignmentRoutes.patch(
  "/assignment/:assignmentId/deadline",
  authenticate,
  isTeacher,
  updateAssignmentDeadline,
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
  "/assignment/:assignmentId/student/:studentId/submission",
  authenticate,
  isTeacher,
  getStudentSubmission,
);
assignmentRoutes.get(
  "/assignment/:assignmentId/submissions",
  authenticate,
  isTeacher,
  getAssignmentSubmissions,
);
assignmentRoutes.patch(
  "/assignment/:assignmentId/submission/:submissionId/grade",
  authenticate,
  isTeacher,
  gradeAssignmentSubmission,
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
