import { Router, type Request, type Response } from 'express'
import { prisma } from '../db.js'

const router = Router()

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { subCategories: { orderBy: { name: 'asc' } } },
  })
  res.status(200).json({ success: true, categories })
})

export default router

