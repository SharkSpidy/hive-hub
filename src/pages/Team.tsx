import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { isOrgWide } from '../lib/permissions'
import { personStats, teamStats } from '../lib/stats'
import { Avatar, Card, EmptyState, PageHeader, TierBadge, field } from '../components/ui'
import { TIER_RANK } from '../lib/types'

export default function Team() {
  const me = useStore((s) => s.me())!
  const data = useStore((s) => s.data)
  const orgWide = isOrgWide(me)
  const owned = data.teams.filter((t) => t.coreOwnerId === me.id)
  const [teamId, setTeamId] = useState(me.teamId ?? owned[0]?.id ?? data.teams[0]?.id ?? '')
  const team = data.teams.find((t) => t.id === teamId)

  if (data.teams.length === 0) return <EmptyState title="No subteams yet" hint="Subteams are created in the database." />
  if (!orgWide && !me.teamId) return <EmptyState title="You are not in a subteam yet" hint="A Founder can add you to one." />
  if (!team) return <EmptyState title="Team not found" />

  const people = data.profiles.filter((p) => p.teamId === team.id).sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || a.fullName.localeCompare(b.fullName))
  const owner = data.profiles.find((p) => p.id === team.coreOwnerId)
  // Workload is only visible to people who can see the team's tasks (Core, Founder, this team's Lead).
  const showLoad = orgWide || (me.tier === 'lead' && me.teamId === team.id)
  const teamTasks = data.tasks.filter((t) => t.teamId === team.id)
  const ts = teamStats(teamTasks)

  return (
    <>
      <PageHeader
        title={`${team.name} subteam`}
        sub={owner ? `Core owner: ${owner.fullName}` : undefined}
        action={
          orgWide && (
            <div>
              <label htmlFor="team-pick" className="sr-only">Choose subteam</label>
              <select id="team-pick" className={`${field} !w-auto`} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                {data.teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )
        }
      />

      {showLoad && (
        <Card className="mb-4 p-4">
          <h2 className="mb-2 text-sm font-bold">Task mix</h2>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${ts.todo} to do, ${ts.inProgress} in progress, ${ts.done} done`}>
            <span className="bg-neutral-500" style={{ width: `${(ts.todo / Math.max(ts.total, 1)) * 100}%` }} />
            <span className="bg-accent-dark" style={{ width: `${(ts.inProgress / Math.max(ts.total, 1)) * 100}%` }} />
            <span className="bg-ok" style={{ width: `${(ts.done / Math.max(ts.total, 1)) * 100}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted-fg">
            <strong className="text-fg">{ts.todo}</strong> to do · <strong className="text-fg">{ts.inProgress}</strong> in progress · <strong className="text-fg">{ts.done}</strong> done · <strong className={ts.overdue ? 'text-danger' : 'text-fg'}>{ts.overdue}</strong> overdue
          </p>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <caption className="sr-only">Members of the {team.name} subteam</caption>
          <thead className="border-b border-line/70 text-xs text-muted-fg">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Person</th>
              <th scope="col" className="px-2 py-2.5 font-semibold">Role</th>
              {showLoad && <th scope="col" className="px-2 py-2.5 text-right font-semibold">Open</th>}
              {showLoad && <th scope="col" className="px-2 py-2.5 text-right font-semibold">Overdue</th>}
              {showLoad && <th scope="col" className="px-4 py-2.5 text-right font-semibold">Done (30d)</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/50">
            {people.map((p) => {
              const st = personStats(p.id, data.tasks)
              return (
                <tr key={p.id} className="hover:bg-amber-50/60">
                  <td className="px-4 py-2.5">
                    <Link to={`/people/${p.id}`} className="flex items-center gap-2.5 font-semibold hover:underline">
                      <Avatar name={p.fullName} size={28} /> {p.fullName}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5"><TierBadge tier={p.tier} /></td>
                  {showLoad && <td className="px-2 py-2.5 text-right tabular-nums">{st.open}</td>}
                  {showLoad && <td className={`px-2 py-2.5 text-right tabular-nums ${st.overdue ? 'font-semibold text-danger' : ''}`}>{st.overdue}</td>}
                  {showLoad && <td className="px-4 py-2.5 text-right tabular-nums">{st.done30}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
      {!showLoad && <p className="mt-3 text-xs text-muted-fg">Workload numbers are visible to your Lead and Core owner only.</p>}
    </>
  )
}
