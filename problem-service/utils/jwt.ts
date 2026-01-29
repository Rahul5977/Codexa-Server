import jwt from "jsonwebtoken";
import type { SignOptions, JwtPayload } from "jsonwebtoken";

const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "your-access-secret-key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";
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

// Generate Access Token
export function generateAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: "codexa-auth-service",
    subject: payload.userId,
  };

  return jwt.sign(payload, JWT_ACCESS_SECRET, options);
}

// Generate Refresh Token
export function generateRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: "codexa-auth-service",
    subject: payload.userId,
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, options);
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
  return jwt.verify(token, JWT_ACCESS_SECRET) as DecodedToken;
}

// Verify Refresh Token
export function verifyRefreshToken(token: string): DecodedToken {
  return jwt.verify(token, JWT_REFRESH_SECRET) as DecodedToken;
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
