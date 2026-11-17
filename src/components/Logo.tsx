import { cn } from '../lib/utils'

const logoSrc = '/logo.svg'

/**
 * Use the brand logo asset from the public folder for all deployed logo variants.
 */
export function LogoMark({ className }: { className?: string }) {
  return <img src={logoSrc} alt="" aria-hidden="true" className={cn('h-9 w-auto shrink-0 object-contain', className)} />
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
