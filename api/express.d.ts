import 'express'

declare module 'express-serve-static-core' {
  interface Request {
    cookies?: Record<string, unknown>
    authUser?: { id: string }
  }
}

