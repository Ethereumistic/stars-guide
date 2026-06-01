# Stars.guide — Daily Horoscope Generation System Rebuild Plan

## Overview

We are rebuilding the daily content generation system from scratch. The old system (context editor → zeitgeist engine → generation desk → hook manager → review/publish) is too manual, too complex, and not scalable for daily automated operation. The new system must be **fully automated, simple to extend, and produce structured JSON** that directly feeds the dashboard UI.

The goal: every 24 hours, a Convex cron fires, collects live astronomical data, and generates a complete daily content package for each of the 12 signs — stored as structured JSON, immediately renderable by the frontend with zero manual steps.

---

## What We Are Replacing

The existing pipeline is admin-heavy and not built for automation:
- Manual context editing before each run
- Separate "zeitgeist" layer adding friction
- A generation desk requiring human review triggers
- A hook manager that is a separate concern from content
- A review/publish step that gates automation

**The new system eliminates all manual gates.** Admins can optionally review/override published content through a lightweight admin view, but the system runs and publishes without any human action required.

---

## Core Principles of the New System

1. **One source of truth per day** — a single `DailyAstrologyContext` document computed once per day that all 12 sign generations read from
2. **Structured JSON output** — the LLM is prompted to return valid JSON matching a strict schema; the frontend renders directly from it
3. **Convex-native** — cron, storage, and job queue all live in Convex
4. **Astronomy-engine stays** — live planet positions, aspects, moon phase, and retrograde data remain the factual backbone
5. **Simple, flat prompt** — one prompt template per generation type, no multi-stage chain

---

## Data Architecture

### `daily_astrology_context` table
Computed once per day by the cron before any sign generation begins.

```ts
{
  date: string,                  // "2025-05-24"
  moon_phase: {
    name: string,                // "First Quarter"
    illumination: number,        // 60.9
    emoji: string,               // "🌓"
  },
  planet_positions: Array<{
    planet: string,              // "Sun"
    sign: string,                // "Gemini"
    degree: number,              // 3.34
    retrograde: boolean
  }>,
  active_aspects: Array<{
    planet_a: string,
    planet_b: string,
    aspect_type: string,         // "sextile" | "trine" | "conjunction" | "square" | "opposition"
    orb: number,
    influence: "harmonious" | "tense" | "neutral"
  }>,
  retrograde_context: {
    current: Array<{ planet: string, sign: string, since: string }>,
    upcoming: Array<{ planet: string, starts: string, sign: string }>,
    recent_direct: Array<{ planet: string, went_direct: string }>
  },
  dominant_themes: string[],     // ["communication", "partnerships", "transformation"] — derived, not AI-generated
  energy_signature: "high" | "moderate" | "low" | "mixed"
}
```

### `daily_horoscopes` table
One document per sign per date.

```ts
{
  date: string,                  // "2025-05-24"
  sign: string,                  // "gemini"
  status: "pending" | "generated" | "failed" | "overridden",
  generated_at: number,          // timestamp
  generation_duration_ms: number,

  content: {
    insight: {
      theme: string,             // "Communication & Boundaries"
      pull_quote: string,        // The big italic hero quote
      body: string               // 2-3 sentence interpretation
    },
    energy: {
      love: number,              // 0-10
      career: number,
      mind: number
    },
    navigate: {
      lean_into: string[],       // 3-4 behavioral items
      step_back: string[]        // 3-4 behavioral items
    },
    mantra: string,              // Today's affirmation
    cosmic_details: {
      color: string,
      power_hour: string,        // "10:00 – 11:00am"
      stone: string,
      scent: string
    }
  },

  // Metadata
  context_snapshot_id: Id<"daily_astrology_context">,
  model_used: string,
  prompt_version: string         // e.g. "v2.1" — for tracking prompt iterations
}
```

> **Active transits** are NOT stored here — they are already handled by the existing card component reading live from astronomy-engine. The JSON above is purely the AI-generated narrative layer.

> **Cosmic details** — color, stone, scent, power hour — CAN be semi-hardcoded as a lookup table per sign per moon phase, or AI-generated. Either way they live in the JSON. Recommendation: generate them via AI since it costs almost nothing and avoids maintaining a lookup table.

---

## System Components

### 1. `computeDailyContext` — Convex Action
Runs first. Reads live data from astronomy-engine (already integrated), computes the `daily_astrology_context` document. Also derives `dominant_themes` and `energy_signature` algorithmically (no LLM needed — simple rules based on which aspects are active and which planets are prominent).

Adds **retrograde context** to the existing data pull:
- Which planets are currently retrograde + sign + how long
- Next upcoming retrograde (planet + start date)
- Any planet that went direct in the last 14 days (still energetically relevant)

This runs **once per day**, not 12 times.

---

### 2. `queueDailyGenerations` — Convex Scheduled Function (Cron)
Fires daily at a configured time (e.g. 02:00 UTC). Calls `computeDailyContext`, then enqueues 12 generation jobs — one per sign — into Convex's internal scheduler with a small stagger (e.g. 30s apart) to avoid rate limits on the Ollama Cloud API.

```
02:00 UTC  → computeDailyContext
02:01 UTC  → schedule generateForSign("aries")
02:01:30   → schedule generateForSign("taurus")
02:02:00   → schedule generateForSign("gemini")
... etc
```

---

### 3. `generateForSign` — Convex Action
The core generation unit. Takes `(sign, date, contextId)`.

Steps:
1. Load `daily_astrology_context` for the date
2. Build the prompt (see Prompt Design below)
3. Call Ollama Cloud API
4. Parse and validate JSON response
5. If valid → write to `daily_horoscopes` with status `"generated"`
6. If invalid/failed → retry once, then write status `"failed"` and log

Each action is independent. A failure for Scorpio doesn't block Sagittarius.

---

### 4. Prompt Design

Single prompt, no chain. The prompt has three sections:

**A. Astronomical context block** (injected from `daily_astrology_context`)
```
TODAY'S ASTRONOMICAL CONTEXT — {date}

Moon: {moon_phase.name}, {illumination}% illuminated
Planet positions: [list with degrees and retrograde flags]
Active aspects: [list with orb and influence type]
Retrograde context: [current retrogrades, upcoming, recent direct]
Dominant themes for today: {dominant_themes}
```

**B. Sign-specific framing**
```
You are writing for: {SIGN_NAME}
Sun sign traits relevant today: [2-3 sentence fixed character sketch per sign — hardcoded, not generated]
Key houses activated today for this sign: [computed from planet positions + sign's natural house wheel]
```

**C. Output instruction (strict JSON)**
```
Return ONLY valid JSON matching this exact schema. No preamble, no explanation, no markdown:

{
  "insight": {
    "theme": "...",
    "pull_quote": "...",
    "body": "..."
  },
  "energy": { "love": 7, "career": 8, "mind": 6 },
  "navigate": {
    "lean_into": ["...", "...", "...", "..."],
    "step_back": ["...", "...", "...", "..."]
  },
  "mantra": "...",
  "cosmic_details": {
    "color": "...",
    "power_hour": "...",
    "stone": "...",
    "scent": "..."
  }
}

Rules:
- pull_quote: max 18 words, second-person, emotionally direct, no clichés
- body: exactly 2-3 sentences, must reference at least one specific planet or aspect from today's context
- lean_into / step_back: behavioral, concrete, specific to today (not generic sign advice)
- energy scores: 1-10, float to one decimal, grounded in the active aspects
- mantra: max 20 words, first-person, affirmative
- cosmic_details: intuitive, poetic, connected to today's energy — not random
```

**Prompt version** is stored with every generated document so you can A/B test prompt changes and see their effect on output quality historically.

---

### 5. Admin Override Layer — Lightweight, Optional
A minimal Convex mutation `overrideHoroscope(sign, date, content)` that sets status to `"overridden"` and replaces content. Frontend always reads the latest `daily_horoscopes` document for the sign+date. No complex review pipeline — just a simple admin UI (a future concern, not blocking launch).

---

## Convex Schema Summary

```ts
// convex/schema.ts additions

daily_astrology_context: defineTable({
  date: v.string(),
  moon_phase: v.object({ name: v.string(), illumination: v.number(), emoji: v.string() }),
  planet_positions: v.array(v.object({
    planet: v.string(), sign: v.string(), degree: v.number(), retrograde: v.boolean()
  })),
  active_aspects: v.array(v.object({
    planet_a: v.string(), planet_b: v.string(), aspect_type: v.string(),
    orb: v.number(), influence: v.string()
  })),
  retrograde_context: v.object({
    current: v.array(v.any()),
    upcoming: v.array(v.any()),
    recent_direct: v.array(v.any())
  }),
  dominant_themes: v.array(v.string()),
  energy_signature: v.string()
}).index("by_date", ["date"]),

daily_horoscopes: defineTable({
  date: v.string(),
  sign: v.string(),
  status: v.string(),
  generated_at: v.number(),
  generation_duration_ms: v.optional(v.number()),
  content: v.any(),
  context_snapshot_id: v.id("daily_astrology_context"),
  model_used: v.string(),
  prompt_version: v.string()
}).index("by_date_sign", ["date", "sign"])
  .index("by_date", ["date"])
```

---

## Convex Cron Setup

```ts
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "generate-daily-horoscopes",
  { hourUTC: 2, minuteUTC: 0 },
  internal.horoscopes.queueDailyGenerations,
  {}
);

export default crons;
```

---

## Frontend Query

```ts
// One query, returns today's content for the user's sign
export const getTodayForSign = query({
  args: { sign: v.string() },
  handler: async (ctx, { sign }) => {
    const today = new Date().toISOString().split("T")[0];
    return await ctx.db
      .query("daily_horoscopes")
      .withIndex("by_date_sign", q => q.eq("date", today).eq("sign", sign))
      .unique();
  }
});
```

---

## Astronomical Data Enrichments to Add

Beyond what's currently pulled, add to `computeDailyContext`:

| Addition | Why |
|---|---|
| **Retrograde flags per planet** | Mercury/Venus/Mars retrogrades meaningfully shift interpretation |
| **Upcoming retrogrades (next 30 days)** | "Pre-shadow" energy is astrologically relevant |
| **Recent direct stations (last 14 days)** | "Post-shadow" — still affects interpretation |
| **Void-of-course Moon windows** | Affects timing advice ("avoid signing contracts") |
| **Moon's next sign ingress** | Useful for power hour and timing suggestions |
| **Dominant element today** | Count fire/earth/air/water across active planets — shapes energy signature |
| **Stellium detection** | 3+ planets in one sign = major theme for the day |

---

## File/Folder Structure (New)

```
convex/
  horoscopes/
    computeDailyContext.ts     ← pulls astronomy-engine data, builds context doc
    queueDailyGenerations.ts   ← cron entrypoint, schedules 12 jobs
    generateForSign.ts         ← single sign generation action
    prompt.ts                  ← prompt builder, versioned
    schema.ts additions        ← daily_astrology_context + daily_horoscopes

  crons.ts                     ← cron registration

lib/
  astrology/
    contextBuilder.ts          ← derives dominant_themes, energy_signature, house activations
    retrogradeCalc.ts          ← retrograde window calculations via astronomy-engine (DELETED 2025-07-24 — logic moved to astronomyEngine.ts)
    signTraits.ts              ← hardcoded per-sign character sketches (used in prompt B)
```

---

## What the Agent Should Ask Before Starting

After reviewing this plan, the implementing agent should clarify:

1. **Ollama Cloud API** — what is the base URL, auth method, and which model is being used? Does it support a `system` + `user` message structure or a single prompt string?
2. **Existing astronomy-engine integration** — where does the current data pull live? Is there already a Convex action that returns planet positions and aspects, or does this need to be wired up fresh?
3. **Existing horoscope tables** — are there existing Convex tables for horoscopes that need to be migrated or can we create fresh tables alongside?
4. **Prompt version starting point** — should we start at `v1.0` or is there an existing prompt from the old system worth adapting as a baseline?
5. **Retrograde data source** — is astronomy-engine already being used to calculate retrograde windows, or do we need to implement that calculation from scratch?
6. **Void-of-course Moon** — is this already calculated, or should it be added as a new computation in `computeDailyContext`?
7. **Stagger timing between sign jobs** — 30 seconds apart is suggested; is the Ollama Cloud API rate limit known so we can tune this?
8. **Fallback strategy** — if the API fails for a sign, should it retry immediately, retry at next hour, or surface in an admin alert?
9. **Time zone for cron** — 02:00 UTC suggested; should this align with a specific market (US, EU) for when users wake up to fresh content?
10. **Cosmic details approach** — confirm: AI-generated (recommended) vs. lookup table per sign/moon phase?