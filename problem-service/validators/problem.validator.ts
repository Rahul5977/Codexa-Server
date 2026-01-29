import { z } from "zod";

export const exampleSchema = z.object({
  input: z.string(),
  output: z.string(),
  explanation: z.string().optional(),
});

export const testcaseSchema = z.object({
  input: z.string(),
  output: z.string(),
});

export const problemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  statement: z.string().min(1, "Statement is required"),
  examples: z.array(exampleSchema),
  constraints: z.array(z.string()),
  tags: z.array(z.string()),
  hints: z.array(z.string()),
  companies: z.array(z.string()),
  testcases: z.array(testcaseSchema),
});

export type ProblemInput = z.infer<typeof problemSchema>;
