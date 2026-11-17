# 🐝 HIVE Hub

> **CONFIDENTIALITY NOTICE:** This repository and its contents are closed-source and proprietary to the HIVE organization. Do not distribute, fork, or share outside the internal team.

Welcome to **HIVE Hub**, our internal operations, event management, and task-tracking platform. This document serves as a guide for new developers and team members to understand the project architecture, set up their local environment, and grasp the core operational logic.

---

## 🛠 Tech Stack

* **Frontend:** React, TypeScript, Vite
* **Styling:** Tailwind CSS, shadcn/ui (UI components)
* **Backend & Database:** Supabase (PostgreSQL, Auth, Row Level Security)
* **State Management / Data Fetching:** Custom React hooks / Context (via Supabase client)

---

## 🚀 Getting Started (Local Development)

### Prerequisites
* Node.js (v18+ recommended)
* npm or yarn
* Access to the HIVE Supabase project dashboard (request from Core team)

### 1. Clone & Install
```bash
git clone <repository-url>
cd hive-hub-main
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory and add your Supabase connection details:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

---

## 🔐 Authentication & Account Provisioning

**HIVE Hub does not have public sign-ups.** All accounts are manually provisioned by Administrators (Founders/Core) to maintain strict access control.

### Login Convention
* **Username:** `firstname.lastname` (e.g., `john.doe`)
  *(Note: The backend resolves this to `firstname.lastname@hive.local` or their actual Gmail via a custom SQL function).*
* **Default Password Pattern:** `FIRSTNAME@DDMM` (First name in ALL CAPS, followed by @, and their 4-digit birthdate). Example: `JOHN@0511`.

### How to Provision a New User (Admin Guide)
1. Go to the **Supabase Dashboard -> Authentication -> Users**.
2. Click **Add User** and enter their email and the patterned password.
3. Copy the generated **User UUID**.
4. Go to the **SQL Editor** or **Table Editor** and insert their profile into `public.profiles`:
```sql
INSERT INTO public.profiles (id, full_name, email, tier, team_id, bio)
VALUES (
  '<copied-uuid>', 
  'John Doe', 
  'john.doe@gmail.com', 
  'member', -- volunteer, member, lead, core, or founder
  'tech',   -- tech, design, events, content, outreach, ops
  'Short bio here'
);
```

---

## 🛡 Roles & Permissions (RBAC)

The application uses Supabase **Row Level Security (RLS)** to enforce strict data access based on user tiers.

| Tier | Access Level | Description |
| :--- | :--- | :--- |
| **Founder / Core** | Global Admin | Can read, create, manage, delete, and verify tasks across *all* subteams. Can assign tasks to anyone. |
| **Lead** | Team Admin | Can create and manage tasks *only* within their assigned `team_id`. Can only assign tasks to members within their team. |
| **Member / Volunteer** | Contributor | Can view team tasks and update the status (`todo`, `in_progress`, `done`) of tasks assigned specifically to them. Cannot create tasks. |

---

## 📁 Project Structure

```text
src/
├── components/       # Reusable UI components (buttons, dialogs, cards)
│   ├── ui/           # Base shadcn/ui components
│   └── ...           # Domain-specific components (TaskCard, NewTaskDialog)
├── lib/              # Core logic and utilities
│   ├── supabase.ts   # Supabase client initialization
│   ├── db.ts         # Database interaction functions
│   ├── permissions.ts# Frontend permission checks (mirrors RLS)
│   ├── types.ts      # TypeScript interfaces for database schema
│   └── utils.ts      # Helper functions (Tailwind merges, etc.)
├── pages/            # Top-level route components
│   ├── Admin.tsx     # Admin dashboard
│   ├── Dashboard.tsx # Main task overview
│   ├── Login.tsx     # Auth entry point
│   ├── Profile.tsx   # User profile management
│   └── Tasks.tsx     # Detailed task views
├── index.css         # Global Tailwind styles
└── main.tsx          # React application entry point
```

---

## 🗄 Database Schema Highlights

The database is built around a few core tables:
* `profiles`: Extends the Supabase `auth.users` table with names, roles (`tier`), and `team_id`.
* `teams`: Defines the subteams (Tech, Design, etc.) and their Core owner.
* `tasks`: Stores task details, status, priority, and verification timestamps.
* `task_assignments`: Maps tasks to assignees.
* `task_events`: An audit log of state changes for tasks.

*For any database schema changes, refer to `supabase/schema.sql` and ensure you update the TypeScript definitions in `src/lib/types.ts` accordingly.*