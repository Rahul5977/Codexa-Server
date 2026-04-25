import jwt from 'jsonwebtoken'

export interface DecodedToken {
  userId: string
  email: string
  role: string
  iat: number
  exp: number
}

export function extractBearerToken(authHeader?: string): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization header is missing or invalid')
  }

  const token = authHeader.slice(7)
  if (!token) {
    throw new Error('Token is missing')
  }

  return token
}

export function verifyAccessToken(token: string): DecodedToken {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not configured')
  }

  return jwt.verify(token, secret) as DecodedToken
}
