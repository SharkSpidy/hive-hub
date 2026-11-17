-- =============================================================================
-- HIVE Hub — Notifications, due-date reminders and task chat
-- Run once AFTER schema.sql: Supabase dashboard → SQL Editor → New query → Run.
-- Safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------- tables -----
create table if not exists public.task_messages (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists task_messages_task_idx on public.task_messages (task_id, created_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('due_2d', 'due_1d', 'assigned', 'chat')),
  task_id uuid references public.tasks (id) on delete cascade,
  title text not null,
  body text not null default '',
  -- Reminders use "<kind>:<task>:<due ms>" so each fires once per user per due date
  -- (and fires again if the due date is moved). Null for chat / assigned.
  dedupe_key text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create unique index if not exists notifications_dedupe_idx on public.notifications (user_id, dedupe_key) where dedupe_key is not null;

alter table public.notifications enable row level security;
alter table public.task_messages enable row level security;

-- Notifications: you only ever see and update your own. Rows are created by the
-- SECURITY DEFINER functions/triggers below, never directly by clients.
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select to authenticated using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

-- Task chat: anyone who can see the task (Founder, Core, the Sub Team Lead of that
-- team, and every assignee) can read and post. You can only post as yourself.
drop policy if exists messages_read on public.task_messages;
create policy messages_read on public.task_messages for select to authenticated using (public.can_see_task(task_id));

drop policy if exists messages_insert on public.task_messages;
create policy messages_insert on public.task_messages for insert to authenticated
  with check (public.can_see_task(task_id) and sender_id = auth.uid());

-- ------------------------------------------------------ notify: assigned -----
create or replace function public.notify_on_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t_title text;
  who text;
begin
  if new.assigned_by is not null and new.assigned_by = new.assignee_id then return new; end if;
  select title into t_title from public.tasks where id = new.task_id;
  select full_name into who from public.profiles where id = new.assigned_by;
  insert into public.notifications (user_id, kind, task_id, title, body)
  values (new.assignee_id, 'assigned', new.task_id, 'New task assigned',
          coalesce(who, 'Someone') || ' assigned you "' || coalesce(t_title, 'a task') || '".');
  return new;
end;
$$;

drop trigger if exists task_assignments_notify on public.task_assignments;
create trigger task_assignments_notify
  after insert on public.task_assignments
  for each row execute function public.notify_on_assignment();

-- --------------------------------------------------------- notify: chat -----
-- Tells the task's creator and every assignee (except the sender) about a new message.
create or replace function public.notify_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t_title text;
  who text;
begin
  select title into t_title from public.tasks where id = new.task_id;
  select full_name into who from public.profiles where id = new.sender_id;
  insert into public.notifications (user_id, kind, task_id, title, body)
  select u.id, 'chat', new.task_id,
         coalesce(who, 'Someone') || ' · ' || coalesce(t_title, 'task chat'),
         left(new.body, 140)
  from (
    select created_by as id from public.tasks where id = new.task_id and created_by is not null
    union
    select assignee_id from public.task_assignments where task_id = new.task_id
  ) u
  where u.id <> new.sender_id;
  return new;
end;
$$;

drop trigger if exists task_messages_notify on public.task_messages;
create trigger task_messages_notify
  after insert on public.task_messages
  for each row execute function public.notify_on_message();

-- ----------------------------------------------------- due-date reminders -----
-- Creates the "2 days left" and "1 day left" reminders for every open task with a
-- due date, for each assignee. Idempotent (the unique dedupe index swallows repeats),
-- so it is safe to call as often as you like. Called:
--   * by the app on sign-in and every 10 minutes while it is open, and
--   * optionally by pg_cron (see bottom) so reminders exist even if nobody is online.
create or replace function public.generate_task_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer := 0;
  c integer;
begin
  -- 2 days before. Skipped once we are inside the final day (the 1-day reminder covers it).
  insert into public.notifications (user_id, kind, task_id, title, body, dedupe_key)
  select a.assignee_id, 'due_2d', t.id, 'Due in 2 days',
         '"' || t.title || '" is due ' || to_char(t.due_date at time zone 'Asia/Kolkata', 'DD Mon') || '.',
         'due_2d:' || t.id || ':' || (extract(epoch from t.due_date) * 1000)::bigint
  from public.tasks t
  join public.task_assignments a on a.task_id = t.id
  where t.status <> 'done' and t.due_date is not null
    and now() >= t.due_date - interval '2 days'
    and now() <  t.due_date - interval '1 day'
  on conflict do nothing;
  get diagnostics c = row_count; n := n + c;

  -- 1 day before.
  insert into public.notifications (user_id, kind, task_id, title, body, dedupe_key)
  select a.assignee_id, 'due_1d', t.id, 'Due tomorrow',
         '"' || t.title || '" is due ' || to_char(t.due_date at time zone 'Asia/Kolkata', 'DD Mon') || '.',
         'due_1d:' || t.id || ':' || (extract(epoch from t.due_date) * 1000)::bigint
  from public.tasks t
  join public.task_assignments a on a.task_id = t.id
  where t.status <> 'done' and t.due_date is not null
    and now() >= t.due_date - interval '1 day'
    and now() <  t.due_date
  on conflict do nothing;
  get diagnostics c = row_count; n := n + c;

  return n;
end;
$$;
revoke all on function public.generate_task_reminders() from public;
grant execute on function public.generate_task_reminders() to authenticated;

-- ---------------------------------------------------------------- realtime ---
do $$
begin
  begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.task_messages; exception when duplicate_object then null; end;
end $$;

-- ------------------------------------------------------------- optional -----
-- Server-side schedule so reminders are created even when nobody has the app open.
-- Enable the extension first: Database → Extensions → pg_cron. Then uncomment:
-- select cron.schedule('hive-task-reminders', '*/15 * * * *', $$select public.generate_task_reminders()$$);
