import { prisma } from "@codexa/db";
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
    throw ApiError.badRequest(
      "Invalid problem data",
      parseResult.error.flatten(),
    );
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
export const updateProblem = asyncHandler(
  async (req: Request, res: Response) => {
    let { id } = req.params;
    if (Array.isArray(id) || typeof id !== "string") {
      throw ApiError.badRequest("Invalid problem id");
    }
    const parseResult = problemSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      throw ApiError.badRequest(
        "Invalid problem data",
        parseResult.error.flatten(),
      );
    }
    const data = parseResult.data;
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = { set: data.title };
    if (data.difficulty !== undefined)
      updateData.difficulty = { set: data.difficulty };
    if (data.statement !== undefined)
      updateData.statement = { set: data.statement };
    if (data.tags !== undefined) updateData.tags = { set: data.tags };
    if (data.examples !== undefined)
      updateData.examples = { set: data.examples };
    if (data.testcases !== undefined)
      updateData.testcases = { set: data.testcases };
    if (data.constraints !== undefined)
      updateData.constraints = { set: data.constraints };
    if (data.companies !== undefined)
      updateData.companies = { set: data.companies };
    if (data.hints !== undefined) updateData.hints = { set: data.hints };

    const problem = await prisma.problem.update({
      where: { id },
      data: updateData,
    });
    const response = ApiResponse.success(
      problem,
      "Problem updated successfully",
    );
    res.status(response.statusCode).json(response);
  },
);

// Get all problems
export const getProblems = asyncHandler(
  async (_req: Request, res: Response) => {
    const problems = await prisma.problem.findMany();
    const response = ApiResponse.success(
      problems,
      "Problems fetched successfully",
    );
    res.status(response.statusCode).json(response);
  },
);

// Get a single problem by id
export const getProblemById = asyncHandler(
  async (req: Request, res: Response) => {
    let { id } = req.params;
    if (Array.isArray(id) || typeof id !== "string") {
      throw ApiError.badRequest("Invalid problem id");
    }
    const problem = await prisma.problem.findUnique({ where: { id } });
    if (!problem) throw ApiError.notFound("Problem not found");
    const response = ApiResponse.success(
      problem,
      "Problem fetched successfully",
    );
    res.status(response.statusCode).json(response);
  },
);

// Delete a problem (admin/teacher only)
export const deleteProblem = asyncHandler(
  async (req: Request, res: Response) => {
    let { id } = req.params;
    if (Array.isArray(id) || typeof id !== "string") {
      throw ApiError.badRequest("Invalid problem id");
    }
    await prisma.problem.delete({ where: { id } });
    const response = ApiResponse.success(null, "Problem deleted successfully");
    res.status(response.statusCode).json(response);
  },
);
