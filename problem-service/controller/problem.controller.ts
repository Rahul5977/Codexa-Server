import { prisma } from "../libs/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { problemSchema } from "../validators/problem.validator.js";
import type { ProblemInput } from "../validators/problem.validator.js";
import type { Request, Response } from "express";

// Add a new problem (admin/teacher only)
export const addProblem = asyncHandler(async (req: Request, res: Response) => {
  // Only admin or teacher allowed (authorization handled by middleware)
  const parseResult = problemSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw ApiError.badRequest("Invalid problem data", parseResult.error.flatten());
  }
  const data: ProblemInput = parseResult.data;
  const problem = await prisma.problem.create({
    data: {
      ...data,
      examples: data.examples,
      testcases: data.testcases,
    },
  });
  const response = ApiResponse.created(problem, "Problem created successfully");
  res.status(response.statusCode).json(response);
});

// Update a problem (admin/teacher only)
export const updateProblem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const parseResult = problemSchema.partial().safeParse(req.body);
  if (!parseResult.success) {
    throw ApiError.badRequest("Invalid problem data", parseResult.error.flatten());
  }
  const data = parseResult.data;
  const problem = await prisma.problem.update({
    where: { id },
    data: {
      ...data,
      examples: data.examples,
      testcases: data.testcases,
    },
  });
  const response = ApiResponse.success(problem, "Problem updated successfully");
  res.status(response.statusCode).json(response);
});

// Get all problems
export const getProblems = asyncHandler(async (_req: Request, res: Response) => {
  const problems = await prisma.problem.findMany();
  const response = ApiResponse.success(problems, "Problems fetched successfully");
  res.status(response.statusCode).json(response);
});

// Get a single problem by id
export const getProblemById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const problem = await prisma.problem.findUnique({ where: { id } });
  if (!problem) throw ApiError.notFound("Problem not found");
  const response = ApiResponse.success(problem, "Problem fetched successfully");
  res.status(response.statusCode).json(response);
});

// Delete a problem (admin/teacher only)
export const deleteProblem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.problem.delete({ where: { id } });
  const response = ApiResponse.success(null, "Problem deleted successfully");
  res.status(response.statusCode).json(response);
});
