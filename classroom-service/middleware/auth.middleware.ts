import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/api-error.js";
import {
  verifyAccessToken,
  extractBearerToken,
  type DecodedToken,
} from "../utils/jwt.js";
import { prisma } from "../libs/prisma.js";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw new ApiError(401, "Access token is required");
    }

    // Verify the token
    const decoded = verifyAccessToken(token);

    // Optional: Check if user still exists (in case user was deleted after token was issued)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user) {
      throw new ApiError(401, "User not found");
    }

    if (user.status !== "ACTIVE") {
      throw new ApiError(401, "Account is not active");
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(401, "Invalid token"));
    }
  }
};

/**
 * Authorization middleware for teachers only
 */
export const requireTeacher = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    if (req.user.role !== "TEACHER" && req.user.role !== "ADMIN") {
      throw new ApiError(403, "Teacher role required");
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware for students only
 */
export const requireStudent = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    if (req.user.role !== "STUDENT" && req.user.role !== "ADMIN") {
      throw new ApiError(403, "Student role required");
    }

    next();
  } catch (error) {
    next(error);
  }
};
