# SpeechForge

AI-powered speech coaching platform. Practice interviews, public speaking, and conversations with real-time AI coaching, then get detailed performance scores.

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS v4 — iOS design language
- **Database**: Supabase (Postgres + Auth + RLS)
- **AI**: Anthropic Claude (`claude-sonnet-4-20250514`) — streaming conversations + scoring
- **Voice**: Web Speech API (STT + TTS)
- **Deployment**: Vercel

## Setup

### 1. Supabase

Create a Supabase project, then run the migration and seed files:

```bash
# In the Supabase SQL editor, run:
supabase/migrations/001_schema.sql
supabase/seed.sql
```

Also enable **Google OAuth** in Supabase → Auth → Providers if you want Google sign-in.

### 2. Environment variables

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## App Structure

```
app/
  (auth)/login        — Email/password + Google + magic link
  (auth)/signup       — Account creation
  onboarding/         — 4-step first-run flow (goal, level, name)
  (app)/home          — Dashboard with stats and recent sessions
  (app)/practice/     — Mode + scenario selection
  session/[id]        — Live AI coaching session (streaming + voice)
  results/[id]        — Score ring, breakdown, and feedback
  (app)/history       — Filterable session history
  (app)/profile       — Settings, stats, sign out
  api/chat            — Claude streaming SSE endpoint
  api/score           — Claude scoring endpoint
```

## Key Technical Notes

- **Voice input**: Web Speech API — Chrome/Edge only. Safari shows text-only fallback.
- **Streaming**: Claude responses stream token-by-token via SSE from `/api/chat`.
- **Scoring**: Full conversation POSTed to `/api/score` after session ends; scores persisted to DB.
- **Auth protection**: `proxy.ts` (Next.js 16 proxy convention) redirects unauthenticated users; onboarding gate checks `profiles.onboarding_complete`.
- **RLS**: All session data is row-level secured to `auth.uid()`.
- **iOS design**: System font stack, `#F2F2F7` grouped backgrounds, no shadows — separators only, 12px card radius, 14px button radius, 44px min tap targets.
