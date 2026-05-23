import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { apiFetch } from '@/lib/api'
import type { User } from '@/lib/models'
import { useSession } from '@/stores/useSession'
import { Chrome, Eye, EyeOff } from 'lucide-react'

type Mode = 'login' | 'register'

export default function Auth() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const session = useSession()
  const [mode, setMode] = useState<Mode>('login')
  const [googleEnabled, setGoogleEnabled] = useState<boolean>(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const e = params.get('e')
    if (e === 'google') setError('Não foi possível entrar com o Google. Tente novamente.')
    if (e === 'google_not_configured') setError('Login com Google ainda não está configurado neste ambiente.')
  }, [params])

  useEffect(() => {
    void session.load()
    void (async () => {
      const r = await apiFetch<{ providers: { google: boolean } }>('/api/auth/providers')
      if (r.success) setGoogleEnabled(Boolean(r.providers.google))
    })()
  }, [])

  useEffect(() => {
    if (session.user) nav('/perfil')
  }, [session.user])

  const title = useMemo(() => (mode === 'login' ? 'Entrar' : 'Criar conta'), [mode])

  async function submit() {
    setError(null)
    if (mode === 'register') {
      if (password.length < 8) {
        setError('A senha deve ter pelo menos 8 caracteres.')
        return
      }
      if (password !== confirmPassword) {
        setError('As senhas não conferem.')
        return
      }
    }
    setLoading(true)
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
    const body =
      mode === 'login'
        ? { email, password }
        : { fullName, email, phone, password, confirmPassword }
    const r = await apiFetch<{ user: User }>(endpoint, { method: 'POST', json: body })
    if ('error' in r) {
      setError(r.error)
      setLoading(false)
      return
    }
    await session.load()
    setLoading(false)
    nav('/perfil')
  }

  return (
    <AppShell>
      <div className="mx-auto grid max-w-2xl gap-5">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm text-slate-300">Acesso</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-2 text-sm text-slate-300">
                {mode === 'login'
                  ? 'Use seu e-mail e senha, ou entre com Google.'
                  : 'Crie sua conta para anunciar e acompanhar suas compras/vendas.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={mode === 'login' ? 'primary' : 'subtle'} onClick={() => setMode('login')}>
                Entrar
              </Button>
              <Button variant={mode === 'register' ? 'primary' : 'subtle'} onClick={() => setMode('register')}>
                Cadastrar
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {mode === 'register' ? (
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-slate-200">Nome completo</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
              </div>
            ) : null}

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-200">E-mail</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
            </div>

            {mode === 'register' ? (
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-slate-200">Telefone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(DDD) 9xxxx-xxxx" />
              </div>
            ) : null}

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-200">Senha</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-300 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' ? (
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-slate-200">Confirmar senha</label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-300 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="mt-1 grid gap-2 md:grid-cols-2">
              <Button onClick={() => void submit()} disabled={loading}>
                {loading ? 'Processando…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  if (!googleEnabled) {
                    setError('Login com Google ainda não está configurado neste ambiente.')
                    return
                  }
                  window.location.href = '/api/auth/google'
                }}
                disabled={!googleEnabled}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-4 text-sm font-medium text-slate-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <Chrome className="h-4 w-4" />
                Entrar com Google
              </button>
            </div>

            <div className="mt-2 text-xs text-slate-400">
              Ao continuar, você concorda em manter seus dados atualizados e anunciar apenas itens usados permitidos.
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
