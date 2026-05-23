/**
 * This is a user authentication API route demo.
 * Handle user registration, login, token management, etc.
 */
import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { prisma } from '../db.js'
import { clearAuthCookie, readUserFromRequest, setAuthCookie, signToken } from '../auth.js'

const router = Router()

const registerSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(8),
    confirmPassword: z.string().min(8),
})

  .superRefine((v, ctx) => {
    if (v.password !== v.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Senha diferente' })
    }
  })

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3001/api/auth/google/callback'

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value
          const googleSub = profile.id
          if (!googleSub) return done(new Error('Google profile inválido'))

          const existing = await prisma.user.findFirst({
            where: { OR: [{ googleSub }, email ? { email } : { email: '__nope__' }] },
          })

          const user =
            existing ??
            (await prisma.user.create({
              data: {
                fullName: profile.displayName || 'Usuário',
                email: email ?? `${googleSub}@google.local`,
                phone: '',
                googleSub,
              },
            }))

          if (existing && !existing.googleSub) {
            await prisma.user.update({ where: { id: existing.id }, data: { googleSub } })
          }

          done(null, { id: user.id })
        } catch (e) {
          done(e as Error)
        }
      },
    ),
  )
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Dados inválidos' })
    return
  }

  const { fullName, email, password, phone } = parsed.data

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    res.status(409).json({ success: false, error: 'E-mail já cadastrado' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { fullName, email, phone, passwordHash },
    select: { id: true, fullName: true, email: true, phone: true, isEmailPublic: true, isPhonePublic: true },
  })

  const token = signToken(user.id)
  setAuthCookie(res, token)
  res.status(201).json({ success: true, user })
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Dados inválidos' })
    return
  }

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, fullName: true, email: true, phone: true, passwordHash: true, isEmailPublic: true, isPhonePublic: true },
  })
  if (!user?.passwordHash) {
    res.status(401).json({ success: false, error: 'Credenciais inválidas' })
    return
  }

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    res.status(401).json({ success: false, error: 'Credenciais inválidas' })
    return
  }

  const token = signToken(user.id)
  setAuthCookie(res, token)
  const { passwordHash: _ph, ...safe } = user
  res.status(200).json({ success: true, user: safe })
})

router.post('/logout', async (_req: Request, res: Response): Promise<void> => {
  clearAuthCookie(res)
  res.status(200).json({ success: true })
})

router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const authUser = readUserFromRequest(req)
  if (!authUser) {
    res.status(200).json({ success: true, user: null })
    return
  }
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, fullName: true, email: true, phone: true, isEmailPublic: true, isPhonePublic: true },
  })
  res.status(200).json({ success: true, user })
})

router.get('/providers', async (_req: Request, res: Response): Promise<void> => {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  res.status(200).json({ success: true, providers: { google: googleEnabled } })
})

router.get('/google', (req: Request, res: Response, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
    if (req.accepts('json')) {
      res.status(400).json({ success: false, error: 'Google OAuth não configurado' })
      return
    }
    res.redirect(`${frontendOrigin}/auth?e=google_not_configured`)
    return
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next)
})

router.get('/google/callback', (req: Request, res: Response, next) => {
  passport.authenticate('google', { session: false }, (err: unknown, user: { id: string } | undefined) => {
    if (err || !user?.id) {
      res.redirect(`${process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'}/auth?e=google`)
      return
    }
    const token = signToken(user.id)
    setAuthCookie(res, token)
    res.redirect(process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173')
  })(req, res, next)
})

export default router
