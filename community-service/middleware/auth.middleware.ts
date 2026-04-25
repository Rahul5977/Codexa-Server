import type { NextFunction, Request, Response } from 'express'
import { pool } from '../libs/db.js'
import { ApiError } from '../utils/api-error.js'
import { extractBearerToken, type DecodedToken, verifyAccessToken } from '../utils/jwt.js'

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = extractBearerToken(req.headers.authorization)
    const decoded = verifyAccessToken(token)

    const result = await pool.query('SELECT id FROM "User" WHERE id = $1 LIMIT 1', [decoded.userId])
    if (result.rowCount === 0) {
      throw ApiError.unauthorized('User not found')
    }

    req.user = decoded
    next()
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error)
    }
    return next(ApiError.unauthorized('Invalid or expired token'))
  }
}
