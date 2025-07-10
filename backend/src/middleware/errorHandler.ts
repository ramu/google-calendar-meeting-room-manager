import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

export interface ApiError extends Error {
  statusCode?: number
  code?: string
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    code: err.code,
    url: req.url,
    method: req.method,
    ip: req.ip,
  })

  // Default error
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal Server Error'

  // Google API errors
  if (err.code === 'invalid_grant') {
    statusCode = 401
    message = 'Invalid or expired token'
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation error'
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  })
}