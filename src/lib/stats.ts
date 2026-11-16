import type { Task } from './types'
import { DAY, startOfDay } from './utils'

export const isOverdue = (t: Task, now = Date.now()) => t.status !== 'done' && t.dueDate !== null && startOfDay(t.dueDate) < startOfDay(now)

export function teamStats(tasks: Task[], now = Date.now()) {
  const done = tasks.filter((t) => t.status === 'done')
  const cycle = done.filter((t) => t.completedAt && t.startedAt).map((t) => Math.max(0, t.completedAt! - t.startedAt!) / DAY)
  return {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    done: done.length,
    awaiting: done.filter((t) => !t.verifiedAt).length,
    overdue: tasks.filter((t) => isOverdue(t, now)).length,
    done7: done.filter((t) => t.completedAt! >= now - 7 * DAY).length,
    donePrev7: done.filter((t) => t.completedAt! < now - 7 * DAY && t.completedAt! >= now - 14 * DAY).length,
    stalled: tasks.filter((t) => t.status === 'in_progress' && t.startedAt && t.startedAt < now - 7 * DAY).length,
    avgCycle: cycle.length ? cycle.reduce((a, b) => a + b, 0) / cycle.length : null,
  }
}

export function weeklyVelocity(tasks: Task[], weeks = 8, now = Date.now()) {
  const out: { label: string; count: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const end = now - i * 7 * DAY
    const start = end - 7 * DAY
    const count = tasks.filter((t) => t.completedAt && t.completedAt > start && t.completedAt <= end).length
    out.push({ label: new Date(end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), count })
  }
  return out
}

export function personStats(userId: string, tasks: Task[], now = Date.now()) {
  const mine = tasks.filter((t) => t.assignments.some((a) => a.assigneeId === userId))
  const done = mine.filter((t) => t.status === 'done')
  const done30 = done.filter((t) => t.completedAt! >= now - 30 * DAY)
  const withDue = done.filter((t) => t.dueDate && t.completedAt)
  const onTime = withDue.filter((t) => startOfDay(t.completedAt!) <= startOfDay(t.dueDate!) + DAY).length
  return {
    open: mine.filter((t) => t.status !== 'done').length,
    overdue: mine.filter((t) => isOverdue(t, now)).length,
    done30: done30.length,
    onTimeRate: withDue.length ? Math.round((onTime / withDue.length) * 100) : null,
    verifiedRate: done.length ? Math.round((done.filter((t) => t.verifiedAt).length / done.length) * 100) : null,
  }
}
