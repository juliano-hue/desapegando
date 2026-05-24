import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Category } from '@/lib/models'
import { useCatalog } from '@/stores/useCatalog'
import { useSession } from '@/stores/useSession'
import { ArrowLeft, Download, Trash2, UploadCloud, Wand2 } from 'lucide-react'

type ImportItem = {
  id: string
  file: File
  previewUrl: string
  status: 'pending' | 'processing' | 'done' | 'error'
  progress: number
  uploadedUrl: string | null
  listingId: string | null
  ocrText: string
  title: string
  description: string
  categoryId: string
  subCategoryId: string
  priceText: string
  priceCents: number | null
  size: string
  needsReview: boolean
  errors: string[]
}

const MAX_FILES = 200

function foldText(s: string) {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function extractPriceCents(raw: string): number | null {
  const txt = raw.replace(/\s+/g, ' ')
  const rx = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{2}))?/gi
  let best: { cents: number; idx: number } | null = null
  for (;;) {
    const m = rx.exec(txt)
    if (!m) break
    const whole = m[1].replace(/\./g, '')
    const decimals = m[2] ?? '00'
    const cents = Number.parseInt(whole, 10) * 100 + Number.parseInt(decimals, 10)
    if (!Number.isFinite(cents)) continue
    if (!best || m.index < best.idx) best = { cents, idx: m.index }
  }
  return best?.cents ?? null
}

function parsePriceText(text: string): number | null {
  const s = text.trim()
  if (!s) return null
  const cleaned = s.replace(/[^\d.,]/g, '')
  if (!cleaned) return null

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  const sep = Math.max(lastComma, lastDot)

  const wholePartRaw = sep >= 0 ? cleaned.slice(0, sep) : cleaned
  const fracPartRaw = sep >= 0 ? cleaned.slice(sep + 1) : ''

  const wholePart = wholePartRaw.replace(/[^\d]/g, '') || '0'
  const fracDigits = fracPartRaw.replace(/[^\d]/g, '')

  const whole = Number.parseInt(wholePart, 10)
  if (!Number.isFinite(whole)) return null

  let cents = 0
  if (fracDigits.length === 1) cents = Number.parseInt(fracDigits, 10) * 10
  else if (fracDigits.length >= 2) cents = Number.parseInt(fracDigits.slice(0, 2), 10)
  if (!Number.isFinite(cents)) return null

  return whole * 100 + cents
}

function formatPriceText(cents: number): string {
  return String((cents / 100).toFixed(2)).replace('.', ',')
}

function extractSize(raw: string): string {
  const t = foldText(raw)
  const tag = /(tamanho|tam\.?|size)\s*[:\-]?\s*([a-z0-9]+)/i.exec(raw)
  if (tag?.[2]) return tag[2].trim().toUpperCase()
  const alpha = /\b(pp|p|m|g|gg|xg|xxg|xgg)\b/i.exec(t)
  if (alpha?.[1]) return alpha[1].toUpperCase()
  const numeric = /\b(3[0-9]|4[0-9]|5[0-9])\b/.exec(t)
  if (numeric?.[1]) return numeric[1]
  return ''
}

function guessCategoryAndSub(text: string): { categoryName: string; subName: string } {
  const t = foldText(text)
  const has = (...words: string[]) => words.some((w) => t.includes(foldText(w)))

  if (has('calça', 'calcas')) return { categoryName: 'Roupas', subName: 'Calças' }
  if (has('blusa', 'blusas')) return { categoryName: 'Roupas', subName: 'Blusas' }
  if (has('camisa', 'camisas')) return { categoryName: 'Roupas', subName: 'Camisas' }
  if (has('camiseta', 'camisetas')) return { categoryName: 'Roupas', subName: 'Camisetas' }
  if (has('short', 'bermuda', 'shorts')) return { categoryName: 'Roupas', subName: 'Shorts e Bermudas' }
  if (has('vestido', 'vestidos')) return { categoryName: 'Roupas', subName: 'Vestidos' }
  if (has('praia', 'biquini', 'bikini', 'maio', 'sunga')) return { categoryName: 'Roupas', subName: 'Praia' }
  if (has('sapato', 'sapatos', 'tenis', 'tênis', 'sandalia', 'sandália', 'chinelo', 'bota'))
    return { categoryName: 'Roupas', subName: 'Sapatos' }

  if (has('tv', 'televis', 'televisão', 'celular', 'smartphone', 'notebook', 'laptop', 'fone', 'headset'))
    return { categoryName: 'Eletro/Eletrônicos', subName: '' }

  if (has('mesa', 'cadeira', 'sofa', 'sofá', 'armario', 'armário', 'cama', 'guarda-roupa', 'estante'))
    return { categoryName: 'Móveis', subName: '' }

  if (has('panela', 'prato', 'talher', 'copo', 'xícara', 'xicara', 'jarra', 'tapete', 'cortina'))
    return { categoryName: 'Utensílios para a casa', subName: '' }

  return { categoryName: 'Roupas', subName: '' }
}

function guessTitle(text: string, fallback: string) {
  const line = text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)[0]
  const base = (line ?? fallback).slice(0, 80).trim()
  return base || fallback
}

async function recognizeText(
  file: File,
  onProgress: (p: number) => void,
): Promise<{ text: string; errors: string[] }> {
  const errors: string[] = []
  const { default: Tesseract } = await import('tesseract.js')
  try {
    const r = await Tesseract.recognize(file, 'por', {
      logger: (m: { status?: string; progress?: number }) => {
        if (typeof m.progress === 'number') onProgress(Math.round(m.progress * 100))
      },
    })
    return { text: r.data?.text ?? '', errors }
  } catch (e) {
    errors.push('OCR falhou (por)')
  }

  try {
    const r = await Tesseract.recognize(file, 'eng', {
      logger: (m: { status?: string; progress?: number }) => {
        if (typeof m.progress === 'number') onProgress(Math.round(m.progress * 100))
      },
    })
    return { text: r.data?.text ?? '', errors }
  } catch (e) {
    errors.push('OCR falhou (eng)')
    return { text: '', errors }
  }
}

function resolveIds(categories: Category[], categoryName: string, subName: string) {
  const cat = categories.find((c) => foldText(c.name) === foldText(categoryName)) ?? null
  if (!cat) return { categoryId: '', subCategoryId: '' }
  if (!subName) return { categoryId: cat.id, subCategoryId: '' }
  const sub =
    cat.subCategories.find((s) => foldText(s.name) === foldText(subName)) ??
    cat.subCategories.find((s) => foldText(s.name).includes(foldText(subName))) ??
    null
  return { categoryId: cat.id, subCategoryId: sub?.id ?? '' }
}

async function fileToDataUrl(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  const b64 = btoa(binary)
  return `data:${file.type};base64,${b64}`
}

export default function BulkImport() {
  const nav = useNavigate()
  const session = useSession()
  const catalog = useCatalog()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [dragging, setDragging] = useState(false)
  const [items, setItems] = useState<ImportItem[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void session.load()
    void catalog.load()
  }, [])

  useEffect(() => {
    if (session.loading) return
    if (!session.user) nav('/auth')
  }, [session.user, session.loading])

  const canAddMore = items.length < MAX_FILES

  function addFiles(list: FileList | File[]) {
    setMessage(null)
    const incoming = Array.from(list).filter((f) => f.type.startsWith('image/'))
    if (incoming.length === 0) {
      setMessage('Nenhuma imagem válida foi encontrada.')
      return
    }
    const remaining = MAX_FILES - items.length
    if (remaining <= 0) {
      setMessage(`Limite de ${MAX_FILES} fotos atingido.`)
      return
    }
    const accepted = incoming.slice(0, remaining)
    if (incoming.length > accepted.length) {
      setMessage(`Você selecionou ${incoming.length} fotos. Só é possível adicionar até ${MAX_FILES}.`)
    }
    const newItems: ImportItem[] = accepted.map((file) => ({
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
      uploadedUrl: null,
      listingId: null,
      ocrText: '',
      title: '',
      description: '',
      categoryId: '',
      subCategoryId: '',
      priceText: '',
      priceCents: null,
      size: '',
      needsReview: true,
      errors: [],
    }))
    setItems((prev) => [...prev, ...newItems])
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id)
      if (it) URL.revokeObjectURL(it.previewUrl)
      return prev.filter((x) => x.id !== id)
    })
  }

  function updateItem(id: string, patch: Partial<ImportItem>) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  async function runOcr() {
    if (busy) return
    setBusy(true)
    setMessage(null)
    try {
      const ids = items.filter((i) => i.status === 'pending').map((i) => i.id)
      if (ids.length === 0) {
        setMessage('Nenhuma imagem pendente para processar.')
        return
      }

      const concurrency = 2
      const queue = [...ids]
      const workers = Array.from({ length: Math.min(concurrency, queue.length) }).map(async () => {
        for (;;) {
          const id = queue.shift()
          if (!id) break
          const it = items.find((x) => x.id === id)
          if (!it) continue
          updateItem(id, { status: 'processing', progress: 0, errors: [] })
          const { text, errors } = await recognizeText(it.file, (p) => updateItem(id, { progress: p }))
          const trimmed = text.trim()
          const priceCents = trimmed ? extractPriceCents(trimmed) : null
          const size = trimmed ? extractSize(trimmed) : ''
          const { categoryName, subName } = guessCategoryAndSub(trimmed)
          const { categoryId, subCategoryId } = resolveIds(catalog.categories, categoryName, subName)
          const title = guessTitle(trimmed, it.file.name.replace(/\.[a-z0-9]+$/i, ''))
          const description = size ? `Tamanho: ${size}\n` : ''

          const itemErrors = [...errors]
          if (!trimmed) itemErrors.push('Sem texto extraído')
          if (!priceCents) itemErrors.push('Preço não encontrado')
          if (!categoryId) itemErrors.push('Categoria não encontrada')

          updateItem(id, {
            status: itemErrors.length ? 'error' : 'done',
            progress: 100,
            ocrText: trimmed,
            title,
            description,
            categoryId,
            subCategoryId,
            priceText: priceCents === null ? '' : formatPriceText(priceCents),
            priceCents,
            size,
            errors: itemErrors,
            needsReview: itemErrors.length > 0,
          })
        }
      })

      await Promise.all(workers)
      setMessage('Processamento concluído. Revise os itens antes de finalizar.')
    } finally {
      setBusy(false)
    }
  }

  const exportPayload = useMemo(() => {
    return items.map((it) => ({
      fileName: it.file.name,
      uploadedUrl: it.uploadedUrl,
      listingId: it.listingId,
      categoryId: it.categoryId || null,
      subCategoryId: it.subCategoryId || null,
      priceCents: it.priceCents,
      size: it.size || null,
      title: it.title || null,
      description: it.description || null,
      ocrText: it.ocrText || null,
      needsReview: it.needsReview,
      errors: it.errors,
    }))
  }, [items])

  function downloadJson() {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `juliana-import-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function finalize() {
    if (busy) return
    setBusy(true)
    setMessage(null)
    try {
      const targets = items
      if (targets.length === 0) {
        setMessage('Adicione imagens para finalizar.')
        return
      }

      const missingCount = targets.filter((i) => !i.title.trim() || !i.categoryId || !i.priceCents).length
      let okCount = 0
      let errCount = 0
      const concurrency = 2
      const queue = [...targets.map((t) => t.id)]
      const workers = Array.from({ length: Math.min(concurrency, queue.length) }).map(async () => {
        for (;;) {
          const id = queue.shift()
          if (!id) break
          const it = items.find((x) => x.id === id)
          if (!it) continue

          updateItem(id, { status: 'processing', progress: 0 })

          const form = new FormData()
          form.append('file', it.file)
          const up = await apiFetch<{ url: string }>('/api/uploads/file', {
            method: 'POST',
            body: form,
          })
          if ('error' in up) {
            updateItem(id, { status: 'error', progress: 100, errors: ['Falha no upload', up.error], needsReview: true })
            errCount += 1
            continue
          }
          updateItem(id, { uploadedUrl: up.url })

          const json: Record<string, unknown> = {
            title: it.title,
            description: it.description,
            categoryId: it.categoryId,
            subCategoryId: it.subCategoryId || null,
            needsReview: Boolean(it.needsReview || !it.title.trim() || !it.categoryId || !it.priceCents),
            city: null,
            state: null,
            images: [{ url: up.url, sortOrder: 0 }],
          }
          if (it.priceCents !== null) json.priceCents = it.priceCents

          const create = await apiFetch<{ listing: { id: string } }>('/api/listings', {
            method: 'POST',
            json,
          })
          if ('error' in create) {
            updateItem(id, {
              status: 'error',
              progress: 100,
              errors: ['Falha ao criar anúncio', create.error],
              needsReview: true,
            })
            errCount += 1
            continue
          }

          updateItem(id, { status: 'done', progress: 100, needsReview: false, listingId: create.listing.id })
          okCount += 1
        }
      })

      await Promise.all(workers)
      if (errCount > 0) {
        setMessage(
          `Finalização concluída com ${okCount} sucesso(s) e ${errCount} erro(s). Revise os itens marcados como erro.`,
        )
      } else {
        setMessage(
          `Finalização concluída. ${okCount} anúncio(s) foram cadastrados.${missingCount ? ` (${missingCount} com campos pendentes)` : ''}`,
        )
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell>
      <div className="mx-auto grid max-w-5xl gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link to="/perfil">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4" />
                Perfil
              </Button>
            </Link>
            <div>
              <div className="text-sm text-slate-300">Importação</div>
              <h1 className="text-2xl font-semibold tracking-tight">Lote de imagens (até {MAX_FILES})</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="subtle" onClick={() => downloadJson()} disabled={items.length === 0}>
              <Download className="h-4 w-4" />
              Exportar JSON
            </Button>
            <Button onClick={() => void runOcr()} disabled={busy || items.length === 0}>
              <Wand2 className="h-4 w-4" />
              Processar OCR
            </Button>
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">{message}</div>
        ) : null}

        <div
          className={cn(
            'rounded-3xl border border-dashed border-white/15 bg-white/4 p-6 transition',
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
            if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
          }}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <UploadCloud className="h-6 w-6 text-emerald-200" />
            </div>
            <div className="text-sm font-semibold text-slate-100">Arraste e solte suas imagens aqui</div>
            <div className="text-xs text-slate-400">
              {canAddMore ? `Você pode adicionar mais ${MAX_FILES - items.length} foto(s).` : `Limite de ${MAX_FILES} atingido.`}
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
              <Button
                variant="subtle"
                onClick={() => inputRef.current?.click()}
                disabled={!canAddMore}
              >
                Selecionar fotos
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  items.forEach((i) => URL.revokeObjectURL(i.previewUrl))
                  setItems([])
                  setMessage(null)
                }}
                disabled={items.length === 0 || busy}
              >
                Limpar
              </Button>
            </div>
          </div>
        </div>

        {items.length ? (
          <section className="grid gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">Prévia e edição</h2>
              <Button onClick={() => void finalize()} disabled={busy || items.length === 0}>
                Finalizar cadastro
              </Button>
            </div>

            <div className="grid gap-3">
              {items.map((it) => {
                const cat = catalog.categories.find((c) => c.id === it.categoryId) ?? null
                const subs = cat?.subCategories ?? []
                return (
                  <div key={it.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/6">
                        <img src={it.previewUrl} alt="" className="h-28 w-full object-contain object-center" loading="lazy" decoding="async" />
                      </div>
                      <div className="grid gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <span
                              className={cn(
                                'rounded-lg border px-2 py-1',
                                it.status === 'done'
                                  ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
                                  : it.status === 'error'
                                    ? 'border-rose-400/20 bg-rose-500/10 text-rose-200'
                                    : 'border-white/10 bg-white/6 text-slate-200',
                              )}
                            >
                              {it.status === 'pending'
                                ? 'Pendente'
                                : it.status === 'processing'
                                  ? `Processando (${it.progress}%)`
                                  : it.status === 'done'
                                    ? it.needsReview
                                      ? 'Processado (revisar)'
                                      : 'OK'
                                    : 'Erro'}
                            </span>
                            <span className="text-slate-400">{it.file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(it.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-white/10 disabled:opacity-50"
                            disabled={busy}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remover
                          </button>
                        </div>

                        {it.errors.length ? (
                          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                            {it.errors.join(' • ')}
                          </div>
                        ) : null}

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="grid gap-2">
                            <label className="text-xs font-semibold text-slate-200">Título</label>
                            <Input
                              value={it.title}
                              onChange={(e) => updateItem(it.id, { title: e.target.value, needsReview: true })}
                              placeholder="Ex.: Vestido floral"
                            />
                          </div>
                          <div className="grid gap-2">
                            <label className="text-xs font-semibold text-slate-200">Preço (R$)</label>
                            <Input
                              inputMode="decimal"
                              value={it.priceText}
                              onChange={(e) => {
                                const priceText = e.target.value
                                updateItem(it.id, { priceText, priceCents: parsePriceText(priceText), needsReview: true })
                              }}
                              onBlur={() => {
                                const cents = parsePriceText(it.priceText)
                                if (cents === null) return
                                updateItem(it.id, { priceText: formatPriceText(cents), priceCents: cents, needsReview: true })
                              }}
                              placeholder="199,90"
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="grid gap-2">
                            <label className="text-xs font-semibold text-slate-200">Categoria</label>
                            <select
                              value={it.categoryId}
                              onChange={(e) => updateItem(it.id, { categoryId: e.target.value, subCategoryId: '', needsReview: true })}
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
                              value={it.subCategoryId}
                              onChange={(e) => updateItem(it.id, { subCategoryId: e.target.value, needsReview: true })}
                              disabled={!cat || subs.length === 0}
                              className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                            >
                              <option value="">Selecione…</option>
                              {subs.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid gap-2">
                            <label className="text-xs font-semibold text-slate-200">Tamanho (extraído)</label>
                            <Input
                              value={it.size}
                              onChange={(e) => updateItem(it.id, { size: e.target.value.toUpperCase(), needsReview: true })}
                              placeholder="P/M/G/40..."
                            />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <label className="text-xs font-semibold text-slate-200">Descrição</label>
                          <Textarea
                            value={it.description}
                            onChange={(e) => updateItem(it.id, { description: e.target.value, needsReview: true })}
                            placeholder="Detalhes do produto"
                          />
                        </div>

                        <details className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                          <summary className="cursor-pointer text-xs font-semibold text-slate-200">Texto extraído (OCR)</summary>
                          <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-300">{it.ocrText || '—'}</pre>
                        </details>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  )
}
