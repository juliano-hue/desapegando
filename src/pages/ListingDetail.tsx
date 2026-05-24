import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { apiFetch } from '@/lib/api'
import type { Listing } from '@/lib/models'
import { useSession } from '@/stores/useSession'
import { ChevronLeft, Mail, MapPin, Phone, Tag } from 'lucide-react'

function formatMoneyBRL(cents: number) {
  const v = cents / 100
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function digitsOnly(v: string) {
  return v.replace(/\D/g, '')
}

function formatBrazilPhone(digits: string) {
  const d = digitsOnly(digits).slice(0, 11)
  const ddd = d.slice(0, 2)
  const rest = d.slice(2)
  if (!ddd) return ''
  if (!rest) return `(${ddd}`
  if (rest.length <= 4) return `(${ddd}) ${rest}`
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
}

function normalizeWhatsAppToWaMe(phone: string): string | null {
  const d = digitsOnly(phone)
  if (!d) return null
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return d
  if (d.length === 10 || d.length === 11) return `55${d}`
  return null
}

export default function ListingDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const session = useSession()
  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [sellBusy, setSellBusy] = useState(false)
  const [sellInfo, setSellInfo] = useState<string | null>(null)
  const [reserveName, setReserveName] = useState('')
  const [reservePhoneDigits, setReservePhoneDigits] = useState('')
  const [reserveTouched, setReserveTouched] = useState<{ name: boolean; phone: boolean }>({ name: false, phone: false })
  const [reserveBusy, setReserveBusy] = useState(false)
  const [reserveInfo, setReserveInfo] = useState<string | null>(null)

  useEffect(() => {
    void session.load()
  }, [])

  useEffect(() => {
    if (!id) return
    void (async () => {
      const r = await apiFetch<{ listing: Listing }>(`/api/listings/${id}`)
      if ('error' in r) {
        setError(r.error)
        return
      }
      setListing(r.listing)
      setActiveImage(0)
      setSellInfo(null)
    })()
  }, [id])

  const cover = listing?.images?.[activeImage]?.url ?? listing?.images?.[0]?.url ?? null
  const seller = listing?.user
  const isOwner = Boolean(listing && session.user?.id && seller?.id && session.user.id === seller.id)
  const contactBlocked = Boolean(listing?.status === 'SOLD' && !isOwner)
  const canShowPhone = Boolean(seller?.isPhonePublic && seller.phone)
  const canShowEmail = Boolean(seller?.isEmailPublic && seller.email)
  const sellerWaMe = seller?.phone ? normalizeWhatsAppToWaMe(seller.phone) : null

  const reserveNameOk = reserveName.trim().length > 0 && reserveName.trim().length <= 100
  const reservePhoneOk = reservePhoneDigits.length === 10 || reservePhoneDigits.length === 11
  const canReserve = Boolean(
    listing && seller && session.user?.id !== seller.id && sellerWaMe && reserveNameOk && reservePhoneOk && !contactBlocked,
  )

  const nameError = !reserveNameOk ? 'Informe seu nome (até 100 caracteres).' : null
  const phoneError = !reservePhoneOk ? 'Informe um telefone válido com DDD.' : null

  const contactHint = useMemo(() => {
    if (!seller) return null
    if (contactBlocked) return 'Este anúncio foi vendido. Contato e reserva estão indisponíveis.'
    if (session.user?.id === seller.id) return 'Este anúncio é seu.'
    if (!canShowPhone && !canShowEmail) return 'O vendedor preferiu não exibir contato público.'
    return null
  }, [seller?.id, session.user?.id, canShowPhone, canShowEmail, contactBlocked])

  return (
    <AppShell>
      <div className="grid gap-5">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => nav(-1)}>
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            {listing && session.user?.id === seller?.id ? (
              <>
                {listing.status !== 'SOLD' ? (
                  <Button
                    variant="subtle"
                    disabled={sellBusy}
                    onClick={() => {
                      if (!listing || sellBusy) return
                      setSellBusy(true)
                      setSellInfo(null)
                      void (async () => {
                        const r = await apiFetch<{ listing: Listing }>(`/api/listings/${listing.id}`, {
                          method: 'PATCH',
                          json: { status: 'SOLD' },
                        })
                        if ('error' in r) {
                          setSellInfo(r.error)
                          setSellBusy(false)
                          return
                        }
                        const fetched = await apiFetch<{ listing: Listing }>(`/api/listings/${listing.id}`)
                        if ('error' in fetched) {
                          setSellInfo(fetched.error)
                          setSellBusy(false)
                          return
                        }
                        setListing(fetched.listing)
                        setSellBusy(false)
                        setSellInfo('Anúncio marcado como vendido.')
                      })()
                    }}
                  >
                    {sellBusy ? 'Marcando…' : 'Marcar como vendido'}
                  </Button>
                ) : null}
                <Link to={`/anuncio/${listing.id}/editar`}>
                  <Button variant="subtle">Editar</Button>
                </Link>
              </>
            ) : null}
            <Link to="/">
              <Button variant="subtle">Explorar</Button>
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {listing ? (
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
              <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
                <div className="space-y-2">
                  <div className="text-sm text-slate-300">Anúncio</div>
                  <h1 className="text-2xl font-semibold tracking-tight">{listing.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" />
                      {listing.category?.name}
                    </span>
                    {listing.subCategory?.name ? (
                      <span className="rounded-md bg-white/6 px-2 py-0.5 text-[11px] text-slate-200">
                        {listing.subCategory.name}
                      </span>
                    ) : null}
                    {listing.city || listing.state ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {[listing.city, listing.state].filter(Boolean).join(' • ')}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-300/18 bg-emerald-300/10 p-4">
                  <div className="text-xs font-semibold text-emerald-100">Preço</div>
                  <div className="mt-1 text-2xl font-semibold text-emerald-200">{formatMoneyBRL(listing.priceCents)}</div>
                  <div className="mt-2 text-xs text-slate-200/80">Negociação combinada diretamente com o vendedor.</div>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/4">
                <div className="relative aspect-[16/10] w-full bg-white/6">
                  {cover ? (
                    <img src={cover} alt={listing.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">Sem fotos</div>
                  )}
                  {listing.status === 'SOLD' ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <div className="rounded-2xl border border-white/20 bg-black/50 px-8 py-4 text-xl font-semibold tracking-[0.35em] text-white">
                        VENDIDO
                      </div>
                    </div>
                  ) : null}
                </div>
                {listing.images.length > 1 ? (
                  <div className="grid grid-cols-6 gap-2 p-3">
                    {listing.images.slice(0, 6).map((img, i) => (
                      <button
                        key={img.url}
                        onClick={() => setActiveImage(i)}
                        className={
                          i === activeImage
                            ? 'overflow-hidden rounded-2xl ring-2 ring-emerald-300/70'
                            : 'overflow-hidden rounded-2xl opacity-80 hover:opacity-100'
                        }
                        aria-label={`Selecionar imagem ${i + 1}`}
                      >
                        <img src={img.url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-5">
                <h2 className="text-sm font-semibold text-slate-100">Descrição</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{listing.description}</p>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
              <h2 className="text-sm font-semibold text-slate-100">Vendedor</h2>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className="text-sm font-semibold text-slate-100">{seller?.fullName ?? 'Usuário'}</div>
                <div className="mt-1 text-xs text-slate-400">
                  Contato aparece de acordo com a privacidade definida pelo vendedor.
                </div>
              </div>

              {contactHint ? (
                <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-slate-300">
                  {contactHint}
                </div>
              ) : null}

              {sellInfo ? (
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/4 p-4 text-sm text-slate-200">
                  {sellInfo}
                </div>
              ) : null}

              <div className="mt-4 grid gap-2">
                {canShowPhone && !contactBlocked ? (
                  <a
                    href={`tel:${seller?.phone}`}
                    className="inline-flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-100 hover:bg-white/10"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Phone className="h-4 w-4 text-emerald-200" />
                      Telefone
                    </span>
                    <span className="text-slate-200">{seller?.phone}</span>
                  </a>
                ) : null}

                {canShowEmail && !contactBlocked ? (
                  <a
                    href={`mailto:${seller?.email}`}
                    className="inline-flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-100 hover:bg-white/10"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Mail className="h-4 w-4 text-cyan-200" />
                      E-mail
                    </span>
                    <span className="truncate text-slate-200">{seller?.email}</span>
                  </a>
                ) : null}
              </div>

              {sellerWaMe && session.user?.id !== seller?.id && !contactBlocked ? (
                <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-slate-100">Reservar pelo WhatsApp</div>
                  <div className="mt-1 text-xs text-slate-300">
                    Preencha seus dados e abra uma conversa com o vendedor. Não guardamos nenhuma informação.
                  </div>

                  {reserveInfo ? (
                    <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
                      {reserveInfo}
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-slate-200">Nome completo</label>
                      <Input
                        value={reserveName}
                        maxLength={100}
                        onChange={(e) => {
                          setReserveName(e.target.value)
                          setReserveInfo(null)
                        }}
                        onBlur={() => setReserveTouched((p) => ({ ...p, name: true }))}
                        placeholder="Seu nome"
                      />
                      {reserveTouched.name && nameError ? <div className="text-xs text-rose-200">{nameError}</div> : null}
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-slate-200">Telefone</label>
                      <Input
                        value={formatBrazilPhone(reservePhoneDigits)}
                        inputMode="tel"
                        onChange={(e) => {
                          const d = digitsOnly(e.target.value).slice(0, 11)
                          setReservePhoneDigits(d)
                          setReserveInfo(null)
                        }}
                        onBlur={() => setReserveTouched((p) => ({ ...p, phone: true }))}
                        placeholder="(11) 99999-9999"
                      />
                      {reserveTouched.phone && phoneError ? <div className="text-xs text-rose-200">{phoneError}</div> : null}
                    </div>

                    <Button
                      onClick={() => {
                        setReserveTouched({ name: true, phone: true })
                        if (!listing || !sellerWaMe) return
                        if (!reserveNameOk || !reservePhoneOk) return
                        if (reserveBusy) return

                        setReserveBusy(true)
                        setReserveInfo('Abrindo WhatsApp…')

                        const photoUrl = listing.images?.[0]?.url
                        const msg =
                          `Olá! Meu nome é ${reserveName.trim()}.\n` +
                          `Meu telefone: ${formatBrazilPhone(reservePhoneDigits)}.\n\n` +
                          `Tenho interesse no anúncio: "${listing.title}" (ID: ${listing.id}).\n` +
                          `Podemos conversar para finalizar a negociação?` +
                          (photoUrl ? `\n\nFoto: ${photoUrl}` : '')

                        const url = `https://wa.me/${sellerWaMe}?text=${encodeURIComponent(msg)}`
                        window.open(url, '_blank', 'noopener,noreferrer')
                        window.setTimeout(() => {
                          setReserveBusy(false)
                          setReserveInfo('WhatsApp aberto. Se não abrir automaticamente, verifique o bloqueio de pop-up do navegador.')
                        }, 1200)
                      }}
                      disabled={!canReserve || reserveBusy}
                    >
                      {reserveBusy ? 'Abrindo WhatsApp…' : 'Reservar'}
                    </Button>
                  </div>
                </div>
              ) : null}

              {!sellerWaMe && session.user?.id !== seller?.id && !contactBlocked ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-slate-300">
                  Reserva pelo WhatsApp indisponível: o vendedor não tem telefone cadastrado.
                </div>
              ) : null}

              {!session.user ? (
                <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                  Entre para salvar anúncios, anunciar e acompanhar compras/vendas.
                  <div className="mt-3">
                    <Link to="/auth">
                      <Button size="sm">Entrar</Button>
                    </Link>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}
