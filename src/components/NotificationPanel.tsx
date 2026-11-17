import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlarmClock, Bell, BellOff, BellRing, CheckCheck, ClipboardList, MessageSquare, Trash2, X } from 'lucide-react'
import { useStore } from '../lib/store'
import type { NotificationKind } from '../lib/types'
import { deviceAlertsOn, deviceAlertsSupported, devicePermission, enableDeviceAlerts, setDeviceAlertsPref, taskUrl } from '../lib/device'
import { cn, relTime } from '../lib/utils'
import { btn } from './ui'

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  due_2d: AlarmClock,
  due_1d: AlarmClock,
  assigned: ClipboardList,
  chat: MessageSquare,
}
const KIND_STYLE: Record<NotificationKind, string> = {
  due_2d: 'bg-amber-100 text-amber-900',
  due_1d: 'bg-red-100 text-red-900',
  assigned: 'bg-secondary/50 text-primary',
  chat: 'bg-muted text-fg',
}

export function BellButton({ onClick, className, label }: { onClick: () => void; className?: string; label?: string }) {
  const unread = useStore((s) => s.notifications.filter((n) => !n.readAt).length)
  return (
    <button onClick={onClick} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} className={className}>
      <span className="relative inline-flex">
        <Bell className="size-[18px]" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-2 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-4 font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </span>
      {label}
    </button>
  )
}

function DeviceAlerts() {
  const [, force] = useState(0)
  const perm = devicePermission()
  const on = deviceAlertsOn()
  if (!deviceAlertsSupported()) return <p className="text-xs text-muted-fg">This browser cannot show device notifications. Reminders still appear here.</p>
  if (perm === 'denied')
    return <p className="text-xs text-muted-fg">Device notifications are blocked. Allow notifications for this site in your browser or phone settings, then reopen this panel.</p>
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium">{on ? 'Device alerts are on for this device.' : 'Get reminders as device notifications.'}</p>
      {on ? (
        <button
          className={btn.secondary}
          onClick={() => {
            setDeviceAlertsPref(false)
            force((n) => n + 1)
          }}
        >
          <BellOff className="size-4" aria-hidden="true" /> Turn off
        </button>
      ) : (
        <button
          className={btn.accent}
          onClick={async () => {
            await enableDeviceAlerts()
            force((n) => n + 1)
          }}
        >
          <BellRing className="size-4" aria-hidden="true" /> Turn on
        </button>
      )}
    </div>
  )
}

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const notifications = useStore((s) => s.notifications)
  const { markRead, markAllRead, clearNotifications } = useStore.getState()
  const navigate = useNavigate()
  const closeRef = useRef<HTMLButtonElement>(null)
  const unread = notifications.filter((n) => !n.readAt).length

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-fg/40" onClick={onClose} aria-hidden="true" />
      <section role="dialog" aria-modal="true" aria-labelledby="notif-title" className="slide-in relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <header className="flex items-center justify-between gap-3 border-b border-line/70 p-4">
          <div>
            <h2 id="notif-title" className="text-lg font-bold">Notifications</h2>
            <p className="text-xs text-muted-fg">{unread ? `${unread} unread` : 'You are all caught up'}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={markAllRead} disabled={unread === 0} aria-label="Mark all as read" title="Mark all as read" className="flex size-10 items-center justify-center rounded-lg hover:bg-amber-100 disabled:opacity-40">
              <CheckCheck className="size-5" aria-hidden="true" />
            </button>
            <button onClick={clearNotifications} disabled={notifications.length === 0} aria-label="Clear all" title="Clear all" className="flex size-10 items-center justify-center rounded-lg hover:bg-amber-100 disabled:opacity-40">
              <Trash2 className="size-5" aria-hidden="true" />
            </button>
            <button ref={closeRef} onClick={onClose} aria-label="Close notifications" className="flex size-10 items-center justify-center rounded-lg hover:bg-amber-100">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="border-b border-line/70 bg-bg p-4">
          <DeviceAlerts />
        </div>

        <ul className="flex-1 overflow-y-auto">
          {notifications.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted-fg">
              Nothing yet. You will see task assignments, chat messages and deadline reminders (2 days and 1 day before) here.
            </li>
          )}
          {notifications.map((n) => {
            const Icon = KIND_ICON[n.kind]
            return (
              <li key={n.id} className="border-b border-line/50 last:border-0">
                <button
                  onClick={() => {
                    markRead([n.id])
                    onClose()
                    navigate(taskUrl(n))
                  }}
                  className={cn('flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-amber-50', !n.readAt && 'bg-amber-50/60')}
                >
                  <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', KIND_STYLE[n.kind])}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn('truncate text-sm', n.readAt ? 'font-medium' : 'font-bold')}>{n.title}</span>
                      <time className="shrink-0 text-xs text-muted-fg">{relTime(n.createdAt)}</time>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-sm text-muted-fg">{n.body}</span>
                  </span>
                  {!n.readAt && <span className="mt-2 size-2 shrink-0 rounded-full bg-danger" aria-label="Unread" />}
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
