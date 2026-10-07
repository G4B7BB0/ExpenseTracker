import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../utils/auth.js'

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    response.status(401).json({ error: { message: 'Authentication required' } })
    return
  }
  try {
    request.userId = verifyToken(header.slice(7)).userId
    next()
  } catch {
    response.status(401).json({ error: { message: 'Invalid or expired token' } })
  }
}
