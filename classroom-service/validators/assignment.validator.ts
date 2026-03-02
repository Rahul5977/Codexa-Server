import { z } from "zod";

/**
 * Schema for creating an assignment
 */
export const createAssignmentSchema = z.object({
  title: z
    .string()
    .min(1, "Assignment title is required")
    .max(100, "Assignment title must be at most 100 characters"),
  subtitle: z
    .string()
    .max(200, "Subtitle must be at most 200 characters")
    .optional(),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .optional(),
  deadline: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date format")
    .transform((date) => new Date(date)),
  problems: z
    .array(
      z.object({
        problemId: z.string().uuid("Invalid problem ID"),
        order: z.number().int().positive("Order must be a positive integer"),
      }),
    )
    .min(1, "At least one problem is required"),
});

/**
 * Schema for updating an assignment
 */
export const updateAssignmentSchema = z.object({
  title: z
    .string()
    .min(1, "Assignment title is required")
    .max(100, "Assignment title must be at most 100 characters")
    .optional(),
  subtitle: z
    .string()
    .max(200, "Subtitle must be at most 200 characters")
    .optional(),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .optional(),
  deadline: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date format")
    .transform((date) => new Date(date))
    .optional(),
  problems: z
    .array(
      z.object({
        problemId: z.string().uuid("Invalid problem ID"),
        order: z.number().int().positive("Order must be a positive integer"),
      }),
    )
    .min(1, "At least one problem is required")
    .optional(),
});

/**
 * Schema for submitting an assignment
 */
export const submitAssignmentSchema = z.object({
  solutions: z
    .record(
      z.string().uuid(), // problemId
      z.object({
        code: z
          .string()
          .min(1, "Code is required")
          .max(50000, "Code must be at most 50,000 characters"),
        language: z
          .string()
          .min(1, "Language is required")
          .max(50, "Language must be at most 50 characters"),
      }),
    )
    .refine(
      (solutions) => Object.keys(solutions).length > 0,
      "At least one solution is required",
    ),
});

/**
 * Schema for creating an exam
 */
export const createExamSchema = z.object({
  title: z
    .string()
    .min(1, "Exam title is required")
    .max(100, "Exam title must be at most 100 characters"),
  subtitle: z
    .string()
    .max(200, "Subtitle must be at most 200 characters")
    .optional(),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .optional(),
  deadline: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date format")
    .transform((date) => new Date(date)),
  duration: z
    .number()
    .int()
    .min(1, "Duration must be at least 1 minute")
    .max(600, "Duration cannot exceed 600 minutes")
    .optional(),
  problems: z
    .array(
      z.object({
        problemId: z.string().uuid("Invalid problem ID"),
        order: z.number().int().positive("Order must be a positive integer"),
      }),
    )
    .min(1, "At least one problem is required"),
});

/**
 * Schema for updating an exam
 */
export const updateExamSchema = z.object({
  title: z
    .string()
    .min(1, "Exam title is required")
    .max(100, "Exam title must be at most 100 characters")
    .optional(),
  subtitle: z
    .string()
    .max(200, "Subtitle must be at most 200 characters")
    .optional(),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .optional(),
  deadline: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date format")
    .transform((date) => new Date(date))
    .optional(),
  duration: z
    .number()
    .int()
    .min(1, "Duration must be at least 1 minute")
    .max(600, "Duration cannot exceed 600 minutes")
    .optional(),
  problems: z
    .array(
      z.object({
        problemId: z.string().uuid("Invalid problem ID"),
        order: z.number().int().positive("Order must be a positive integer"),
      }),
    )
    .min(1, "At least one problem is required")
    .optional(),
});

/**
 * Schema for submitting an exam
 */
export const submitExamSchema = z.object({
  solutions: z
    .record(
      z.string().uuid(), // problemId
      z.object({
        code: z
          .string()
          .min(1, "Code is required")
          .max(50000, "Code must be at most 50,000 characters"),
        language: z
          .string()
          .min(1, "Language is required")
          .max(50, "Language must be at most 50 characters"),
      }),
    )
    .refine(
      (solutions) => Object.keys(solutions).length > 0,
      "At least one solution is required",
    ),
});

/**
 * Schema for adding a new problem to the database
 */
export const createProblemSchema = z.object({
  title: z
    .string()
    .min(1, "Problem title is required")
    .max(200, "Problem title must be at most 200 characters"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"], {
    errorMap: () => ({ message: "Difficulty must be EASY, MEDIUM, or HARD" }),
  }),
  statement: z
    .string()
    .min(1, "Problem statement is required")
    .max(10000, "Problem statement must be at most 10,000 characters"),
  examples: z
    .array(
      z.object({
        input: z.string(),
        output: z.string(),
        explanation: z.string().optional(),
      }),
    )
    .min(1, "At least one example is required"),
  constraints: z
    .array(z.string())
    .min(1, "At least one constraint is required"),
  tags: z.array(z.string()).default([]),
  hints: z.array(z.string()).default([]),
  companies: z.array(z.string()).default([]),
  testcases: z
    .array(
      z.object({
        input: z.string(),
        output: z.string(),
      }),
    )
    .min(1, "At least one test case is required"),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>;
export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type SubmitExamInput = z.infer<typeof submitExamSchema>;
export type CreateProblemInput = z.infer<typeof createProblemSchema>;
