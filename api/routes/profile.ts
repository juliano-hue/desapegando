import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

const patchSchema = z.object({
  fullName: z.string().min(3).optional(),
  phone: z.string().min(0).optional(),
  isPhonePublic: z.boolean().optional(),
  isEmailPublic: z.boolean().optional(),
})

router.patch('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as Request & { authUser: { id: string } }).authUser
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Dados inválidos' })
    return
  }
  const user = await prisma.user.update({
    where: { id: authUser.id },
    data: parsed.data,
    select: { id: true, fullName: true, email: true, phone: true, isEmailPublic: true, isPhonePublic: true },
  })
  res.status(200).json({ success: true, user })
})

router.get('/listings', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as Request & { authUser: { id: string } }).authUser
  const listings = await prisma.listing.findMany({
    where: { userId: authUser.id },
    orderBy: { createdAt: 'desc' },
    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, category: true, subCategory: true },
  })
  res.status(200).json({ success: true, listings })
})

router.get('/listings/next-pending', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as Request & { authUser: { id: string } }).authUser
  const afterId = (req.query.afterId as string | undefined)?.trim()

  if (!afterId) {
    const first = await prisma.listing.findFirst({
      where: { userId: authUser.id, needsReview: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
    })
    res.status(200).json({ success: true, listingId: first?.id ?? null })
    return
  }

  const current = await prisma.listing.findUnique({
    where: { id: afterId },
    select: { id: true, userId: true, createdAt: true },
  })
  if (!current || current.userId !== authUser.id) {
    res.status(404).json({ success: false, error: 'Anúncio não encontrado' })
    return
  }

  const next = await prisma.listing.findFirst({
    where: {
      userId: authUser.id,
      needsReview: true,
      OR: [
        { createdAt: { lt: current.createdAt } },
        { createdAt: current.createdAt, id: { lt: current.id } },
      ],
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { id: true },
  })

  res.status(200).json({ success: true, listingId: next?.id ?? null })
})

router.get('/orders', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as Request & { authUser: { id: string } }).authUser
  const orders = await prisma.order.findMany({
    where: { buyerId: authUser.id },
    orderBy: { createdAt: 'desc' },
    include: {
      listing: {
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          category: true,
        },
      },
    },
  })
  res.status(200).json({ success: true, orders })
})

router.get('/sales', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as Request & { authUser: { id: string } }).authUser
  const sales = await prisma.sale.findMany({
    where: { sellerId: authUser.id },
    orderBy: { createdAt: 'desc' },
    include: {
      listing: {
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          category: true,
        },
      },
    },
  })
  res.status(200).json({ success: true, sales })
})

export default router
