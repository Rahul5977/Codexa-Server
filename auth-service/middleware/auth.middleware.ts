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
      throw ApiError.unauthorized("Access token is required");
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Optionally verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw ApiError.unauthorized("User not found");
    }

    // Attach user to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(ApiError.unauthorized("Invalid or expired token"));
    }
  }
};

/**
 * Authorization middleware factory
 * Check if user has required role(s)
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized("Not authenticated"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden("You don't have permission to perform this action"),
      );
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't fail if missing
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (token) {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
    }

    next();
  } catch {
    // Token invalid or expired, continue without user
    next();
  }
};
