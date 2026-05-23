import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { apiFetch } from '@/lib/api'
import type { Listing, User, Order, Sale } from '@/lib/models'
import { useSession } from '@/stores/useSession'
import { ListingCard } from '@/components/ListingCard'
import { Shield, ShoppingBag, Store, UserRound, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react'

type Tab = 'dados' | 'anuncios' | 'compras' | 'vendas' | 'privacidade'

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: 'bg-amber-500/10 text-amber-200 border-amber-500/20',
    COMPLETED: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
    CANCELED: 'bg-rose-500/10 text-rose-200 border-rose-500/20',
  }
  const labels: Record<string, string> = {
    OPEN: 'Em andamento',
    COMPLETED: 'Concluído',
    CANCELED: 'Cancelado',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium ${styles[status] || styles.OPEN}`}>
      {status === 'OPEN' && <Clock className="h-3 w-3" />}
      {status === 'COMPLETED' && <CheckCircle className="h-3 w-3" />}
      {status === 'CANCELED' && <XCircle className="h-3 w-3" />}
      {labels[status] || status}
    </span>
  )
}

export default function Profile() {
  const nav = useNavigate()
  const location = useLocation()
  const session = useSession()
  const [tab, setTab] = useState<Tab>('dados')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingSales, setLoadingSales] = useState(false)

  const user = session.user

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [isPhonePublic, setIsPhonePublic] = useState(false)
  const [isEmailPublic, setIsEmailPublic] = useState(false)

  useEffect(() => {
    void session.load()
  }, [])

  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    const t = sp.get('tab')
    if (t === 'dados' || t === 'anuncios' || t === 'compras' || t === 'vendas' || t === 'privacidade') setTab(t)
  }, [location.search])

  useEffect(() => {
    if (session.loading) return
    if (!session.user) nav('/auth')
  }, [session.user, session.loading])

  useEffect(() => {
    if (!user) return
    setFullName(user.fullName)
    setPhone(user.phone)
    setIsPhonePublic(user.isPhonePublic)
    setIsEmailPublic(user.isEmailPublic)
  }, [user?.id])

  const tabs = useMemo(
    () =>
      [
        { id: 'dados', label: 'Dados', icon: UserRound },
        { id: 'anuncios', label: 'Anúncios', icon: Store },
        { id: 'compras', label: 'Compras', icon: ShoppingBag },
        { id: 'vendas', label: 'Vendas', icon: DollarSign },
        { id: 'privacidade', label: 'Privacidade', icon: Shield },
      ] as const,
    [],
  )

  async function loadListings() {
    const r = await apiFetch<{ listings: Listing[] }>('/api/profile/listings')
    if (r.success) setListings(r.listings)
  }

  async function loadOrders() {
    setLoadingOrders(true)
    const r = await apiFetch<{ orders: Order[] }>('/api/profile/orders')
    if (r.success) setOrders(r.orders)
    setLoadingOrders(false)
  }

  async function loadSales() {
    setLoadingSales(true)
    const r = await apiFetch<{ sales: Sale[] }>('/api/profile/sales')
    if (r.success) setSales(r.sales)
    setLoadingSales(false)
  }

  useEffect(() => {
    if (tab === 'anuncios') void loadListings()
    if (tab === 'compras') void loadOrders()
    if (tab === 'vendas') void loadSales()
  }, [tab])

  async function saveProfile() {
    setSaving(true)
    setError(null)
    const r = await apiFetch<{ user: User }>('/api/profile', {
      method: 'PATCH',
      json: { fullName, phone, isPhonePublic, isEmailPublic },
    })
    if ('error' in r) {
      setError(r.error)
      setSaving(false)
      return
    }
    await session.load()
    setSaving(false)
  }

  if (!user) return null

  return (
    <AppShell>
      <div className="grid gap-5">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm text-slate-300">Conta</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{user.fullName}</h1>
              <div className="mt-2 text-sm text-slate-300">{user.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/importar">
                <Button variant="subtle">Importar</Button>
              </Link>
              <Link to="/anunciar">
                <Button>Anunciar</Button>
              </Link>
              <Button variant="ghost" onClick={() => void session.logout()}>
                Sair
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-5">
            {tabs.map((t) => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={
                    active
                      ? 'flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-100'
                      : 'flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/4 px-3 py-2 text-sm text-slate-200 hover:bg-white/8'
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>
        </section>

        {tab === 'dados' ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
            <h2 className="text-sm font-semibold text-slate-100">Dados cadastrais</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-slate-200">Nome completo</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-slate-200">Telefone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" />
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex items-center gap-2">
              <Button onClick={() => void saveProfile()} disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </section>
        ) : null}

        {tab === 'privacidade' ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
            <h2 className="text-sm font-semibold text-slate-100">Privacidade</h2>
            <p className="mt-2 text-sm text-slate-300">
              Você controla o que outras pessoas veem no detalhe do seu anúncio.
            </p>
            <div className="mt-4 grid gap-3">
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-100">Exibir telefone</div>
                  <div className="text-xs text-slate-400">Mostra seu telefone para contato.</div>
                </div>
                <input
                  type="checkbox"
                  checked={isPhonePublic}
                  onChange={(e) => setIsPhonePublic(e.target.checked)}
                  className="h-5 w-5 accent-emerald-300"
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-100">Exibir e-mail</div>
                  <div className="text-xs text-slate-400">Mostra seu e-mail no anúncio.</div>
                </div>
                <input
                  type="checkbox"
                  checked={isEmailPublic}
                  onChange={(e) => setIsEmailPublic(e.target.checked)}
                  className="h-5 w-5 accent-emerald-300"
                />
              </label>
            </div>
            <div className="mt-5">
              <Button onClick={() => void saveProfile()} disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </section>
        ) : null}

        {tab === 'anuncios' ? (
          <section className="grid gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">Seus anúncios</h2>
              <Link to="/anunciar">
                <Button size="sm">Criar anúncio</Button>
              </Link>
            </div>
            {listings.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                Você ainda não tem anúncios. Crie o primeiro em poucos cliques.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((l) => (
                  <div key={l.id} className="grid gap-2">
                    <ListingCard listing={l} />
                    <div className="flex items-center gap-2">
                      <Link to={`/anuncio/${l.id}/editar?returnTo=${encodeURIComponent('/perfil?tab=anuncios')}`}>
                        <Button size="sm" variant="subtle">
                          Editar
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {tab === 'compras' ? (
          <section className="grid gap-3">
            <h2 className="text-sm font-semibold text-slate-100">Suas compras</h2>
            {loadingOrders ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">
                Carregando...
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                Você ainda não fez nenhuma compra. Explore os anúncios disponíveis!
              </div>
            ) : (
              <div className="grid gap-3">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/anuncio/${order.listingId}`}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/8 transition-colors"
                  >
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-white/10">
                      {order.listing?.images?.[0]?.url ? (
                        <img
                          src={order.listing.images[0].url}
                          alt={order.listing.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-500">
                          Sem foto
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate text-sm font-medium text-slate-100">
                        {order.listing?.title || 'Produto'}
                      </h3>
                      <p className="mt-1 text-sm text-emerald-300">
                        {order.listing ? formatMoney(order.listing.priceCents) : ''}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {tab === 'vendas' ? (
          <section className="grid gap-3">
            <h2 className="text-sm font-semibold text-slate-100">Suas vendas</h2>
            {loadingSales ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">
                Carregando...
              </div>
            ) : sales.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                Você ainda não tem vendas. Crie anúncios para começar a vender!
              </div>
            ) : (
              <div className="grid gap-3">
                {sales.map((sale) => (
                  <Link
                    key={sale.id}
                    to={`/anuncio/${sale.listingId}`}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/8 transition-colors"
                  >
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-white/10">
                      {sale.listing?.images?.[0]?.url ? (
                        <img
                          src={sale.listing.images[0].url}
                          alt={sale.listing.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-500">
                          Sem foto
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate text-sm font-medium text-slate-100">
                        {sale.listing?.title || 'Produto'}
                      </h3>
                      <p className="mt-1 text-sm text-emerald-300">
                        {sale.listing ? formatMoney(sale.listing.priceCents) : ''}
                      </p>
                    </div>
                    <StatusBadge status={sale.status} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </AppShell>
  )
}
