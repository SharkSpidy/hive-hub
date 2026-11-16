import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { TIER_LABEL, TIER_RANK } from '../lib/types'
import type { Tier } from '../lib/types'
import { Avatar, Card, PageHeader, btn, field } from '../components/ui'

export default function Admin() {
  const me = useStore((s) => s.me())!
  const data = useStore((s) => s.data)
  const setTier = useStore((s) => s.setTier)
  const setCoreOwner = useStore((s) => s.setCoreOwner)
  const invite = useStore((s) => s.invite)
  const notify = useStore((s) => s.notify)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [tier, setTierState] = useState<Tier>('volunteer')
  const [team, setTeam] = useState('tech')

  if (me.tier !== 'founder') return <Navigate to="/tasks" replace />
  const tiers = (Object.keys(TIER_LABEL) as Tier[]).sort((a, b) => TIER_RANK[b] - TIER_RANK[a])
  const cores = data.profiles.filter((p) => p.tier === 'core')
  const people = [...data.profiles].sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || a.fullName.localeCompare(b.fullName))
  const needsTeam = tier === 'lead' || tier === 'member' || tier === 'volunteer'

  const onInvite = (e: React.FormEvent) => {
    e.preventDefault()
    const r = invite(name, email, tier, needsTeam ? team : null)
    notify(r.ok ? `Invite sent to ${email}` : r.error, r.ok ? 'ok' : 'error')
    if (r.ok) { setName(''); setEmail('') }
  }

  return (
    <>
      <PageHeader title="Admin" sub="Invite people, set tiers, and assign Core owners to subteams. Founders only." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-1">
          <h2 className="mb-3 text-sm font-bold">Invite someone</h2>
          <form onSubmit={onInvite} className="space-y-3">
            <div>
              <label htmlFor="inv-name" className="mb-1 block text-sm font-semibold">Full name</label>
              <input id="inv-name" required className={field} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="inv-email" className="mb-1 block text-sm font-semibold">Email</label>
              <input id="inv-email" type="email" required className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label htmlFor="inv-tier" className="mb-1 block text-sm font-semibold">Tier</label>
              <select id="inv-tier" className={field} value={tier} onChange={(e) => setTierState(e.target.value as Tier)}>
                {tiers.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
              </select>
            </div>
            {needsTeam && (
              <div>
                <label htmlFor="inv-team" className="mb-1 block text-sm font-semibold">Subteam</label>
                <select id="inv-team" className={field} value={team} onChange={(e) => setTeam(e.target.value)}>
                  {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            <button type="submit" className={`${btn.primary} w-full`}>Send invite</button>
            <p className="text-xs text-muted-fg">In the live app this calls an Edge Function that uses the service role to invite the user by email.</p>
          </form>

          <h2 className="mt-6 mb-2 text-sm font-bold">Core owners by subteam</h2>
          <ul className="space-y-2">
            {data.teams.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <label htmlFor={`own-${t.id}`} className="text-sm font-semibold">{t.name}</label>
                <select id={`own-${t.id}`} className={`${field} !w-44`} value={t.coreOwnerId ?? ''} onChange={(e) => { const r = setCoreOwner(t.id, e.target.value); notify(r.ok ? `${t.name} owner updated` : r.error, r.ok ? 'ok' : 'error') }}>
                  {cores.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </select>
              </li>
            ))}
          </ul>
        </Card>

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
                  <td className="px-4 py-2"><span className="flex items-center gap-2.5 font-semibold"><Avatar name={p.fullName} size={26} /> {p.fullName}</span></td>
                  <td className="px-2 py-2 text-muted-fg">{data.teams.find((t) => t.id === p.teamId)?.name ?? '–'}</td>
                  <td className="px-4 py-2">
                    <label htmlFor={`tier-${p.id}`} className="sr-only">Tier for {p.fullName}</label>
                    <select
                      id={`tier-${p.id}`}
                      className={`${field} !min-h-9 !w-44`}
                      value={p.tier}
                      disabled={p.id === me.id}
                      title={p.id === me.id ? 'You cannot change your own tier' : undefined}
                      onChange={(e) => { const r = setTier(p.id, e.target.value as Tier); notify(r.ok ? `${p.fullName} is now ${TIER_LABEL[e.target.value as Tier]}` : r.error, r.ok ? 'ok' : 'error') }}
                    >
                      {tiers.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  )
}
