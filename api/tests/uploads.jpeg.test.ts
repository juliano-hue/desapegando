import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

let app: unknown
let prisma: any

const jpegBase64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wCEAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAFAAUDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAdEAACAQQDAAAAAAAAAAAAAAABAgMABAURBhIh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAQL/xAAXEQEBAQEAAAAAAAAAAAAAAAABAgAD/9oADAMBAAIRAxEAPwCrVgVbZJY8jD7WvV4WQfYtW4Hj5Q3pM8bYwCk4QwZ3rGmZ8cNQbq7y3cGd3oHcN/9k='

beforeAll(async () => {
  const dbPath = path.join(os.tmpdir(), `desapegando-test-${Date.now()}-${Math.random().toString(16).slice(2)}.db`)
  process.env.DATABASE_URL = `file:${dbPath}`
  process.env.JWT_SECRET = 'test-secret'
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173'
  process.env.API_PUBLIC_ORIGIN = 'http://localhost:3002'
  process.env.UPLOAD_DIR = path.join(os.tmpdir(), `desapegando-uploads-test-${Date.now()}`)

  execSync('npx prisma generate', { cwd: process.cwd(), env: process.env, stdio: 'ignore' })
  execSync('npx prisma migrate deploy', { cwd: process.cwd(), env: process.env, stdio: 'ignore' })

  const appMod = await import('../app.ts')
  app = appMod.default
  const dbMod = await import('../db.ts')
  prisma = dbMod.prisma
})

afterAll(async () => {
  if (prisma) await prisma.$disconnect()
})

async function register(agent: any, email: string) {
  const r = await agent.post('/api/auth/register').send({
    fullName: 'Teste',
    email,
    password: '12345678',
    confirmPassword: '12345678',
    phone: '99999999',
  })
  expect(r.status).toBe(201)
}

describe('Uploads JPEG', () => {
  it('aceita multipart com image/jpeg e filename .jpg', async () => {
    const agent = request.agent(app as any)
    await register(agent, `u-${Date.now()}@exemplo.com`)

    const buf = Buffer.from(jpegBase64, 'base64')
    const r = await agent.post('/api/uploads/file').attach('file', buf, { filename: 'foto.jpg', contentType: 'image/jpeg' })
    expect(r.status).toBe(201)
    expect(r.body?.url).toMatch(/\/uploads\/.+\.jpg$/)
  })

  it('aceita dataUrl com image/jpg', async () => {
    const agent = request.agent(app as any)
    await register(agent, `u2-${Date.now()}@exemplo.com`)

    const r = await agent.post('/api/uploads').send({ dataUrl: `data:image/jpg;base64,${jpegBase64}` })
    expect(r.status).toBe(201)
    expect(r.body?.url).toMatch(/\/uploads\/.+\.jpg$/)
  })
})
