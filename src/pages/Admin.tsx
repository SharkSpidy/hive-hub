import { Navigate } from 'react-router-dom'
import { Info } from 'lucide-react'
import { useStore } from '../lib/store'
import { TIER_LABEL, TIER_RANK } from '../lib/types'
import type { Tier } from '../lib/types'
import { Avatar, Card, EmptyState, PageHeader, field } from '../components/ui'

export default function Admin() {
  const me = useStore((s) => s.me())!
  const data = useStore((s) => s.data)
  const setTier = useStore((s) => s.setTier)
  const setCoreOwner = useStore((s) => s.setCoreOwner)
  const notify = useStore((s) => s.notify)

  if (me.tier !== 'founder') return <Navigate to="/tasks" replace />
  const tiers = (Object.keys(TIER_LABEL) as Tier[]).sort((a, b) => TIER_RANK[b] - TIER_RANK[a])
  const cores = data.profiles.filter((p) => p.tier === 'core')
  const people = [...data.profiles].sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || a.fullName.localeCompare(b.fullName))

  return (
    <>
      <PageHeader title="Admin" sub="Set tiers and Core owners. Founders only." />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card className="p-4">
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <Info className="size-4 text-accent-dark" aria-hidden="true" /> Adding people
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-fg">
              There is no sign-up. Create the login in Supabase (Authentication → Users) with a username-style email, then add
              the matching row in <code className="font-semibold text-fg">profiles</code>. Their tier here controls what they can see.
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-bold">Core owners by subteam</h2>
            {data.teams.length === 0 ? (
              <p className="text-sm text-muted-fg">No subteams in the database yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.teams.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <label htmlFor={`own-${t.id}`} className="text-sm font-semibold">
                      {t.name}
                    </label>
                    <select
                      id={`own-${t.id}`}
                      className={`${field} !w-44`}
                      value={t.coreOwnerId ?? ''}
                      onChange={(e) => {
                        const r = setCoreOwner(t.id, e.target.value)
                        notify(r.ok ? `${t.name} owner updated` : r.error, r.ok ? 'ok' : 'error')
                      }}
                    >
                      <option value="">Unassigned</option>
                      {cores.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {people.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyState title="No profiles yet" hint="Add your people in Supabase and they will show up here." />
          </div>
        ) : (
          <Card className="overflow-x-auto lg:col-span-2">
            <table className="w-full min-w-[480px] text-left text-sm">
              <caption className="sr-only">Everyone in the organization and their tier</caption>
              <thead className="border-b border-line/70 text-xs text-muted-fg">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Person</th>
                  <th scope="col" className="px-2 py-2.5 font-semibold">Subteam</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {people.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-2.5 font-semibold">
                        <Avatar name={p.fullName} size={26} /> {p.fullName}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-muted-fg">{data.teams.find((t) => t.id === p.teamId)?.name ?? '–'}</td>
                    <td className="px-4 py-2">
                      <label htmlFor={`tier-${p.id}`} className="sr-only">Tier for {p.fullName}</label>
                      <select
                        id={`tier-${p.id}`}
                        className={`${field} !min-h-9 !w-44`}
                        value={p.tier}
                        disabled={p.id === me.id}
                        title={p.id === me.id ? 'You cannot change your own tier' : undefined}
                        onChange={(e) => {
                          const r = setTier(p.id, e.target.value as Tier)
                          notify(r.ok ? `${p.fullName} is now ${TIER_LABEL[e.target.value as Tier]}` : r.error, r.ok ? 'ok' : 'error')
                        }}
                      >
                        {tiers.map((t) => (
                          <option key={t} value={t}>
                            {TIER_LABEL[t]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </>
  )
}
