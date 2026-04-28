# Workout Tracker

A mobile-first PWA for tracking and sharing powerlifting programs. Built with Next.js 14, Tailwind CSS, and Supabase.

## Features

- **Program view** — expandable week → day → lift hierarchy with RPE color coding
- **Logging** — tap any lift to log actual weight, reps, and RPE
- **Offline support** — logs queue in localStorage and sync when back online
- **Progress charts** — recharts line graphs per main lift across weeks
- **Program sharing** — public share links, follow to copy to your account
- **PWA** — installable on Android and iOS home screen

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Find these in your Supabase dashboard → Project Settings → API.

### 4. Run the database schema

Open the Supabase SQL editor and paste + run the contents of `supabase/schema.sql`.

### 5. Seed the default program

```bash
npm run seed
```

This creates Raymond's Winter Arc (4-week powerlifting block) as a public/default program.

### 6. Generate PWA icons

```bash
npm run generate-icons
```

This requires `sharp` (already in devDependencies). Outputs:
- `public/icons/icon-192x192.png`
- `public/icons/icon-512x512.png`

### 7. Start dev server

```bash
npm run dev
```

Visit `http://localhost:3000`.

---

## Deployment (Vercel)

```bash
npm install -g vercel
vercel
```

Set the three environment variables in the Vercel dashboard under Project → Settings → Environment Variables.

The PWA service worker is **disabled in development** and only active in production builds. To test PWA behavior locally:

```bash
npm run build && npm run start
```

---

## Database schema overview

| Table | Description |
|-------|-------------|
| `profiles` | Username + display name (auto-created on signup) |
| `programs` | Programs (owned by user or system with `user_id = null`) |
| `weeks` | Weeks within a program |
| `days` | Training days within a week |
| `lifts` | Prescribed lifts within a day |
| `logs` | Actual logged sets (user's performance data) |
| `program_follows` | Which programs a user is following |

### Key RPC functions

- `copy_program_for_user(source_program_id, target_user_id)` — duplicates a program hierarchy into a user's account when they follow it.

---

## RPE color coding

| RPE | Color |
|-----|-------|
| ≤5 (recovery) | Blue |
| 6 | Green |
| 7 | Yellow |
| 8 | Orange |
| 9–10 | Red |

---

## Default program

**Raymond's Winter Arc** — 4-week powerlifting block

- Baseline: 275lb bench / 315lb squat
- RPE wave: 6 → 7 → 8 → 9 (Week 4 Day 1 is a recovery day)
- 5 days/week: Pause Squat / Primary Bench / Comp Squat + Secondary Bench / RDL + Pullups / OHP + Pause Bench

Accessible at `/program/raymond-winter-arc` after seeding.

---

## Offline behavior

1. All program data is cached via Workbox `NetworkFirst` strategy.
2. When logging a set offline, it's saved to `localStorage` under `pending_logs`.
3. On reconnect (browser `online` event), the queue is drained to Supabase automatically.
4. The Log and Program pages show a count of pending offline logs.

---

## PWA / TWA (Play Store) notes

For submitting to the Play Store via PWA Builder:

1. Run `npm run generate-icons` to get proper PNG icons.
2. Deploy to Vercel (or any HTTPS host).
3. Go to [pwabuilder.com](https://www.pwabuilder.com), enter your production URL.
4. PWABuilder will generate a TWA wrapper you can upload to the Play Console.

Requirements already met:
- `manifest.json` with `display: standalone`, correct icon sizes
- HTTPS (Vercel provides this)
- Service worker registered via `@ducanh2912/next-pwa`
- `theme_color` and `background_color` set

---

## Project structure

```
/app
  /auth/login        Sign in
  /auth/signup       Create account
  /program           Program list
  /program/[slug]    Program detail (week → day → lift view)
  /log               Today's log (week/day picker)
  /progress          Progress charts
  /profile           Profile + program sharing
/components
  BottomNav          Fixed bottom navigation
  ProgramView        Full program viewer with logging
  WeekAccordion      Collapsible week
  DayAccordion       Collapsible day
  LiftRow            Single lift row with RPE badge
  LogModal           Bottom sheet for logging a set
  ProgressChart      Recharts wrapper
/lib
  supabase/client    Browser Supabase client
  supabase/server    Server Component Supabase client
  offline            localStorage queue + sync
  utils              RPE colors, slugify, weight formatting
/types
  database           TypeScript interfaces for all DB types
/supabase
  schema.sql         Full schema + RLS + RPC functions
/scripts
  seed.js            Seed default 4-week program
  generate-icons.js  Generate PNG icons from SVG
/public
  manifest.json      PWA manifest
  icons/             App icons
```
