import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

let app: unknown
let prisma: any
let categoryId = ''

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

  const cat = await prisma.category.create({ data: { name: 'Roupas' } })
  categoryId = cat.id
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

describe('Edição de anúncios', () => {
  it('permite criar anúncio com campos faltantes', async () => {
    const agent = request.agent(app as any)
    await register(agent, `empty-${Date.now()}@exemplo.com`)

    const created = await agent.post('/api/listings').send({})
    expect(created.status).toBe(201)
    expect(created.body.listing.title).toBe('Produto sem título')
    expect(created.body.listing.description).toBe('Descrição pendente')
    expect(created.body.listing.priceCents).toBe(0)
    expect(created.body.listing.status).toBe('ACTIVE')
    expect(created.body.listing.needsReview).toBe(false)
    expect(created.body.listing.category.id).toBe(categoryId)
  })

  it('retorna o próximo anúncio pendente de edição', async () => {
    const agent = request.agent(app as any)
    const email = `pending-${Date.now()}@exemplo.com`
    await register(agent, email)

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (!user) throw new Error('Usuário não encontrado no teste')

    const l1 = await prisma.listing.create({
      data: {
        userId: user.id,
        categoryId,
        title: 'Pendente 1',
        description: 'Descrição pendente',
        priceCents: 0,
        currency: 'BRL',
        needsReview: true,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      },
    })
    const l2 = await prisma.listing.create({
      data: {
        userId: user.id,
        categoryId,
        title: 'Pendente 2',
        description: 'Descrição pendente',
        priceCents: 0,
        currency: 'BRL',
        needsReview: true,
        createdAt: new Date('2025-01-02T00:00:00.000Z'),
      },
    })
    const l3 = await prisma.listing.create({
      data: {
        userId: user.id,
        categoryId,
        title: 'OK',
        description: 'OK',
        priceCents: 100,
        currency: 'BRL',
        needsReview: false,
        createdAt: new Date('2025-01-03T00:00:00.000Z'),
      },
    })

    const r1 = await agent.get(`/api/profile/listings/next-pending?afterId=${l3.id}`)
    expect(r1.status).toBe(200)
    expect(r1.body.listingId).toBe(l2.id)

    const r2 = await agent.get(`/api/profile/listings/next-pending?afterId=${l2.id}`)
    expect(r2.status).toBe(200)
    expect(r2.body.listingId).toBe(l1.id)

    const patched = await agent.patch(`/api/listings/${l2.id}`).send({ needsReview: false })
    expect(patched.status).toBe(200)
    expect(patched.body.listing.needsReview).toBe(false)

    const r3 = await agent.get(`/api/profile/listings/next-pending?afterId=${l3.id}`)
    expect(r3.status).toBe(200)
    expect(r3.body.listingId).toBe(l1.id)

    const r4 = await agent.get(`/api/profile/listings/next-pending?afterId=${l1.id}`)
    expect(r4.status).toBe(200)
    expect(r4.body.listingId).toBe(null)
  })

  it('permite que o dono edite e mantém id/data/status', async () => {
    const agent = request.agent(app as any)
    await register(agent, `a-${Date.now()}@exemplo.com`)

    const created = await agent.post('/api/listings').send({
      title: 'Produto A',
      description: 'Descrição mínima para teste',
      priceCents: 1234,
      categoryId,
      subCategoryId: null,
      city: 'Natal',
      state: 'RN',
      images: [{ url: 'http://localhost/x.jpg', sortOrder: 0 }],
    })
    expect(created.status).toBe(201)
    const id = created.body.listing.id as string

    const before = await prisma.listing.findUnique({ where: { id } })
    expect(before).toBeTruthy()

    const patched = await agent.patch(`/api/listings/${id}`).send({ title: 'Produto A (editado)' })
    expect(patched.status).toBe(200)
    expect(patched.body.listing.id).toBe(id)

    const after = await prisma.listing.findUnique({ where: { id } })
    expect(after.title).toBe('Produto A (editado)')
    expect(after.createdAt.getTime()).toBe(before.createdAt.getTime())
    expect(after.status).toBe('ACTIVE')

    const fetched = await agent.get(`/api/listings/${id}`)
    expect(fetched.status).toBe(200)
    expect(fetched.body.listing.title).toBe('Produto A (editado)')

    const publicList = await agent.get('/api/listings?query=editado')
    expect(publicList.status).toBe(200)
    expect((publicList.body.listings as any[]).some((l) => l.id === id)).toBe(true)
  })

  it('bloqueia edição por usuário não proprietário', async () => {
    const owner = request.agent(app as any)
    const other = request.agent(app as any)
    await register(owner, `owner-${Date.now()}@exemplo.com`)
    await register(other, `other-${Date.now()}@exemplo.com`)

    const created = await owner.post('/api/listings').send({
      title: 'Produto B',
      description: 'Descrição mínima para teste',
      priceCents: 1000,
      categoryId,
    })
    expect(created.status).toBe(201)
    const id = created.body.listing.id as string

    const patched = await other.patch(`/api/listings/${id}`).send({ title: 'Tentativa' })
    expect(patched.status).toBe(403)
  })
})
