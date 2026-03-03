# Stars.Guide: Cosmic Weather Integration — Refactor Plan

## Overview

This plan adds a real-time astronomical data layer ("Cosmic Weather") to the horoscope generation pipeline. Every daily horoscope will be enriched with live planet positions, moon phase, and active conjunctions/oppositions — computed from `astronomy-engine`, cached once per UTC day in Convex, and injected into the OpenRouter prompt as a structured third context layer.

**Stack:** Next.js 16 App Router · TypeScript · Convex · Tailwind + shadcn/ui · OpenRouter (BYOK) · `astronomy-engine`

---

## Architecture Summary

```
[midnight UTC cron / on-demand trigger]
        │
        ▼
computeCosmicWeather (Convex internal action)
  → runs astronomy-engine calculations
  → writes one record to `cosmicWeather` table (keyed by UTC date)
        │
        ▼
cosmicWeather table  ←──── checked before every generation job
        │                   (if missing for today → compute on-demand)
        ▼
runGenerationJob (existing internal action)
  → fetches cosmicWeather record for target date
  → injects snapshot into user message prompt
        │
        ▼
OpenRouter (LLM) — sees Cosmic Weather + Zeitgeist + Sign Profile
        │
        ▼
horoscopes table (unchanged upsert logic)
```

---

## Step 1 — Install astronomy-engine (ALREADY INSTALLED)

Add the package to your project. It is a pure TypeScript/JS library with no native dependencies, so it runs cleanly inside Convex actions.

```bash
pnpm install astronomy-engine
```

**Verify it works inside a Convex action context** — Convex actions run in a V8 isolate (not Node), so confirm `astronomy-engine` doesn't use any Node built-ins. Based on the library's source it is pure JS and safe.

---

## Step 2 — Add the `cosmicWeather` Convex Table

### 2a. Schema (`convex/schema.ts`)

Add the following table definition:

```typescript
cosmicWeather: defineTable({
  date: v.string(),                  // "YYYY-MM-DD" UTC — primary lookup key
  planetPositions: v.array(
    v.object({
      planet: v.string(),            // e.g. "Mars"
      sign: v.string(),              // e.g. "Gemini"
      degreeInSign: v.number(),      // 0–29.99
    })
  ),
  moonPhase: v.object({
    name: v.string(),                // e.g. "Waxing Gibbous"
    illuminationPercent: v.number(), // 0–100
  }),
  activeAspects: v.array(
    v.object({
      planet1: v.string(),           // e.g. "Mars"
      planet2: v.string(),           // e.g. "Pluto"
      aspect: v.string(),            // "conjunction" | "opposition" | "trine" | "square" | "sextile"
      orbDegrees: v.number(),        // how tight the aspect is
    })
  ),
  generatedAt: v.number(),           // Date.now() timestamp for audit
}).index("by_date", ["date"]),
```

### 2b. Why a dedicated table, not `systemSettings`

`systemSettings` is human-edited config with no defined shape. Cosmic Weather is machine-computed, date-keyed, and structurally typed. Mixing them would break type safety and make cache invalidation messy. The dedicated table gives you a clean `by_date` index, easy TTL logic, and a clear audit trail.

---

## Step 3 — Build the Cosmic Weather Utility

### 3a. Create `convex/lib/astronomyEngine.ts`

This module is the pure computation layer. It takes a UTC date string and returns the structured snapshot. It has no Convex dependencies — it is a plain function that can be unit tested in isolation.

```typescript
import * as Astronomy from "astronomy-engine";

// The 9 classical + modern planets we track
const TRACKED_PLANETS: Astronomy.Body[] = [
  Astronomy.Body.Sun,
  Astronomy.Body.Moon,
  Astronomy.Body.Mercury,
  Astronomy.Body.Venus,
  Astronomy.Body.Mars,
  Astronomy.Body.Jupiter,
  Astronomy.Body.Saturn,
  Astronomy.Body.Uranus,
  Astronomy.Body.Neptune,
];

const PLANET_NAMES: Record<Astronomy.Body, string> = {
  [Astronomy.Body.Sun]: "Sun",
  [Astronomy.Body.Moon]: "Moon",
  [Astronomy.Body.Mercury]: "Mercury",
  [Astronomy.Body.Venus]: "Venus",
  [Astronomy.Body.Mars]: "Mars",
  [Astronomy.Body.Jupiter]: "Jupiter",
  [Astronomy.Body.Saturn]: "Saturn",
  [Astronomy.Body.Uranus]: "Uranus",
  [Astronomy.Body.Neptune]: "Neptune",
  // fill remaining required keys with empty string to satisfy Record type
} as Record<Astronomy.Body, string>;

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

// Convert ecliptic longitude (0–360) to zodiac sign + degree within sign
function longitudeToSign(lon: number): { sign: string; degreeInSign: number } {
  const normalized = ((lon % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  return {
    sign: ZODIAC_SIGNS[signIndex],
    degreeInSign: parseFloat((normalized % 30).toFixed(2)),
  };
}

// Moon phase name from illumination + phase angle
function getMoonPhaseName(date: Date): { name: string; illuminationPercent: number } {
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
  const phaseDeg = illum.phase_angle; // 0 = new, 180 = full
  const illumPct = parseFloat((illum.phase_fraction * 100).toFixed(1));

  let name: string;
  if (phaseDeg < 22.5) name = "New Moon";
  else if (phaseDeg < 67.5) name = "Waxing Crescent";
  else if (phaseDeg < 112.5) name = "First Quarter";
  else if (phaseDeg < 157.5) name = "Waxing Gibbous";
  else if (phaseDeg < 202.5) name = "Full Moon";
  else if (phaseDeg < 247.5) name = "Waning Gibbous";
  else if (phaseDeg < 292.5) name = "Last Quarter";
  else if (phaseDeg < 337.5) name = "Waning Crescent";
  else name = "New Moon";

  return { name, illuminationPercent: illumPct };
}

// Check for active aspects between all planet pairs (orb ≤ 3°)
const ASPECT_ANGLES = [
  { name: "conjunction", angle: 0 },
  { name: "opposition", angle: 180 },
  { name: "trine", angle: 120 },
  { name: "square", angle: 90 },
  { name: "sextile", angle: 60 },
];
const ORB_THRESHOLD = 3;

export type CosmicWeatherSnapshot = {
  planetPositions: { planet: string; sign: string; degreeInSign: number }[];
  moonPhase: { name: string; illuminationPercent: number };
  activeAspects: { planet1: string; planet2: string; aspect: string; orbDegrees: number }[];
};

export function computeSnapshot(utcDate: string): CosmicWeatherSnapshot {
  // Use noon UTC on the target date for stability
  const date = new Date(`${utcDate}T12:00:00Z`);

  // Planet positions
  const planetPositions = TRACKED_PLANETS.map((body) => {
    const ecliptic = Astronomy.EclipticLongitude(body, date);
    const { sign, degreeInSign } = longitudeToSign(ecliptic);
    return { planet: PLANET_NAMES[body], sign, degreeInSign };
  });

  // Moon phase
  const moonPhase = getMoonPhaseName(date);

  // Active aspects
  const activeAspects: CosmicWeatherSnapshot["activeAspects"] = [];
  const longitudes = TRACKED_PLANETS.map((body) => ({
    name: PLANET_NAMES[body],
    lon: Astronomy.EclipticLongitude(body, date),
  }));

  for (let i = 0; i < longitudes.length; i++) {
    for (let j = i + 1; j < longitudes.length; j++) {
      const diff = Math.abs(longitudes[i].lon - longitudes[j].lon);
      const angle = diff > 180 ? 360 - diff : diff;
      for (const { name, angle: aspectAngle } of ASPECT_ANGLES) {
        const orb = Math.abs(angle - aspectAngle);
        if (orb <= ORB_THRESHOLD) {
          activeAspects.push({
            planet1: longitudes[i].name,
            planet2: longitudes[j].name,
            aspect: name,
            orbDegrees: parseFloat(orb.toFixed(2)),
          });
        }
      }
    }
  }

  return { planetPositions, moonPhase, activeAspects };
}
```

---

## Step 4 — Build the Convex Internal Action

### 4a. Create `convex/internal/cosmicWeather.ts`

```typescript
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { computeSnapshot } from "../lib/astronomyEngine";

// Query: fetch today's snapshot (returns null if not yet computed)
export const getForDate = internalQuery({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    return await ctx.db
      .query("cosmicWeather")
      .withIndex("by_date", (q) => q.eq("date", date))
      .unique();
  },
});

// Mutation: write computed snapshot to DB
export const upsertSnapshot = internalMutation({
  args: {
    date: v.string(),
    planetPositions: v.array(v.object({
      planet: v.string(),
      sign: v.string(),
      degreeInSign: v.number(),
    })),
    moonPhase: v.object({
      name: v.string(),
      illuminationPercent: v.number(),
    }),
    activeAspects: v.array(v.object({
      planet1: v.string(),
      planet2: v.string(),
      aspect: v.string(),
      orbDegrees: v.number(),
    })),
    generatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cosmicWeather")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("cosmicWeather", args);
    }
  },
});

// Action: compute and persist (safe to call multiple times — idempotent)
export const computeAndStore = internalAction({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const snapshot = computeSnapshot(date);
    await ctx.runMutation(internal.cosmicWeather.upsertSnapshot, {
      date,
      ...snapshot,
      generatedAt: Date.now(),
    });
  },
});
```

---

## Step 5 — Daily Cron Job

### 5a. `convex/crons.ts`

Schedule the computation to run at **00:05 UTC** every day (5-minute buffer after midnight to avoid any UTC boundary edge cases).

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "compute-cosmic-weather",
  { hourUTC: 0, minuteUTC: 5 },
  internal.cosmicWeather.computeAndStore,
  // date arg: the cron does not receive args automatically,
  // so wrap in a scheduled action that computes today's UTC date:
  // See Step 5b below.
);

export default crons;
```

### 5b. Wrap with a date-aware trigger

Because Convex crons don't pass dynamic args, create a thin wrapper:

```typescript
// convex/internal/scheduledJobs.ts

export const dailyCosmicWeather = internalAction({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0]; // safe here — cron runs at 00:05 UTC
    await ctx.runAction(internal.cosmicWeather.computeAndStore, { date: today });
  },
});
```

Point the cron at `internal.scheduledJobs.dailyCosmicWeather`.

---

## Step 6 — On-Demand Fallback

In `runGenerationJob`, before generating, check if today's snapshot exists. If not, compute it on-demand. This means generation always works even if the cron missed (e.g. first deploy, cold start).

```typescript
// Inside runGenerationJob (convex/internal/ai.ts or equivalent)

async function getOrComputeCosmicWeather(ctx, date: string) {
  const existing = await ctx.runQuery(internal.cosmicWeather.getForDate, { date });
  if (existing) return existing;
  // Not yet computed — run on demand
  await ctx.runAction(internal.cosmicWeather.computeAndStore, { date });
  return await ctx.runQuery(internal.cosmicWeather.getForDate, { date });
}
```

---

## Step 7 — Prompt Injection

### 7a. Format the snapshot as a human-readable string for the LLM

```typescript
function formatCosmicWeatherForPrompt(snapshot: CosmicWeatherSnapshot): string {
  const planets = snapshot.planetPositions
    .map((p) => `${p.planet} in ${p.sign} (${p.degreeInSign}°)`)
    .join(", ");

  const aspects = snapshot.activeAspects.length > 0
    ? snapshot.activeAspects
        .map((a) => `${a.planet1} ${a.aspect} ${a.planet2} (orb: ${a.orbDegrees}°)`)
        .join("; ")
    : "No exact aspects today.";

  return `
COSMIC WEATHER FOR ${snapshot.date}:
Planet Positions: ${planets}
Moon: ${snapshot.moonPhase.name}, ${snapshot.moonPhase.illuminationPercent}% illuminated
Active Aspects: ${aspects}
`.trim();
}
```

### 7b. Updated OpenRouter payload structure

```typescript
{
  role: "user",
  content: `
TARGET SIGN: ${sign}
TARGET DATES: ${dates.join(", ")}

COSMIC WEATHER (USE THIS TO GROUND THE HOROSCOPE IN TODAY'S ACTUAL SKY):
${formatCosmicWeatherForPrompt(cosmicWeather)}
Weave the relevant planetary data naturally into the copy.
Do NOT list planets robotically. Reference them the way a real astrologer would —
as felt energies, not data points.

CURRENT WORLD VIBE (ZEITGEIST):
${zeitgeistSummary}

TASK: Generate horoscopes for the above sign and dates.
Map both the Cosmic Weather and the Zeitgeist to this sign's psychological wiring.
Output ONLY valid JSON matching the schema in the system prompt.
  `
}
```

---

## Step 8 — Update `master-astrology-context.md`

Add a new section instructing the LLM how to use Cosmic Weather data. Insert this as **Section 1b** between the existing System Rules and Sign Profiles:

```markdown
## 1b. How to Use Cosmic Weather Data

You will receive a "COSMIC WEATHER" block in every prompt. This contains real,
computed astronomical positions for the target date. Use it as follows:

- **Planet in Sign:** If a planet rules or strongly influences the target sign,
  reference its current sign as a felt quality. Example: Mars in Gemini = scattered
  drive, mental restlessness. Do NOT say "Mars is in Gemini." Say "your energy
  right now has a restless, all-over-the-place quality to it."

- **Moon Phase:** Always weave this in. It sets the emotional texture of the day.
  Waxing = building, growing energy. Full = peak intensity, things coming to a head.
  Waning = releasing, letting go. New Moon = quiet reset.

- **Active Aspects:** Only reference aspects that are relevant to the target sign's
  ruling planet or to the emotional theme of the day. A Mars-Pluto opposition =
  push-pull between action and fear. A Venus-Jupiter conjunction = expansion in
  relationships or pleasure. Translate, never list.

- **Ignore irrelevant data.** If a planet has no meaningful connection to the
  target sign or the day's theme, leave it out. Relevance over completeness.
```

---

## Step 9 — Admin UI (Minor Addition)

Add a small read-only **"Today's Cosmic Weather"** card in the admin dashboard. It shows:
- Current planet positions (simple list)
- Moon phase + illumination
- Active aspects (if any)
- A "Recompute" button that calls `computeAndStore` on demand

This gives admins visibility into what the AI is seeing before they trigger generation. It also doubles as a debugging tool.

---

## File Change Summary

| File | Action |
|---|---|
| `convex/schema.ts` | Add `cosmicWeather` table definition |
| `convex/lib/astronomyEngine.ts` | **Create** — pure computation utility |
| `convex/internal/cosmicWeather.ts` | **Create** — query, mutation, action |
| `convex/internal/scheduledJobs.ts` | **Create** — date-aware cron wrapper |
| `convex/crons.ts` | Add daily cron at 00:05 UTC |
| `convex/internal/ai.ts` | Add `getOrComputeCosmicWeather()` + inject into prompt payload |
| `master-astrology-context.md` | Add Section 1b (Cosmic Weather usage instructions) |
| `app/admin/...` (dashboard) | Add read-only Cosmic Weather card + Recompute button |

---

## Non-Goals for v1

- No retrograde detection (can be added in v2 — `astronomy-engine` supports it) **(ACTUALLY THIS MUST BE ADDED IN THE FIRST **VERSION!)**
- No user-facing "sky map" visual (separate feature, separate plan)
- No per-user location-based calculations (rising signs etc. — requires birth data)
- No historical backfill of the `cosmicWeather` table

---

## Key Invariants

1. The `cosmicWeather` table has **at most one record per UTC date** — enforced by the upsert logic.
2. Generation jobs **never block** on a missing snapshot — the on-demand fallback in Step 6 guarantees this.
3. The astronomy computation runs at **noon UTC** on the target date for positional stability (avoids sign-boundary edge cases at midnight).
4. The LLM receives Cosmic Weather as **felt language instructions**, not raw data — the prompt in Step 7 and the master context in Step 8 together enforce this.