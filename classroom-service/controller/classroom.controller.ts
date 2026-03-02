import { ZodError } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { prisma } from "../libs/prisma.js";
import {
  sendEmailNotification,
  type NotificationPayload,
} from "../libs/kafka.js";
import {
  createClassroomSchema,
  joinClassroomSchema,
  updateClassroomSchema,
  type CreateClassroomInput,
  type JoinClassroomInput,
  type UpdateClassroomInput,
} from "../validators/classroom.validator.js";
import { generateClassroomCode } from "../utils/classroom.js";

// Helper to format Zod errors
function formatZodErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    errors[path] = issue.message;
  }
  return errors;
}

/**
 * @route   POST /api/classroom/create
 * @desc    Create a new classroom (Teacher only)
 * @access  Private (Teacher/Admin)
 */
export const createClassroom = asyncHandler(async (req, res) => {
  try {
    // Validate input
    const validatedData: CreateClassroomInput = createClassroomSchema.parse(
      req.body,
    );

    // Check if user is authenticated
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    // Generate unique classroom code
    let code: string;
    let isCodeUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isCodeUnique && attempts < maxAttempts) {
      code = generateClassroomCode();

      // Check if code already exists
      const existingClassroom = await prisma.classroom.findUnique({
        where: { code },
      });

      if (!existingClassroom) {
        isCodeUnique = true;
      }
      attempts++;
    }

    if (!isCodeUnique) {
      throw new ApiError(500, "Failed to generate unique classroom code");
    }

    // Update user role to TEACHER if not already
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { role: "TEACHER" },
    });

    // Create classroom
    const classroom = await prisma.classroom.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        imageUrl: validatedData.imageUrl,
        code: code!,
        teacherId: req.user.userId,
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    // Send email with classroom code
    const emailNotification: NotificationPayload = {
      to: req.user.email,
      subject: `Classroom Created: ${classroom.name}`,
      html: `
        <h2>Classroom Created Successfully!</h2>
        <p>Hello ${classroom.teacher.name},</p>
        <p>Your classroom <strong>${classroom.name}</strong> has been created successfully.</p>
        <p><strong>Classroom Code:</strong> <code style="background-color: #f4f4f4; padding: 4px 8px; border-radius: 4px; font-size: 16px; font-weight: bold;">${classroom.code}</code></p>
        <p>Share this code with your students so they can join the classroom.</p>
        <br>
        <p>Best regards,<br>Codexa Team</p>
      `,
      type: "classroom_created",
    };

    // Send notification via Kafka (non-blocking)
    sendEmailNotification(emailNotification).catch((error) => {
      console.error("Failed to send classroom creation email:", error);
    });

    res.status(201).json(
      new ApiResponse(
        201,
        {
          classroom: {
            id: classroom.id,
            name: classroom.name,
            description: classroom.description,
            code: classroom.code,
            imageUrl: classroom.imageUrl,
            teacher: classroom.teacher,
            studentCount: classroom._count.enrollments,
            createdAt: classroom.createdAt,
            updatedAt: classroom.updatedAt,
          },
        },
        "Classroom created successfully",
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
 * @route   POST /api/classroom/join
 * @desc    Join a classroom using code (Student only)
 * @access  Private (Student/Admin)
 */
export const joinClassroom = asyncHandler(async (req, res) => {
  try {
    // Validate input
    const validatedData: JoinClassroomInput = joinClassroomSchema.parse(
      req.body,
    );

    // Check if user is authenticated
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    // Find classroom by code
    const classroom = await prisma.classroom.findUnique({
      where: { code: validatedData.code },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new ApiError(404, "Invalid classroom code");
    }

    // Check if user is the teacher of this classroom
    if (classroom.teacherId === req.user.userId) {
      throw new ApiError(400, "Teachers cannot join their own classroom");
    }

    // Check if user is already enrolled
    const existingEnrollment = await prisma.classroomEnrollment.findUnique({
      where: {
        classroomId_studentId: {
          classroomId: classroom.id,
          studentId: req.user.userId,
        },
      },
    });

    if (existingEnrollment) {
      throw new ApiError(400, "You are already enrolled in this classroom");
    }

    // Update user role to STUDENT if not already
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { role: "STUDENT" },
    });

    // Create enrollment
    const enrollment = await prisma.classroomEnrollment.create({
      data: {
        classroomId: classroom.id,
        studentId: req.user.userId,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send confirmation email to student
    const emailNotification: NotificationPayload = {
      to: req.user.email,
      subject: `Successfully Joined: ${classroom.name}`,
      html: `
        <h2>Welcome to ${classroom.name}!</h2>
        <p>Hello ${enrollment.student.name},</p>
        <p>You have successfully joined the classroom <strong>${classroom.name}</strong>.</p>
        <p><strong>Teacher:</strong> ${classroom.teacher.name}</p>
        <p>You can now access all the resources and assignments for this classroom.</p>
        <br>
        <p>Best regards,<br>Codexa Team</p>
      `,
      type: "classroom_joined",
    };

    // Send notification via Kafka (non-blocking)
    sendEmailNotification(emailNotification).catch((error) => {
      console.error("Failed to send classroom join email:", error);
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          classroom: {
            id: classroom.id,
            name: classroom.name,
            description: classroom.description,
            teacher: classroom.teacher,
            joinedAt: enrollment.joinedAt,
          },
        },
        "Successfully joined classroom",
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
 * @route   GET /api/classroom/:classroomId/students
 * @desc    Get all enrolled students in a classroom
 * @access  Private (Teacher of the classroom)
 */
export const getEnrolledStudents = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  // Find classroom and verify teacher
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!classroom) {
    throw new ApiError(404, "Classroom not found");
  }

  // Check if user is the teacher of this classroom or admin
  if (classroom.teacherId !== req.user.userId && req.user.role !== "ADMIN") {
    throw new ApiError(
      403,
      "Access denied. Only the teacher can view enrolled students",
    );
  }

  // Get all enrolled students
  const enrollments = await prisma.classroomEnrollment.findMany({
    where: { classroomId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          currentRating: true,
          totalSolved: true,
          easyCount: true,
          mediumCount: true,
          hardCount: true,
        },
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        classroom: {
          id: classroom.id,
          name: classroom.name,
          teacher: classroom.teacher,
        },
        students: enrollments.map((enrollment) => ({
          ...enrollment.student,
          joinedAt: enrollment.joinedAt,
        })),
        totalStudents: enrollments.length,
      },
      "Students retrieved successfully",
    ),
  );
});

/**
 * @route   GET /api/classroom/my-classrooms
 * @desc    Get user's classrooms (teaching or enrolled)
 * @access  Private
 */
export const getMyClassrooms = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  // Get classrooms where user is teacher
  const teachingClassrooms = await prisma.classroom.findMany({
    where: { teacherId: req.user.userId },
    include: {
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Get classrooms where user is enrolled as student
  const studentEnrollments = await prisma.classroomEnrollment.findMany({
    where: { studentId: req.user.userId },
    include: {
      classroom: {
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
      },
    },
    orderBy: {
      joinedAt: "desc",
    },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        teaching: teachingClassrooms.map((classroom) => ({
          id: classroom.id,
          name: classroom.name,
          description: classroom.description,
          code: classroom.code,
          imageUrl: classroom.imageUrl,
          studentCount: classroom._count.enrollments,
          createdAt: classroom.createdAt,
          updatedAt: classroom.updatedAt,
        })),
        enrolled: studentEnrollments.map((enrollment) => ({
          id: enrollment.classroom.id,
          name: enrollment.classroom.name,
          description: enrollment.classroom.description,
          imageUrl: enrollment.classroom.imageUrl,
          teacher: enrollment.classroom.teacher,
          studentCount: enrollment.classroom._count.enrollments,
          joinedAt: enrollment.joinedAt,
        })),
      },
      "Classrooms retrieved successfully",
    ),
  );
});

/**
 * @route   PUT /api/classroom/:classroomId
 * @desc    Update classroom details
 * @access  Private (Teacher of the classroom)
 */
export const updateClassroom = asyncHandler(async (req, res) => {
  try {
    const { classroomId } = req.params;
    const validatedData: UpdateClassroomInput = updateClassroomSchema.parse(
      req.body,
    );

    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    // Find classroom and verify teacher
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      throw new ApiError(404, "Classroom not found");
    }

    // Check if user is the teacher of this classroom
    if (classroom.teacherId !== req.user.userId) {
      throw new ApiError(
        403,
        "Access denied. Only the teacher can update the classroom",
      );
    }

    // Update classroom
    const updatedClassroom = await prisma.classroom.update({
      where: { id: classroomId },
      data: validatedData,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          classroom: {
            id: updatedClassroom.id,
            name: updatedClassroom.name,
            description: updatedClassroom.description,
            code: updatedClassroom.code,
            imageUrl: updatedClassroom.imageUrl,
            teacher: updatedClassroom.teacher,
            studentCount: updatedClassroom._count.enrollments,
            createdAt: updatedClassroom.createdAt,
            updatedAt: updatedClassroom.updatedAt,
          },
        },
        "Classroom updated successfully",
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
 * @route   DELETE /api/classroom/:classroomId
 * @desc    Delete a classroom
 * @access  Private (Teacher of the classroom)
 */
export const deleteClassroom = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  // Find classroom and verify teacher
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });

  if (!classroom) {
    throw new ApiError(404, "Classroom not found");
  }

  // Check if user is the teacher of this classroom
  if (classroom.teacherId !== req.user.userId) {
    throw new ApiError(
      403,
      "Access denied. Only the teacher can delete the classroom",
    );
  }

  // Delete classroom (enrollments will be deleted due to cascade)
  await prisma.classroom.delete({
    where: { id: classroomId },
  });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Classroom deleted successfully"));
});
