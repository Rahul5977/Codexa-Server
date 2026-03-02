import { z } from "zod";

/**
 * Schema for creating a classroom
 */
export const createClassroomSchema = z.object({
  name: z
    .string()
    .min(1, "Classroom name is required")
    .max(100, "Classroom name must be at most 100 characters"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional(),
  imageUrl: z.string().url("Invalid image URL").optional(),
});

/**
 * Schema for joining a classroom
 */
export const joinClassroomSchema = z.object({
  code: z
    .string()
    .length(6, "Classroom code must be exactly 6 characters")
    .regex(
      /^[A-Z0-9]+$/,
      "Classroom code must contain only uppercase letters and numbers",
    ),
});

/**
 * Schema for updating a classroom
 */
export const updateClassroomSchema = z.object({
  name: z
    .string()
    .min(1, "Classroom name is required")
    .max(100, "Classroom name must be at most 100 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional(),
  imageUrl: z.string().url("Invalid image URL").optional(),
});

export type CreateClassroomInput = z.infer<typeof createClassroomSchema>;
export type JoinClassroomInput = z.infer<typeof joinClassroomSchema>;
export type UpdateClassroomInput = z.infer<typeof updateClassroomSchema>;
