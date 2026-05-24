import { Router, type Request, type Response } from 'express'
import { prisma } from '../db.js'
import { ensureSeed } from '../seed.js'

const router = Router()

let seedEnsured = false
async function ensureSeedOnce() {
  if (seedEnsured) return
  await ensureSeed()
  seedEnsured = true
}

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  await ensureSeedOnce()
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { subCategories: { orderBy: { name: 'asc' } } },
  })
  res.status(200).json({ success: true, categories })
})

export default router

