import { prisma } from './db.js'

export async function ensureSeed(): Promise<void> {
  const roupas = await prisma.category.upsert({
    where: { name: 'Roupas' },
    update: {},
    create: { name: 'Roupas' },
  })

  const roupasSubcats = [
    'Calças',
    'Blusas',
    'Camisas',
    'Camisetas',
    'Saias',
    'Shorts e Bermudas',
    'Sapatos',
    'Vestidos',
    'Praia',
  ]

  for (const name of roupasSubcats) {
    await prisma.subCategory.upsert({
      where: { categoryId_name: { categoryId: roupas.id, name } },
      update: {},
      create: { categoryId: roupas.id, name },
    })
  }

  const categories = ['Eletro/Eletrônicos', 'Utensílios para a casa', 'Móveis']
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }
}
