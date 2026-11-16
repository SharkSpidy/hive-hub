import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useStore } from '../lib/store'
import { canCreateTask, canSeeTask, isAssigned, isOrgWide } from '../lib/permissions'
import { STATUSES, STATUS_LABEL } from '../lib/types'
import { cn } from '../lib/utils'
import TaskCard from '../components/TaskCard'
import TaskDrawer from '../components/TaskDrawer'
import NewTaskDialog from '../components/NewTaskDialog'
import { EmptyState, PageHeader, btn, field } from '../components/ui'

type Scope = 'mine' | 'all'
const COL_DOT = { todo: 'bg-neutral-500', in_progress: 'bg-accent-dark', done: 'bg-ok' }

export default function Tasks() {
  const me = useStore((s) => s.me())!
  const data = useStore((s) => s.data)
    const [teamId, setTeamId] = useState('')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const orgWide = isOrgWide(me)
  const broad = orgWide || me.tier === 'lead'
  const [scope, setScope] = useState<Scope>(broad ? 'all' : 'mine')
  const canCreate = canCreateTask(me, me.teamId) || orgWide

  // Row-level visibility, mirroring the tasks_read policy.
  const visible = useMemo(() => data.tasks.filter((t) => canSeeTask(me, t)), [data.tasks, me])
  const shown = useMemo(
    () =>
      visible
        .filter((t) => (scope === 'mine' && broad ? isAssigned(me, t) : true))
        .filter((t) => (teamId ? t.teamId === teamId : true))
        .filter((t) => (q ? t.title.toLowerCase().includes(q.toLowerCase()) : true))
        .sort((a, b) => (a.dueDate ?? 9e15) - (b.dueDate ?? 9e15)),
    [visible, scope, broad, me, teamId, q],
  )

  const sub = broad ? `${visible.length} tasks visible to you` : `${visible.length} tasks assigned to you`

  return (
    <>
      <PageHeader
        title="Tasks"
        sub={sub}
        action={
          canCreate && (
            <button className={btn.primary} onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden="true" /> New task
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {broad && (
          <div role="group" aria-label="Task scope" className="inline-flex rounded-lg border border-line bg-white p-0.5">
            {([['mine', 'Assigned to me'], ['all', orgWide ? 'Everything' : 'My subteam']] as const).map(([k, label]) => (
              <button
                key={k}
                aria-pressed={scope === k}
                onClick={() => setScope(k)}
                className={cn('min-h-9 rounded-md px-3 text-sm font-semibold transition-colors', scope === k ? 'bg-primary-dark text-white' : 'hover:bg-amber-50')}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {orgWide && (
          <>
            <label htmlFor="team-filter" className="sr-only">Filter by subteam</label>
            <select id="team-filter" className={`${field} !w-auto`} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">All subteams</option>
              {data.teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </>
        )}
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-fg" aria-hidden="true" />
          <label htmlFor="task-search" className="sr-only">Search tasks</label>
          <input id="task-search" className={`${field} pl-9`} placeholder="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState title="No tasks here" hint={scope === 'mine' ? 'Nothing is assigned to you right now.' : 'Try clearing the filters.'} />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {STATUSES.map((s) => {
            const col = shown.filter((t) => t.status === s)
            return (
              <section key={s} aria-labelledby={`col-${s}`} className="rounded-xl bg-white/50 p-2.5">
                <h2 id={`col-${s}`} className="mb-2 flex items-center gap-2 px-1 text-sm font-bold">
                  <span className={cn('size-2.5 rounded-full', COL_DOT[s])} aria-hidden="true" />
                  {STATUS_LABEL[s]}
                  <span className="rounded-md bg-white px-1.5 text-xs font-semibold text-muted-fg">{col.length}</span>
                </h2>
                <ul className="space-y-2">
                  {col.length === 0 && <li className="px-1 py-3 text-xs text-muted-fg">Nothing here.</li>}
                  {col.map((t) => (
                    <li key={t.id}>
                      <TaskCard task={t} data={data} onOpen={() => setOpen(t.id)} />
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      {open && <TaskDrawer taskId={open} onClose={() => setOpen(null)} />}
      {creating && <NewTaskDialog onClose={() => setCreating(false)} />}
    </>
  )
}
