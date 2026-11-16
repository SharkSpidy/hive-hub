import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import type { Data, Priority, Profile, Status, Task, TaskEvent, Tier } from './types'
import { canAssign, canCreateTask, canSetStatus, canVerify, isTaskManager } from './permissions'
import { supabase } from './supabase'
import {
  EMPTY_DATA,
  dbAssign,
  dbInsertEvents,
  dbInsertTask,
  dbSetCoreOwner,
  dbSetTier,
  dbUnassign,
  dbUpdateTask,
  loadAll,
  loadMyProfile,
  resolveUsernameEmail,
} from './db'
import type { Result } from './db'
import { uid } from './utils'

const ok: Result = { ok: true }
const no = (error: string): Result => ({ ok: false, error })
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.')

interface State {
  data: Data
  session: Session | null
  userId: string | null
  booted: boolean
  toast: { id: number; text: string; tone: 'ok' | 'error' } | null
  me: () => Profile | null
  boot: () => Promise<void>
  refresh: () => Promise<void>
  signIn: (username: string, password: string) => Promise<Result>
  signOut: () => Promise<void>
  notify: (text: string, tone?: 'ok' | 'error') => void
  createTask: (input: { title: string; description: string; teamId: string | null; priority: Priority; dueDate: number | null; assigneeIds: string[] }) => Result
  assign: (taskId: string, assigneeId: string) => Result
  unassign: (taskId: string, assigneeId: string) => Result
  setStatus: (taskId: string, status: Status) => Result
  verify: (taskId: string) => Result
  setTier: (userId: string, tier: Tier) => Result
  setCoreOwner: (teamId: string, coreId: string) => Result
}

export const useStore = create<State>()((set, get) => {
  const hydrate = async (session: Session) => {
    if (!supabase) return
    const profile = await loadMyProfile(session)
    if (!profile) {
      await supabase.auth.signOut()
      throw new Error('This login has no HIVE profile yet. Ask a Founder to add you.')
    }
    const data = await loadAll()
    if (!data.profiles.some((p) => p.id === profile.id)) data.profiles = [...data.profiles, profile]
    set({ session, userId: profile.id, data })
  }

  const reload = async () => {
    if (!supabase || !get().userId) return
    try {
      set({ data: await loadAll() })
    } catch (e) {
      get().notify(message(e), 'error')
    }
  }

  /** Runs a database write in the background; a failure rolls the optimistic UI back. */
  const persist = (run: () => Promise<Result>) => {
    void (async () => {
      try {
        const r = await run()
        if (!r.ok) {
          get().notify(r.error, 'error')
          await reload()
        }
      } catch (e) {
        get().notify(message(e), 'error')
        await reload()
      }
    })()
  }

  const mutateTask = (taskId: string, fn: (t: Task, me: Profile) => Result | void, write?: (t: Task) => Promise<Result>): Result => {
    const me = get().me()
    if (!me) return no('Sign in first.')
    const task = get().data.tasks.find((t) => t.id === taskId)
    if (!task) return no('Task not found.')
    const copy: Task = { ...task, assignments: [...task.assignments] }
    const res = fn(copy, me)
    if (res && !res.ok) return res
    set((s) => ({ data: { ...s.data, tasks: s.data.tasks.map((t) => (t.id === taskId ? copy : t)) } }))
    if (write && supabase) persist(() => write(copy))
    return ok
  }

  const addEvent = (e: { taskId: string; actorId: string; kind: TaskEvent['kind']; toStatus?: Status }) => {
    const event: TaskEvent = { ...e, id: uid(), at: Date.now() }
    set((s) => ({ data: { ...s.data, events: [...s.data.events, event] } }))
    return event
  }

  return {
    data: EMPTY_DATA,
    session: null,
    userId: null,
    booted: false,
    toast: null,
    me: () => get().data.profiles.find((p) => p.id === get().userId) ?? null,
    notify: (text, tone = 'ok') => set({ toast: { id: Date.now(), text, tone } }),

    boot: async () => {
      if (!supabase) {
        set({ booted: true })
        return
      }
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session) await hydrate(session)
      } catch (e) {
        set({ toast: { id: Date.now(), text: message(e), tone: 'error' } })
      } finally {
        set({ booted: true })
      }
      supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) set({ session: null, userId: null, data: EMPTY_DATA })
      })
    },

    refresh: reload,

    signIn: async (username, password) => {
      if (!supabase) return no('The backend is not connected yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart.')
      try {
        const email = await resolveUsernameEmail(username)
        if (!email) return no('That username is not registered. Check the spelling, or use your full email address.')
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          const msg = error.message.toLowerCase()
          if (msg.includes('invalid login')) return no('Wrong username or password.')
          if (msg.includes('email not confirmed')) return no('This account is not confirmed yet. Ask a Founder to confirm it.')
          return no(error.message)
        }
        if (!data.session) return no('Could not start a session. Try again.')
        await hydrate(data.session)
        return ok
      } catch (e) {
        return no(message(e))
      }
    },

    signOut: async () => {
      try {
        await supabase?.auth.signOut()
      } finally {
        set({ session: null, userId: null, data: EMPTY_DATA })
      }
    },

    createTask: (input) => {
      const me = get().me()
      if (!me) return no('Sign in first.')
      if (!canCreateTask(me, input.teamId)) return no('Your role cannot create tasks here.')
      for (const id of input.assigneeIds) {
        const p = get().data.profiles.find((x) => x.id === id)
        if (!p || !canAssign(me, input.teamId, p)) return no('You cannot assign a task to that person.')
      }
      const now = Date.now()
      const task: Task = {
        id: uid(),
        title: input.title.trim(),
        description: input.description.trim(),
        teamId: input.teamId,
        createdBy: me.id,
        status: 'todo',
        priority: input.priority,
        dueDate: input.dueDate,
        startedAt: null,
        completedAt: null,
        verifiedBy: null,
        verifiedAt: null,
        createdAt: now,
        assignments: input.assigneeIds.map((a) => ({ assigneeId: a, assignedBy: me.id, assignedAt: now })),
      }
      set((s) => ({ data: { ...s.data, tasks: [task, ...s.data.tasks] } }))
      const events = [
        { id: uid(), taskId: task.id, actorId: me.id, kind: 'created' as const, at: now },
        ...input.assigneeIds.map(() => ({
          id: uid(),
          taskId: task.id,
          actorId: me.id,
          kind: 'assigned' as const,
          at: now,
        })),
      ]
      set((s) => ({ data: { ...s.data, events: [...s.data.events, ...events] } }))
      if (supabase) persist(async () => (await dbInsertTask(task)).ok ? dbInsertEvents(events) : failTask(task.id))
      return ok
    },

    assign: (taskId, assigneeId) =>
      mutateTask(
        taskId,
        (t, me) => {
          const p = get().data.profiles.find((x) => x.id === assigneeId)
          if (!p || !canAssign(me, t.teamId, p)) return no('You cannot assign this task to that person.')
          if (t.assignments.some((a) => a.assigneeId === assigneeId)) return no('Already assigned.')
          t.assignments.push({ assigneeId, assignedBy: me.id, assignedAt: Date.now() })
          addEvent({ taskId, actorId: me.id, kind: 'assigned' })
        },
        async () => {
          const actor = get().userId ?? ''
          const r = await dbAssign(taskId, assigneeId, actor)
          if (!r.ok) return r
          return dbInsertEvents([{ id: uid(), taskId, actorId: actor, kind: 'assigned', at: Date.now() }])
        },
      ),

    unassign: (taskId, assigneeId) =>
      mutateTask(
        taskId,
        (t, me) => {
          if (!isTaskManager(me, t)) return no('Only a manager of this task can remove assignees.')
          t.assignments = t.assignments.filter((a) => a.assigneeId !== assigneeId)
        },
        () => dbUnassign(taskId, assigneeId),
      ),

    setStatus: (taskId, status) =>
      mutateTask(
        taskId,
        (t, me) => {
          if (!canSetStatus(me, t)) return no('You cannot change this task.')
          if (t.status === status) return
          const now = Date.now()
          t.status = status
          if (status === 'in_progress' && !t.startedAt) t.startedAt = now
          if (status === 'done') {
            t.completedAt = now
            if (!t.startedAt) t.startedAt = now
          } else {
            t.completedAt = null
            t.verifiedAt = null
            t.verifiedBy = null
          }
          addEvent({ taskId, actorId: me.id, kind: 'status_changed', toStatus: status })
        },
        async (t) => {
          const r = await dbUpdateTask(t)
          if (!r.ok) return r
          return dbInsertEvents([{ id: uid(), taskId, actorId: get().userId ?? '', kind: 'status_changed', toStatus: status, at: Date.now() }])
        },
      ),

    verify: (taskId) =>
      mutateTask(
        taskId,
        (t, me) => {
          if (!canVerify(me, t)) return no('You cannot verify this task. Assignees cannot verify their own work.')
          t.verifiedAt = Date.now()
          t.verifiedBy = me.id
          addEvent({ taskId, actorId: me.id, kind: 'verified' })
        },
        async (t) => {
          const r = await dbUpdateTask(t)
          if (!r.ok) return r
          return dbInsertEvents([{ id: uid(), taskId, actorId: get().userId ?? '', kind: 'verified', at: Date.now() }])
        },
      ),

    setTier: (userId, tier) => {
      const me = get().me()
      if (!me || me.tier !== 'founder') return no('Only Founders can change tiers.')
      set((s) => ({ data: { ...s.data, profiles: s.data.profiles.map((p) => (p.id === userId ? { ...p, tier } : p)) } }))
      if (supabase) persist(() => dbSetTier(userId, tier))
      return ok
    },

    setCoreOwner: (teamId, coreId) => {
      const me = get().me()
      if (!me || me.tier !== 'founder') return no('Only Founders can change team owners.')
      set((s) => ({ data: { ...s.data, teams: s.data.teams.map((t) => (t.id === teamId ? { ...t, coreOwnerId: coreId } : t)) } }))
      if (supabase) persist(() => dbSetCoreOwner(teamId, coreId))
      return ok
    },
  }
})

/** Removes an optimistically added task after the insert failed. */
function failTask(taskId: string): Result {
  useStore.setState((s) => ({
    data: { ...s.data, tasks: s.data.tasks.filter((t) => t.id !== taskId), events: s.data.events.filter((e) => e.taskId !== taskId) },
  }))
  return { ok: false, error: 'Could not save the task.' }
}
