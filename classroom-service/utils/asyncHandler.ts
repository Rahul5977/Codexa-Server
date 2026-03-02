import type { Request, Response, NextFunction } from "express";

// Async wrapper to catch errors from async route handlers
export const asyncHandler = (fn: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
