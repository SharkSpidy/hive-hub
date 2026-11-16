export const DAY = 86_400_000
export const cn = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(' ')

export const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export const fmtDateTime = (ms: number) =>
  new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export const startOfDay = (ms: number) => {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function relDue(due: number, now = Date.now()) {
  const diff = Math.round((startOfDay(due) - startOfDay(now)) / DAY)
  if (diff < 0) return { text: `${-diff}d overdue`, overdue: true }
  if (diff === 0) return { text: 'Due today', overdue: false }
  if (diff === 1) return { text: 'Due tomorrow', overdue: false }
  return { text: `Due ${fmtDate(due)}`, overdue: false }
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
