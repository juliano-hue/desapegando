import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

const createSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  priceCents: z.number().int().nonnegative().optional(),
  currency: z.string().min(3).max(3).optional(),
  categoryId: z.string().optional(),
  subCategoryId: z.string().optional().nullable(),
  needsReview: z.boolean().optional(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  images: z.array(z.object({ url: z.string().min(1), sortOrder: z.number().int().optional() })).optional(),
})

async function resolveCategoryId(categoryId: string | undefined): Promise<string> {
  const id = (categoryId ?? '').trim()
  if (id) {
    const found = await prisma.category.findUnique({ where: { id }, select: { id: true } })
    if (found) return found.id
  }
  const first = await prisma.category.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } })
  if (first) return first.id
  const created = await prisma.category.create({ data: { name: 'Roupas' }, select: { id: true } })
  return created.id
}

async function resolveSubCategoryId(subCategoryId: string | null | undefined, categoryId: string): Promise<string | null> {
  const id = (subCategoryId ?? '').trim()
  if (!id) return null
  const found = await prisma.subCategory.findUnique({ where: { id }, select: { id: true, categoryId: true } })
  if (!found) return null
  if (found.categoryId !== categoryId) return null
  return found.id
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const query = (req.query.query as string | undefined)?.trim()
  const categoryId = (req.query.categoryId as string | undefined)?.trim()
  const subCategoryId = (req.query.subCategoryId as string | undefined)?.trim()
  const page = Math.max(1, Number(req.query.page ?? 1))
  const pageSize = 24

  const where = {
    status: 'ACTIVE' as const,
    ...(query
      ? {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
        }
      : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(subCategoryId ? { subCategoryId } : {}),
  }

  const [total, listings] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, category: true, subCategory: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  res.status(200).json({ success: true, total, page, pageSize, listings })
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      category: true,
      subCategory: true,
      user: { select: { id: true, fullName: true, phone: true, email: true, isEmailPublic: true, isPhonePublic: true } },
    },
  })
  if (!listing) {
    res.status(404).json({ success: false, error: 'Anúncio não encontrado' })
    return
  }
  res.status(200).json({ success: true, listing })
})

router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Dados inválidos' })
    return
  }

  const authUser = (req as Request & { authUser: { id: string } }).authUser
  const data = parsed.data
  const categoryId = await resolveCategoryId(data.categoryId)
  const subCategoryId = await resolveSubCategoryId(data.subCategoryId, categoryId)

  const listing = await prisma.listing.create({
    data: {
      userId: authUser.id,
      title: data.title?.trim() ? data.title.trim() : 'Produto sem título',
      description: data.description?.trim() ? data.description.trim() : 'Descrição pendente',
      priceCents: Number.isFinite(data.priceCents) ? data.priceCents! : 0,
      currency: data.currency ?? 'BRL',
      categoryId,
      subCategoryId,
      needsReview: data.needsReview ?? false,
      city: data.city ?? null,
      state: data.state ?? null,
      images: data.images?.length
        ? { create: data.images.map((i, idx) => ({ url: i.url, sortOrder: i.sortOrder ?? idx })) }
        : undefined,
    },
    include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, subCategory: true },
  })

  res.status(201).json({ success: true, listing })
})

router.patch('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as Request & { authUser: { id: string } }).authUser
  const existing = await prisma.listing.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    res.status(404).json({ success: false, error: 'Anúncio não encontrado' })
    return
  }
  if (existing.userId !== authUser.id) {
    res.status(403).json({ success: false, error: 'Sem permissão' })
    return
  }

  const patchSchema = createSchema.partial()
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Dados inválidos' })
    return
  }

  const data = parsed.data
  const title = data.title === undefined ? undefined : data.title.trim() ? data.title.trim() : 'Produto sem título'
  const description =
    data.description === undefined ? undefined : data.description.trim() ? data.description.trim() : 'Descrição pendente'
  const categoryId = data.categoryId === undefined ? undefined : await resolveCategoryId(data.categoryId)
  const subCategoryId =
    categoryId === undefined
      ? data.subCategoryId === undefined
        ? undefined
        : data.subCategoryId ?? null
      : await resolveSubCategoryId(data.subCategoryId, categoryId)

  const listing = await prisma.listing.update({
    where: { id: req.params.id },
    data: {
      status: 'ACTIVE',
      title,
      description,
      priceCents: data.priceCents === undefined ? undefined : Number.isFinite(data.priceCents) ? data.priceCents : 0,
      currency: data.currency,
      categoryId,
      subCategoryId: subCategoryId === undefined ? undefined : subCategoryId,
      needsReview: data.needsReview,
      city: data.city === undefined ? undefined : data.city ?? null,
      state: data.state === undefined ? undefined : data.state ?? null,
      images:
        data.images === undefined
          ? undefined
          : {
              deleteMany: {},
              create: data.images?.map((i, idx) => ({ url: i.url, sortOrder: i.sortOrder ?? idx })) ?? [],
            },
    },
    include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, subCategory: true },
  })

  res.status(200).json({ success: true, listing })
})

router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as Request & { authUser: { id: string } }).authUser
  const existing = await prisma.listing.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    res.status(404).json({ success: false, error: 'Anúncio não encontrado' })
    return
  }
  if (existing.userId !== authUser.id) {
    res.status(403).json({ success: false, error: 'Sem permissão' })
    return
  }
  await prisma.listing.delete({ where: { id: req.params.id } })
  res.status(200).json({ success: true })
})

export default router
