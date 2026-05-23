/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import passport from 'passport'
import { prisma } from './db.js'
import authRoutes from './routes/auth.js'
import categoryRoutes from './routes/categories.js'
import listingRoutes from './routes/listings.js'
import profileRoutes from './routes/profile.js'
import uploadRoutes from './routes/uploads.js'
import { getUploadDir } from './uploadDir.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

const allowedOrigins = [
  process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  process.env.API_PUBLIC_ORIGIN,
  'http://localhost:5173',
].filter(Boolean) as string[]

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (allowedOrigins.includes(origin)) return cb(null, true)
      return cb(null, false)
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())
app.use(passport.initialize())

app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$connect()
    next()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    res.status(503).json({ success: false, error: 'Falha de conexão com o banco de dados', detail: msg })
  }
})

app.use('/uploads', express.static(getUploadDir()))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/listings', listingRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/uploads', uploadRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * Serve SPA in production
 */
const distDir = path.join(__dirname, '..', 'dist')
app.use(express.static(distDir))

app.use((req: Request, res: Response) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({
      success: false,
      error: 'API not found',
    })
    return
  }
  res.sendFile(path.join(distDir, 'index.html'))
})

export default app
