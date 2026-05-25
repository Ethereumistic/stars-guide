# AGENTS.md — stars-guide

Astrology web app at **stars.guide**. Next.js App Router + Convex + Cloudflare Workers.

## Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind v4, shadcn-ui (Radix), motion
- **Backend/DB**: Convex (schema, queries, mutations, actions, crons, HTTP API)
- **Auth**: @convex-dev/auth (email + Google One Tap)
- **Astrology**: astronomy-engine (real ephemeris), custom astrology modules
- **AI/LLM**: Multi-provider Oracle (Google Gemini, OpenAI) via provider router
- **Deploy**: Cloudflare Workers via @opennextjs/cloudflare (`pnpm deploy`)
- **Build**: `pnpm build` (standard Next), `opennextjs-cloudflare build` (CF build)

## Scripts (NEVER run unless asked)

```
pnpm dev          # Next dev server
pnpm build        # Standard Next build (NOT for CF deploy)
pnpm deploy       # CF: opennextjs-cloudflare build + deploy
pnpm preview      # CF: build + local preview
pnpm lint         # ESLint
check             # build + tsc
```

## Project Layout

```
src/app/                    # Next.js App Router pages
  (shell)/                  # Authenticated shell layout (sidebar, nav)
    dashboard/              # Main dashboard
    horoscopes/[sign]/[date]/ # Daily horoscopes per sign
    learn/{signs,planets,houses,aspects,elements}/ # Astrology 101
    settings/               # User settings
    pricing/                # Tier page
    [username]/             # Public profile
  admin/                    # Admin panel (oracle, journal, horoscope, ban, AI, notifications)
  oracle/chat/[sessionId]/  # AI Oracle chat
  journal/{new,calendar,search,stats,[entryId]}/ # Journaling
  onboarding/               # Sign-up flow
  invite/[username]/        # Viral referral pages

convex/                     # Convex backend (ALL server logic)
  schema.ts                 # DB schema (users, horoscopes, oracleSessions, journal, etc.)
  crons.ts                  # Scheduled jobs (cosmic weather, horoscope gen, notifications)
  auth.ts                   # Custom auth (Google One Tap authorize)
  horoscopes/               # Daily horoscope gen pipeline
  oracle/                   # AI Oracle: quota, sessions, LLM routing, synastry
  journal/                  # Journal entries, prompts, search, stats
  cosmicWeather.ts          # Daily planetary positions + felt language
  users.ts, friends.ts, referrals.ts, notifications/
  lib/                      # Shared: astronomyEngine, astrology/contextBuilder, signTraits, retrogradeCalc

lib/oracle/                 # Client-side Oracle logic
  features.ts               # Feature flags & gating
  promptBuilder.ts           # Prompt assembly
  safetyRules.ts             # Crisis detection keywords
  soul.ts                    # Oracle personality/system prompt
  providers.ts               # Provider config
  intentRouter.ts            # Intent classification
  pipelines/                 # Prompt pipeline chains

src/components/             # React components (ui/, oracle/, dashboard/, horoscopes/, learn/, etc.)
docs/oracle/                # Oracle system docs (01-14 series, ORACLE_EXPLAINED.md)
```

## Key Architecture

### Convex Contexts
- **Queries** (`ctx.db`): Sync reads, run in mutation context
- **Mutations** (`ctx.db`): Sync writes, transactional
- **Actions** (`ctx.runQuery/runMutation`): Async, can call external APIs, NO `ctx.db` direct access
- Auth `authorize` runs in **action context** — must use `ctx.runMutation`, NOT `ctx.db`

### Oracle (AI Chat)
- Multi-provider LLM routing: request → intentRouter → providerRouter → stream
- Pipeline: promptBuilder assembles system prompt from soul + birth chart + journal context + safety
- Quota per user tier (free/popular/premium)
- Session-based chat with message history in Convex

### Horoscope Generation
- Cron at 02:00 UTC queues all 12 signs (30s stagger)
- Pipeline: computeDailyContext (planetary positions) → prompt → generateForSign → store
- Manual trigger: `triggerDailyGeneration` action in Convex dashboard

### Cosmic Weather
- Cron at 00:05 UTC computes planetary positions via astronomy-engine
- Cron at 00:10 UTC generates "felt language" prose from positions

### Auth
- @convex-dev/auth with Google One Tap + email
- One Tap `authorize` is an **action** (no `ctx.db`), uses `ctx.runMutation` for user creation
- Index for auth lookups: `providerAndAccountId` (NOT `provider_accountId`)

## Deployment

- Live: **stars.guide** on Cloudflare Workers
- Convex: `convex.stars.guide` (backend), `convex-site.stars.guide` (HTTP)
- Build for CF: `opennextjs-cloudflare build` (NOT `next build` alone)
- Env vars in `.env.local` (dev) + wrangler.jsonc `vars` (prod)

## Conventions

- TypeScript strict, no `any` unless unavoidable
- shadcn-ui components in `src/components/ui/`
- Convex functions: one file per domain, helpers in same dir or `lib/`
- Routes use App Router conventions: `_components/` for page-local components
- `lib/` = shared client logic, `convex/lib/` = shared server logic

## Pitfalls

- `convex/` actions cannot use `ctx.db` — always `ctx.runQuery`/`ctx.runMutation`
- Google One Tap GIS API: `isNotDisplayed()` (NOT `isNotDisplayedMoment()`)
- CF deploy needs opennextjs-cloudflare build, not plain `next build`
- Convex index names must match schema exactly (e.g., `providerAndAccountId`)
- `pnpm` only — no npm/yarn