import { create } from 'zustand'
import { apiFetch } from '@/lib/api'
import type { User } from '@/lib/models'

type SessionState = {
  user: User | null
  loading: boolean
  load: () => Promise<void>
  logout: () => Promise<void>
}

export const useSession = create<SessionState>((set, get) => ({
  user: null,
  loading: false,
  load: async () => {
    if (get().loading) return
    set({ loading: true })
    const r = await apiFetch<{ user: User | null }>('/api/auth/me')
    if (r.success) set({ user: r.user })
    set({ loading: false })
  },
  logout: async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' })
    set({ user: null })
  },
}))

