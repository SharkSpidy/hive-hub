import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { Download, LayoutDashboard, ListChecks, LogOut, Shield, UserRound, Users, WifiOff } from 'lucide-react'
import { LogoMark } from './Logo'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useStore } from '../lib/store'
import { atLeast } from '../lib/permissions'
import { cn } from '../lib/utils'
import { Avatar, TierBadge } from './ui'
import NotificationPanel, { BellButton } from './NotificationPanel'

interface BIPEvent extends Event {
  prompt: () => Promise<void>
}

export default function Layout() {
  const me = useStore((s) => s.me())
  const signOut = useStore((s) => s.signOut)
  const toast = useStore((s) => s.toast)
  const navigate = useNavigate()
  const [online, setOnline] = useState(navigator.onLine)
  const [panelOpen, setPanelOpen] = useState(false)
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    const bip = (e: Event) => {
      e.preventDefault()
      setInstallEvt(e as BIPEvent)
    }
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    window.addEventListener('beforeinstallprompt', bip)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      window.removeEventListener('beforeinstallprompt', bip)
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => useStore.setState({ toast: null }), 3500)
    return () => clearTimeout(t)
  }, [toast])

  if (!me) return <Navigate to="/login" replace />

  const items = [
    { to: '/tasks', label: 'Tasks', icon: ListChecks, show: true },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: atLeast(me, 'core') },
    { to: '/team', label: 'Team', icon: Users, show: true },
    { to: '/me', label: 'Profile', icon: UserRound, show: true },
    { to: '/admin', label: 'Admin', icon: Shield, show: me.tier === 'founder' },
  ].filter((i) => i.show)

  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold transition-colors',
      isActive ? 'bg-primary-dark text-white' : 'text-fg hover:bg-amber-100',
    )

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line/70 bg-white p-3 md:flex">
        <div className="mb-4 flex items-center gap-2 px-2 pt-1">
          <LogoMark className="h-6 w-auto" />
          <span className="text-base font-extrabold tracking-tight">HIVE</span>
        </div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} className={link}>
              <i.icon className="size-[18px]" aria-hidden="true" />
              {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          <BellButton label="Notifications" onClick={() => setPanelOpen(true)} className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-fg hover:bg-amber-100" />
          {installEvt && (
            <button
              className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold hover:bg-amber-50"
              onClick={async () => {
                await installEvt.prompt()
                setInstallEvt(null)
              }}
            >
              <Download className="size-4" aria-hidden="true" /> Install app
            </button>
          )}
          <div className="rounded-lg bg-bg p-2.5">
            <div className="flex items-center gap-2">
              <Avatar name={me.fullName} size={32} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{me.fullName}</p>
                <TierBadge tier={me.tier} />
              </div>
            </div>
            <button
              onClick={() => {
                signOut()
                navigate('/login')
              }}
              className="mt-2 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-md text-sm font-semibold text-muted-fg hover:bg-amber-100 hover:text-fg"
            >
              <LogOut className="size-4" aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <header className="flex items-center justify-between border-b border-line/70 bg-white px-4 py-2 md:hidden">
        <div className="flex items-center gap-2">
          <LogoMark className="h-5 w-auto" />
          <span className="font-extrabold tracking-tight">HIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <TierBadge tier={me.tier} />
          <BellButton onClick={() => setPanelOpen(true)} className="flex size-10 items-center justify-center rounded-lg hover:bg-amber-100" />
          <button
            aria-label="Sign out"
            onClick={() => {
              signOut()
              navigate('/login')
            }}
            className="flex size-10 items-center justify-center rounded-lg hover:bg-amber-100"
          >
            <LogOut className="size-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {!online && (
          <div role="status" className="flex items-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
            <WifiOff className="size-4" aria-hidden="true" /> You are offline. Showing the last synced data; changes will sync when you reconnect.
          </div>
        )}
        <div className="mx-auto max-w-[1280px] p-4 pb-24 md:p-6 md:pb-6">
          <Outlet />
        </div>
      </main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line/70 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            className={({ isActive }) =>
              cn('flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold', isActive ? 'text-primary-dark' : 'text-muted-fg')
            }
          >
            <i.icon className="size-5" aria-hidden="true" />
            {i.label}
          </NavLink>
        ))}
      </nav>

      {panelOpen && <NotificationPanel onClose={() => setPanelOpen(false)} />}

      {(toast || needRefresh) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6">
          <div
            role={toast?.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg',
              needRefresh ? 'bg-fg' : toast?.tone === 'error' ? 'bg-danger' : 'bg-fg',
            )}
          >
            {needRefresh ? (
              <>
                A new version is available.
                <button className="rounded-md bg-white px-2.5 py-1 text-fg" onClick={() => updateServiceWorker(true)}>
                  Update
                </button>
              </>
            ) : (
              toast?.text
            )}
          </div>
        </div>
      )}
    </div>
  )
}
