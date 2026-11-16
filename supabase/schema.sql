-- =============================================================================
-- HIVE Hub — Supabase schema
-- Run once: Supabase dashboard → SQL Editor → New query → paste → Run.
--
-- Accounts are created by hand (there is no sign-up):
--   1. Authentication → Users → Add user: email + password.
--      Use a username-style email, e.g. sanjay.rao@hive.local, as the username.
--   2. Insert the matching profile row (see the example at the bottom).
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables -----
create table if not exists public.teams (
  id text primary key,
  name text not null,
  core_owner_id uuid
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text unique,
  tier text not null default 'member' check (tier in ('volunteer', 'member', 'lead', 'core', 'founder')),
  team_id text references public.teams (id) on delete set null,
  bio text not null default '',
  joined_at timestamptz not null default now()
);

alter table public.teams drop constraint if exists teams_core_owner_fk;
alter table public.teams
  add constraint teams_core_owner_fk foreign key (core_owner_id) references public.profiles (id) on delete set null;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  team_id text references public.teams (id) on delete set null,
  created_by uuid references public.profiles (id),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.task_assignments (
  task_id uuid not null references public.tasks (id) on delete cascade,
  assignee_id uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid references public.profiles (id),
  assigned_at timestamptz not null default now(),
  primary key (task_id, assignee_id)
);

create table if not exists public.task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  kind text not null check (kind in ('created', 'assigned', 'status_changed', 'verified')),
  to_status text,
  at timestamptz not null default now()
);

create index if not exists tasks_team_idx on public.tasks (team_id);
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists task_assignments_assignee_idx on public.task_assignments (assignee_id);
create index if not exists task_events_task_idx on public.task_events (task_id);

-- --------------------------------------------------- permission helpers -----
-- SECURITY DEFINER so the policies can read profiles without recursing into RLS.
create or replace function public.is_founder()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select tier = 'founder' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.can_create_task(p_team text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and (
        me.tier in ('core', 'founder')
        or (me.tier = 'lead' and p_team is not null and me.team_id = p_team)
      )
  );
$$;

create or replace function public.can_manage_task(p_task uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tasks t
    join public.profiles me on me.id = auth.uid()
    where t.id = p_task
      and (
        me.tier in ('core', 'founder')
        or (me.tier = 'lead' and t.team_id is not null and t.team_id = me.team_id)
      )
  );
$$;

create or replace function public.can_see_task(p_task uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_task(p_task)
      or exists (
        select 1 from public.task_assignments a
        where a.task_id = p_task and a.assignee_id = auth.uid()
      );
$$;

create or replace function public.can_assign_to(p_task uuid, p_assignee uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.tasks t
    join public.profiles me on me.id = auth.uid()
    join public.profiles target on target.id = p_assignee
    where t.id = p_task
      and (
        me.tier in ('core', 'founder')
        or (
          me.tier = 'lead'
          and t.team_id is not null
          and t.team_id = me.team_id
          and target.team_id = me.team_id
          and target.tier in ('member', 'volunteer')
        )
      )
  );
$$;

-- ---------------------------------------------------------------- policies --
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignments enable row level security;
alter table public.task_events enable row level security;

drop policy if exists teams_read on public.teams;
create policy teams_read on public.teams for select to authenticated using (true);

drop policy if exists teams_update_founder on public.teams;
create policy teams_update_founder on public.teams for update to authenticated
  using (public.is_founder()) with check (public.is_founder());

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (true);

drop policy if exists profiles_update_founder on public.profiles;
create policy profiles_update_founder on public.profiles for update to authenticated
  using (public.is_founder()) with check (public.is_founder());

drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks for select to authenticated using (public.can_see_task(id));

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
  with check (public.can_create_task(team_id) and created_by = auth.uid());

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated
  using (public.can_see_task(id)) with check (public.can_see_task(id));

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete to authenticated using (public.is_founder());

drop policy if exists assignments_read on public.task_assignments;
create policy assignments_read on public.task_assignments for select to authenticated
  using (public.can_see_task(task_id));

drop policy if exists assignments_insert on public.task_assignments;
create policy assignments_insert on public.task_assignments for insert to authenticated
  with check (public.can_manage_task(task_id) and public.can_assign_to(task_id, assignee_id));

drop policy if exists assignments_update on public.task_assignments;
create policy assignments_update on public.task_assignments for update to authenticated
  using (public.can_manage_task(task_id)) with check (public.can_manage_task(task_id));

drop policy if exists assignments_delete on public.task_assignments;
create policy assignments_delete on public.task_assignments for delete to authenticated
  using (public.can_manage_task(task_id));

drop policy if exists events_read on public.task_events;
create policy events_read on public.task_events for select to authenticated
  using (public.can_see_task(task_id));

drop policy if exists events_insert on public.task_events;
create policy events_insert on public.task_events for insert to authenticated
  with check (public.can_see_task(task_id) and actor_id = auth.uid());

grant execute on function public.is_founder() to authenticated;
grant execute on function public.can_create_task(text) to authenticated;
grant execute on function public.can_manage_task(uuid) to authenticated;
grant execute on function public.can_see_task(uuid) to authenticated;
grant execute on function public.can_assign_to(uuid, uuid) to authenticated;

-- ------------------------------------------------- username → email login ---
-- Lets the login page accept "sanjay.rao" instead of the full email.
create or replace function public.username_email(p_username text)
returns text language sql stable security definer set search_path = public as $$
  select email
  from public.profiles
  where lower(split_part(coalesce(email, ''), '@', 1)) = lower(trim(p_username))
  limit 1;
$$;
revoke all on function public.username_email(text) from public;
grant execute on function public.username_email(text) to anon, authenticated;

-- ------------------------------------------------------------- optional -----
-- Starting subteams (safe to edit or delete).
insert into public.teams (id, name) values
  ('tech', 'Tech'),
  ('design', 'Design'),
  ('events', 'Events'),
  ('content', 'Content'),
  ('outreach', 'Outreach'),
  ('ops', 'Operations')
on conflict (id) do nothing;

-- Example: after creating the auth user, attach their profile.
-- Copy the user's UUID from Authentication → Users.
-- insert into public.profiles (id, full_name, email, tier, team_id, bio)
-- values ('<auth-user-uuid>', 'Sanjay Rao', 'sanjay.rao@hive.local', 'lead', 'tech', 'Leads the Tech subteam.');
