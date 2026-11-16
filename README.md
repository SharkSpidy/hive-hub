# HIVE Hub

Task tracking and team visibility for HIVE. React + TypeScript + Vite + Tailwind, installable as a PWA,
with a Supabase backend for login and data. There is **no demo data and no sign-up**: every person is
created by a HIVE admin.

## Run it

```bash
npm install
cp .env.example .env    # then paste your Supabase URL + anon key
npm run dev             # http://localhost:5173
npm run build && npm run preview
```

## Backend setup (once)

1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → New query → paste all of `supabase/schema.sql` → Run. It creates `teams`, `profiles`,
   `tasks`, `task_assignments`, `task_events`, the row-level-security policies, and the
   `username_email()` helper the login form uses.
3. Project Settings → API → copy **Project URL** and **anon public** key into `.env`:
   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. Restart `npm run dev`.

### Adding a person (manual, no sign-up)

1. Authentication → Users → **Add user**: email `sanjay.rao@hive.local`, a password, and confirm the user.
2. Table editor → `profiles` → insert a row whose `id` is that user's UUID, `full_name` "Sanjay Rao",
   `email` the same address, `tier` one of `volunteer | member | lead | core | founder`, `team_id` one of
   the team ids (`tech`, `design`, `events`, `content`, `outreach`, `ops`).
3. They log in with `sanjay.rao` (or the full email) and the password. The username resolves to the email
   through `public.username_email()`.

If you would rather log in with plain emails only, skip step 1's username convention — the form accepts a
full email address too. `VITE_AUTH_EMAIL_DOMAIN` (optional) turns bare usernames into
`<username>@<domain>` when the helper is not installed.

Existing auth users created before `schema.sql` ran: run the file again, then add their profile rows.

### Keeping the backend awake

Supabase pauses free projects after 7 days without requests. `.github/workflows/keep-alive.yml` queries
`profiles` once a day so the project never pauses. Add repository secrets `SUPABASE_URL` and
`SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions), then run the workflow once manually.

## What the app does

- Login page is the front page (`/`), username + password only, with no registration route.
- Tasks board (To Do / In Progress / Done), task drawer with assign, status and verification.
- Global dashboard (Core and Founders): KPIs, velocity, deadlines, subteam bottlenecks.
- Team page, profile stats, Founder admin for tiers and Core owners.
- Installable PWA with offline banner and update prompt.

Permission rules live in `src/lib/permissions.ts` and are mirrored by the SQL helpers
(`is_founder`, `can_create_task`, `can_manage_task`, `can_see_task`, `can_assign_to`) so the database and
the UI agree. `src/lib/db.ts` maps Supabase rows to the types in `src/lib/types.ts`.

## Design

Colour tokens are in `src/index.css` (`@theme`): honey `#FFD629`, gold `#E8B800`, ink `#0A0A0A` on warm
paper `#FFFDF4`. The logo lives in `src/components/Logo.tsx` and `public/favicon.svg`.

## Deploy

Push to GitHub, import in Vercel (Vite preset), and set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in
the project's environment variables. `vercel.json` rewrites deep links to `index.html`.
