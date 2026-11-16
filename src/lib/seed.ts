import type { Assignment, Data, Priority, Profile, Status, Task, TaskEvent, Team, Tier } from './types'
import { DAY } from './utils'

function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TEAM_DEFS = [
  { id: 'tech', name: 'Tech' },
  { id: 'design', name: 'Design' },
  { id: 'events', name: 'Events' },
  { id: 'content', name: 'Content' },
  { id: 'outreach', name: 'Outreach' },
  { id: 'ops', name: 'Operations' },
]

const FOUNDERS = ['Aarav Menon', 'Meera Nair']
const CORE = ['Devika Varma', 'Arjun Kurian', 'Nila Thomas']
const LEADS = ['Sanjay Rao', 'Anju Mathew', 'Faisal Ahmed', 'Tara Joseph', 'Kiran Das', 'Lakshmi Iyer']
const MEMBERS = [
  'Hari Krishnan', 'Noor Fathima', 'Adithya Raj', 'Sneha George', 'Vishnu Prasad', 'Ayesha Khan',
  'Gokul Nair', 'Ria Sebastian', 'Jithin Paul', 'Fida Rahman', 'Akhil Mohan', 'Diya Chandran',
]
const VOLUNTEERS = [
  'Sreya Anand', 'Basil Jacob', 'Mehak Singh', 'Nandan Varier', 'Tess Abraham', 'Irfan Basheer',
  'Lekha Pillai', 'Rohit Babu', 'Zoya Hameed', 'Abin Thomas', 'Kavya Suresh', 'Midhun Raj',
]

const TASKS: Record<string, string[]> = {
  tech: ['Set up CI for the hub repo', 'Build event registration API', 'Move sign-in to invite-only', 'Fix mobile nav bug', 'Write onboarding docs for devs', 'Audit access policies'],
  design: ['Design summit poster', 'Refresh app icon set', 'Wireframes for the task board', 'Brand guideline v2', 'Social media template pack', 'Write usability test script'],
  events: ['Book venue for hack night', 'Finalize speaker lineup', 'Prepare volunteer shift roster', 'Order swag and badges', 'Run-of-show for summit day', 'Follow up on vendor payments'],
  content: ['Publish campus recap blog', 'Edit interview series ep. 3', 'Write the November newsletter', 'Caption batch for reels', 'Draft sponsor deck copy', 'Tag the photo archive'],
  outreach: ['Reach out to 10 college chapters', 'Sponsor follow-up calls', 'Draft partner MoU', 'Clean up the alumni mailing list', 'Onboard campus ambassadors', 'Send out the press kit'],
  ops: ['Reconcile October expenses', 'Update the member database', 'Plan the quarterly review', 'Schedule team 1:1s', 'Renew tool licences', 'Compile attendance reports'],
}
const ORG_TASKS = ['Prepare the year-end report', 'Quarterly OKR review', 'Volunteer recognition plan', 'Refresh the code of conduct']

const PRIORITIES: Priority[] = ['low', 'medium', 'medium', 'high', 'urgent']

export function buildSeed(now = Date.now()): Data {
  const r = rng(42)
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)]
  const profiles: Profile[] = []
  const mk = (idx: number, name: string, tier: Tier, teamId: string | null, bio: string) => {
    const id = `u-${tier}-${idx}`
    profiles.push({
      id,
      fullName: name,
      email: name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ /g, '.') + '@hive.example',
      tier,
      teamId,
      bio,
      joinedAt: now - Math.round((30 + r() * 600) * DAY),
    })
    return id
  }

  FOUNDERS.forEach((n, i) => mk(i, n, 'founder', null, 'Co-founder. Keeps the whole picture in view.'))
  const coreIds = CORE.map((n, i) => mk(i, n, 'core', null, 'HIVE Core. Looks after two subteams.'))
  const teams: Team[] = TEAM_DEFS.map((t, i) => ({ id: t.id, name: t.name, coreOwnerId: coreIds[Math.floor(i / 2)] }))
  LEADS.forEach((n, i) => mk(i, n, 'lead', TEAM_DEFS[i].id, `Leads the ${TEAM_DEFS[i].name} subteam.`))
  MEMBERS.forEach((n, i) => mk(i, n, 'member', TEAM_DEFS[Math.floor(i / 2)].id, `Member of ${TEAM_DEFS[Math.floor(i / 2)].name}.`))
  VOLUNTEERS.forEach((n, i) => mk(i, n, 'volunteer', TEAM_DEFS[Math.floor(i / 2)].id, `Volunteer with ${TEAM_DEFS[Math.floor(i / 2)].name}.`))

  const tasks: Task[] = []
  const events: TaskEvent[] = []
  let n = 0

  const build = (title: string, teamId: string | null) => {
    n += 1
    const id = `t-${n}`
    const team = teams.find((t) => t.id === teamId)
    const lead = profiles.find((p) => p.tier === 'lead' && p.teamId === teamId)
    const creator = lead ? lead.id : (team?.coreOwnerId ?? coreIds[0])
    const pool = teamId
      ? profiles.filter((p) => p.teamId === teamId && (p.tier === 'member' || p.tier === 'volunteer'))
      : profiles.filter((p) => p.tier === 'lead' || p.tier === 'core')
    const count = r() < 0.35 ? 2 : 1
    const assignees: string[] = []
    while (assignees.length < Math.min(count, pool.length)) {
      const p = pick(pool)
      if (!assignees.includes(p.id)) assignees.push(p.id)
    }
    const roll = r()
    const status: Status = roll < 0.3 ? 'todo' : roll < 0.55 ? 'in_progress' : 'done'
    let createdAt = now - Math.round((3 + r() * 40) * DAY)
    let startedAt: number | null = null
    let completedAt: number | null = null
    let verifiedBy: string | null = null
    let verifiedAt: number | null = null
    let dueDate: number | null
    if (status === 'todo') {
      dueDate = now + Math.round((-3 + r() * 17) * DAY)
    } else if (status === 'in_progress') {
      startedAt = now - Math.round((1 + r() * 12) * DAY)
      dueDate = now + Math.round((-5 + r() * 14) * DAY)
    } else {
      completedAt = now - Math.round((0.3 + r() * 48) * DAY)
      startedAt = completedAt - Math.round((1 + r() * 9) * DAY)
      dueDate = completedAt + Math.round((-2 + r() * 6) * DAY)
      if (r() < 0.6) {
        verifiedBy = creator
        verifiedAt = completedAt + Math.round((0.2 + r() * 2) * DAY)
      }
    }
    if (startedAt && startedAt < createdAt) createdAt = startedAt - DAY / 2
    const assignments: Assignment[] = assignees.map((a) => ({ assigneeId: a, assignedBy: creator, assignedAt: createdAt + 3_600_000 }))
    tasks.push({
      id,
      title,
      description: `${title}. Add updates in the team thread and link any docs here when it is ready for review.`,
      teamId,
      createdBy: creator,
      status,
      priority: pick(PRIORITIES),
      dueDate,
      startedAt,
      completedAt,
      verifiedBy,
      verifiedAt,
      createdAt,
      assignments,
    })
    events.push({ id: `e-${n}-c`, taskId: id, actorId: creator, kind: 'created', at: createdAt })
    assignees.forEach((_a, i) => events.push({ id: `e-${n}-a${i}`, taskId: id, actorId: creator, kind: 'assigned', at: createdAt + 3_600_000 }))
    if (startedAt) events.push({ id: `e-${n}-s`, taskId: id, actorId: assignees[0], kind: 'status_changed', toStatus: 'in_progress', at: startedAt })
    if (completedAt) events.push({ id: `e-${n}-d`, taskId: id, actorId: assignees[0], kind: 'status_changed', toStatus: 'done', at: completedAt })
    if (verifiedAt && verifiedBy) events.push({ id: `e-${n}-v`, taskId: id, actorId: verifiedBy, kind: 'verified', at: verifiedAt })
  }

  TEAM_DEFS.forEach((t) => TASKS[t.id].forEach((title) => build(title, t.id)))
  ORG_TASKS.forEach((title) => build(title, null))

  // Make the demo story richer: one team with a verification backlog and one with overdue work.
  const forceDoneUnverified = tasks.filter((t) => t.teamId === 'events' && t.status === 'done')
  forceDoneUnverified.forEach((t) => {
    t.verifiedAt = null
    t.verifiedBy = null
    for (let i = events.length - 1; i >= 0; i--) if (events[i].kind === 'verified' && events[i].taskId === t.id) events.splice(i, 1)
  })
  tasks
    .filter((t) => t.teamId === 'outreach' && t.status !== 'done')
    .forEach((t) => {
      t.dueDate = now - Math.round((1 + r() * 4) * DAY)
    })

  return { profiles, teams, tasks, events }
}
