import type { Session } from '@supabase/supabase-js'
import type { Data, Priority, Profile, Status, Task, TaskEvent, Team, Tier } from './types'
import { supabase } from './supabase'
import { uid } from './utils'

export type Result = { ok: true } | { ok: false; error: string }
export const ok: Result = { ok: true }
export const fail = (error: string): Result => ({ ok: false, error })

/** No demo rows: until Supabase answers, every table is empty. */
export const EMPTY_DATA: Data = { profiles: [], teams: [], tasks: [], events: [] }

const ms = (v: string | null | undefined) => (v ? Date.parse(v) : null)
const iso = (v: number | null | undefined) => (typeof v === 'number' ? new Date(v).toISOString() : null)

interface ProfileRow {
  id: string
  full_name: string | null
  email: string | null
  tier: Tier | null
  team_id: string | null
  bio: string | null
  joined_at: string | null
}
interface TeamRow {
  id: string
  name: string
  core_owner_id: string | null
}
interface TaskRow {
  id: string
  title: string
  description: string | null
  team_id: string | null
  created_by: string | null
  status: Status
  priority: Priority
  due_date: string | null
  started_at: string | null
  completed_at: string | null
  verified_by: string | null
  verified_at: string | null
  created_at: string | null
}
interface AssignmentRow {
  task_id: string
  assignee_id: string
  assigned_by: string | null
  assigned_at: string | null
}
interface EventRow {
  id: string
  task_id: string
  actor_id: string | null
  kind: TaskEvent['kind']
  to_status: Status | null
  at: string | null
}

const mapProfile = (r: ProfileRow): Profile => ({
  id: r.id,
  fullName: r.full_name?.trim() || r.email?.split('@')[0] || 'HIVE member',
  email: r.email ?? '',
  tier: r.tier ?? 'member',
  teamId: r.team_id,
  bio: r.bio ?? '',
  joinedAt: ms(r.joined_at) ?? Date.now(),
})

/** Loads every table the app renders. Throws with the first database error so the UI can explain it. */
export async function loadAll(): Promise<Data> {
  if (!supabase) return EMPTY_DATA
  const [teams, profiles, tasks, assignments, events] = await Promise.all([
    supabase.from('teams').select('*'),
    supabase.from('profiles').select('*'),
    supabase.from('tasks').select('*'),
    supabase.from('task_assignments').select('*'),
    supabase.from('task_events').select('*'),
  ])
  for (const res of [teams, profiles, tasks, assignments, events]) {
    if (res.error) throw new Error(res.error.message)
  }

  const byTask = new Map<string, AssignmentRow[]>()
  for (const a of (assignments.data ?? []) as AssignmentRow[]) {
    const list = byTask.get(a.task_id) ?? []
    list.push(a)
    byTask.set(a.task_id, list)
  }

  return {
    teams: ((teams.data ?? []) as TeamRow[]).map<Team>((t) => ({ id: t.id, name: t.name, coreOwnerId: t.core_owner_id })),
    profiles: ((profiles.data ?? []) as ProfileRow[]).map(mapProfile),
    tasks: ((tasks.data ?? []) as TaskRow[]).map<Task>((t) => ({
      id: t.id,
      title: t.title,
      description: t.description ?? '',
      teamId: t.team_id,
      createdBy: t.created_by ?? '',
      status: t.status,
      priority: t.priority,
      dueDate: ms(t.due_date),
      startedAt: ms(t.started_at),
      completedAt: ms(t.completed_at),
      verifiedBy: t.verified_by,
      verifiedAt: ms(t.verified_at),
      createdAt: ms(t.created_at) ?? Date.now(),
      assignments: (byTask.get(t.id) ?? []).map((a) => ({
        assigneeId: a.assignee_id,
        assignedBy: a.assigned_by ?? '',
        assignedAt: ms(a.assigned_at) ?? Date.now(),
      })),
    })),
    events: ((events.data ?? []) as EventRow[]).map<TaskEvent>((e) => ({
      id: e.id,
      taskId: e.task_id,
      actorId: e.actor_id ?? '',
      kind: e.kind,
      toStatus: e.to_status ?? undefined,
      at: ms(e.at) ?? Date.now(),
    })),
  }
}

/** The signed-in auth user mapped to their HIVE profile row (by auth id, then by email). */
export async function loadMyProfile(session: Session): Promise<Profile | null> {
  if (!supabase) return null
  const email = session.user.email
  const filter = email ? `id.eq.${session.user.id},email.eq.${email}` : `id.eq.${session.user.id}`
  const { data, error } = await supabase.from('profiles').select('*').or(filter).limit(1)
  if (error) throw new Error(error.message)
  const row = (data ?? [])[0] as ProfileRow | undefined
  return row ? mapProfile(row) : null
}

/**
 * Turns what the user typed into the email Supabase Auth expects.
 * Usernames resolve through public.username_email(); if that RPC is not installed
 * we fall back to VITE_AUTH_EMAIL_DOMAIN (or the plain form if an email was typed).
 */
export async function resolveUsernameEmail(input: string): Promise<string | null> {
  const raw = input.trim()
  if (!raw) return null
  if (raw.includes('@')) return raw

  if (supabase) {
    const { data } = await supabase.rpc('username_email', { p_username: raw })
    if (typeof data === 'string' && data.trim()) return data.trim()
  }

  const domain = import.meta.env.VITE_AUTH_EMAIL_DOMAIN?.trim().replace(/^@/, '')
  return domain ? `${raw}@${domain}` : null
}

const taskRow = (t: Task) => ({
  id: t.id,
  title: t.title,
  description: t.description,
  team_id: t.teamId,
  created_by: t.createdBy || null,
  status: t.status,
  priority: t.priority,
  due_date: iso(t.dueDate),
  started_at: iso(t.startedAt),
  completed_at: iso(t.completedAt),
  verified_by: t.verifiedBy,
  verified_at: iso(t.verifiedAt),
  created_at: iso(t.createdAt),
})

export async function dbInsertTask(task: Task): Promise<Result> {
  if (!supabase) return ok

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError) return fail(authError.message)
  if (!user) return fail('Sign in first.')

  const teamId = task.teamId?.trim().toLowerCase() ?? null
  if (task.teamId && !teamId) return fail('Choose a valid subteam.')
  if (teamId) {
    const { data: team, error: teamError } = await supabase.from('teams').select('id').eq('id', teamId).maybeSingle()
    if (teamError) return fail(teamError.message)
    if (!team) return fail('The selected subteam does not exist. Choose a valid subteam.')
  }

  const { error } = await supabase.from('tasks').insert({
    ...taskRow(task),
    team_id: teamId,
    created_by: user.id,
  })
  if (error) return fail(error.message)
  if (task.assignments.length === 0) return ok
  const { error: aErr } = await supabase.from('task_assignments').insert(
    task.assignments.map((a) => ({
      task_id: task.id,
      assignee_id: a.assigneeId,
      assigned_by: a.assignedBy || null,
      assigned_at: iso(a.assignedAt),
    })),
  )
  return aErr ? fail(aErr.message) : ok
}

export async function dbInsertEvents(events: TaskEvent[]): Promise<Result> {
  if (!supabase || events.length === 0) return ok
  const { error } = await supabase.from('task_events').insert(
    events.map((e) => ({
      id: e.id || uid(),
      task_id: e.taskId,
      actor_id: e.actorId || null,
      kind: e.kind,
      to_status: e.toStatus ?? null,
      at: iso(e.at),
    })),
  )
  return error ? fail(error.message) : ok
}

export async function dbAssign(taskId: string, assigneeId: string, actorId: string): Promise<Result> {
  if (!supabase) return ok
  const { error } = await supabase
    .from('task_assignments')
    .upsert({ task_id: taskId, assignee_id: assigneeId, assigned_by: actorId, assigned_at: new Date().toISOString() })
  return error ? fail(error.message) : ok
}

export async function dbUnassign(taskId: string, assigneeId: string): Promise<Result> {
  if (!supabase) return ok
  const { error } = await supabase.from('task_assignments').delete().eq('task_id', taskId).eq('assignee_id', assigneeId)
  return error ? fail(error.message) : ok
}

export async function dbUpdateTask(task: Task): Promise<Result> {
  if (!supabase) return ok
  const { error } = await supabase.from('tasks').update(taskRow(task)).eq('id', task.id)
  return error ? fail(error.message) : ok
}

export async function dbSetTier(userId: string, tier: Tier): Promise<Result> {
  if (!supabase) return ok
  const { error } = await supabase.from('profiles').update({ tier }).eq('id', userId)
  return error ? fail(error.message) : ok
}

export async function dbSetCoreOwner(teamId: string, coreId: string | null): Promise<Result> {
  if (!supabase) return ok
  const { error } = await supabase.from('teams').update({ core_owner_id: coreId }).eq('id', teamId)
  return error ? fail(error.message) : ok
}
