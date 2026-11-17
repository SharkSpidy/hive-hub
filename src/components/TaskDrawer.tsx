import { useEffect, useRef } from 'react'
import { BadgeCheck, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { canAssign, canSetStatus, canVerifyTask, isTaskManager } from '../lib/permissions'
import { STATUSES, STATUS_LABEL } from '../lib/types'
import { cn, fmtDate, fmtDateTime, relDue } from '../lib/utils'
import { Avatar, PriorityBadge, StatusBadge, btn, field } from './ui'

export default function TaskDrawer({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const me = useStore((s) => s.me())!
  const data = useStore((s) => s.data)
  const { setStatus, verify, assign, unassign, notify } = useStore.getState()
  const closeRef = useRef<HTMLButtonElement>(null)
  const task = data.tasks.find((t) => t.id === taskId)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!task) return null
  const team = data.teams.find((t) => t.id === task.teamId)
  const manager = isTaskManager(me, task)
  const editable = canSetStatus(me, task)
  const due = task.dueDate ? relDue(task.dueDate) : null
  const creator = data.profiles.find((p) => p.id === task.createdBy)
  const verifier = data.profiles.find((p) => p.id === task.verifiedBy)
  const assignedIds = new Set(task.assignments.map((a) => a.assigneeId))
  const candidates = data.profiles.filter((p) => !assignedIds.has(p.id) && canAssign(me, task.teamId, p))
  const history = data.events.filter((e) => e.taskId === task.id).sort((a, b) => b.at - a.at)

  const run = (r: { ok: boolean; error?: string }, msg: string) => notify(r.ok ? msg : (r.error ?? 'Not allowed'), r.ok ? 'ok' : 'error')
  const name = (id: string) => data.profiles.find((p) => p.id === id)?.fullName ?? 'Someone'

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-fg/40" onClick={onClose} aria-hidden="true" />
      <section role="dialog" aria-modal="true" aria-labelledby="task-title" className="slide-in relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-line/70 p-4">
          <div>
            <h2 id="task-title" className="text-lg leading-snug font-bold">{task.title}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              <span className="text-xs font-semibold text-muted-fg">{team ? team.name : 'Org-wide'}</span>
            </div>
          </div>
          <button ref={closeRef} onClick={onClose} aria-label="Close task" className="flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-amber-100">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <p className="text-sm leading-relaxed text-fg">{task.description}</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs font-semibold text-muted-fg">Due</dt>
              <dd className={cn('font-semibold', due?.overdue && task.status !== 'done' && 'text-danger')}>{task.dueDate ? `${fmtDate(task.dueDate)}${task.status !== 'done' && due ? ` (${due.text.toLowerCase()})` : ''}` : 'No due date'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-fg">Created by</dt>
              <dd className="font-semibold">{creator?.fullName ?? 'Unknown'}</dd>
            </div>
          </dl>

          <div>
            <h3 className="mb-1.5 text-sm font-bold">Status</h3>
            <div role="group" aria-label="Change status" className="grid grid-cols-3 gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={!editable}
                  aria-pressed={task.status === s}
                  onClick={() => run(setStatus(task.id, s), `Moved to ${STATUS_LABEL[s]}`)}
                  className={cn(
                    'min-h-10 rounded-lg border px-2 text-sm font-semibold transition-colors disabled:opacity-50',
                    task.status === s ? 'border-primary-dark bg-primary-dark text-white' : 'border-line bg-white hover:bg-amber-50',
                  )}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            {!editable && <p className="mt-1.5 text-xs text-muted-fg">Only assignees and managers of this task can change its status.</p>}
          </div>

          {task.status === 'done' && (
            <div className="rounded-lg bg-bg p-3">
              {task.verifiedAt ? (
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ok">
                  <BadgeCheck className="size-4" aria-hidden="true" /> Verified by {verifier?.fullName ?? 'a manager'} on {fmtDate(task.verifiedAt)}
                </p>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Waiting for verification.</p>
                  <button disabled={!canVerifyTask(me, task)} onClick={() => run(verify(task.id), 'Task verified')} className={btn.accent}>
                    Verify
                  </button>
                </div>
              )}
              {!task.verifiedAt && !canVerifyTask(me, task) && <p className="mt-1.5 text-xs text-muted-fg">A Founder, HIVE Core member, or Sub Team Lead who is not assigned to this task verifies it.</p>}
            </div>
          )}

          <div>
            <h3 className="mb-1.5 text-sm font-bold">Assigned to</h3>
            {task.assignments.length === 0 && <p className="text-sm text-muted-fg">Nobody yet.</p>}
            <ul className="space-y-1.5">
              {task.assignments.map((a) => {
                const p = data.profiles.find((x) => x.id === a.assigneeId)
                if (!p) return null
                return (
                  <li key={a.assigneeId} className="flex items-center gap-2.5">
                    <Avatar name={p.fullName} size={28} />
                    <span className="flex-1 text-sm font-semibold">{p.fullName}</span>
                    {manager && (
                      <button onClick={() => run(unassign(task.id, p.id), `Removed ${p.fullName}`)} aria-label={`Remove ${p.fullName}`} className="flex size-9 items-center justify-center rounded-md text-muted-fg hover:bg-amber-100 hover:text-fg">
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
            {candidates.length > 0 && (
              <div className="mt-2">
                <label htmlFor="add-assignee" className="sr-only">Add assignee</label>
                <select
                  id="add-assignee"
                  className={field}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) run(assign(task.id, e.target.value), 'Assigned')
                  }}
                >
                  <option value="">Assign someone…</option>
                  {candidates.map((p) => (
                    <option key={p.id} value={p.id}>{p.fullName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-1.5 text-sm font-bold">Activity</h3>
            <ul className="space-y-1.5 text-sm">
              {history.map((e) => (
                <li key={e.id} className="flex justify-between gap-3">
                  <span>
                    <strong className="font-semibold">{name(e.actorId)}</strong>{' '}
                    {e.kind === 'created' && 'created this task'}
                    {e.kind === 'assigned' && 'assigned it'}
                    {e.kind === 'verified' && 'verified it'}
                    {e.kind === 'status_changed' && e.toStatus && `moved it to ${STATUS_LABEL[e.toStatus]}`}
                  </span>
                  <time className="shrink-0 text-xs text-muted-fg">{fmtDateTime(e.at)}</time>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
