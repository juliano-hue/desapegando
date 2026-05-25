import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { ListingCard } from '@/components/ListingCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { apiFetch } from '@/lib/api'
import type { Listing } from '@/lib/models'
import { useCatalog } from '@/stores/useCatalog'

type ListingsResponse = { listings: Listing[]; total: number; page: number; pageSize: number }

export default function Home() {
  const catalog = useCatalog()
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [subCategoryId, setSubCategoryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  useEffect(() => {
    void catalog.load()
  }, [])

  const selectedCategory = useMemo(
    () => catalog.categories.find((c) => c.id === categoryId) ?? null,
    [catalog.categories, categoryId],
  )

  async function loadListings(nextPage = 1) {
    setLoading(true)
    const params = new URLSearchParams()
    if (query.trim()) params.set('query', query.trim())
    if (categoryId) params.set('categoryId', categoryId)
    if (subCategoryId) params.set('subCategoryId', subCategoryId)
    params.set('page', String(nextPage))
    const r = await apiFetch<ListingsResponse>(`/api/listings?${params.toString()}`)
    if (r.success) {
      setListings((prev) => (nextPage === 1 ? r.listings : [...prev, ...r.listings]))
      setTotal(r.total)
      setPage(r.page)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadListings(1)
  }, [categoryId, subCategoryId])

  return (
    <AppShell>
      <div className="grid gap-5">
        <section className="rounded-3xl border border-emerald-300/20 bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-indigo-500/10 p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-200" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por título ou descrição…"
                className="pl-10 ring-1 ring-white/10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void loadListings(1)
                }}
                aria-label="Buscar anúncios"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" onClick={() => void loadListings(1)} disabled={loading}>
                Buscar
              </Button>
              <Button variant="subtle" onClick={() => void loadListings(1)} disabled={loading}>
                Atualizar
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <div className="text-xs font-semibold text-slate-100">Categoria</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setCategoryId(null)
                    setSubCategoryId(null)
                  }}
                  className={
                    categoryId === null
                      ? 'rounded-full bg-emerald-300 px-3 py-1 text-xs font-semibold text-slate-950 shadow-sm shadow-emerald-400/30 ring-2 ring-emerald-200/60'
                      : 'rounded-full bg-white/8 px-3 py-1 text-xs text-slate-100 ring-1 ring-white/10 hover:bg-white/12'
                  }
                >
                  Todas
                </button>
                {catalog.categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCategoryId(c.id)
                      setSubCategoryId(null)
                    }}
                    className={
                      c.id === categoryId
                        ? 'rounded-full bg-emerald-300 px-3 py-1 text-xs font-semibold text-slate-950 shadow-sm shadow-emerald-400/30 ring-2 ring-emerald-200/60'
                        : 'rounded-full bg-white/8 px-3 py-1 text-xs text-slate-100 ring-1 ring-white/10 hover:bg-white/12'
                    }
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <div className="text-xs font-semibold text-slate-100">Subcategoria</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setSubCategoryId(null)}
                  className={
                    subCategoryId === null
                      ? 'rounded-full bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-950 shadow-sm shadow-cyan-400/30 ring-2 ring-cyan-200/60'
                      : 'rounded-full bg-white/8 px-3 py-1 text-xs text-slate-100 ring-1 ring-white/10 hover:bg-white/12'
                  }
                >
                  Todas
                </button>
                {(selectedCategory?.subCategories ?? []).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSubCategoryId(s.id)}
                    className={
                      s.id === subCategoryId
                        ? 'rounded-full bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-950 shadow-sm shadow-cyan-400/30 ring-2 ring-cyan-200/60'
                        : 'rounded-full bg-white/8 px-3 py-1 text-xs text-slate-100 ring-1 ring-white/10 hover:bg-white/12'
                    }
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              {!selectedCategory ? (
                <div className="mt-3 text-xs text-slate-200/80">Escolha uma categoria para ver subcategorias.</div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm text-slate-300">Marketplace</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
                Compre e venda usado sem drama
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Anuncie em poucos passos, navegue por categorias e encontre boas oportunidades. Simples o suficiente para qualquer pessoa usar.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => void loadListings(1)} disabled={loading}>
                Atualizar
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-300">
              {total > 0 ? (
                <span>
                  <span className="text-slate-100 font-semibold">{total}</span> anúncios encontrados
                </span>
              ) : (
                <span>Nenhum anúncio ainda. Seja o primeiro a desapegar.</span>
              )}
            </div>
            {total > listings.length ? (
              <Button variant="ghost" onClick={() => void loadListings(page + 1)} disabled={loading}>
                Carregar mais
              </Button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`sk-${i}`}
                  className="h-[320px] animate-pulse rounded-2xl border border-white/10 bg-white/5"
                />
              ))
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
