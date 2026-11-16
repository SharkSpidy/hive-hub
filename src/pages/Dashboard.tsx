import { Link, Navigate } from 'react-router-dom'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { useStore } from '../lib/store'
import { isOrgWide } from '../lib/permissions'
import { isOverdue, teamStats, weeklyVelocity } from '../lib/stats'
import { DAY, relDue } from '../lib/utils'
import { Avatar, Card, PageHeader, StatusBadge } from '../components/ui'

export default function Dashboard() {
  const me = useStore((s) => s.me())!
  const data = useStore((s) => s.data)
  if (!isOrgWide(me)) return <Navigate to="/tasks" replace />

  const now = Date.now()
  const all = teamStats(data.tasks, now)
  const velocity = weeklyVelocity(data.tasks, 8, now)
  const maxV = Math.max(...velocity.map((v) => v.count), 1)
  const delta = all.done7 - all.donePrev7

  const rows = data.teams
    .map((t) => {
      const s = teamStats(data.tasks.filter((x) => x.teamId === t.id), now)
      const flags: string[] = []
      if (s.awaiting >= 3) flags.push('Verification backlog')
      if (s.overdue >= 2) flags.push('Overdue work')
      if (s.stalled >= 2) flags.push('Stalled in progress')
      return { team: t, s, flags, score: s.awaiting + s.overdue * 2 + s.stalled }
    })
    .sort((a, b) => b.score - a.score)

  const upcoming = data.tasks
    .filter((t) => t.status !== 'done' && t.dueDate !== null && t.dueDate <= now + 7 * DAY)
    .sort((a, b) => a.dueDate! - b.dueDate!)
    .slice(0, 10)

  const kpis = [
    { label: 'Open tasks', value: all.todo + all.inProgress, note: `${all.inProgress} in progress` },
    { label: 'Overdue', value: all.overdue, note: 'past due date', warn: all.overdue > 0 },
    { label: 'Done this week', value: all.done7, note: null, delta },
    { label: 'Awaiting verification', value: all.awaiting, note: 'done, not yet verified', warn: all.awaiting >= 5 },
    { label: 'Avg cycle time', value: all.avgCycle === null ? '–' : `${all.avgCycle.toFixed(1)}d`, note: 'start to done' },
  ]

  // chart geometry
  const W = 560, H = 190, padL = 28, padB = 26, bw = 36
  const step = (W - padL) / velocity.length

  return (
    <>
      <PageHeader title="Global dashboard" sub="Org-wide velocity, bottlenecks and deadlines" />

      <dl className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="p-3">
            <dt className="text-xs font-semibold text-muted-fg">{k.label}</dt>
            <dd className={`mt-1 text-2xl font-bold tabular-nums ${k.warn ? 'text-danger' : ''}`}>{k.value}</dd>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-fg">
              {'delta' in k && k.delta !== undefined ? (
                <>
                  {k.delta > 0 ? <ArrowUpRight className="size-3.5 text-ok" aria-hidden="true" /> : k.delta < 0 ? <ArrowDownRight className="size-3.5 text-danger" aria-hidden="true" /> : <Minus className="size-3.5" aria-hidden="true" />}
                  {k.delta > 0 ? `+${k.delta}` : k.delta} vs last week
                </>
              ) : (
                k.note
              )}
            </p>
          </Card>
        ))}
      </dl>

      <div className="mb-4 grid items-start gap-4 lg:grid-cols-5">
        <Card className="p-4 lg:col-span-3">
          <h2 className="text-sm font-bold">Velocity: tasks completed per week</h2>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Tasks completed per week over the last 8 weeks: ${velocity.map((v) => `${v.label} ${v.count}`).join(', ')}`} className="mt-2 h-auto w-full">
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line x1={padL} x2={W} y1={H - padB - f * (H - padB - 16)} y2={H - padB - f * (H - padB - 16)} stroke="var(--color-line)" strokeWidth="1" opacity="0.7" />
                <text x={padL - 6} y={H - padB - f * (H - padB - 16) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted-fg)">{Math.round(f * maxV)}</text>
              </g>
            ))}
            {velocity.map((v, i) => {
              const h = (v.count / maxV) * (H - padB - 16)
              const x = padL + i * step + (step - bw) / 2
              const last = i === velocity.length - 1
              return (
                <g key={v.label}>
                  <rect x={x} y={H - padB - h} width={bw} height={h} rx="4" fill={last ? 'var(--color-accent-dark)' : 'var(--color-primary)'} />
                  <text x={x + bw / 2} y={H - padB - h - 5} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--color-fg)">{v.count}</text>
                  <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-muted-fg)">{v.label}</text>
                </g>
              )
            })}
          </svg>
          <details className="mt-1 text-sm">
            <summary className="cursor-pointer font-semibold text-primary-dark">View as table</summary>
            <table className="mt-2 w-full text-left text-sm">
              <thead className="text-xs text-muted-fg"><tr><th scope="col" className="py-1 font-semibold">Week ending</th><th scope="col" className="py-1 text-right font-semibold">Completed</th></tr></thead>
              <tbody>{velocity.map((v) => (<tr key={v.label} className="border-t border-line/50"><td className="py-1">{v.label}</td><td className="py-1 text-right tabular-nums">{v.count}</td></tr>))}</tbody>
            </table>
          </details>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-2 text-sm font-bold">Upcoming deadlines (next 7 days and overdue)</h2>
          {upcoming.length === 0 ? <p className="text-sm text-muted-fg">Nothing due soon.</p> : (
            <ul className="divide-y divide-line/50">
              {upcoming.map((t) => {
                const due = relDue(t.dueDate!)
                const team = data.teams.find((x) => x.id === t.teamId)
                const first = data.profiles.find((p) => p.id === t.assignments[0]?.assigneeId)
                return (
                  <li key={t.id} className="flex items-center gap-2.5 py-2">
                    {first ? <Avatar name={first.fullName} size={26} /> : <span className="size-[26px]" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.title}</p>
                      <p className="text-xs text-muted-fg">{team?.name ?? 'Org-wide'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-semibold ${isOverdue(t, now) ? 'text-danger' : ''}`}>{due.text}</p>
                      <StatusBadge status={t.status} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <div className="p-4 pb-2">
          <h2 className="text-sm font-bold">Team bottlenecks</h2>
          <p className="text-xs text-muted-fg">Sorted by what needs attention first. Flags: 3+ awaiting verification, 2+ overdue, 2+ in progress for over a week.</p>
        </div>
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="sr-only">Task counts and flags for each subteam</caption>
          <thead className="border-y border-line/70 text-xs text-muted-fg">
            <tr>
              <th scope="col" className="px-4 py-2 font-semibold">Subteam</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">To do</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">In progress</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">Awaiting verif.</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">Overdue</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">Done (7d)</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">Cycle (d)</th>
              <th scope="col" className="px-4 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/50">
            {rows.map(({ team, s, flags }) => (
              <tr key={team.id}>
                <td className="px-4 py-2.5 font-semibold"><Link to={`/team`} className="hover:underline" onClick={() => undefined}>{team.name}</Link></td>
                <td className="px-2 py-2.5 text-right tabular-nums">{s.todo}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{s.inProgress}</td>
                <td className={`px-2 py-2.5 text-right tabular-nums ${s.awaiting >= 3 ? 'font-semibold text-amber-800' : ''}`}>{s.awaiting}</td>
                <td className={`px-2 py-2.5 text-right tabular-nums ${s.overdue >= 2 ? 'font-semibold text-danger' : ''}`}>{s.overdue}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{s.done7}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{s.avgCycle === null ? '–' : s.avgCycle.toFixed(1)}</td>
                <td className="px-4 py-2.5">
                  {flags.length === 0 ? <span className="text-sm font-semibold text-ok">On track</span> : (
                    <span className="flex flex-wrap gap-1">
                      {flags.map((f) => (
                        <span key={f} className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
                          <AlertTriangle className="size-3" aria-hidden="true" /> {f}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}
