import { ZodError } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { prisma } from "../libs/prisma.js";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  submitAssignmentSchema,
  createExamSchema,
  updateExamSchema,
  submitExamSchema,
  createProblemSchema,
  type CreateAssignmentInput,
  type UpdateAssignmentInput,
  type SubmitAssignmentInput,
  type CreateExamInput,
  type UpdateExamInput,
  type SubmitExamInput,
  type CreateProblemInput,
} from "../validators/assignment.validator.js";

// Helper to format Zod errors
function formatZodErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    errors[path] = issue.message;
  }
  return errors;
}

// Helper to verify classroom ownership
async function verifyClassroomTeacher(classroomId: string, teacherId: string) {
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });

  if (!classroom) {
    throw new ApiError(404, "Classroom not found");
  }

  if (classroom.teacherId !== teacherId) {
    throw new ApiError(
      403,
      "Access denied. Only the classroom teacher can perform this action",
    );
  }

  return classroom;
}

// Helper to verify student enrollment
async function verifyStudentEnrollment(classroomId: string, studentId: string) {
  const enrollment = await prisma.classroomEnrollment.findUnique({
    where: {
      classroomId_studentId: {
        classroomId,
        studentId,
      },
    },
  });

  if (!enrollment) {
    throw new ApiError(
      403,
      "Access denied. You must be enrolled in this classroom",
    );
  }

  return enrollment;
}

/**
 * @route   POST /api/classroom/:classroomId/assignment
 * @desc    Create a new assignment for a classroom
 * @access  Private (Teacher of the classroom)
 */
export const createAssignment = asyncHandler(async (req, res) => {
  try {
    const { classroomId } = req.params;
    const validatedData: CreateAssignmentInput = createAssignmentSchema.parse(
      req.body,
    );

    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    // Verify teacher owns this classroom
    await verifyClassroomTeacher(classroomId, req.user.userId);

    // Verify all problems exist
    const problemIds = validatedData.problems.map((p) => p.problemId);
    const existingProblems = await prisma.problem.findMany({
      where: { id: { in: problemIds } },
      select: { id: true },
    });

    if (existingProblems.length !== problemIds.length) {
      throw new ApiError(400, "One or more problems not found");
    }

    // Check for duplicate orders
    const orders = validatedData.problems.map((p) => p.order);
    if (new Set(orders).size !== orders.length) {
      throw new ApiError(400, "Problem orders must be unique");
    }

    // Create assignment with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create assignment
      const assignment = await tx.assignment.create({
        data: {
          title: validatedData.title,
          subtitle: validatedData.subtitle,
          description: validatedData.description,
          deadline: validatedData.deadline,
          classroomId,
        },
      });

      // Add problems to assignment
      await tx.assignmentProblem.createMany({
        data: validatedData.problems.map((p) => ({
          assignmentId: assignment.id,
          problemId: p.problemId,
          order: p.order,
        })),
      });

      // Return assignment with problems
      return await tx.assignment.findUnique({
        where: { id: assignment.id },
        include: {
          problems: {
            include: {
              problem: {
                select: {
                  id: true,
                  title: true,
                  difficulty: true,
                  tags: true,
                },
              },
            },
            orderBy: { order: "asc" },
          },
          classroom: {
            select: {
              id: true,
              name: true,
              teacher: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              submissions: true,
            },
          },
        },
      });
    });

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { assignment: result },
          "Assignment created successfully",
        ),
      );
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = formatZodErrors(error);
      throw new ApiError(
        400,
        "Validation failed",
        Object.values(formattedErrors),
      );
    }
    throw error;
  }
});

/**
 * @route   POST /api/classroom/:classroomId/exam
 * @desc    Create a new exam for a classroom
 * @access  Private (Teacher of the classroom)
 */
export const createExam = asyncHandler(async (req, res) => {
  try {
    const { classroomId } = req.params;
    const validatedData: CreateExamInput = createExamSchema.parse(req.body);

    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    // Verify teacher owns this classroom
    await verifyClassroomTeacher(classroomId, req.user.userId);

    // Verify all problems exist
    const problemIds = validatedData.problems.map((p) => p.problemId);
    const existingProblems = await prisma.problem.findMany({
      where: { id: { in: problemIds } },
      select: { id: true },
    });

    if (existingProblems.length !== problemIds.length) {
      throw new ApiError(400, "One or more problems not found");
    }

    // Check for duplicate orders
    const orders = validatedData.problems.map((p) => p.order);
    if (new Set(orders).size !== orders.length) {
      throw new ApiError(400, "Problem orders must be unique");
    }

    // Create exam with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create exam
      const exam = await tx.exam.create({
        data: {
          title: validatedData.title,
          subtitle: validatedData.subtitle,
          description: validatedData.description,
          deadline: validatedData.deadline,
          duration: validatedData.duration,
          classroomId,
        },
      });

      // Add problems to exam
      await tx.examProblem.createMany({
        data: validatedData.problems.map((p) => ({
          examId: exam.id,
          problemId: p.problemId,
          order: p.order,
        })),
      });

      // Return exam with problems
      return await tx.exam.findUnique({
        where: { id: exam.id },
        include: {
          problems: {
            include: {
              problem: {
                select: {
                  id: true,
                  title: true,
                  difficulty: true,
                  tags: true,
                },
              },
            },
            orderBy: { order: "asc" },
          },
          classroom: {
            select: {
              id: true,
              name: true,
              teacher: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              submissions: true,
            },
          },
        },
      });
    });

    res
      .status(201)
      .json(
        new ApiResponse(201, { exam: result }, "Exam created successfully"),
      );
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = formatZodErrors(error);
      throw new ApiError(
        400,
        "Validation failed",
        Object.values(formattedErrors),
      );
    }
    throw error;
  }
});

/**
 * @route   POST /api/classroom/problem
 * @desc    Create a new problem and add it to the global problem database
 * @access  Private (Teachers only)
 */
export const createProblem = asyncHandler(async (req, res) => {
  try {
    const validatedData: CreateProblemInput = createProblemSchema.parse(
      req.body,
    );

    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    if (req.user.role !== "TEACHER" && req.user.role !== "ADMIN") {
      throw new ApiError(403, "Only teachers can create problems");
    }

    const problem = await prisma.problem.create({
      data: {
        title: validatedData.title,
        difficulty: validatedData.difficulty,
        statement: validatedData.statement,
        examples: validatedData.examples,
        constraints: validatedData.constraints,
        tags: validatedData.tags,
        hints: validatedData.hints,
        companies: validatedData.companies,
        testcases: validatedData.testcases,
      },
    });

    res
      .status(201)
      .json(new ApiResponse(201, { problem }, "Problem created successfully"));
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = formatZodErrors(error);
      throw new ApiError(
        400,
        "Validation failed",
        Object.values(formattedErrors),
      );
    }
    throw error;
  }
});

/**
 * @route   GET /api/classroom/:classroomId/assignments
 * @desc    Get all assignments for a classroom
 * @access  Private (Teacher or enrolled students)
 */
export const getClassroomAssignments = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  // Verify access (teacher or enrolled student)
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });

  if (!classroom) {
    throw new ApiError(404, "Classroom not found");
  }

  const isTeacher = classroom.teacherId === req.user.userId;

  if (!isTeacher) {
    await verifyStudentEnrollment(classroomId, req.user.userId);
  }

  const assignments = await prisma.assignment.findMany({
    where: { classroomId },
    include: {
      problems: {
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              tags: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
      _count: {
        select: {
          submissions: true,
        },
      },
      submissions: isTeacher
        ? false
        : {
            where: { studentId: req.user.userId },
            select: {
              id: true,
              submittedAt: true,
            },
          },
    },
    orderBy: { createdAt: "desc" },
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { assignments },
        "Assignments retrieved successfully",
      ),
    );
});

/**
 * @route   GET /api/classroom/:classroomId/exams
 * @desc    Get all exams for a classroom
 * @access  Private (Teacher or enrolled students)
 */
export const getClassroomExams = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  // Verify access (teacher or enrolled student)
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });

  if (!classroom) {
    throw new ApiError(404, "Classroom not found");
  }

  const isTeacher = classroom.teacherId === req.user.userId;

  if (!isTeacher) {
    await verifyStudentEnrollment(classroomId, req.user.userId);
  }

  const exams = await prisma.exam.findMany({
    where: { classroomId },
    include: {
      problems: {
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              tags: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
      _count: {
        select: {
          submissions: true,
        },
      },
      submissions: isTeacher
        ? false
        : {
            where: { studentId: req.user.userId },
            select: {
              id: true,
              submittedAt: true,
            },
          },
    },
    orderBy: { createdAt: "desc" },
  });

  res
    .status(200)
    .json(new ApiResponse(200, { exams }, "Exams retrieved successfully"));
});

/**
 * @route   GET /api/classroom/assignment/:assignmentId
 * @desc    Get assignment details with problems
 * @access  Private (Teacher or enrolled students)
 */
export const getAssignmentDetails = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      classroom: {
        select: {
          id: true,
          name: true,
          teacherId: true,
        },
      },
      problems: {
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              statement: true,
              tags: true,
              examples: true,
              constraints: true,
              companies: true,
              hints: true,
              // testcases excluded for security
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  const isTeacher = assignment.classroom.teacherId === req.user.userId;

  if (!isTeacher) {
    await verifyStudentEnrollment(assignment.classroom.id, req.user.userId);
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { assignment },
        "Assignment details retrieved successfully",
      ),
    );
});

/**
 * @route   GET /api/classroom/exam/:examId
 * @desc    Get exam details with problems
 * @access  Private (Teacher or enrolled students)
 */
export const getExamDetails = asyncHandler(async (req, res) => {
  const { examId } = req.params;

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      classroom: {
        select: {
          id: true,
          name: true,
          teacherId: true,
        },
      },
      problems: {
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              statement: true,
              tags: true,
              examples: true,
              constraints: true,
              companies: true,
              hints: true,
              // testcases excluded for security
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!exam) {
    throw new ApiError(404, "Exam not found");
  }

  const isTeacher = exam.classroom.teacherId === req.user.userId;

  if (!isTeacher) {
    await verifyStudentEnrollment(exam.classroom.id, req.user.userId);
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, { exam }, "Exam details retrieved successfully"),
    );
});

/**
 * @route   POST /api/classroom/assignment/:assignmentId/submit
 * @desc    Submit solutions for an assignment
 * @access  Private (Enrolled students only)
 */
export const submitAssignment = asyncHandler(async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const validatedData: SubmitAssignmentInput = submitAssignmentSchema.parse(
      req.body,
    );

    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    // Get assignment with classroom info
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        classroom: { select: { id: true } },
        problems: { select: { problemId: true } },
      },
    });

    if (!assignment) {
      throw new ApiError(404, "Assignment not found");
    }

    // Verify student enrollment
    await verifyStudentEnrollment(assignment.classroom.id, req.user.userId);

    // Check deadline
    if (new Date() > assignment.deadline) {
      throw new ApiError(400, "Assignment deadline has passed");
    }

    // Verify all required problems have solutions
    const assignmentProblemIds = assignment.problems.map((p) => p.problemId);
    const submittedProblemIds = Object.keys(validatedData.solutions);

    const missingProblems = assignmentProblemIds.filter(
      (id) => !submittedProblemIds.includes(id),
    );
    if (missingProblems.length > 0) {
      throw new ApiError(400, "Solutions required for all assignment problems");
    }

    // Check for extra problems not in assignment
    const extraProblems = submittedProblemIds.filter(
      (id) => !assignmentProblemIds.includes(id),
    );
    if (extraProblems.length > 0) {
      throw new ApiError(
        400,
        "Solutions contain problems not in this assignment",
      );
    }

    // Create or update submission
    const submission = await prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: req.user.userId,
        },
      },
      create: {
        assignmentId,
        studentId: req.user.userId,
        solutions: validatedData.solutions,
      },
      update: {
        solutions: validatedData.solutions,
        updatedAt: new Date(),
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            deadline: true,
          },
        },
      },
    });

    // Delete all drafts for this assignment after successful submission
    await prisma.assignmentDraft.deleteMany({
      where: {
        assignmentId,
        studentId: req.user.userId,
      },
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { submission },
          "Assignment submitted successfully",
        ),
      );
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = formatZodErrors(error);
      throw new ApiError(
        400,
        "Validation failed",
        Object.values(formattedErrors),
      );
    }
    throw error;
  }
});

/**
 * @route   POST /api/classroom/exam/:examId/submit
 * @desc    Submit solutions for an exam
 * @access  Private (Enrolled students only)
 */
export const submitExam = asyncHandler(async (req, res) => {
  try {
    const { examId } = req.params;
    const validatedData: SubmitExamInput = submitExamSchema.parse(req.body);

    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    // Get exam with classroom info
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        classroom: { select: { id: true } },
        problems: { select: { problemId: true } },
      },
    });

    if (!exam) {
      throw new ApiError(404, "Exam not found");
    }

    // Verify student enrollment
    await verifyStudentEnrollment(exam.classroom.id, req.user.userId);

    // Check deadline
    if (new Date() > exam.deadline) {
      throw new ApiError(400, "Exam deadline has passed");
    }

    // Verify all required problems have solutions
    const examProblemIds = exam.problems.map((p) => p.problemId);
    const submittedProblemIds = Object.keys(validatedData.solutions);

    const missingProblems = examProblemIds.filter(
      (id) => !submittedProblemIds.includes(id),
    );
    if (missingProblems.length > 0) {
      throw new ApiError(400, "Solutions required for all exam problems");
    }

    // Check for extra problems not in exam
    const extraProblems = submittedProblemIds.filter(
      (id) => !examProblemIds.includes(id),
    );
    if (extraProblems.length > 0) {
      throw new ApiError(400, "Solutions contain problems not in this exam");
    }

    // Create or update submission
    const submission = await prisma.examSubmission.upsert({
      where: {
        examId_studentId: {
          examId,
          studentId: req.user.userId,
        },
      },
      create: {
        examId,
        studentId: req.user.userId,
        solutions: validatedData.solutions,
      },
      update: {
        solutions: validatedData.solutions,
        updatedAt: new Date(),
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            deadline: true,
          },
        },
      },
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, { submission }, "Exam submitted successfully"),
      );
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = formatZodErrors(error);
      throw new ApiError(
        400,
        "Validation failed",
        Object.values(formattedErrors),
      );
    }
    throw error;
  }
});

/**
 * @route   GET /api/classroom/assignment/:assignmentId/my-submission
 * @desc    Get current user's submission for an assignment
 * @access  Private (Student enrolled in classroom)
 */
export const getMySubmission = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  // Get assignment with classroom info
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      classroom: { select: { id: true, teacherId: true } },
    },
  });

  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  const isTeacher = assignment.classroom.teacherId === req.user.userId;

  // Verify student enrollment (skip for teachers)
  if (!isTeacher) {
    await verifyStudentEnrollment(assignment.classroom.id, req.user.userId);
  }

  // Get submission
  const submission = await prisma.assignmentSubmission.findUnique({
    where: {
      assignmentId_studentId: {
        assignmentId,
        studentId: req.user.userId,
      },
    },
  });

  if (!submission) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, null, "No submission found for this assignment"),
      );
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, { submission }, "Submission retrieved successfully"),
    );
});

/**
 * @route   GET /api/classroom/assignment/:assignmentId/submissions
 * @desc    Get all submissions for an assignment (Teacher only)
 * @access  Private (Teacher of the classroom)
 */
export const getAssignmentSubmissions = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  // Get assignment and verify teacher
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      classroom: { select: { id: true, teacherId: true } },
    },
  });

  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  if (assignment.classroom.teacherId !== req.user.userId) {
    throw new ApiError(
      403,
      "Access denied. Only the teacher can view submissions",
    );
  }

  // Get all submissions
  const submissions = await prisma.assignmentSubmission.findMany({
    where: { assignmentId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          deadline: assignment.deadline,
        },
        submissions,
      },
      "Assignment submissions retrieved successfully",
    ),
  );
});

/**
 * @route   GET /api/classroom/exam/:examId/submissions
 * @desc    Get all submissions for an exam (Teacher only)
 * @access  Private (Teacher of the classroom)
 */
export const getExamSubmissions = asyncHandler(async (req, res) => {
  const { examId } = req.params;

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  // Get exam and verify teacher
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      classroom: { select: { id: true, teacherId: true } },
    },
  });

  if (!exam) {
    throw new ApiError(404, "Exam not found");
  }

  if (exam.classroom.teacherId !== req.user.userId) {
    throw new ApiError(
      403,
      "Access denied. Only the teacher can view submissions",
    );
  }

  // Get all submissions
  const submissions = await prisma.examSubmission.findMany({
    where: { examId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        exam: {
          id: exam.id,
          title: exam.title,
          deadline: exam.deadline,
        },
        submissions,
      },
      "Exam submissions retrieved successfully",
    ),
  );
});

/**
 * @route   POST /api/classroom/assignment/:assignmentId/draft
 * @desc    Save/update a draft for an assignment problem
 * @access  Private (Enrolled students only)
 */
export const saveDraft = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { problemId, code, languageId } = req.body;

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  if (!problemId || !code || !languageId) {
    throw new ApiError(400, "Problem ID, code, and language ID are required");
  }

  // Get assignment with classroom info
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      classroom: { select: { id: true, teacherId: true } },
    },
  });

  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  const isTeacher = assignment.classroom.teacherId === req.user.userId;

  // Verify student enrollment (skip for teachers)
  if (!isTeacher) {
    await verifyStudentEnrollment(assignment.classroom.id, req.user.userId);
  }

  // Check if problem is part of the assignment
  const assignmentProblem = await prisma.assignmentProblem.findFirst({
    where: {
      assignmentId,
      problemId,
    },
  });

  if (!assignmentProblem) {
    throw new ApiError(400, "Problem not part of this assignment");
  }

  // Upsert draft
  const draft = await prisma.assignmentDraft.upsert({
    where: {
      assignmentId_studentId_problemId: {
        assignmentId,
        studentId: req.user.userId,
        problemId,
      },
    },
    create: {
      assignmentId,
      studentId: req.user.userId,
      problemId,
      code,
      languageId,
    },
    update: {
      code,
      languageId,
      updatedAt: new Date(),
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, { draft }, "Draft saved successfully"));
});

/**
 * @route   GET /api/classroom/assignment/:assignmentId/problem/:problemId/draft
 * @desc    Get draft for a specific problem in an assignment
 * @access  Private (Enrolled students only)
 */
export const getDraft = asyncHandler(async (req, res) => {
  const { assignmentId, problemId } = req.params;

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  // Get assignment with classroom info
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      classroom: { select: { id: true, teacherId: true } },
    },
  });

  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  const isTeacher = assignment.classroom.teacherId === req.user.userId;

  // Verify student enrollment (skip for teachers)
  if (!isTeacher) {
    await verifyStudentEnrollment(assignment.classroom.id, req.user.userId);
  }

  // Get draft
  const draft = await prisma.assignmentDraft.findUnique({
    where: {
      assignmentId_studentId_problemId: {
        assignmentId,
        studentId: req.user.userId,
        problemId,
      },
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { draft },
        draft ? "Draft retrieved successfully" : "No draft found",
      ),
    );
});

/**
 * @route   GET /api/classroom/assignment/:assignmentId/drafts
 * @desc    Get all drafts for an assignment
 * @access  Private (Enrolled students only)
 */
export const getAssignmentDrafts = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  // Get assignment with classroom info
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      classroom: { select: { id: true, teacherId: true } },
    },
  });

  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  const isTeacher = assignment.classroom.teacherId === req.user.userId;

  // Verify student enrollment (skip for teachers)
  if (!isTeacher) {
    await verifyStudentEnrollment(assignment.classroom.id, req.user.userId);
  }

  // Get all drafts for this assignment
  const drafts = await prisma.assignmentDraft.findMany({
    where: {
      assignmentId,
      studentId: req.user.userId,
    },
    orderBy: { updatedAt: "desc" },
  });

  res
    .status(200)
    .json(new ApiResponse(200, { drafts }, "Drafts retrieved successfully"));
});

/**
 * @route   DELETE /api/classroom/assignment/:assignmentId/drafts
 * @desc    Delete all drafts for an assignment (called after submission)
 * @access  Private (Enrolled students only)
 */
export const deleteAssignmentDrafts = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  // Get assignment with classroom info
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      classroom: { select: { id: true, teacherId: true } },
    },
  });

  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  const isTeacher = assignment.classroom.teacherId === req.user.userId;

  // Verify student enrollment (skip for teachers)
  if (!isTeacher) {
    await verifyStudentEnrollment(assignment.classroom.id, req.user.userId);
  }

  // Delete all drafts for this assignment
  await prisma.assignmentDraft.deleteMany({
    where: {
      assignmentId,
      studentId: req.user.userId,
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Drafts deleted successfully"));
});

/**
 * @route   GET /api/classroom/problems
 * @desc    Get all available problems for adding to assignments/exams
 * @access  Private (Teacher only)
 */
export const getProblems = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  if (req.user.role !== "TEACHER" && req.user.role !== "ADMIN") {
    throw new ApiError(403, "Only teachers can access problems");
  }

  const { page = "1", limit = "20", search, difficulty, tags } = req.query;
  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  const skip = (pageNum - 1) * limitNum;

  // Build where clause
  const where: any = {};

  if (search) {
    where.OR = [
      { title: { contains: search as string, mode: "insensitive" } },
      { statement: { contains: search as string, mode: "insensitive" } },
    ];
  }

  if (difficulty && ["EASY", "MEDIUM", "HARD"].includes(difficulty as string)) {
    where.difficulty = difficulty;
  }

  if (tags && typeof tags === "string") {
    const tagArray = (tags as string).split(",").map((tag) => tag.trim());
    where.tags = { hasSome: tagArray };
  }

  const [problems, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      select: {
        id: true,
        title: true,
        difficulty: true,
        tags: true,
        companies: true,
        createdAt: true,
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
    }),
    prisma.problem.count({ where }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        problems,
        pagination: {
          current: pageNum,
          total: Math.ceil(total / limitNum),
          count: problems.length,
          totalItems: total,
        },
      },
      "Problems retrieved successfully",
    ),
  );
});
