import express from "express";
import {
  createClassroom,
  joinClassroom,
  getEnrolledStudents,
  getMyClassrooms,
  updateClassroom,
  deleteClassroom,
} from "../controller/classroom.controller.js";
import { authenticate, requireTeacher } from "../middleware/auth.middleware.js";

const classroomRoutes = express.Router();

// Create a new classroom (Teacher only)
classroomRoutes.post("/create", authenticate, requireTeacher, createClassroom);

// Join a classroom using code (Student only)
classroomRoutes.post("/join", authenticate, joinClassroom);

// Get user's classrooms (both teaching and enrolled)
classroomRoutes.get("/my-classrooms", authenticate, getMyClassrooms);

// Get enrolled students in a specific classroom (Teacher only)
classroomRoutes.get(
  "/:classroomId/students",
  authenticate,
  getEnrolledStudents,
);

// Update classroom details (Teacher only)
classroomRoutes.put(
  "/:classroomId",
  authenticate,
  requireTeacher,
  updateClassroom,
);

// Delete classroom (Teacher only)
classroomRoutes.delete(
  "/:classroomId",
  authenticate,
  requireTeacher,
  deleteClassroom,
);

export default classroomRoutes;
