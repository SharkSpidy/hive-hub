import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowRight, Hexagon } from 'lucide-react'
import { useStore } from '../lib/store'
import { TIER_LABEL, TIER_RANK } from '../lib/types'
import type { Tier } from '../lib/types'
import { Avatar, TierBadge, field } from '../components/ui'

const BLURB: Record<Tier, string> = {
  founder: 'Sees and manages everything, including tiers and teams.',
  core: 'Org-wide dashboard; assigns tasks anywhere.',
  lead: 'Runs one subteam; assigns to its members and volunteers.',
  member: 'Sees and updates the tasks assigned to them.',
  volunteer: 'Sees and updates the tasks assigned to them.',
}
const DEMO: Record<Tier, string> = {
  founder: 'u-founder-0',
  core: 'u-core-0',
  lead: 'u-lead-0',
  member: 'u-member-0',
  volunteer: 'u-volunteer-0',
}

export default function Login() {
  const me = useStore((s) => s.me())
  const signIn = useStore((s) => s.signIn)
  const data = useStore((s) => s.data)
  const resetDemo = useStore((s) => s.resetDemo)
  const [other, setOther] = useState('')
  if (me) return <Navigate to={me.tier === 'founder' || me.tier === 'core' ? '/dashboard' : '/tasks'} replace />

  const go = (id: string) => signIn(id)
  const tiers = (Object.keys(DEMO) as Tier[]).sort((a, b) => TIER_RANK[b] - TIER_RANK[a])
  // For Member/Volunteer, demo as whoever has the most open assigned tasks so the first view is not empty.
  const demoFor = (t: Tier) => {
    if (t !== 'member' && t !== 'volunteer') return data.profiles.find((x) => x.id === DEMO[t])!
    const open = (id: string) => data.tasks.filter((k) => k.status !== 'done' && k.assignments.some((a) => a.assigneeId === id)).length
    return data.profiles.filter((x) => x.tier === t).sort((a, b) => open(b.id) - open(a.id))[0] ?? data.profiles.find((x) => x.id === DEMO[t])!
  }

  return (
    <div className="min-h-full overflow-y-auto bg-bg">
      <div className="mx-auto flex max-w-3xl flex-col px-4 py-10 md:py-16">
        <div className="flex items-center gap-2.5">
          <Hexagon className="size-8 fill-accent-dark text-accent-dark" aria-hidden="true" />
          <span className="text-2xl font-bold tracking-tight">The HIVE Hub</span>
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">One place to see every task across every subteam.</h1>
        <p className="mt-3 max-w-xl text-base text-muted-fg">
          Tasks flow down from Founders to Core, Leads, Members and Volunteers, and status flows back up. What you see depends on your tier.
        </p>

        <div className="mt-8 rounded-xl border border-line bg-white p-4 md:p-5">
          <h2 className="text-sm font-bold">Demo mode: sign in as a role</h2>
          <p className="mt-0.5 text-sm text-muted-fg">Pick a tier to see exactly what that person can view and do. Data is saved only in this browser.</p>
          <ul className="mt-3 grid gap-2">
            {tiers.map((t) => {
              const p = demoFor(t)
              return (
                <li key={t}>
                  <button
                    onClick={() => go(p.id)}
                    className="group flex min-h-14 w-full items-center gap-3 rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-primary-dark hover:bg-teal-50"
                  >
                    <Avatar name={p.fullName} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{p.fullName}</span>
                        <TierBadge tier={t} />
                      </span>
                      <span className="block text-sm text-muted-fg">{BLURB[t]}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-fg transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    <span className="sr-only">Sign in as {TIER_LABEL[t]}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 flex flex-col gap-2 border-t border-line/70 pt-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="other" className="mb-1 block text-sm font-semibold">
                Or choose anyone in the org
              </label>
              <select id="other" className={field} value={other} onChange={(e) => setOther(e.target.value)}>
                <option value="">Select a person</option>
                {data.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({TIER_LABEL[p.tier]})
                  </option>
                ))}
              </select>
            </div>
            <button disabled={!other} onClick={() => go(other)} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary-dark px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
              Sign in
            </button>
          </div>
          <button onClick={resetDemo} className="mt-3 text-sm font-semibold text-muted-fg underline underline-offset-2 hover:text-fg">
            Reset demo data
          </button>
        </div>
      </div>
    </div>
  )
}
