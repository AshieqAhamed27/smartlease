import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../services/jwt'
import { AppError } from './errorHandler'

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string; plan?: string }
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication required')
  }
  const token = header.slice(7)
  const payload = verifyAccessToken(token)
  if (!payload) throw new AppError(401, 'Invalid or expired token')
  req.user = payload
  next()
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check user role from DB if needed
    next()
  }
}
