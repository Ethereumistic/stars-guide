# Horoscope Engine — Architecture Overview

## What This System Does

Generates daily horoscope copy for all 12 zodiac signs using LLMs, through a multi-step admin pipeline: define world context → configure generation → run AI → review → publish. Published horoscopes are served to users through a paywalled public API.

## The Pipeline (in order)

```
1. Context Editor     →  Write the master system prompt (stored in systemSettings)
2. Zeitgeist Engine   →  Define the collective emotional state (stored in zeitgeists)
3. Hook Manager       →  Configure opening-hook archetypes (stored in hooks)
4. Cosmic Weather     →  Auto-computed daily at 00:05 UTC (stored in cosmicWeather)
5. Generation Desk    →  Trigger AI generation (creates generationJobs, writes horoscopes)
6. Review & Publish   →  Approve drafts (updates horoscopes.status → "published")
```

## DB Tables & Their Relationships

```
systemSettings          key="master_context" → the master system prompt
      │
      ▼
generationJobs ───────── references zeitgeistId, hookId
      │                       stores: modelId, targetDates, targetSigns
      │                       tracks:  status (running→completed|partial|failed)
      │                                progress {completed, failed, total}
      ▼
horoscopes              one row per sign×date combination
      │                   status: "draft" | "published" | "failed"
      │                   indexed by (sign, targetDate) and (targetDate)
      ▼
horoscopes (public)     only status="published" rows are served to users
                        paywall logic: free=today, popular=±1 day, premium=±7 days

zeitgeists              world-vibe summaries (manual or AI-synthesized)
hooks                   opening-hook archetypes with moon phase mappings
cosmicWeather           daily astronomical snapshot (planet positions, moon phase, aspects)
```

## Key Files Map

| File | Purpose |
|---|---|
| `convex/admin.ts` | All admin mutations/queries: settings CRUD, zeitgeist CRUD, job lifecycle, horoscope review/publish |
| `convex/ai.ts` | The core generation engine (`runGenerationJob`), zeitgeist synthesis, emotional translation |
| `convex/aiQueries.ts` | Internal queries used by `ai.ts` (can't live there due to `"use node"`) |
| `convex/hooks.ts` | Hook archetype CRUD + `getAssignedHook` (auto-match by moon phase) |
| `convex/cosmicWeather.ts` | Cosmic weather compute/store, daily cron job, admin recompute |
| `convex/horoscopes.ts` | Public-facing queries with paywall enforcement |
| `convex/crons.ts` | Scheduled jobs: cosmic weather at 00:05 UTC |
| `convex/lib/astronomyEngine.ts` | Pure astronomy computation (planet positions, moon phase, retrogrades, aspects, moon phase frames) |
| `convex/lib/adminGuard.ts` | `requireAdmin()` — used by all admin-facing functions |
| `src/app/admin/horoscope/` | Admin UI pages (Next.js) |
| `src/components/admin/sidebar/admin-sidebar.tsx` | Sidebar navigation with section labels |

## Architecture Decisions

**Fire-and-forget generation**: The browser is only a progress viewer. `startGeneration` creates a job record, then schedules `internal.ai.runGenerationJob` via `ctx.scheduler.runAfter(0, ...)`. If the admin closes the tab, the action continues. Each successful sign is persisted immediately — a crash mid-way doesn't lose completed work.

**Smart overwrite**: `upsertHoroscopes` compares content. Identical content = skip. Different content = overwrite and reset to draft. New = insert as draft. This means re-running generation for the same sign×date is safe and idempotent.

**v3 Emotional Translation Layer**: The zeitgeist is a two-pass system. Pass 1: raw world events → 3-sentence psychological summary. Pass 2: that summary → "how people are feeling" emotional prose. Only the emotional version goes into the LLM prompt. The admin can also write the emotional state manually, skipping AI synthesis entirely.

**Hook archetypes are DB-driven**: Hooks live in the `hooks` table, not in code. Each hook maps to a moon phase category. The generation pipeline auto-selects a hook based on the current moon phase, unless the admin overrides it.

## API Keys

- `OPENROUTER_API_KEY` — required in Convex env vars. All LLM calls (generation, zeitgeist synthesis, emotional translation) go through OpenRouter.

## Sub-Documents

- [01-context-editor.md](./01-context-editor.md)
- [02-zeitgeist-engine.md](./02-zeitgeist-engine.md)
- [03-hook-manager.md](./03-hook-manager.md)
- [04-generation-desk.md](./04-generation-desk.md)
- [05-review-and-publish.md](./05-review-and-publish.md)
