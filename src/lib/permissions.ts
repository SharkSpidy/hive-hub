import type { Profile, Task } from './types'
import { TIER_RANK } from './types'

/**
 * These functions mirror the Postgres helpers and RLS policies in the architecture doc
 * (is_org_wide, is_task_manager, can_assign, tasks_read ...). In production the database
 * enforces the rules; here they gate the mock data layer and the UI.
 */
export const isOrgWide = (u: Profile) => u.tier === 'core' || u.tier === 'founder'
export const atLeast = (u: Profile, min: Profile['tier']) => TIER_RANK[u.tier] >= TIER_RANK[min]

export const isAssigned = (u: Profile, t: Task) => t.assignments.some((a) => a.assigneeId === u.id)

export const isTaskManager = (u: Profile, t: Task) =>
  isOrgWide(u) || (u.tier === 'lead' && t.teamId !== null && t.teamId === u.teamId)

export const canSeeTask = (u: Profile, t: Task) => isOrgWide(u) || isTaskManager(u, t) || isAssigned(u, t)

export const canCreateTask = (u: Profile, teamId: string | null) =>
  isOrgWide(u) || (u.tier === 'lead' && teamId !== null && teamId === u.teamId)

export const canAssign = (u: Profile, taskTeamId: string | null, assignee: Profile) => {
  if (u.tier === 'founder' || u.tier === 'core') return true
  if (u.tier === 'lead')
    return (
      taskTeamId !== null &&
      taskTeamId === u.teamId &&
      assignee.teamId === u.teamId &&
      (assignee.tier === 'member' || assignee.tier === 'volunteer')
    )
  return false
}

export const canSetStatus = (u: Profile, t: Task) => isTaskManager(u, t) || isAssigned(u, t)

export const canVerify = (u: Profile, t: Task) =>
  isTaskManager(u, t) && !isAssigned(u, t) && t.status === 'done' && !t.verifiedAt

export const canSeeProfile = (u: Profile, p: Profile) =>
  u.id === p.id || isOrgWide(u) || (u.teamId !== null && u.teamId === p.teamId)
