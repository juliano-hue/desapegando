import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Home, PlusSquare, UserRound } from 'lucide-react'

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  const items = [
    { to: '/', label: 'Explorar', icon: Home },
    { to: '/anunciar', label: 'Anunciar', icon: PlusSquare },
    { to: '/perfil', label: 'Perfil', icon: UserRound },
  ]

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-50">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -bottom-56 right-[-160px] h-[560px] w-[560px] rounded-full bg-cyan-400/8 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_0%,rgba(255,255,255,0.06),transparent_55%),radial-gradient(900px_circle_at_80%_40%,rgba(52,211,153,0.06),transparent_55%)]" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/8 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="group inline-flex items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight text-slate-50">Lugar</span>
            <span className="text-lg font-semibold tracking-tight text-emerald-300">de desapegar</span>
            <span className="ml-2 hidden text-xs text-slate-400 group-hover:text-slate-300 md:inline">
              simples • direto • humano
            </span>
          </Link>
          <Link
            to="/auth"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Entrar / cadastrar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-5">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-slate-950/90 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-3 px-2">
          {items.map((it) => {
            const active = location.pathname === it.to
            const Icon = it.icon
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-3 text-xs',
                  active ? 'text-emerald-300' : 'text-slate-300 hover:text-slate-100',
                )}
              >
                <Icon className={cn('h-5 w-5', active ? 'stroke-[2.5]' : 'stroke-[2]')} />
                <span className="leading-none">{it.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

