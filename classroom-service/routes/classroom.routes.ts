import express from "express";
import {
  createClassroom,
  joinClassroom,
  getEnrolledStudents,
  getMyClassrooms,
  getClassroomById,
  updateClassroom,
  deleteClassroom,
} from "../controller/classroom.controller.js";
import { authenticate, isTeacher } from "../middleware/auth.middleware.js";

const classroomRoutes = express.Router();

// Create a new classroom (Teacher only)
classroomRoutes.post("/create", authenticate, isTeacher, createClassroom);

// Join a classroom using code (Student only)
classroomRoutes.post("/join", authenticate, joinClassroom);

// Get user's classrooms (both teaching and enrolled)
classroomRoutes.get("/my-classrooms", authenticate, getMyClassrooms);

// Get enrolled students in a specific classroom (All enrolled users)
// This must come BEFORE /:classroomId to avoid route conflicts
classroomRoutes.get(
  "/:classroomId/students",
  authenticate,
  getEnrolledStudents,
);

// Get classroom details by ID
classroomRoutes.get("/:classroomId", authenticate, getClassroomById);

// Update classroom details (Teacher only)
classroomRoutes.put(
  "/:classroomId",
  authenticate,
  isTeacher,
  updateClassroom,
);

// Delete classroom (Teacher only)
classroomRoutes.delete(
  "/:classroomId",
  authenticate,
  isTeacher,
  deleteClassroom,
);

export default classroomRoutes;
