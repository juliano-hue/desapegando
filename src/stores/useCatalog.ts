import { create } from 'zustand'
import { apiFetch } from '@/lib/api'
import type { Category } from '@/lib/models'

type CatalogState = {
  categories: Category[]
  loading: boolean
  load: () => Promise<void>
}

export const useCatalog = create<CatalogState>((set, get) => ({
  categories: [],
  loading: false,
  load: async () => {
    if (get().loading) return
    set({ loading: true })
    const r = await apiFetch<{ categories: Category[] }>('/api/categories')
    if (r.success) set({ categories: r.categories })
    set({ loading: false })
  },
}))

