import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

export interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface DecodedToken {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Generate access and refresh token pair
 */
export function generateTokenPair(payload: Omit<TokenPayload, "iat" | "exp">) {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  return { accessToken, refreshToken };
}

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(
  payload: Omit<TokenPayload, "iat" | "exp">,
) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "15m";

  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(
  payload: Omit<TokenPayload, "iat" | "exp">,
) {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

  if (!secret) {
    throw new Error("REFRESH_TOKEN_SECRET environment variable is not set");
  }

  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): DecodedToken {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  try {
    return jwt.verify(token, secret) as DecodedToken;
  } catch (error) {
    throw new Error("Invalid or expired access token");
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): DecodedToken {
  const secret = process.env.REFRESH_TOKEN_SECRET;

  if (!secret) {
    throw new Error("REFRESH_TOKEN_SECRET environment variable is not set");
  }

  try {
    return jwt.verify(token, secret) as DecodedToken;
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader?: string): string {
  if (!authHeader) {
    throw new Error("Authorization header is missing");
  }

  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header must start with 'Bearer '");
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  if (!token) {
    throw new Error("Token is missing from Authorization header");
  }

  return token;
}
