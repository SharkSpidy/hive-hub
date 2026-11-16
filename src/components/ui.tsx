import type { ReactNode } from 'react'
import type { Priority, Status, Tier } from '../lib/types'
import { PRIORITY_LABEL, STATUS_LABEL, TIER_LABEL } from '../lib/types'
import { cn, initials } from '../lib/utils'

const TIER_STYLE: Record<Tier, string> = {
  founder: 'bg-accent-dark text-primary',
  core: 'bg-primary-dark text-white',
  lead: 'bg-secondary text-primary',
  member: 'bg-muted text-fg',
  volunteer: 'border border-line bg-white text-muted-fg',
}
export const TierBadge = ({ tier }: { tier: Tier }) => (
  <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap', TIER_STYLE[tier])}>{TIER_LABEL[tier]}</span>
)

const PRIORITY_STYLE: Record<Priority, string> = {
  low: 'bg-muted text-muted-fg',
  medium: 'bg-secondary/45 text-primary',
  high: 'bg-amber-100 text-amber-950',
  urgent: 'bg-red-100 text-red-900',
}
export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-semibold', PRIORITY_STYLE[priority])}>{PRIORITY_LABEL[priority]}</span>
)

const STATUS_STYLE: Record<Status, string> = {
  todo: 'bg-muted text-fg',
  in_progress: 'bg-secondary/50 text-primary',
  done: 'bg-emerald-100 text-emerald-900',
}
export const StatusBadge = ({ status }: { status: Status }) => (
  <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-semibold', STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>
)

const AVATAR_COLORS = ['bg-primary-dark', 'bg-[#a17800]', 'bg-[#7a5b00]', 'bg-neutral-700', 'bg-[#8a6d00]', 'bg-neutral-600']
export function Avatar({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  const color = AVATAR_COLORS[name.length % AVATAR_COLORS.length]
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', color, className)}
    >
      {initials(name)}
    </span>
  )
}

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('rounded-xl border border-line/70 bg-card', className)}>{children}</div>
)

export const PageHeader = ({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) => (
  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="mt-0.5 text-sm text-muted-fg">{sub}</p>}
    </div>
    {action}
  </div>
)

export const btn = {
  primary: 'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-primary-dark px-3.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50',
  secondary: 'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3.5 text-sm font-semibold text-fg transition-colors hover:bg-amber-50 disabled:opacity-50',
  accent: 'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-secondary px-3.5 text-sm font-bold text-primary transition-colors hover:bg-accent-dark disabled:opacity-50',
}

export const field =
  'min-h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-fg placeholder:text-muted-fg focus:border-primary-dark'

export const EmptyState = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="rounded-xl border border-dashed border-line bg-white/60 px-4 py-8 text-center">
    <p className="text-sm font-semibold">{title}</p>
    {hint && <p className="mt-1 text-sm text-muted-fg">{hint}</p>}
  </div>
)
