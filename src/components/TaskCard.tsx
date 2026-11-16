import { AlertTriangle, BadgeCheck, CalendarClock, Hourglass } from 'lucide-react'
import type { Data, Task } from '../lib/types'
import { relDue } from '../lib/utils'
import { cn } from '../lib/utils'
import { Avatar, PriorityBadge } from './ui'

export default function TaskCard({ task, data, onOpen }: { task: Task; data: Data; onOpen: () => void }) {
  const team = data.teams.find((t) => t.id === task.teamId)
  const due = task.dueDate ? relDue(task.dueDate) : null
  const overdue = !!due?.overdue && task.status !== 'done'
  const people = task.assignments.map((a) => data.profiles.find((p) => p.id === a.assigneeId)).filter(Boolean)
  return (
    <button
      onClick={onOpen}
      className="w-full rounded-lg border border-line/80 bg-white p-3 text-left transition-colors hover:border-primary-dark"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-sm leading-snug font-semibold">{task.title}</span>
        <PriorityBadge priority={task.priority} />
      </span>
      <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-fg">
        <span className="rounded bg-bg px-1.5 py-0.5 font-semibold text-fg">{team ? team.name : 'Org-wide'}</span>
        {due && task.status !== 'done' && (
          <span className={cn('inline-flex items-center gap-1 font-medium', overdue && 'font-semibold text-danger')}>
            {overdue ? <AlertTriangle className="size-3.5" aria-hidden="true" /> : <CalendarClock className="size-3.5" aria-hidden="true" />}
            {due.text}
          </span>
        )}
        {task.status === 'done' &&
          (task.verifiedAt ? (
            <span className="inline-flex items-center gap-1 font-semibold text-ok">
              <BadgeCheck className="size-3.5" aria-hidden="true" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
              <Hourglass className="size-3.5" aria-hidden="true" /> Awaiting verification
            </span>
          ))}
      </span>
      <span className="mt-2 flex items-center -space-x-1.5">
        {people.length === 0 && <span className="text-xs text-muted-fg">Unassigned</span>}
        {people.map((p) => (
          <span key={p!.id} title={p!.fullName} className="rounded-full ring-2 ring-white">
            <Avatar name={p!.fullName} size={24} />
          </span>
        ))}
        {people.length > 0 && <span className="sr-only">Assigned to {people.map((p) => p!.fullName).join(', ')}</span>}
      </span>
    </button>
  )
}
