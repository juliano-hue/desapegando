import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { apiFetch } from '@/lib/api'
import type { Category, Listing } from '@/lib/models'
import { useCatalog } from '@/stores/useCatalog'
import { useSession } from '@/stores/useSession'
import { ImagePlus, Trash2, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function EditListing() {
  const { id } = useParams()
  const nav = useNavigate()
  const location = useLocation()
  const session = useSession()
  const catalog = useCatalog()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [subCategoryId, setSubCategoryId] = useState<string>('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [initialCoverUrl, setInitialCoverUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('ACTIVE')
  const [busy, setBusy] = useState(false)
  const [sellBusy, setSellBusy] = useState(false)
  const [sellInfo, setSellInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingListing, setLoadingListing] = useState(true)
  const [postSaveOpen, setPostSaveOpen] = useState(false)
  const [postSaveMessage, setPostSaveMessage] = useState<string | null>(null)
  const [postSaveBusy, setPostSaveBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const MAX_IMAGES = 8
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024

  useEffect(() => {
    void session.load()
    void catalog.load()
  }, [])

  useEffect(() => {
    if (!id) return
    setError(null)
    setBusy(false)
    setPostSaveOpen(false)
    setPostSaveMessage(null)
    setPostSaveBusy(false)
    setDragging(false)
    setInitialCoverUrl(null)
    setStatus('ACTIVE')
    setSellBusy(false)
    setSellInfo(null)
  }, [id])

  useEffect(() => {
    if (session.loading) return
    if (!session.user) nav('/auth')
  }, [session.user, session.loading])

  useEffect(() => {
    if (!id) return
    void (async () => {
      setLoadingListing(true)
      const r = await apiFetch<{ listing: Listing }>(`/api/listings/${id}`)
      if ('error' in r) {
        setError(r.error)
        setLoadingListing(false)
        return
      }
      const l = r.listing
      if (session.user?.id && l.user?.id && l.user.id !== session.user.id) {
        setError('Você não tem permissão para editar este anúncio.')
        setLoadingListing(false)
        return
      }
      setTitle(l.title)
      setDescription(l.description)
      setPrice(String((l.priceCents / 100).toFixed(2)).replace('.', ','))
      setCategoryId(l.category?.id ?? '')
      setSubCategoryId(l.subCategory?.id ?? '')
      setCity(l.city ?? '')
      setState(l.state ?? '')
      setStatus(l.status ?? 'ACTIVE')
      const urls = (l.images ?? []).map((i) => i.url)
      setImages(urls)
      setInitialCoverUrl(urls[0] ?? null)
      setLoadingListing(false)
    })()
  }, [id, session.user?.id])

  const selectedCategory: Category | null = useMemo(
    () => catalog.categories.find((c) => c.id === categoryId) ?? null,
    [catalog.categories, categoryId],
  )

  const returnTo = useMemo(() => {
    const sp = new URLSearchParams(location.search)
    return sp.get('returnTo') || '/perfil?tab=anuncios'
  }, [location.search])

  function validateImageFile(file: File): string | null {
    if (!file.type || !file.type.toLowerCase().startsWith('image/')) return 'Formato não suportado (envie uma imagem).'
    if (file.size > MAX_IMAGE_BYTES) return 'Imagem muito grande. Envie um arquivo menor.'
    return null
  }

  async function uploadFile(file: File) {
    const form = new FormData()
    form.append('file', file)
    const r = await apiFetch<{ url: string }>('/api/uploads/file', { method: 'POST', body: form })
    if ('error' in r) throw new Error(r.error)
    return r.url
  }

  async function onPickFiles(files: FileList | File[] | null) {
    const list = files ? Array.from(files) : []
    if (list.length === 0) return
    setError(null)
    setBusy(true)
    try {
      const urls: string[] = []
      const canAdd = Math.max(0, MAX_IMAGES - images.length)
      for (const f of list.slice(0, canAdd)) {
        const v = validateImageFile(f)
        if (v) throw new Error(v)
        const url = await uploadFile(f)
        urls.push(url)
      }
      setImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function goNextPending() {
    if (!id) return
    setError(null)
    setPostSaveMessage(null)
    setPostSaveBusy(true)
    try {
      const r = await apiFetch<{ listingId: string | null }>(`/api/profile/listings/next-pending?afterId=${encodeURIComponent(id)}`)
      if ('error' in r) {
        setPostSaveMessage(r.error)
        return
      }
      if (!r.listingId) {
        setPostSaveMessage('Não existem mais anúncios pendentes de edição. Voltando para sua dashboard em 5 segundos…')
        window.setTimeout(() => nav(returnTo), 5000)
        return
      }
      nav(`/anuncio/${r.listingId}/editar${location.search}`)
    } finally {
      setPostSaveBusy(false)
    }
  }

  async function save() {
    if (!id) return
    setError(null)
    setBusy(true)
    const priceCents = Math.round(Number(String(price).replace(',', '.')) * 100)
    const r = await apiFetch<{ listing: Listing }>(`/api/listings/${id}`, {
      method: 'PATCH',
      json: {
        title,
        description,
        priceCents: Number.isFinite(priceCents) ? priceCents : 0,
        categoryId,
        subCategoryId: subCategoryId || null,
        needsReview: false,
        city: city || null,
        state: state || null,
        images: images.map((url, idx) => ({ url, sortOrder: idx })),
      },
    })
    if ('error' in r) {
      setError(r.error)
      setBusy(false)
      return
    }
    setBusy(false)
    setPostSaveMessage(null)
    setPostSaveOpen(true)
  }

  const currentCoverUrl = images[0] ?? null
  const canAddMore = images.length < MAX_IMAGES

  return (
    <AppShell>
      <div className="mx-auto grid max-w-3xl gap-5">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm text-slate-300">Editar anúncio</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Atualize seu anúncio</h1>
              <p className="mt-2 text-sm text-slate-300">Mantenha as informações atualizadas antes de negociar.</p>
            </div>
            <div className="flex items-center justify-between gap-2 md:justify-end">
              <Button
                variant="subtle"
                onClick={() => void goNextPending()}
                disabled={busy || loadingListing || postSaveBusy}
                aria-label="Ir para o próximo anúncio pendente de edição"
              >
                Próximo pendente
              </Button>
            </div>
          </div>
        </section>

        {postSaveOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="postsave-title"
          >
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-5">
              <div id="postsave-title" className="text-sm font-semibold text-slate-100">
                Alterações salvas
              </div>
              <div className="mt-2 text-sm text-slate-300">
                {postSaveMessage ?? 'O que você quer fazer agora?'}
              </div>

              <div className="mt-4 grid gap-2">
                <Button onClick={() => void goNextPending()} disabled={postSaveBusy}>
                  Atualizar próximo anúncio não editado
                </Button>
                <Button variant="subtle" onClick={() => nav(returnTo)} disabled={postSaveBusy}>
                  Voltar para a dashboard do anunciante
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setPostSaveOpen(false)}
                  disabled={postSaveBusy}
                  aria-label="Fechar confirmação"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {loadingListing ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">Carregando…</section>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
        ) : null}

        {sellInfo ? (
          <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-slate-200">{sellInfo}</div>
        ) : null}

        {!loadingListing && !error ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr] md:items-start">
                <div className="rounded-3xl border border-white/10 bg-white/4 p-3">
                  <div className="text-xs font-semibold text-slate-200">Imagem principal</div>
                  <div className="relative mt-2 overflow-hidden rounded-2xl border border-white/10 bg-white/6">
                    {initialCoverUrl ? (
                      <img src={initialCoverUrl} alt="Imagem principal do anúncio" className="aspect-square w-full object-contain object-center" decoding="async" />
                    ) : currentCoverUrl ? (
                      <img src={currentCoverUrl} alt="Imagem principal do anúncio" className="aspect-square w-full object-contain object-center" decoding="async" />
                    ) : (
                      <div className="flex aspect-square items-center justify-center text-sm text-slate-400">Sem foto</div>
                    )}
                    {status === 'SOLD' ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <div className="rounded-2xl border border-white/20 bg-black/50 px-6 py-3 text-lg font-semibold tracking-[0.35em] text-white">
                          VENDIDO
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {initialCoverUrl && currentCoverUrl && currentCoverUrl !== initialCoverUrl ? (
                    <div className="mt-2 text-xs text-slate-300">Uma nova foto foi adicionada, mas a imagem original continua visível durante a edição.</div>
                  ) : null}
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold text-slate-200">Título</label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: iPhone 12 conservado" />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-semibold text-slate-200">Descrição</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Conte o estado do produto, defeitos, acessórios e condições de retirada/entrega."
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-slate-200">Preço (R$)</label>
                      <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="199,90" inputMode="decimal" />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-slate-200">Cidade</label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Opcional" />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-slate-200">UF</label>
                      <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Opcional" maxLength={2} />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-slate-200">Categoria</label>
                      <select
                        value={categoryId}
                        onChange={(e) => {
                          setCategoryId(e.target.value)
                          setSubCategoryId('')
                        }}
                        className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                      >
                        <option value="">Selecione…</option>
                        {catalog.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-slate-200">Subcategoria</label>
                      <select
                        value={subCategoryId}
                        onChange={(e) => setSubCategoryId(e.target.value)}
                        disabled={!selectedCategory || selectedCategory.subCategories.length === 0}
                        className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                      >
                        <option value="">Selecione…</option>
                        {(selectedCategory?.subCategories ?? []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  'rounded-3xl border border-dashed border-white/15 bg-white/4 p-4 transition',
                  dragging ? 'bg-emerald-300/10 border-emerald-300/30' : '',
                )}
                onDragEnter={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragging(true)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragging(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragging(false)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragging(false)
                  const files = e.dataTransfer.files
                  void onPickFiles(files)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
                }}
                aria-label="Arraste e solte imagens aqui para adicionar ao anúncio"
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <UploadCloud className="h-6 w-6 text-emerald-200" />
                  </div>
                  <div className="text-sm font-semibold text-slate-100">Arraste e solte fotos aqui</div>
                  <div className="text-xs text-slate-400">
                    {canAddMore ? `Você pode adicionar mais ${MAX_IMAGES - images.length} foto(s).` : `Limite de ${MAX_IMAGES} fotos atingido.`}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        void onPickFiles(e.target.files)
                        e.target.value = ''
                      }}
                    />
                    <Button variant="subtle" onClick={() => fileInputRef.current?.click()} disabled={!canAddMore || busy}>
                      <ImagePlus className="h-4 w-4" />
                      Selecionar fotos
                    </Button>
                  </div>
                  <div className="text-xs text-slate-400">Formatos: imagens. Tamanho máximo: 8MB por arquivo.</div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-100">Fotos do anúncio</div>
                  <div className="text-xs text-slate-400">{images.length}/{MAX_IMAGES}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {images.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/6">
                      <img src={url} alt={`Foto ${idx + 1}`} className="aspect-square w-full object-contain object-center" loading="lazy" decoding="async" />
                      <button
                        type="button"
                        onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                        className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950/70 text-slate-100 hover:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
                        aria-label="Remover foto"
                        disabled={busy}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {images.length === 0 ? (
                    <div className="col-span-2 rounded-2xl border border-dashed border-white/15 bg-white/3 p-4 text-sm text-slate-300 md:col-span-4">
                      Você pode publicar sem fotos, mas anúncios com foto vendem mais rápido.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Link to={`/anuncio/${id}`}>
                  <Button variant="ghost">Cancelar</Button>
                </Link>
                <div className="flex items-center gap-2">
                  {status !== 'SOLD' ? (
                    <Button
                      variant="subtle"
                      disabled={busy || sellBusy}
                      onClick={() => {
                        if (!id) return
                        if (sellBusy) return
                        setSellBusy(true)
                        setSellInfo(null)
                        void (async () => {
                          const r = await apiFetch<{ listing: Listing }>(`/api/listings/${id}`, {
                            method: 'PATCH',
                            json: { status: 'SOLD' },
                          })
                          if ('error' in r) {
                            setSellInfo(r.error)
                            setSellBusy(false)
                            return
                          }
                          setStatus(r.listing.status ?? 'SOLD')
                          setSellBusy(false)
                          setSellInfo('Anúncio marcado como vendido.')
                        })()
                      }}
                    >
                      {sellBusy ? 'Marcando…' : 'Marcar como vendido'}
                    </Button>
                  ) : null}
                  <Button onClick={() => void save()} disabled={busy}>
                    {busy ? 'Salvando…' : 'Salvar alterações'}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  )
}
