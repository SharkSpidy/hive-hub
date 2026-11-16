# The HIVE Hub

Task tracking and team visibility for HIVE. React + TypeScript + Vite + Tailwind, installable as a PWA.

## Run it
```bash
npm install
npm run dev        # http://localhost:5173
npm run build && npm run preview   # production build with the service worker
```

## What is in the demo
- Sign in as any of the five tiers from the login page (Founder, HIVE Core, Sub Team Lead, Member, Volunteer).
- Tasks board (To Do / In Progress / Done), task drawer with assign, status and verify.
- Global dashboard (Core and Founders): KPIs, weekly velocity, deadlines, team bottleneck flags.
- Team page, profile pages with personal stats, Founder admin (invite, tiers, Core owners).
- Installable PWA: manifest, service worker, offline banner, update prompt, install button.

## How it maps to the architecture doc
- `src/lib/permissions.ts` mirrors the Postgres RLS helpers (`is_org_wide`, `is_task_manager`, `can_assign`, `tasks_read`).
- `src/lib/store.ts` is a local mock of the Supabase tables (data saved in browser localStorage). Replace its actions
  with Supabase queries and the `set_task_status` / `verify_task` RPCs; keep the same shapes in `src/lib/types.ts`.
- `src/lib/stats.ts` mirrors the `v_team_stats` and `v_profile_stats` views.
- Design tokens and rules: `design-system/hive-hub/MASTER.md` (generated with the ui-ux-pro-max skill).

## Deploy
Push to GitHub, import in Vercel (Vite preset). `vercel.json` already rewrites deep links to `index.html`.
