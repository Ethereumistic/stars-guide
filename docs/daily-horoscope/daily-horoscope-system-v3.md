# Stars.Guide: Daily Horoscope System v3 — Complete Architecture

> **Last updated:** 2026-03-04
> **Status:** Production-ready
> **Core principle:** Emotionally specific + Circumstantially universal = Feels personal

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Database Schema](#3-database-schema)
4. [The Generation Pipeline (End-to-End)](#4-the-generation-pipeline-end-to-end)
5. [Cosmic Weather Engine](#5-cosmic-weather-engine)
6. [Emotional Zeitgeist (Two-Pass Translation)](#6-emotional-zeitgeist-two-pass-translation)
7. [Hook Archetype System](#7-hook-archetype-system)
8. [Moon Phase Narrative Frames](#8-moon-phase-narrative-frames)
9. [The Prompt Architecture](#9-the-prompt-architecture)
10. [Master Context (The System Prompt)](#10-master-context-the-system-prompt)
11. [Data Validation & Resilience](#11-data-validation--resilience)
12. [Public Frontend API](#12-public-frontend-api)
13. [Admin UI Pages](#13-admin-ui-pages)
14. [Cron Jobs](#14-cron-jobs)
15. [Security Model](#15-security-model)
16. [File Map (Where Everything Lives)](#16-file-map-where-everything-lives)
17. [Key Invariants (The Rules That Must Never Break)](#17-key-invariants-the-rules-that-must-never-break)
18. [Common Tasks (How To...)](#18-common-tasks-how-to)

---

## 1. System Overview

Stars.Guide generates daily mundane horoscopes (no birth chart needed) for all 12 zodiac signs. The system is fully automated once configured, but requires admin oversight for quality control.

### The 30-Second Version

```
Admin inputs world events
    → AI synthesizes psychological baseline (Pass 1)
    → AI translates to emotional felt-state (Pass 2: v3 Emotional Translation)
    → Admin configures dates + signs + model
    → Clicks "Generate"
    → Server-side action runs (fire-and-forget)
    → For each sign:
        → Fetches Cosmic Weather (planet positions, moon phase, retrogrades, aspects)
        → Determines Moon Phase Frame (the emotional container)
        → Assigns Hook Archetype (the opening style)
        → Builds full prompt (system prompt + dynamic context)
        → Calls OpenRouter API
        → Validates response with Zod
        → Persists as draft in DB
    → Admin reviews drafts in Review & Publish page
    → Admin publishes
    → Public frontend serves published horoscopes
```

### What Changed from v2 to v3

| Aspect | v2 | v3 |
|--------|----|----|
| **Zeitgeist** | Raw events → directly into prompt | Raw events → AI synthesis → **Emotional Translation** → prompt |
| **Narrative driver** | Impact→Processing→Pivot→Integration arc | **Moon Phase** as primary emotional container |
| **Opening style** | Single "punchy question" hook | **4 hook archetypes** (Mirror, Permission, Provocation, Observation), DB-driven |
| **Sign profiles** | "Their World" + DO/DON'T | **3-layer profile**: Likely Felt State + Hook Target + The One Action |
| **Planet references** | Static descriptions | **Planet Felt-Language Guide** with direct/retrograde variants |
| **Houses section** | Included (Section 4) | **Removed** (irrelevant for mundane horoscopes without birth charts) |
| **Cosmic weather** | Not included | **Full integration**: planet positions, retrogrades, aspects, moon phase |
| **Hook management** | N/A | **Admin UI page** with CRUD, moon-phase auto-assignment |
| **Temperature** | 0.7 | **0.75** (more natural variation) |

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | [Convex](https://convex.dev) | Real-time database, serverless functions, cron jobs |
| **AI Provider** | [OpenRouter](https://openrouter.ai) | Multi-model API gateway (Grok, Gemini, Claude, GPT, etc.) |
| **Astronomy** | [`astronomy-engine`](https://www.npmjs.com/package/astronomy-engine) | Planet positions, moon phase, retrograde detection |
| **Validation** | [Zod](https://zod.dev) | LLM output validation ("The LLM Lie Defense") |
| **Frontend** | Next.js + React | Admin dashboard + public-facing site |
| **UI Components** | Shadcn UI | Admin interface components |
| **Date Handling** | `date-fns` | UTC date normalization |
| **Auth** | `@convex-dev/auth` | User authentication + admin role verification |

---

## 3. Database Schema

File: `convex/schema.ts`

### Tables Relevant to Horoscopes

#### `systemSettings`
Stores the master context (system prompt) as a key-value pair.

| Field | Type | Purpose |
|-------|------|---------|
| `key` | `string` | `"master_context"` |
| `content` | `string` | The full markdown system prompt text |
| `updatedAt` | `number` | Timestamp |
| `updatedBy` | `Id<"users">` | Admin who last edited |

**Index:** `by_key` → fast lookup by key name.

#### `zeitgeists`
Stores world-vibe context entries created by admins.

| Field | Type | Purpose |
|-------|------|---------|
| `title` | `string` | Human-readable label, e.g. "Week of March 10" |
| `isManual` | `boolean` | `true` = admin wrote it directly, `false` = AI synthesized |
| `archetypes` | `string[]?` | Raw world events (only if AI-synthesized) |
| `summary` | `string` | The final emotional text injected into the prompt |
| `createdBy` | `Id<"users">` | Admin who created it |
| `createdAt` | `number` | Timestamp |

**Index:** `by_createdAt` → reverse chronological listing.

#### `horoscopes`
The output product — generated horoscope content.

| Field | Type | Purpose |
|-------|------|---------|
| `zeitgeistId` | `Id<"zeitgeists">` | Which zeitgeist context was used |
| `sign` | `string` | e.g. "Taurus" |
| `targetDate` | `string` | "YYYY-MM-DD" (UTC-normalized) |
| `content` | `string` | The horoscope text (330–460 characters) |
| `status` | `"draft" \| "published" \| "failed"` | Publication state |
| `generatedBy` | `Id<"generationJobs">?` | Which job produced this |

**Indexes:** `by_sign_and_date`, `by_status`, `by_date`.

#### `generationJobs`
Audit trail + live progress tracking for generation runs.

| Field | Type | Purpose |
|-------|------|---------|
| `adminUserId` | `Id<"users">` | Who started the job |
| `zeitgeistId` | `Id<"zeitgeists">` | Selected zeitgeist |
| `modelId` | `string` | e.g. "x-ai/grok-4.1-fast" |
| `targetDates` | `string[]` | Dates to generate for |
| `targetSigns` | `string[]` | Signs to generate for |
| `status` | `"running" \| "completed" \| "partial" \| "failed" \| "cancelled"` | Job state |
| `progress` | `{ completed, failed, total }` | Live progress counts |
| `errors` | `string[]?` | Per-sign error messages |
| `startedAt` | `number` | Timestamp |
| `completedAt` | `number?` | Timestamp |
| `rawZeitgeist` | `string?` | **(v3)** Original admin-typed events |
| `emotionalZeitgeist` | `string?` | **(v3)** AI-translated emotional state |
| `hookId` | `Id<"hooks">?` | **(v3)** Assigned hook archetype |

**Indexes:** `by_status` (concurrency guard), `by_admin`.

#### `cosmicWeather`
Daily astronomical snapshots, computed by cron or on-demand.

| Field | Type | Purpose |
|-------|------|---------|
| `date` | `string` | "YYYY-MM-DD" — primary lookup key |
| `planetPositions` | `Array<{ planet, sign, degreeInSign, isRetrograde }>` | All 9 tracked bodies |
| `moonPhase` | `{ name, illuminationPercent }` | e.g. "Waxing Gibbous", 82% |
| `activeAspects` | `Array<{ planet1, planet2, aspect, orbDegrees }>` | Aspects within 3° orb |
| `generatedAt` | `number` | Computation timestamp |

**Index:** `by_date`.

#### `hooks` **(v3 new)**
DB-driven hook archetype library. Zero-deploy updates.

| Field | Type | Purpose |
|-------|------|---------|
| `name` | `string` | e.g. "The Mirror Hook" |
| `description` | `string` | One-sentence description of the hook's effect |
| `examples` | `string[]` | 2–5 example opening lines (tone reference for LLM) |
| `isActive` | `boolean` | Only active hooks are assignable |
| `moonPhaseMapping` | `string?` | `"new_moon"`, `"waxing"`, `"full_moon"`, or `"waning"` |
| `createdAt` | `number` | Timestamp |
| `updatedAt` | `number` | Timestamp |

**Index:** `by_active`.

---

## 4. The Generation Pipeline (End-to-End)

### Step 1: Admin Preparation (UI)

The admin performs these steps in the admin dashboard:

1. **Context Editor** (`/admin/context`): Sets the master system prompt stored under key `"master_context"` in `systemSettings`. This is the v3 master context document (`context-claude-v3.md`) containing sign profiles, planet guides, hook descriptions, and output constraints.

2. **Zeitgeist Engine** (`/admin/zeitgeist`): Creates a zeitgeist entry — either manually (admin writes the emotional text directly) or via AI synthesis:
   - **Pass 1:** Admin enters 3–7 raw world events → calls `synthesizeZeitgeistAction` → gets a 3-sentence psychological baseline.
   - **Pass 2 (v3):** The baseline is auto-translated via `synthesizeEmotionalZeitgeistAction` → produces a 4–6 sentence description of how people are FEELING (not what happened). This is the Emotional Translation Layer.
   - Admin can edit either text, skip translation, or regenerate.

3. **Hook Manager** (`/admin/hooks`): Manages hook archetypes. Each hook has a moon phase mapping. The seed function creates the initial 4 hooks (Mirror → Waxing, Permission → New Moon, Gentle Provocation → Waning, Observation → Full Moon).

4. **Generation Desk** (`/admin/generator`): Configures the generation run — selects zeitgeist, model, date range, signs — and clicks "Generate."

### Step 2: Job Creation (`convex/admin.ts → startGeneration`)

The mutation:
1. Validates admin role via `requireAdmin()`
2. Validates all sign names and date formats
3. Checks for conflicting running jobs (concurrency guard — no overlapping dates allowed)
4. Verifies the zeitgeist exists
5. Creates a `generationJobs` record with status `"running"`, including v3 fields (`rawZeitgeist`, `emotionalZeitgeist`, `hookId`)
6. **Fire-and-forget:** Schedules `runGenerationJob` via `ctx.scheduler.runAfter(0, ...)`
7. Returns the `jobId` for the client to subscribe to progress

### Step 3: Server-Side Generation (`convex/ai.ts → runGenerationJob`)

This is an `internalAction` that runs entirely on the Convex server. The browser is ONLY a progress viewer — if the admin closes the tab, the action continues.

**Pre-flight (once per job):**

1. Fetches job details from DB
2. Fetches zeitgeist data → determines the `emotionalZeitgeist` text (prefers `job.emotionalZeitgeist`, falls back to `zeitgeist.summary`)
3. Fetches master context from `systemSettings` (key: `"master_context"`)
4. Gets `OPENROUTER_API_KEY` from environment
5. **(v3) Cosmic Weather + Moon Phase Frame:**
   - Queries `cosmicWeather` for the first target date
   - If missing → on-demand fallback: runs `computeAndStore` action, then re-queries
   - Formats planet positions, retrogrades, aspects into a prompt block via `formatCosmicWeatherForPrompt()`
   - Computes the Moon Phase Frame via `getMoonPhaseFrame()` (maps phase name → narrative frame text)
   - Computes the Moon Phase Category via `getMoonPhaseCategory()` (normalises to `"new_moon"` | `"waxing"` | `"full_moon"` | `"waning"`)
6. **(v3) Hook Assignment:**
   - Calls `hooks.getAssignedHook` with priority: manual hookId > auto-match by moon phase category > first active hook > null
   - Formats the hook into a prompt block via `formatHookForPrompt()`

**Per-sign loop:**

For each sign in `job.targetSigns`:
1. Calls `callOpenRouter()` with all context layers
2. Validates response with Zod (`LLMResponseSchema.safeParse()`)
3. If validation fails → retries once (3-second delay)
4. If retry fails → marks sign as failed, moves to next
5. If validation succeeds → persists via `upsertHoroscopes` (smart overwrite: skip identical, reset to draft if different, insert if new)
6. Updates job progress after each sign
7. Sleeps 2 seconds between signs (rate limit protection)
8. If total failures ≥ 6 → aborts entire job

**Post-loop:**
- Sets job status to `"completed"` (0 failures) or `"partial"` (some failures)

### Step 4: Review & Publish (`/admin/review`)

- Admin views all generated horoscopes by date
- Can inline-edit content, delete entries
- Publishes selected horoscopes (bulk status update: `"draft"` → `"published"`)
- Can unpublish individual horoscopes (revert to `"draft"`)

### Step 5: Public Serving (`convex/horoscopes.ts`)

Published horoscopes are served to the public frontend with tiered access:
- **Free users:** Today only (`diff === 0`)
- **Popular tier:** Yesterday, Today, Tomorrow (`diff >= -1 && diff <= 1`)
- **Premium/Admin:** All past + up to 7 days future (`diff <= 7`)
- Paywalled content returns `{ isPaywalled: true, requiredTier }` instead of content

---

## 5. Cosmic Weather Engine

### Purpose
Provides real astronomical data (planet positions, moon phase, retrogrades, aspects) to ground the horoscope generation in actual celestial mechanics.

### Computation (`convex/lib/astronomyEngine.ts`)

This is a **pure computation layer** with zero Convex dependencies — can be unit tested in isolation.

**Tracked bodies:** Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune (9 bodies).

**Key functions:**

| Function | Purpose |
|----------|---------|
| `computeSnapshot(utcDate)` | Main entry point. Returns full `CosmicWeatherSnapshot` |
| `getGeocentricLongitude(body, date)` | Geocentric ecliptic longitude. Handles Sun (`SunPosition`), Moon (`EclipticGeoMoon`), and planets (`EclipticLongitude`) separately |
| `longitudeToSign(lon)` | Converts 0–360° longitude to zodiac sign + degree within sign |
| `getMoonPhaseName(date)` | Phase name + illumination % from phase angle |
| `isRetrograde(body, date)` | Compares longitude over 24h. Negative diff = retrograde. Sun and Moon never retrograde |
| `getMoonPhaseFrame(phaseName)` | **(v3)** Maps phase name to narrative frame text |
| `getMoonPhaseCategory(phaseName)` | **(v3)** Normalises to broad category for hook auto-assignment |

**Aspects:** Conjunction (0°), Opposition (180°), Trine (120°), Square (90°), Sextile (60°). Orb threshold: 3°.

**Computation timing:** Uses noon UTC (`T12:00:00Z`) for positional stability — avoids sign-boundary edge cases at midnight.

### Storage & Retrieval (`convex/cosmicWeather.ts`)

| Function | Type | Purpose |
|----------|------|---------|
| `getForDate` | Internal Query | Fetch snapshot by date |
| `upsertSnapshot` | Internal Mutation | Idempotent write (patch if exists, insert if new) |
| `computeAndStore` | Internal Action | Compute + persist (called by cron and on-demand fallback) |
| `dailyCosmicWeatherJob` | Internal Action | Cron wrapper — computes today's date, calls `computeAndStore` |
| `getCosmicWeatherForAdmin` | Public Query | Admin dashboard display |
| `recomputeCosmicWeather` | Public Action | Admin "Recompute" button |

### Cosmic Weather Prompt Format

The `formatCosmicWeatherForPrompt()` function in `ai.ts` produces:

```
COSMIC WEATHER FOR 2026-03-10:
Planet Positions: Sun in Pisces (19.45°), Moon in Leo (7.23°), Mercury in Aquarius (28.11°) (retrograde — energy turns inward, review not advance), ...
Retrogrades: Mercury
Moon: Waxing Gibbous, 82% illuminated
Active Aspects: Mars opposition Saturn (orb: 1.5°); Venus trine Jupiter (orb: 2.1°)
```

---

## 6. Emotional Zeitgeist (Two-Pass Translation)

### The Problem v3 Solves
In v2, raw world events went directly into the prompt. "Massive tech layoffs" doesn't generate empathy in horoscope copy — it generates news-adjacent language the reader doesn't connect with.

### The Solution: Two-Pass System

**Pass 1 — Psychological Synthesis** (`ai.ts → synthesizeZeitgeist`):
- Input: 3–7 raw archetypal events (admin types these)
- LLM prompt: "Synthesize into a unified psychological baseline"
- Output: 3-sentence summary
- Model: Admin-configurable
- Temperature: 0.6

**Pass 2 — Emotional Translation** (`ai.ts → synthesizeEmotionalZeitgeist`):
- Input: The Pass 1 summary (or admin can provide raw text)
- LLM prompt: "Describe how an average person is FEELING right now"
- Rules enforced in prompt:
  - Never mention country names, political figures, specific events
  - Never use ban-list words
  - Focus on felt human experience: fears, cravings, confusion, quiet hopes
  - 4–6 sentences of plain, warm prose
- Output: The emotional felt-state
- Temperature: 0.65

**Manual Override:** Admin can write the emotional zeitgeist directly via the Manual mode toggle, bypassing both passes entirely. The manual text should already be emotionally framed.

**Skip Translation Checkbox:** On the Zeitgeist page, admin can check "Skip emotional translation" to use the Pass 1 summary directly without Pass 2.

### What Enters the Prompt
Only the **emotional zeitgeist** enters the generation prompt — never raw events. The prompt block reads:

```
COLLECTIVE EMOTIONAL STATE (ZEITGEIST):
[emotional translation text here]
This is how the world FEELS right now — not what happened.
Map this emotional climate to the sign's Likely Felt State.
Never reference news events, countries, or headlines in the output.
```

---

## 7. Hook Archetype System

### Purpose
Hooks control how horoscopes **open**. Without rotation, every horoscope starts to feel the same ("Are you feeling...?"). The 4 archetypes create genuinely different emotional entry points.

### The 4 Default Archetypes

| Hook | Effect | Moon Phase | Example |
|------|--------|------------|---------|
| **The Mirror** | Names what the reader is already doing. "How did you know?" | Waxing | "Still refreshing that one app, hoping the news has changed?" |
| **The Permission** | Validates something the reader has been denying themselves | New Moon | "You're allowed to not have a plan right now." |
| **The Gentle Provocation** | Challenges a pattern with warmth, not accusation | Waning | "You keep waiting for the right moment. What if this is it?" |
| **The Observation** | Describes the reader's life back to them. Strongest personal response | Full Moon | "Something shifted for you recently. You might not be able to name it yet." |

### Assignment Logic (`hooks.ts → getAssignedHook`)

Priority order:
1. **Manual selection**: If admin chooses a specific hook on the Generation Desk, use it directly
2. **Auto-match**: Match the current moon phase category to the hook's `moonPhaseMapping`
3. **Fallback**: First active hook in the library

### How It Works in Code

```
hooks table (DB) → getAssignedHook (internal query) → formatHookForPrompt() → injected into user message
```

The hook enters the prompt as:
```
HOOK ARCHETYPE FOR THIS HOROSCOPE:
Type: The Mirror Hook
Description: Names something the reader is probably already doing or feeling.
Examples of this hook style:
1. "Still refreshing that one app, hoping the news has changed?"
2. "You've been moving fast lately — but do you actually know where you're going?"
Open the horoscope with this hook type. Do not copy the examples — use them as tone reference only.
```

### Admin Management (`/admin/hooks`)
- **Seed Defaults:** One-click button creates the 4 initial archetypes
- **Create/Edit:** Sheet UI for adding new hooks with name, description, 2–5 examples, moon phase mapping
- **Toggle Active/Inactive:** Only active hooks are assignable
- **Delete:** Permanently removes a hook
- **Moon Phase Mapping:** Visual grid shows which hook is assigned to each phase

---

## 8. Moon Phase Narrative Frames

### Purpose
The moon phase is the **primary narrative container** in v3, replacing the old Impact→Processing→Pivot→Integration arc. The arc was complex, had low ROI for single-day generation, and didn't connect to anything astronomically real.

### The 8 Frames

| Phase | Emotional Container | Example Language |
|-------|-------------------|-----------------|
| **New Moon** | Quiet beginnings. Seed energy. | "Something is starting, even if you can't see it yet." |
| **Waxing Crescent** | Building momentum. Work accumulating. | "Keep going. The momentum is real even when it's invisible." |
| **First Quarter** | Building. Effort matters. | "You're further along than you think." |
| **Waxing Gibbous** | Almost there. Refinement. | "Don't change the plan now. Finish the thing." |
| **Full Moon** | Peak intensity. Revelations. | "Something is coming to a head." |
| **Waning Gibbous** | Release. Let go what didn't work. | "What are you still carrying that you don't need?" |
| **Last Quarter** | Release. Integration. | "You get to put some of this down." |
| **Waning Crescent** | Rest. Cycle ending. | "This is the pause before the next chapter." |

### Where They Live
Defined in `convex/lib/astronomyEngine.ts` as the `MOON_PHASE_FRAMES` constant. Retrieved via `getMoonPhaseFrame(phaseName)`.

### How They Enter the Prompt
```
MOON PHASE CONTEXT:
MOON PHASE FRAME: Waxing Gibbous — Almost There
Frame: Refinement energy. The gap between where you are and the goal feels frustrating.
Language: "You're in the final stretch. Don't change the plan now." "Finish the thing."
Avoid: Introducing new directions. This phase is completion energy.
This is the emotional container for all horoscopes in this run.
Every piece of copy should be coloured by this phase's energy.
```

---

## 9. The Prompt Architecture

### Message Structure

The LLM receives two messages:

**System Message:** The full master context document (stored in `systemSettings` under key `"master_context"`). This contains:
- The Core Principle ("emotionally specific + circumstantially universal")
- System rules & constraints + ban list
- Hook archetype descriptions
- Moon phase narrative frame descriptions
- All 12 sign profiles (Likely Felt State, Hook Target, One Action, Copy Rules)
- Planet Felt-Language Guide (direct + retrograde variants)
- Output schema (JSON format, character limits)
- Few-shot examples

**User Message:** Dynamically assembled per sign, containing:

```
TARGET SIGN: Taurus
TARGET DATES: 2026-03-10

MOON PHASE CONTEXT:
[Moon phase frame text — the emotional container]

COSMIC WEATHER:
[Planet positions, retrogrades, aspects — formatted for felt translation]
Translate relevant planetary data into felt language per the Planet Felt-Language Guide.
Never name a planet directly in the copy. Never list positions robotically.

COLLECTIVE EMOTIONAL STATE (ZEITGEIST):
[Emotional translation text]
This is how the world FEELS right now — not what happened.
Map this emotional climate to the sign's Likely Felt State.
Never reference news events, countries, or headlines in the output.

HOOK ARCHETYPE FOR THIS HOROSCOPE:
[Hook name, description, examples]
Open the horoscope with this hook type. Do not copy the examples — use them as tone reference only.

TASK:
Generate horoscopes for Taurus for the dates above.
Each horoscope must feel like it was written specifically for this reader, today.
Apply the Core Principle: emotionally specific, circumstantially universal.
Output ONLY valid JSON matching the schema in the system prompt.
```

### API Call Parameters
- **Endpoint:** `https://openrouter.ai/api/v1/chat/completions`
- **Temperature:** `0.75` (raised from 0.7 in v2 for more natural variation)
- **Max tokens:** `2048`
- **Response format:** `{ type: "json_object" }` (forces JSON output)
- **Headers:** Authorization, Content-Type, HTTP-Referer (`https://stars.guide`), X-Title

---

## 10. Master Context (The System Prompt)

The master context is stored in the DB (`systemSettings`, key: `"master_context"`) and edited via the **Context Editor** admin page.

The current v3 master context is documented in `docs/daily-horoscope/context-claude-v3.md` and contains:

1. **The Core Principle** — "Name the feeling exactly. Leave the circumstance open."
2. **System Rules** — generation mode (single-day default, multi-day), accessible language rules, tone, ban list, character limits, no planet names in copy
3. **Hook Archetypes** — descriptions + examples for all 4 types
4. **Moon Phase Narrative Frames** — 6 phase frames with Frame, Language, Avoid
5. **12 Sign Profiles** — each with Likely Felt State, Hook Target, The One Action, Copy Rules (DO/DON'T)
6. **Planet Felt-Language Guide** — direct + retrograde variants for Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
7. **Output Schema** — the JSON format + all requirements per content string
8. **Few-Shot Examples** — 4 examples demonstrating hook types, cosmic weather integration, and emotional precision

---

## 11. Data Validation & Resilience

### Zod Schema ("The LLM Lie Defense")

Every LLM response is validated against:

```typescript
const LLMResponseSchema = z.object({
    sign: z.enum(VALID_SIGNS),              // Must be one of the 12 canonical names
    horoscopes: z.array(z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),  // Must be YYYY-MM-DD
        content: z.string().min(1),                       // Must not be empty
    })).min(1).max(7),
});
```

**Important design decision:** Character length (330–460) is NOT enforced at the Zod level. This prevents discarding great AI content that's slightly over/under the limit. The admin reviews and decides in the Review & Publish step.

### Retry Strategy
- **Per-sign retries:** 1 retry allowed (total 2 attempts) with 3-second delay
- **Total failure cap:** If 6+ signs fail, the entire job is aborted
- **Inter-sign delay:** 2-second sleep between signs (rate limit protection)

### JSON Sanitization
`sanitizeLLMJson()` strips markdown code block wrappers (` ```json ... ``` `) that LLMs sometimes return despite explicit instructions.

### Smart Overwrite (`upsertHoroscopes`)
When saving generated horoscopes:
1. **Content identical** → skip (avoid unnecessary writes)
2. **Content different** → overwrite, reset status to `"draft"` (forces re-review)
3. **No existing record** → insert as `"draft"`

### Fire-and-Forget Architecture
The generation job runs as an `internalAction` (server-side). The browser is ONLY a progress viewer:
- If admin closes the tab → job continues running
- Every successful sign is persisted immediately → partial progress is safe
- If the action crashes mid-way → all previously saved signs are preserved

### Non-Fatal Degradation
Cosmic weather fetch and hook assignment are wrapped in try/catch blocks. If either fails, generation proceeds without them — the core pipeline (zeitgeist + master context + sign) is sufficient.

---

## 12. Public Frontend API

File: `convex/horoscopes.ts`

### Queries

| Function | Args | Purpose |
|----------|------|---------|
| `getPublished` | `sign`, `date` | Single horoscope with tiered paywall |
| `getWeekPublished` | `sign`, `dates[]` | Multiple dates for weekly view |
| `getAllSignsForDate` | `date` | All 12 signs for "Today's Horoscopes" page |

### Paywall Logic (`getPublished`)

```
Free user:    diff === 0         → Today only
Popular tier: diff >= -1 && <= 1 → Yesterday, Today, Tomorrow
Premium/Admin: diff <= 7         → All past + up to 7 days future
```

If paywalled: returns `{ isPaywalled: true, requiredTier: "popular" | "premium" }` — never the content.

---

## 13. Admin UI Pages

All admin pages live under `src/app/admin/` and are protected by a client-side role check in `layout.tsx` + server-side `requireAdmin()` on every Convex function.

### Layout (`layout.tsx`)
- Sidebar with 6 navigation items: Dashboard, Context Editor, Zeitgeist Engine, Generation Desk, Hook Manager, Review & Publish
- Shows signed-in admin email in the footer
- Loading state while verifying admin access

### Pages

| Page | Route | Purpose |
|------|-------|---------|
| **Dashboard** | `/admin` | Overview (not detailed here) |
| **Context Editor** | `/admin/context` | Edit the master system prompt (`systemSettings` key `"master_context"`) |
| **Zeitgeist Engine** | `/admin/zeitgeist` | Create zeitgeist entries with two-pass emotional translation |
| **Generation Desk** | `/admin/generator` | Configure and launch generation runs. Shows cosmic weather card + job progress |
| **Hook Manager** | `/admin/hooks` | **(v3)** CRUD for hook archetypes. Moon phase auto-assignment grid |
| **Review & Publish** | `/admin/review` | Review drafts, inline edit, publish/unpublish, delete |

### Zeitgeist Engine Page (v3 Updates)
- **Mode Toggle:** AI Synthesis ↔ Manual Override
- **AI Synthesis flow:** Input events → Synthesize & Translate (auto-chains Pass 1 + Pass 2)
- **Two-panel display:** Left panel = raw psychological summary, Right panel = emotional translation (green-tinted when active)
- **Regenerate button:** Re-runs Pass 2 on the current Pass 1 summary
- **Skip Translation checkbox:** Bypasses Pass 2, uses raw synthesis directly
- **History:** Shows recent 10 zeitgeists with title, AI/Manual badge, summary snippet

### Hook Manager Page (v3 New)
- **Auto-Assignment Grid:** Shows which hook is mapped to each moon phase (New Moon, Waxing, Full Moon, Waning)
- **Active/Inactive Hooks:** Separate sections with card grid
- **Hook Cards:** Name, description, 3 example lines (italic, quoted), moon phase badge, active/inactive toggle, edit/delete buttons
- **Create/Edit Sheet:** Slide-out panel with name, description, 2–5 examples, moon phase mapping dropdown, active toggle
- **Seed Defaults:** One-click button to create the initial 4 archetypes (idempotent)

---

## 14. Cron Jobs

File: `convex/crons.ts`

| Job | Schedule | Function | Purpose |
|-----|----------|----------|---------|
| `compute-cosmic-weather` | Daily at 00:05 UTC | `cosmicWeather.dailyCosmicWeatherJob` | Compute planet positions, moon phase, aspects for today |

The 5-minute buffer after midnight avoids UTC boundary edge cases.

**On-demand fallback:** If the cron hasn't run when a generation is triggered, `runGenerationJob` computes cosmic weather on-the-fly via `computeAndStore`.

---

## 15. Security Model

### Three-Layer Defense

| Layer | Description | Location |
|-------|-------------|----------|
| **Layer 1** | Client-side role check in layout | `src/app/admin/layout.tsx` — redirects non-admins to `/dashboard` |
| **Layer 2** | Server-side `requireAdmin()` on EVERY admin function | `convex/lib/adminGuard.ts` — the real enforcement. Throws `FORBIDDEN` if not admin |
| **Layer 3** | Internal functions are unreachable from client | `internalAction`, `internalMutation`, `internalQuery` — only callable server-side |

### Admin Guard (`convex/lib/adminGuard.ts`)

```typescript
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("UNAUTHORIZED: Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") throw new Error("FORBIDDEN: Admin access required");
    return { userId, user };
}
```

A motivated attacker can call Convex functions directly, bypassing the Next.js UI. Layer 2 is the law.

### Prompt Injection Defense
The Zeitgeist page scans input text for suspicious patterns (`/ignore previous/i`, `/forget your instructions/i`, etc.) and displays a warning. It does NOT block — the admin reviews and decides. The zeitgeist text is placed in the **user message** (not system message) to reduce injection risk.

### API Key Security
`OPENROUTER_API_KEY` is stored as a Convex environment variable — never exposed to the client. Only `internalAction` functions (which run server-side in the Node.js runtime) can access `process.env`.

---

## 16. File Map (Where Everything Lives)

```
convex/
├── schema.ts              # Full database schema (10 tables)
├── ai.ts                  # Core generation engine (runGenerationJob, synthesize actions)
├── aiQueries.ts           # Internal queries for the AI pipeline (job details, zeitgeist, settings, cosmic weather, hooks)
├── admin.ts               # Admin CRUD (settings, zeitgeists, generation jobs, horoscopes, review/publish)
├── hooks.ts               # Hook archetype CRUD (internal queries + admin-facing mutations)
├── horoscopes.ts          # Public frontend queries (getPublished, getWeekPublished, getAllSignsForDate)
├── cosmicWeather.ts       # Cosmic weather computation, storage, and admin queries
├── crons.ts               # Scheduled jobs (daily cosmic weather at 00:05 UTC)
└── lib/
    ├── astronomyEngine.ts # Pure computation: planet positions, moon phase, retrogrades, aspects, moon phase frames
    └── adminGuard.ts      # requireAdmin() security utility

src/app/admin/
├── layout.tsx             # Admin sidebar layout with 6 nav items
├── context/page.tsx       # Context Editor (master system prompt)
├── zeitgeist/page.tsx     # Zeitgeist Engine (two-pass emotional translation)
├── generator/page.tsx     # Generation Desk (configure + launch runs)
├── hooks/page.tsx         # Hook Manager (CRUD, moon phase mapping)
└── review/page.tsx        # Review & Publish (inline edit, publish, delete)

docs/daily-horoscope/
├── daily-horoscope-system-v3.md   # THIS DOCUMENT
├── daily-horoscope-plan-v3.md     # The original v3 upgrade plan
├── context-claude-v3.md           # The v3 master context (system prompt content)
├── master-astrology-context.md    # The v2 master context (legacy)
└── master-astrology-context-v3.md # The auto-generated v3 master context (superseded by context-claude-v3.md)
```

---

## 17. Key Invariants (The Rules That Must Never Break)

1. **Emotional Zeitgeist only.** Never raw events. The emotional translation (not news) enters the prompt.
2. **No country names, political figures, or headlines.** Not in the zeitgeist, not in the cosmic weather, not in the output.
3. **Moon phase is the primary narrative driver.** Not the old arc. Every horoscope is coloured by the current moon phase frame.
4. **Retrograde status is always computed and injected.** Uses 24-hour longitude comparison. Sun and Moon never retrograde.
5. **Hooks are DB-driven.** No hardcoded hook text. New archetypes take effect on the next run with zero code deploys.
6. **Core Principle is prominent.** "Name the feeling exactly. Leave the circumstance open." — first rule the LLM reads.
7. **Planet names are never stated directly in copy.** Always translated to felt human language.
8. **Character limits: 330–460.** Hard frontend UI constraint. Validated visually in review, not by Zod (to avoid discarding good-but-slightly-off content).
9. **Every admin function calls `requireAdmin()`.** No exceptions. This is the security law.
10. **Fire-and-forget.** The browser is not a critical link. Jobs survive tab closure. Every sign is persisted immediately.
11. **Smart overwrite.** Re-generating for the same sign+date updates existing records and resets to `"draft"`, never creates duplicates.
12. **Cosmic weather is non-fatal.** If it fails to fetch or compute, generation proceeds without it. The prompt still works.

---

## 18. Common Tasks (How To...)

### Generate horoscopes for tomorrow
1. Go to `/admin/zeitgeist` → create a zeitgeist (or use an existing one)
2. Go to `/admin/generator` → select the zeitgeist, pick a model, set tomorrow's date, select all 12 signs
3. Click "Generate" → watch progress
4. Go to `/admin/review` → filter by tomorrow's date → review, edit if needed → publish

### Add a new hook archetype
1. Go to `/admin/hooks` → click "New Hook"
2. Fill in name, description, 2–5 examples, optional moon phase mapping
3. Toggle active → Save
4. It will be used in the next generation run (no deploy needed)

### Update the master system prompt
1. Go to `/admin/context`
2. Edit the markdown text (copy from `docs/daily-horoscope/context-claude-v3.md` or write custom)
3. Save → it takes effect on the next generation run immediately

### Force-recompute cosmic weather
1. Go to `/admin/generator` → the Cosmic Weather card has a "Recompute" button
2. Or: it auto-computes on-demand during generation if missing

### Change the AI model
1. On the Generation Desk, select a different model from the dropdown
2. Models available: Grok 4.1 Fast, Grok 4.1, Gemini 2.5 Flash Lite, Gemini 2.5 Flash, Claude Sonnet 4, GPT-4.1 Mini, Trinity Large Preview
3. The model choice is stored per-job in `generationJobs.modelId` for audit

### Debug a failed generation
1. Go to `/admin/generator` → check "Recent Jobs" section
2. A failed/partial job will show error messages per sign
3. Common causes: API key not set, API rate limiting (429), invalid JSON response, zeitgeist or context not configured
4. Re-run the failed signs only by selecting just those signs on the Generation Desk

### Skip emotional translation (use raw zeitgeist)
1. On the Zeitgeist page, check the "Skip emotional translation" checkbox before synthesizing
2. The raw 3-sentence psychological summary will be saved as the zeitgeist summary
3. Alternatively, use Manual mode and write the emotional text directly
