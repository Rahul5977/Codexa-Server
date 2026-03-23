import { z } from "zod";

const assignmentTypeSchema = z.enum(["DSA", "IDE"]);

const ideFileSchema = z.object({
  name: z.string().min(1, "File name is required").max(255, "File name is too long"),
  mimeType: z.string().min(1, "File type is required").max(120, "Invalid file type"),
  size: z.number().int().nonnegative("Invalid file size"),
  content: z.string(), // Allow empty content for now (files might not have readable content)
});

const ideWorkspaceSchema = z.object({
  tree: z.any(),
  fileContents: z.record(z.string()),
  selectedNodeId: z.string().nullable().optional(),
  selectedLanguageId: z.string().optional(),
  stdin: z.string().optional(),
  stdinMode: z.enum(["manual", "file"]).optional(),
  selectedStdinFileId: z.string().nullable().optional(),
  expandedFolderIds: z.array(z.string()).optional(),
});

/**
 * Schema for creating an assignment
 */
export const createAssignmentSchema = z.object({
  type: assignmentTypeSchema.default("DSA"),
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
    .optional()
    .default([]),
  ideFiles: z.array(ideFileSchema).optional().default([]),
}).superRefine((data, ctx) => {
  if (data.type === "DSA" && (!data.problems || data.problems.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["problems"],
      message: "At least one problem is required for DSA assignments",
    });
  }

  if (data.type === "IDE" && (!data.ideFiles || data.ideFiles.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ideFiles"],
      message: "At least one file is required for IDE assignments",
    });
  }
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
    .optional(),
  ideWorkspace: ideWorkspaceSchema.optional(),
}).superRefine((data, ctx) => {
  const hasSolutions = data.solutions && Object.keys(data.solutions).length > 0;
  const hasWorkspace = !!data.ideWorkspace;

  if (!hasSolutions && !hasWorkspace) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["solutions"],
      message: "Provide either DSA solutions or an IDE workspace",
    });
  }
});

/**
 * Schema for creating an exam
 */
export const createExamSchema = z.object({
  type: assignmentTypeSchema.default("DSA"),
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
  startTime: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date format")
    .transform((date) => new Date(date)),
  duration: z
    .number()
    .int()
    .min(1, "Duration must be at least 1 minute")
    .max(600, "Duration cannot exceed 600 minutes"),
  problems: z
    .array(
      z.object({
        problemId: z.string().uuid("Invalid problem ID"),
        order: z.number().int().positive("Order must be a positive integer"),
      }),
    )
    .optional()
    .default([]),
  ideFiles: z.array(ideFileSchema).optional().default([]),
}).superRefine((data, ctx) => {
  if (data.type === "DSA" && (!data.problems || data.problems.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["problems"],
      message: "At least one problem is required for DSA exams",
    });
  }

  if (data.type === "IDE" && (!data.ideFiles || data.ideFiles.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ideFiles"],
      message: "At least one file is required for IDE exams",
    });
  }
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
    .optional(),
  ideWorkspace: ideWorkspaceSchema.optional(),
}).superRefine((data, ctx) => {
  const hasSolutions =
    data.solutions && Object.keys(data.solutions).length > 0;
  const hasWorkspace = !!data.ideWorkspace;

  if (!hasSolutions && !hasWorkspace) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["solutions"],
      message: "Provide either DSA solutions or an IDE workspace",
    });
  }
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
