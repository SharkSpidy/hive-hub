import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Data, Priority, Profile, Status, Task, Tier } from './types'
import { buildSeed } from './seed'
import { canAssign, canCreateTask, canSetStatus, canVerify, isTaskManager } from './permissions'
import { uid } from './utils'

type Result = { ok: true } | { ok: false; error: string }
const ok: Result = { ok: true }
const no = (error: string): Result => ({ ok: false, error })

interface State {
  data: Data
  currentUserId: string | null
  toast: { id: number; text: string; tone: 'ok' | 'error' } | null
  me: () => Profile | null
  signIn: (id: string) => void
  signOut: () => void
  notify: (text: string, tone?: 'ok' | 'error') => void
  createTask: (input: { title: string; description: string; teamId: string | null; priority: Priority; dueDate: number | null; assigneeIds: string[] }) => Result
  assign: (taskId: string, assigneeId: string) => Result
  unassign: (taskId: string, assigneeId: string) => Result
  setStatus: (taskId: string, status: Status) => Result
  verify: (taskId: string) => Result
  setTier: (userId: string, tier: Tier) => Result
  setCoreOwner: (teamId: string, coreId: string) => Result
  invite: (name: string, email: string, tier: Tier, teamId: string | null) => Result
  resetDemo: () => void
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const mutateTask = (taskId: string, fn: (t: Task, me: Profile) => Result | void): Result => {
        const me = get().me()
        if (!me) return no('Sign in first.')
        const task = get().data.tasks.find((t) => t.id === taskId)
        if (!task) return no('Task not found.')
        const copy: Task = { ...task, assignments: [...task.assignments] }
        const res = fn(copy, me)
        if (res && !res.ok) return res
        set((s) => ({ data: { ...s.data, tasks: s.data.tasks.map((t) => (t.id === taskId ? copy : t)) } }))
        return ok
      }
      const addEvent = (e: Omit<Data['events'][number], 'id' | 'at'>) =>
        set((s) => ({ data: { ...s.data, events: [...s.data.events, { ...e, id: uid(), at: Date.now() }] } }))

      return {
        data: buildSeed(),
        currentUserId: null,
        toast: null,
        me: () => get().data.profiles.find((p) => p.id === get().currentUserId) ?? null,
        signIn: (id) => set({ currentUserId: id }),
        signOut: () => set({ currentUserId: null }),
        notify: (text, tone = 'ok') => set({ toast: { id: Date.now(), text, tone } }),

        createTask: (input) => {
          const me = get().me()
          if (!me) return no('Sign in first.')
          if (!canCreateTask(me, input.teamId)) return no('Your role cannot create tasks here.')
          const people = get().data.profiles
          for (const id of input.assigneeIds) {
            const p = people.find((x) => x.id === id)
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
          addEvent({ taskId: task.id, actorId: me.id, kind: 'created' })
          input.assigneeIds.forEach(() => addEvent({ taskId: task.id, actorId: me.id, kind: 'assigned' }))
          return ok
        },

        assign: (taskId, assigneeId) =>
          mutateTask(taskId, (t, me) => {
            const p = get().data.profiles.find((x) => x.id === assigneeId)
            if (!p || !canAssign(me, t.teamId, p)) return no('You cannot assign this task to that person.')
            if (t.assignments.some((a) => a.assigneeId === assigneeId)) return no('Already assigned.')
            t.assignments.push({ assigneeId, assignedBy: me.id, assignedAt: Date.now() })
            addEvent({ taskId, actorId: me.id, kind: 'assigned' })
          }),

        unassign: (taskId, assigneeId) =>
          mutateTask(taskId, (t, me) => {
            if (!isTaskManager(me, t)) return no('Only a manager of this task can remove assignees.')
            t.assignments = t.assignments.filter((a) => a.assigneeId !== assigneeId)
          }),

        setStatus: (taskId, status) =>
          mutateTask(taskId, (t, me) => {
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
          }),

        verify: (taskId) =>
          mutateTask(taskId, (t, me) => {
            if (!canVerify(me, t)) return no('You cannot verify this task. Assignees cannot verify their own work.')
            t.verifiedAt = Date.now()
            t.verifiedBy = me.id
            addEvent({ taskId, actorId: me.id, kind: 'verified' })
          }),

        setTier: (userId, tier) => {
          const me = get().me()
          if (!me || me.tier !== 'founder') return no('Only Founders can change tiers.')
          set((s) => ({ data: { ...s.data, profiles: s.data.profiles.map((p) => (p.id === userId ? { ...p, tier } : p)) } }))
          return ok
        },

        setCoreOwner: (teamId, coreId) => {
          const me = get().me()
          if (!me || me.tier !== 'founder') return no('Only Founders can change team owners.')
          set((s) => ({ data: { ...s.data, teams: s.data.teams.map((t) => (t.id === teamId ? { ...t, coreOwnerId: coreId } : t)) } }))
          return ok
        },

        invite: (name, email, tier, teamId) => {
          const me = get().me()
          if (!me || me.tier !== 'founder') return no('Only Founders can invite people.')
          const p: Profile = { id: uid(), fullName: name.trim(), email: email.trim(), tier, teamId, bio: 'Invited by a Founder.', joinedAt: Date.now() }
          set((s) => ({ data: { ...s.data, profiles: [...s.data.profiles, p] } }))
          return ok
        },

        resetDemo: () => set({ data: buildSeed() }),
      }
    },
    { name: 'hive-hub-demo-v1', version: 1, partialize: (s) => ({ data: s.data, currentUserId: s.currentUserId }) },
  ),
)
