import { cn } from '../lib/utils'

/**
 * The HIVE mark: three honey hexagons with gold circuit traces.
 * Decorative on its own - the wordmark or surrounding text names the brand.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 132" fill="none" aria-hidden="true" className={cn('h-9 w-auto shrink-0', className)}>
      <g stroke="var(--color-accent-dark)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 47 18 26 14 12" />
        <circle cx="12" cy="7" r="3.5" />
        <path d="M111 57 124 66" />
        <circle cx="128" cy="69" r="3.5" />
        <path d="M32 95 20 115 16 122" />
        <circle cx="14" cy="127" r="3.5" />
      </g>
      <polygon points="46,38 73.7,54 73.7,86 46,102 18.3,86 18.3,54" fill="#FFD629" />
      <polygon points="96,11 119.4,24.5 119.4,51.5 96,65 72.6,51.5 72.6,24.5" fill="#E8B800" stroke="#FFD75E" strokeWidth="4" />
      <polygon points="96,75 119.4,88.5 119.4,115.5 96,129 72.6,115.5 72.6,88.5" fill="#FFE98A" stroke="#E8B800" strokeWidth="4" />
    </svg>
  )
}

export function Logo({
  tone = 'dark',
  className,
  wordmark = true,
}: {
  tone?: 'dark' | 'light'
  className?: string
  wordmark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {wordmark && (
        <span
          className={cn(
            'text-[1.45rem] leading-none font-extrabold tracking-[-0.045em]',
            tone === 'light' ? 'text-white' : 'text-primary',
          )}
        >
          HIVE
        </span>
      )}
    </span>
  )
}
