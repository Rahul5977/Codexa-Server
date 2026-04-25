import express from 'express'
import cors from 'cors'
import type { NextFunction, Request, Response } from 'express'
import communityRoutes from './routes/community.routes.js'
import { ApiError } from './utils/api-error.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'community-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

app.use('/api/community', communityRoutes)

app.use((_req, res) => {
  res.status(404).json({
    statusCode: 404,
    message: 'Route not found',
    success: false,
    errors: [],
  })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Community service error:', err)

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      statusCode: err.statusCode,
      message: err.message,
      success: false,
      errors: err.errors,
    })
  }

  return res.status(500).json({
    statusCode: 500,
    message: 'Internal server error',
    success: false,
    errors: process.env.NODE_ENV === 'development' ? [err.message] : [],
  })
})

export default app
