import { useEffect, useMemo, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { dbLoadMessages, dbSendMessage, mapMessage } from '../lib/db'
import type { TaskMessage } from '../lib/types'
import { TIER_LABEL } from '../lib/types'
import { cn, fmtDateTime, uid } from '../lib/utils'
import { Avatar, btn, field } from './ui'

/** Chat room for one task: its creator (Founder / Core / Sub Team Lead), managers and every assignee. */
export default function TaskChat({ taskId }: { taskId: string }) {
  const me = useStore((s) => s.me())!
  const profiles = useStore((s) => s.data.profiles)
  const task = useStore((s) => s.data.tasks.find((t) => t.id === taskId))
  const notifications = useStore((s) => s.notifications)
  const unreadChat = useMemo(() => notifications.filter((n) => n.kind === 'chat' && n.taskId === taskId && !n.readAt), [notifications, taskId])
  const [messages, setMessages] = useState<TaskMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let live = true
    setLoading(true)
    dbLoadMessages(taskId)
      .then((m) => live && setMessages(m))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : 'Could not load chat.'))
      .finally(() => live && setLoading(false))

    const channel = supabase
      ?.channel(`task-chat:${taskId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_messages', filter: `task_id=eq.${taskId}` }, (p) => {
        const m = mapMessage(p.new as Parameters<typeof mapMessage>[0])
        setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]))
      })
      .subscribe()
    return () => {
      live = false
      if (channel) void supabase?.removeChannel(channel)
    }
  }, [taskId])

  // Chat notifications for this task are read the moment the chat is on screen.
  useEffect(() => {
    if (unreadChat.length) useStore.getState().markRead(unreadChat.map((n) => n.id))
  }, [unreadChat])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, loading])

  const people = useMemo(() => {
    if (!task) return []
    const ids = new Set([task.createdBy, ...task.assignments.map((a) => a.assigneeId)])
    return profiles.filter((p) => ids.has(p.id))
  }, [task, profiles])

  const send = () => {
    const body = draft.trim()
    if (!body) return
    const m: TaskMessage = { id: uid(), taskId, senderId: me.id, body, createdAt: Date.now() }
    setMessages((cur) => [...cur, m])
    setDraft('')
    setError('')
    void dbSendMessage(m).then((r) => {
      if (!r.ok) {
        setMessages((cur) => cur.filter((x) => x.id !== m.id))
        setDraft(body)
        setError(r.error)
      }
    })
  }

  const who = (id: string) => profiles.find((p) => p.id === id)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="border-b border-line/70 px-4 py-2 text-xs text-muted-fg">
        {people.length > 0 ? `In this chat: ${people.map((p) => p.fullName).join(', ')}` : 'Only the task creator and managers are here until someone is assigned.'}
      </p>

      <div className="flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite" aria-label="Task chat messages">
        {loading && <p className="text-sm text-muted-fg">Loading messages…</p>}
        {!loading && messages.length === 0 && <p className="py-8 text-center text-sm text-muted-fg">No messages yet. Say hello to start the conversation.</p>}
        {messages.map((m) => {
          const mine = m.senderId === me.id
          const p = who(m.senderId)
          return (
            <div key={m.id} className={cn('flex items-end gap-2', mine && 'flex-row-reverse')}>
              <Avatar name={p?.fullName ?? '?'} size={28} />
              <div className={cn('max-w-[80%] rounded-2xl px-3 py-2', mine ? 'rounded-br-sm bg-secondary text-primary' : 'rounded-bl-sm bg-muted text-fg')}>
                {!mine && (
                  <p className="mb-0.5 text-xs font-bold">
                    {p?.fullName ?? 'Someone'} <span className="font-medium text-muted-fg">· {p ? TIER_LABEL[p.tier] : ''}</span>
                  </p>
                )}
                <p className="text-sm break-words whitespace-pre-wrap">{m.body}</p>
                <time className="mt-0.5 block text-[10px] text-muted-fg">{fmtDateTime(m.createdAt)}</time>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="border-t border-line/70 p-3"
      >
        {error && <p role="alert" className="mb-2 text-xs font-semibold text-danger">{error}</p>}
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">Message</label>
          <textarea
            id="chat-input"
            rows={1}
            maxLength={2000}
            className={`${field} max-h-32 min-h-10 resize-none py-2`}
            placeholder="Write a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />
          <button type="submit" disabled={!draft.trim()} aria-label="Send message" className={`${btn.primary} !px-3`}>
            <Send className="size-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  )
}
