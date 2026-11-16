import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react'
import { useStore } from '../lib/store'
import { isSupabaseConfigured } from '../lib/supabase'
import { Logo, LogoMark } from '../components/Logo'

const input =
  'min-h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-fg placeholder:text-muted-fg/80 transition-colors focus:border-primary-dark focus:outline-none focus:ring-2 focus:ring-secondary'

export default function Login() {
  const me = useStore((s) => s.me())
  const signIn = useStore((s) => s.signIn)
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (me) return <Navigate to={me.tier === 'founder' || me.tier === 'core' ? '/dashboard' : '/tasks'} replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError('')
    if (!username.trim() || !password) {
      setError('Enter your username and password.')
      return
    }
    setBusy(true)
    const result = await signIn(username, password)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/tasks', { replace: true })
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
      <section className="honeycomb relative hidden flex-col justify-between overflow-hidden bg-primary-dark p-10 text-white lg:flex">
        <svg viewBox="0 0 140 132" aria-hidden="true" className="pointer-events-none absolute -right-16 top-1/3 h-[420px] w-auto opacity-[0.07]">
          <polygon points="46,38 73.7,54 73.7,86 46,102 18.3,86 18.3,54" fill="#FFD629" />
          <polygon points="96,11 119.4,24.5 119.4,51.5 96,65 72.6,51.5 72.6,24.5" fill="#FFD629" />
          <polygon points="96,75 119.4,88.5 119.4,115.5 96,129 72.6,115.5 72.6,88.5" fill="#FFD629" />
        </svg>

        <Logo tone="light" className="fade-up relative" />

        <div className="fade-up relative max-w-sm">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-secondary uppercase">
            <LogoMark className="h-3.5 w-auto" /> Internal workspace
          </p>
          <h1 className="text-[2.6rem] leading-[1.05] font-extrabold tracking-tight">
            Every task.
            <br />
            Every subteam.
            <br />
            <span className="text-secondary">One hive.</span>
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-white/60">
            HIVE Hub is the single place we run work: what is planned, who owns it, and what is waiting on verification.
          </p>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-white/40">
          <LockKeyhole className="size-3.5" aria-hidden="true" /> Private workspace · accounts are issued by HIVE admins
        </p>
      </section>

      <section className="flex flex-col justify-center bg-bg px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-9 lg:hidden">
            <Logo />
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight">Log in</h2>
          <p className="mt-1.5 text-sm text-muted-fg">Use the username and password a HIVE admin gave you.</p>

          {!isSupabaseConfigured && (
            <div role="status" className="mt-5 rounded-xl border border-accent-dark/40 bg-secondary/20 p-3.5">
              <p className="flex items-center gap-2 text-sm font-bold text-primary">
                <AlertCircle className="size-4 shrink-0" aria-hidden="true" /> Backend not connected
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-fg">
                Add <code className="font-semibold text-primary">VITE_SUPABASE_URL</code> and{' '}
                <code className="font-semibold text-primary">VITE_SUPABASE_ANON_KEY</code> to <code>.env</code>, then restart
                the dev server.
              </p>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-semibold">
                Username
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className={input}
                placeholder="your.username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`${input} pr-12`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-fg transition-colors hover:bg-amber-100 hover:text-fg"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !isSupabaseConfigured}
              className="group flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-dark px-4 text-sm font-bold text-white transition-colors hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Signing in…
                </>
              ) : (
                <>
                  Log in
                  <ArrowRight className="size-4 text-secondary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="mt-7 border-t border-line pt-4 text-xs leading-relaxed text-muted-fg">
            No self sign-up. Accounts are created by HIVE administrators and handed to you directly.
          </p>
        </div>
      </section>
    </div>
  )
}
