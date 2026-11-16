import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../lib/store'
import { canAssign, isOrgWide } from '../lib/permissions'
import { PRIORITY_LABEL } from '../lib/types'
import type { Priority } from '../lib/types'
import { Avatar, btn, field } from './ui'

export default function NewTaskDialog({ onClose }: { onClose: () => void }) {
  const me = useStore((s) => s.me())!
  const data = useStore((s) => s.data)
  const createTask = useStore((s) => s.createTask)
  const notify = useStore((s) => s.notify)
  const orgWide = isOrgWide(me)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [teamId, setTeamId] = useState<string>(orgWide ? '' : (me.teamId ?? ''))
  const [priority, setPriority] = useState<Priority>('medium')
  const [due, setDue] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [error, setError] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const tid = teamId || null
  const eligible = useMemo(
    () => data.profiles.filter((p) => canAssign(me, tid, p) && p.id !== me.id).filter((p) => (tid ? p.teamId === tid || orgWide : true)),
    [data.profiles, me, tid, orgWide],
  )
  // For team tasks, Core/Founder see that team's people first; for org-wide tasks they see everyone.
  const list = tid ? eligible.filter((p) => p.teamId === tid) : eligible

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return setError('Give the task a title.')
    const r = createTask({ title, description, teamId: tid, priority, dueDate: due ? new Date(due + 'T12:00:00').getTime() : null, assigneeIds: picked })
    if (!r.ok) return setError(r.error)
    notify('Task created')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-fg/40" onClick={onClose} aria-hidden="true" />
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="nt-title" className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-line/70 p-4">
          <h2 id="nt-title" className="text-lg font-bold">New task</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-10 items-center justify-center rounded-lg hover:bg-teal-100">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="space-y-4 overflow-y-auto p-4">
          <div>
            <label htmlFor="nt-name" className="mb-1 block text-sm font-semibold">Title</label>
            <input id="nt-name" ref={titleRef} className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to happen?" />
          </div>
          <div>
            <label htmlFor="nt-desc" className="mb-1 block text-sm font-semibold">Details <span className="font-normal text-muted-fg">(optional)</span></label>
            <textarea id="nt-desc" className={`${field} min-h-20 py-2`} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="nt-team" className="mb-1 block text-sm font-semibold">Subteam</label>
              <select id="nt-team" className={field} value={teamId} disabled={!orgWide} onChange={(e) => { setTeamId(e.target.value); setPicked([]) }}>
                {orgWide && <option value="">Org-wide</option>}
                {data.teams.filter((t) => orgWide || t.id === me.teamId).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="nt-pri" className="mb-1 block text-sm font-semibold">Priority</label>
              <select id="nt-pri" className={field} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="nt-due" className="mb-1 block text-sm font-semibold">Due date <span className="font-normal text-muted-fg">(optional)</span></label>
            <input id="nt-due" type="date" className={field} value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <fieldset>
            <legend className="mb-1 text-sm font-semibold">Assign to</legend>
            <p className="mb-1.5 text-xs text-muted-fg">
              {me.tier === 'lead' ? 'You can assign to Members and Volunteers in your subteam.' : 'You can assign to anyone in the org.'}
            </p>
            <div className="max-h-44 overflow-y-auto rounded-lg border border-line">
              {list.length === 0 && <p className="p-3 text-sm text-muted-fg">No eligible people.</p>}
              {list.map((p) => (
                <label key={p.id} className="flex min-h-11 cursor-pointer items-center gap-2.5 border-b border-line/50 px-3 last:border-0 hover:bg-teal-50">
                  <input type="checkbox" className="size-4 accent-teal-700" checked={picked.includes(p.id)} onChange={() => setPicked((c) => (c.includes(p.id) ? c.filter((x) => x !== p.id) : [...c, p.id]))} />
                  <Avatar name={p.fullName} size={24} />
                  <span className="text-sm font-medium">{p.fullName}</span>
                  <span className="ml-auto text-xs text-muted-fg">{data.teams.find((t) => t.id === p.teamId)?.name ?? p.tier}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-line/70 p-4">
          <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
          <button type="submit" className={btn.primary}>Create task</button>
        </footer>
      </form>
    </div>
  )
}
