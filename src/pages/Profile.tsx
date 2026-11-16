import { Link, useParams } from 'react-router-dom'
import { CalendarDays, Mail, Users } from 'lucide-react'
import { useStore } from '../lib/store'
import { canSeeProfile, canSeeTask } from '../lib/permissions'
import { personStats } from '../lib/stats'
import { STATUS_LABEL } from '../lib/types'
import { fmtDate, fmtDateTime, relDue } from '../lib/utils'
import { Avatar, Card, EmptyState, StatusBadge, TierBadge } from '../components/ui'

export default function Profile() {
  const { id } = useParams()
  const me = useStore((s) => s.me())!
  const data = useStore((s) => s.data)
  const person = data.profiles.find((p) => p.id === (id ?? me.id))
  if (!person) return <EmptyState title="Person not found" />
  if (!canSeeProfile(me, person)) return <EmptyState title="You cannot view this profile" hint="You can see people in your own subteam." />

  const tasksVisible = data.tasks.filter((t) => canSeeTask(me, t))
  const stats = personStats(person.id, tasksVisible)
  const team = data.teams.find((t) => t.id === person.teamId)
  const owner = team && data.profiles.find((p) => p.id === team.coreOwnerId)
  const ownedTeams = data.teams.filter((t) => t.coreOwnerId === person.id)
  const open = tasksVisible.filter((t) => t.status !== 'done' && t.assignments.some((a) => a.assigneeId === person.id)).sort((a, b) => (a.dueDate ?? 9e15) - (b.dueDate ?? 9e15))
  const activity = data.events.filter((e) => e.actorId === person.id && tasksVisible.some((t) => t.id === e.taskId)).sort((a, b) => b.at - a.at).slice(0, 8)

  const kpis = [
    { label: 'Open tasks', value: String(stats.open) },
    { label: 'Overdue', value: String(stats.overdue), warn: stats.overdue > 0 },
    { label: 'Done in 30 days', value: String(stats.done30) },
    { label: 'On-time rate', value: stats.onTimeRate === null ? '–' : `${stats.onTimeRate}%` },
    { label: 'Verified rate', value: stats.verifiedRate === null ? '–' : `${stats.verifiedRate}%` },
  ]

  return (
    <>
      <Card className="mb-4 flex flex-wrap items-center gap-4 p-4">
        <Avatar name={person.fullName} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight">{person.fullName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <TierBadge tier={person.tier} />
            {team && <span className="inline-flex items-center gap-1 text-sm font-semibold"><Users className="size-4" aria-hidden="true" /> {team.name} subteam</span>}
            {ownedTeams.length > 0 && <span className="text-sm font-semibold">Owns {ownedTeams.map((t) => t.name).join(' and ')}</span>}
          </div>
          <p className="mt-2 text-sm text-muted-fg">{person.bio}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-fg">
            <span className="inline-flex items-center gap-1"><Mail className="size-4" aria-hidden="true" /> {person.email}</span>
            <span className="inline-flex items-center gap-1"><CalendarDays className="size-4" aria-hidden="true" /> Joined {fmtDate(person.joinedAt)}</span>
            {owner && owner.id !== person.id && <span>Core owner: <Link className="font-semibold text-primary-dark underline" to={`/people/${owner.id}`}>{owner.fullName}</Link></span>}
          </div>
        </div>
      </Card>

      <dl className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="p-3">
            <dt className="text-xs font-semibold text-muted-fg">{k.label}</dt>
            <dd className={`mt-1 text-2xl font-bold tabular-nums ${k.warn ? 'text-danger' : ''}`}>{k.value}</dd>
          </Card>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="p-4 lg:col-span-3">
          <h2 className="mb-2 text-sm font-bold">Open tasks</h2>
          {open.length === 0 ? <p className="text-sm text-muted-fg">No open tasks.</p> : (
            <ul className="divide-y divide-line/50">
              {open.map((t) => {
                const due = t.dueDate ? relDue(t.dueDate) : null
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{t.title}</p>
                      <p className={`text-xs ${due?.overdue ? 'font-semibold text-danger' : 'text-muted-fg'}`}>{due ? due.text : 'No due date'}</p>
                    </div>
                    <StatusBadge status={t.status} />
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-2 text-sm font-bold">Recent activity</h2>
          {activity.length === 0 ? <p className="text-sm text-muted-fg">No recent activity you can see.</p> : (
            <ul className="space-y-2 text-sm">
              {activity.map((e) => {
                const t = data.tasks.find((x) => x.id === e.taskId)
                return (
                  <li key={e.id}>
                    <span className="font-medium">
                      {e.kind === 'created' && 'Created'}
                      {e.kind === 'assigned' && 'Assigned'}
                      {e.kind === 'verified' && 'Verified'}
                      {e.kind === 'status_changed' && e.toStatus && `Moved to ${STATUS_LABEL[e.toStatus]}:`}
                    </span>{' '}
                    {t?.title}
                    <time className="block text-xs text-muted-fg">{fmtDateTime(e.at)}</time>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
