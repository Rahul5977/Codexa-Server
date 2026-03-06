import jwt from "jsonwebtoken";
import type { SignOptions, JwtPayload } from "jsonwebtoken";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface DecodedToken extends JwtPayload, TokenPayload {}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Helper functions to get secrets dynamically
const getAccessSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET or JWT_SECRET environment variable is not set");
  }
  return secret;
};

const getRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET or REFRESH_TOKEN_SECRET environment variable is not set");
  }
  return secret;
};

// Generate Access Token
export function generateAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: "codexa-problem-service",
    subject: payload.userId,
  };

  return jwt.sign(payload, getAccessSecret(), options);
}

// Generate Refresh Token
export function generateRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: "codexa-problem-service",
    subject: payload.userId,
  };

  return jwt.sign(payload, getRefreshSecret(), options);
}

// Generate both tokens
export function generateTokenPair(payload: TokenPayload): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

// Verify Access Token
export function verifyAccessToken(token: string): DecodedToken {
  return jwt.verify(token, getAccessSecret()) as DecodedToken;
}

// Verify Refresh Token
export function verifyRefreshToken(token: string): DecodedToken {
  return jwt.verify(token, getRefreshSecret()) as DecodedToken;
}

// Extract token from Authorization header
export function extractBearerToken(
  authHeader: string | undefined,
): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}
