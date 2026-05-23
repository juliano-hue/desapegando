import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export type AuthUser = { id: string }

const COOKIE_NAME = 'ld_token'

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 14,
  })
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}

export function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET ?? 'dev-jwt-secret'
  return jwt.sign({ sub: userId }, secret, { expiresIn: '14d' })
}

export function readUserFromRequest(req: Request): AuthUser | null {
  const token = (req.cookies?.[COOKIE_NAME] as string | undefined) ?? undefined
  if (!token) return null
  try {
    const secret = process.env.JWT_SECRET ?? 'dev-jwt-secret'
    const decoded = jwt.verify(token, secret) as { sub?: string }
    if (!decoded?.sub) return null
    return { id: decoded.sub }
  } catch {
    return null
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = readUserFromRequest(req)
  if (!user) {
    res.status(401).json({ success: false, error: 'Não autenticado' })
    return
  }
  ;(req as Request & { authUser: AuthUser }).authUser = user
  next()
}
