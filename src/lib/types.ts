export type Tier = 'volunteer' | 'member' | 'lead' | 'core' | 'founder'
export type Status = 'todo' | 'in_progress' | 'done'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export const TIER_RANK: Record<Tier, number> = { volunteer: 1, member: 2, lead: 3, core: 4, founder: 5 }
export const TIER_LABEL: Record<Tier, string> = {
  volunteer: 'Volunteer',
  member: 'Sub Team Member',
  lead: 'Sub Team Lead',
  core: 'HIVE Core',
  founder: 'Founder',
}
export const STATUS_LABEL: Record<Status, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
export const STATUSES: Status[] = ['todo', 'in_progress', 'done']
export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }

export interface Profile {
  id: string
  fullName: string
  email: string
  tier: Tier
  teamId: string | null
  bio: string
  joinedAt: number
}

export interface Team {
  id: string
  name: string
  coreOwnerId: string | null
}

export interface Assignment {
  assigneeId: string
  assignedBy: string
  assignedAt: number
}

export interface Task {
  id: string
  title: string
  description: string
  teamId: string | null // null = org-wide
  createdBy: string
  status: Status
  priority: Priority
  dueDate: number | null
  startedAt: number | null
  completedAt: number | null
  verifiedBy: string | null
  verifiedAt: number | null
  createdAt: number
  assignments: Assignment[]
}

export interface TaskEvent {
  id: string
  taskId: string
  actorId: string
  kind: 'created' | 'assigned' | 'status_changed' | 'verified'
  toStatus?: Status
  at: number
}

export interface Data {
  profiles: Profile[]
  teams: Team[]
  tasks: Task[]
  events: TaskEvent[]
}
