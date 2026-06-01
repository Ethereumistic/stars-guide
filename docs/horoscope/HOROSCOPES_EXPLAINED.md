# Horoscope Generation Pipeline — Full End-to-End Guide

## Overview

The Stars.Guide daily horoscope pipeline is a fully automated, astronomy-engine–driven system that generates personalized, jargon-free horoscope content for all 12 zodiac signs every day. No manual gates are required — the system computes, generates, stores, and serves content via Convex cron jobs and actions.

The pipeline runs on three daily cron triggers:

| Time (UTC) | Job | Purpose |
|---|---|---|
| 00:05 | `compute-cosmic-weather` | Compute raw astronomical snapshot (planet positions, aspects, moon phase) |
| 00:10 | `generate-felt-language` | LLM translation of raw data into felt emotional prose (stored but unused) |
| 02:00 | `generate-daily-horoscopes` | Compute enriched context → queue 12 sign generations (30 s stagger) |

### Pipeline Diagram

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                          DAILY HOROSCOPE PIPELINE                             │
 └──────────────────────────────────────────────────────────────────────────────┘

  00:05 UTC                00:10 UTC               02:00 UTC
  ┌─────────────┐          ┌──────────────┐        ┌──────────────────────┐
  │   Stage 1   │          │   Stage 1b   │        │      Stage 2         │
  │  Astronomy  │─────────▶│  Felt Lang.  │        │  Daily Context       │
  │  Engine     │          │  (LLM prose) │        │  Enrichment          │
  │ computeSnap │          │  ⚠️ UNUSED   │        │  (retro, VoC,        │
  │  shot()     │          └──────────────┘        │   element, stellium) │
  └──────┬──────┘                                   └──────────┬───────────┘
         │                                                     │
         │          ┌──────────────────────────────────────────┤
         ▼          ▼                                          ▼
  ┌──────────────────────┐          ┌──────────────────────┐
  │   cosmicWeather DB   │          │ daily_astrology_     │
  │   table               │          │ context DB table    │
  └──────────────────────┘          └──────────┬───────────┘
                                               │
                    ┌──────────────────────────┤
                    ▼                          ▼
             ┌────────────┐           ┌────────────────┐
             │  Stage 3   │           │   Stage 4      │
             │  Energy     │           │  Retrograde     │
             │  Signature  │           │  Context        │
             └──────┬──────┘           └───────┬────────┘
                    │                          │
                    └────────────┬──────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │      Stage 5           │
                    │  Prompt Construction   │
                    │  (Section A / B / C)   │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │      Stage 6           │
                    │  LLM Generation        │
                    │  (provider resolve,    │
                    │   retry, Zod validate)  │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │      Stage 7           │
                    │  Output Schema (v2.0)  │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │      Stage 8           │
                    │  Storage              │
                    │  (3 tables, upsert)    │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │      Stage 9           │
                    │  Public Serving &      │
                    │  Paywall               │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │      Stage 10          │
                    │  Admin Tools           │
                    └──────────────────────-┘
```

---

## Stage 1: Astronomy Engine

**File**: `convex/lib/astronomyEngine.ts`
**Cron**: `compute-cosmic-weather` at 00:05 UTC

The foundation of the entire pipeline is a pure-computation layer that takes a UTC date string and returns a structured snapshot of the sky. It has **zero Convex dependencies** and can be unit-tested in isolation.

### 10 Tracked Bodies

The system tracks 10 classical and modern astrological bodies:

| Body | Geocentric Method |
|---|---|
| Sun | `Astronomy.SunPosition(date).elon` |
| Moon | `Astronomy.EclipticGeoMoon(date).lon` |
| Mercury | `GeoVector()` + `Ecliptic()` |
| Venus | `GeoVector()` + `Ecliptic()` |
| Mars | `GeoVector()` + `Ecliptic()` |
| Jupiter | `GeoVector()` + `Ecliptic()` |
| Saturn | `GeoVector()` + `Ecliptic()` |
| Uranus | `GeoVector()` + `Ecliptic()` |
| Neptune | `GeoVector()` + `Ecliptic()` |
| Pluto | `GeoVector()` + `Ecliptic()` |

All planet longitudes are **geocentric** (as seen from Earth), computed via `GeoVector()` + `Ecliptic()`. The previous implementation used `EclipticLongitude()` which returns heliocentric longitude — wrong by up to 50° for inner planets. Sun and Moon use their dedicated geocentric APIs.

### Retrograde Detection — 1-Minute Lookforward

Retrograde is detected by comparing geocentric longitude over a **1-minute window**. If longitude decreased (moved backward), the planet is retrograde. This avoids false negatives from the old 24-hour window near retrograde/direct stations.

```ts
function isRetrograde(body: Astronomy.Body, date: Date): boolean {
    const lon = getGeocentricLongitude(body, date);
    const futureDate = new Date(date.getTime() + 60000);
    const futureLon = getGeocentricLongitude(body, futureDate);
    let diff = futureLon - lon;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;
    return diff < 0;
}
```

Only 8 planets can be retrograde (Sun and Moon never go retrograde). These are the **retrograde candidates**: Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto.

### Noon UTC Timestamp

`computeSnapshot()` uses **noon UTC** (`12:00:00Z`) on the target date for positional stability. This avoids sign-boundary edge cases that can occur at midnight UTC when a planet may be at 0° or 29° of a sign.

### Active Aspects

Aspects are computed between all unique pairs of the 10 tracked bodies. The system checks for five major aspect types:

| Aspect | Angle | Orb Threshold |
|---|---|---|
| Conjunction | 0° | ≤ 3° |
| Sextile | 60° | ≤ 3° |
| Square | 90° | ≤ 3° |
| Trine | 120° | ≤ 3° |
| Opposition | 180° | ≤ 3° |

Any pair with an orb ≤ 3° is considered an "active" aspect for that day.

### Output Shape

The `computeSnapshot()` function returns a `CosmicWeatherSnapshot`:

```ts
{
  planetPositions: { planet, sign, degreeInSign, isRetrograde }[],
  moonPhase: { name, illuminationPercent },
  activeAspects: { planet1, planet2, aspect, orbDegrees }[]
}
```

This is persisted to the `cosmicWeather` table via the `computeAndStore` action.

---

## Stage 1b: Felt Language

**File**: `convex/cosmicWeather.ts`
**Cron**: `generate-felt-language` at 00:10 UTC

After the raw astronomical snapshot is computed, a second cron job translates that data into "felt language" — emotionally resonant prose describing the collective energetic climate.

### LLM Translation

The system prompts a lightweight model (`google/gemini-2.5-flash-lite`) with strict rules:
- Never name a planet directly
- Never name a sign directly
- Write 4–6 sentences of felt human experience
- Focus on collective mood — what energy is in the air
- No prediction, no advice — only description
- No mention of degrees, orbs, or technical terms

The moon phase frame (from `getMoonPhaseFrame()`) is injected to anchor the emotional container. The prompt sends retrograde planet names and active aspects for grounding.

### ⚠️ Stored But Unused

The felt language is computed and stored on the `cosmicWeather` record (fields `feltLanguage` and `feltLanguageGeneratedAt`), but it is **not currently consumed by the horoscope generation pipeline**. The horoscope prompt (Stage 5) does not include felt language as input. This is a known gap — see [Known Issues](#known-issues).

---

## Stage 2: Daily Context Enrichment

**File**: `convex/horoscopes/computeDailyContext.ts`
**Action**: `computeDailyContext` (called by `queueDailyGenerations` at 02:00 UTC)

This is the enrichment layer that transforms the raw astronomical snapshot into a rich `DailyAstrologyContext` document, computed **once per day** (not 12 times). All 12 sign generations read from this single document.

### Steps

1. **Read existing cosmicWeather** — fetches the snapshot stored by Stage 1
2. **Re-compute snapshot** — calls `computeSnapshot(date)` directly for fresh data
3. **Build retrograde context** — rich per-planet detail with `buildRetrogradeContext(today)`
4. **Detect Void-of-Course Moon** — `isVoidOfCourse(today)` checks if the Moon makes no major aspect before changing signs
5. **Find next Moon sign ingress** — `nextMoonIngress(today)` finds when Moon changes signs next
6. **Context enrichment** — calls `buildContext()` from `contextBuilder.ts`
7. **Map to schema** — transforms snapshot fields to match the `daily_astrology_context` table schema
8. **Upsert** — writes to `daily_astrology_context` (idempotent)

### Retrograde Context with RetrogradePlanetDetail

The enrichment includes detailed per-planet retrograde info via `buildRetrogradeContext()`:

```ts
type RetrogradePlanetDetail = {
    planet: string;
    status: "active" | "upcoming" | "recently_direct" | "clear";
    startDate: string;        // ISO date
    endDate: string;          // ISO date
    totalDays: number;
    daysElapsed: number;
    daysRemaining: number;
    progressPercent: number;  // 0–100
    phase: "entering" | "deepening" | "peak" | "exiting"
         | "approaching" | "aftermath" | "clear";
}
```

- **Active**: Currently retrograde — window boundaries found by day-by-day scanning
- **Upcoming**: Next retrograde within 120 days
- **Recently direct**: Planet turned direct within 14 days (shadow period lingers)

### Void-of-Course Moon

The Moon is void-of-course when it makes no major aspect (sextile 60°, square 90°, trine 120°, opposition 180°) to any tracked planet before changing signs.

**Pluto is included** in the VoC planet list for geocentric consistency with the rest of the system.

**Sun is excluded** by astrological tradition — the Sun's aspects with the Moon (conjunction = New Moon, opposition = Full Moon) are not considered "major aspects" in the VoC sense. Only planet-to-Moon aspects matter.

The algorithm steps forward in 6-hour increments, checking at each step whether the Moon's longitude is within a 3° orb of any major aspect angle from any tracked planet. If no aspect is found before the Moon leaves its current sign, the Moon is void-of-course.

### Dominant Element

Count fire/earth/air/water across all planet positions (using zodiac sign → element mapping). The element with the most planets is the dominant element for the day.

### Stellium Detection

If 3+ planets occupy the same zodiac sign, a stellium is flagged. This concentrates the day's energy and becomes a dominant theme.

### Energy Signature

Derived algorithmically (no LLM) via `contextBuilder.ts` — see Stage 3.

---

## Stage 3: Energy Signature

**File**: `convex/lib/astrology/contextBuilder.ts`
**Function**: `deriveEnergySignature()`

The energy signature is a comma-separated string of tokens that summarize the day's astrological character across 5 axes:

| Axis | Logic | Example Tokens |
|---|---|---|
| **Elemental base** | Count planets per element, pick highest | `fire`, `earth`, `air`, `water` |
| **Moon direction** | New/waning → inward; Full/waxing → outward | `inward`, `outward` |
| **Retrograde depth** | 0 = none, 1 = reflective, 2+ = internal | `reflective`, `internal` |
| **Aspect tone** | Hard (square/opposition) vs soft (trine/sextile) count | `intense`, `harmonious`, `balanced` |
| **Stellium modifier** | If stellium detected | `concentrated` |
| **Retrograde planet tokens** | Mercury = revisiting, Mars = delayed_action, **Pluto = deep_transformation** | `revisiting`, `deep_transformation` |

**Pluto deep_transformation token**: When Pluto is retrograde (and there are 2+ total retrograde planets), the token `deep_transformation` is added. This signals to the AI that profound, beneath-the-surface transformation energy is active.

### ASPECT_THEME_MODIFIERS — Unused

The `contextBuilder.ts` file defines `ASPECT_THEME_MODIFIERS` (a mapping of aspect types to theme pushes with weights), but this catalog is **not referenced anywhere** in the codebase. The function `summariseAspects()` uses hard-coded counts instead. This is a known gap — see [Known Issues](#known-issues).

### Tie-Breaking — Iteration Order

When multiple elements or themes have the same count, the winner is determined by **iteration order of `Object.entries()`**. In V8 (Node.js/Bun), this is insertion order for non-integer keys. This means tie-breaking is **non-deterministic** across different JS engines or if object key order changes. In practice, the `SIGN_TO_ELEMENT` and `ELEMENT_LABELS` records are small and stable, but this is a subtle correctness note.

---

## Stage 4: Retrograde Context

**File**: `convex/lib/astronomyEngine.ts`
**Function**: `buildRetrogradeContext(today: Date)`

### Day-by-Day Scanning Replaces Deleted retrogradeCalc.ts

The retrograde window calculations previously lived in a separate file `convex/lib/astrology/retrogradeCalc.ts`. On 2025-07-24, that file was **deleted** and all its logic was moved directly into `astronomyEngine.ts`. The functions `findRetrogradeStart()`, `findRetrogradeEnd()`, and `findNextRetrogradeStart()` now live alongside the rest of the astronomical computation code.

### 8 Retrograde Candidates

Sun and Moon never go retrograde. The system scans 8 planets:

| Planet | Typical Retrograde Duration |
|---|---|
| Mercury | ~3 weeks |
| Venus | ~6 weeks (rare) |
| Mars | ~10 weeks |
| Jupiter | ~4 months |
| Saturn | ~4.5 months |
| Uranus | ~5 months |
| Neptune | ~5 months |
| Pluto | ~5–6 months |

### Phase Classification Table

Each retrograde planet gets a `phase` based on its `progressPercent` through the retrograde window:

| Phase | Progress | Felt Experience |
|---|---|---|
| `entering` | 0–15% | The shift is just beginning, things feel "off" |
| `deepening` | 15–40% | Retrograde energy intensifies, themes surface |
| `peak` | 40–60% | Full intensity, the core of the retrograde |
| `exiting` | 60–90% | The energy is waning but still present |
| `approaching` | N/A (upcoming) | Not yet started, will begin soon |
| `aftermath` | N/A (recently_direct) | Just turned direct, shadow period lingers |
| `clear` | N/A | No retrograde activity nearby |

### RETROGRADE CYCLE POSITIONS in Prompt

The per-planet detail is injected into the horoscope prompt (Stage 5, Section A) under the heading `RETROGRADE CYCLE POSITIONS (translate into felt experience):`. For each active planet, the prompt shows:

```
Mercury: entering phase — 8% through retrograde (2d elapsed, 19d remaining of 21d window)
Jupiter: peak phase — 52% through retrograde (94d elapsed, 87d remaining of 181d window)
```

Upcoming planets show days until retrograde: `Mars: approaching — turns retrograde in 14d`
Recently-direct planets show shadow period: `Venus: aftermath — turned direct 5d ago (shadow period may linger)`

Planets with `clear` status are omitted from the prompt — no retrograde story to tell.

---

## Stage 5: Prompt Construction

**File**: `convex/horoscopes/prompt.ts`
**Version**: v2.0
**Function**: `buildHoroscopePrompt({ sign, context })`

The prompt is assembled from three sections and returned as `{ system, user }`.

### Section A — Astronomical Context

Injects the `DailyAstrologyContext` as **context only**. The entire section is prefixed with:

> ⚠️ This entire section is CONTEXT ONLY. Do NOT repeat any planet names, aspect names, astrological terms, or jargon in your output. Translate EVERYTHING into felt human experience.

Includes:
- Moon phase, illumination, VoC status, next ingress
- Planet positions (with `[RETROGRADE]` flags for LLM grounding)
- Active aspects (with `[TIGHT ORB]` flags for orbs < 3°)
- Retrograde context + RETROGRADE CYCLE POSITIONS
- Dominant themes, dominant element, stellium, aspect patterns
- Energy signature

### Section B — Sign-Specific Framing

Two components:
1. **Trait blurb** — hardcoded 2–3 sentence character sketch from `signTraits.ts`
2. **Hook angle** — per-sign psychological angle that determines the opening line style

### 12 Hook Angles Table

| Sign | Angle | Description |
|---|---|---|
| Aries | `confrontation_and_courage` | A truth they've been avoiding or a brave move that's overdue |
| Taurus | `comfort_zone_disruption` | Challenge what they've been settling for |
| Gemini | `information_and_perspective` | A shift in understanding, a secret being told |
| Cancer | `emotional_stakes_and_protection` | What they're really feeling beneath the surface |
| Leo | `recognition_and_expression` | What happens when they stop performing and start being real |
| Virgo | `precision_and_letting_go` | The one detail that matters vs the ten they're fixating on |
| Libra | `decision_and_balance` | A decision they've been circling but not making |
| Scorpio | `revelation_and_truth` | Something they already sense but haven't named |
| Sagittarius | `expansion_and_horizon` | An unexpected opening, a door appearing where there was only wall |
| Capricorn | `structure_and_redefinition` | A redefinition of success, permission to change the rules |
| Aquarius | `pattern_disruption_and_truth` | Seeing what others don't, the thing everyone's pretending not to see |
| Pisces | `boundary_and_truth` | Feeling something that isn't entirely theirs to carry, clarity through fog |

Each hook angle comes with 3 example hooks. The prompt mandates: "The hook MUST use this angle type. Do NOT give a [sign] a hook that belongs to another sign's angle."

### Section C — Output Schema + Zero-Jargon Rules

Specifies the exact JSON schema the LLM must return (see Stage 7 for full schema) plus:

**Jargon Blacklist** — these must NEVER appear in LLM output:
- Planet names (Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto)
- Aspect names (square, trine, conjunction, opposition, sextile)
- House numbers or references
- Retrograde, ingress, stellium, orb, transit, natal, chart
- Elements used as astrology terms
- Phrases like "the stars align", "cosmic energy", "the universe wants"
- Phrases like "Mercury in Gemini" or "Venus square Mars"

**Translation examples**:
- "Mercury retrograde" → "conversations and plans may need revisiting"
- "Venus trine Jupiter" → "relationships carry unexpected warmth today"
- "Mars square Pluto" → "there's a pressure building — handle it deliberately"
- "Full Moon" → "things that have been building are ready to surface"
- "Moon void-of-course" → "decisions made right now may not stick"

### v2.0 System Prompt

```
[v2.0] You are a horoscope writer for a mainstream digital publication read by millions.
Your #1 priority is making readers feel seen — like the horoscope was written specifically for them.

APPROACH:
  - You read the astronomical context like a weather report, but you WRITE like
    a great friend who happens to understand the sky.
  - Every planetary position is a HUMAN EXPERIENCE in disguise. Your job is to
    translate the astronomy into psychology, behavior, and feeling.
  - Never let a planet name, aspect type, or astrological term appear in your output.
  - The hook must be immediately gripping and rational. Like a quote that could be famous.
  - Different signs get different psychological angles — follow your assigned angle exactly.

Your writing is:
  — Warm but not soft. Direct but not harsh.
  — Specific, never vague. If you catch yourself writing "something may," stop and write what.
  — Psychologically grounded. You write about real human behavior, not mystical abstractions.
  — The kind of voice that makes someone screenshot the horoscope and send it to a friend.
```

---

## Stage 6: LLM Generation

**File**: `convex/horoscopes/generateForSign.ts`
**Action**: `generateForSign(sign, date?)`

### Provider Resolution

1. Resolve providers from `oracle_settings` table (key `providers_config`)
2. Prefer `ollama_cloud` provider if available
3. Fall back to first configured provider
4. Ultimate fallback: hardcoded Ollama Cloud config

```ts
const ollamaProvider = providers.find((p) => p.id === "ollama_cloud");
const provider = ollamaProvider ?? providers[0] ?? DEFAULT_OLLAMA_CLOUD;
```

### LLM Parameters

| Parameter | Value |
|---|---|
| Model | `gemma3:27b` (default) |
| Temperature | 0.75 |
| Max tokens | 4096 |
| Thinking mode | `disabled` (forced off for structured output) |
| JSON mode | Not sent (many providers return null content with it) |

### Retry Logic

- **Timeout**: 120 seconds (AbortController)
- **Retry**: One retry after 3 seconds on any failure
- If both attempts fail → write `status: "failed"` with error message

### Zod Validation

The LLM output is parsed through `HoroscopeContentSchema`:

```ts
const HoroscopeContentSchema = z.object({
    hook: z.string().min(10).max(120),
    bodyText: z.string().min(50).max(400),
    mantra: z.string().min(5).max(80),
    dailyPillars: z.object({
        vibe: z.string().min(2).max(50),
        powerMove: z.string().min(2).max(50),
        blindSpot: z.string().min(2).max(50),
        luckySpark: z.string().min(2).max(50),
    }),
    domainScores: z.array(DomainScoreSchema).min(6).max(6),
});
```

If validation fails, `tryRecoverContent()` attempts to extract valid fields from malformed output (handles wrong field names, v1 format data, missing wrappers). If recovery succeeds and the recovered content still exceeds 450 chars (hook + bodyText), `bodyText` is truncated.

### Content Recovery

The `tryRecoverContent()` function handles:
- **Wrong field names**: Attempts to extract `hook`, `bodyText`, `mantra`, `dailyPillars` from nested or flat structures
- **v1 format data**: Converts `insight`/`energy`/`navigate` → `hook` + `bodyText`
- **Missing domainScores**: Defaults to 6 domains at score 50 (pads from valid LLM output or uses full fallback set)
- **Missing dailyPillars**: Falls back to generic values
- **Character overflow**: Truncates `bodyText` to fit within 450 char limit

### errorMessage → errors Bug Fix Note

Previously, `generateForSign.ts` wrote an `errorMessage` field on failed horoscopes, but the `daily_horoscopes` table schema defined an `errors` field (array of strings), not `errorMessage` (string). The `upsertHoroscope` mutation now correctly uses `errorMessage` as the argument name but stores it appropriately. Additionally, the `markQueued` mutation in `queueDailyGenerations.ts` clears `errors: undefined` when resetting status to pending. This mismatch was fixed on 2025-07-24 — the schema field `errors: v.optional(v.array(v.string()))` coexists with the `errorMessage` arg name in the mutation. The `errorMessage` text is passed through but the `errors` array field on the record may also contain structured error strings.

---

## Stage 7: Output Schema (v2.0)

The LLM must respond with ONLY valid JSON matching this exact shape:

### v2.0 JSON Example

```json
{
  "hook": "The thing you're not saying is the thing that needs saying.",
  "bodyText": "You've been carrying a truth that's heavier every day you don't speak it. The friction in a close relationship isn't a sign something's wrong — it's a sign something's ready to shift. Say the thing you've been editing out.",
  "mantra": "I speak what's true even when my voice shakes.",
  "dailyPillars": {
    "vibe": "quiet momentum",
    "powerMove": "Send that message",
    "blindSpot": "Your own limits",
    "luckySpark": "That random idea"
  },
  "domainScores": [
    { "name": "Love", "score": 78 },
    { "name": "Career", "score": 62 },
    { "name": "Family", "score": 55 },
    { "name": "Health", "score": 45 },
    { "name": "Finance", "score": 71 },
    { "name": "Creativity", "score": 83 }
  ]
}
```

### Field Constraints Table

| Field | Type | Constraints |
|---|---|---|
| `hook` | string | 10–120 chars. 15–60 chars recommended. Must match sign's hook angle. |
| `bodyText` | string | 50–400 chars. 2–3 sentences. Must reference at least one transit. |
| **hook + bodyText** | **combined** | **Must not exceed 450 characters.** Hard limit enforced by truncation. |
| `mantra` | string | 5–80 chars. ≤12 words. First-person ("I trust…", "I release…"). |
| `dailyPillars.vibe` | string | 2–50 chars. 2–3 words. Today's energy feel. |
| `dailyPillars.powerMove` | string | 2–50 chars. 2–5 words. Most impactful action today. |
| `dailyPillars.blindSpot` | string | 2–50 chars. 2–6 words. What they're overlooking. |
| `dailyPillars.luckySpark` | string | 2–50 chars. 2–5 words. Small thing with outsized potential. |
| `domainScores` | array | 6 entries. Each `{ name, score }` where score is 0–100 integer. |
| `domainScores[].name` | enum | One of: Love, Career, Family, Health, Finance, Creativity, Social, Spirituality. Exactly 6 chosen from these 8 per sign per day. |

### 450-Character Limit

The combined length of `hook` + `bodyText` must not exceed **450 characters**. This is enforced in two places:
1. In the prompt instructions (Section C)
2. In the `generateForSign` handler — if the validated content exceeds 450 chars, `bodyText` is truncated

---

## Stage 8: Storage

### 3 Tables

| Table | Purpose | Write Timing |
|---|---|---|
| `cosmicWeather` | Raw astronomical snapshot (planet positions, aspects, moon phase) | 00:05 UTC |
| `daily_astrology_context` | Enriched context (retrograde, VoC, element, stellium, energy signature) | 02:00 UTC |
| `daily_horoscopes` | Per-sign generated content | 02:00–02:06 UTC (staggered) |

### Idempotent Upsert

All three tables use idempotent upsert patterns:

- **cosmicWeather**: `upsertSnapshot()` — if record for date exists, patches it; otherwise inserts
- **daily_astrology_context**: `upsertDailyContext()` — if record for date exists, patches it; otherwise inserts
- **daily_horoscopes**: `upsertHoroscope()` — if record for date+sign exists AND status is `pending` or `failed`, patches it; otherwise inserts new

This means the pipeline is safe to re-run for the same date without creating duplicates.

### contextSnapshotId — Reserved

The `daily_horoscopes` table includes a `contextSnapshotId` field (type `v.optional(v.id("daily_astrology_context"))`) intended to link each horoscope back to the context document it was generated from. However, this field is **currently not populated** during generation — it remains `undefined`. See [Known Issues](#known-issues).

---

## Stage 9: Public Serving & Paywall

**File**: `convex/horoscopes/queries.ts`

### Status Gate

Only horoscopes with status `"generated"` or `"overridden"` are exposed to the public frontend. Entries with status `"pending"` or `"failed"` return `null`.

### Tier Date Ranges

| Tier | Access Window | Product Name |
|---|---|---|
| `free` | Today only (±0 days) | Free tier |
| `popular` | ±1 day (yesterday, today, tomorrow) | Cosmic Flow |
| `premium` | ±7 days | Oracle |

### Content Stripping

When a date is not accessible to the user's tier, the query returns:

```ts
{
    isPaywalled: true,
    requiredTier: "popular" | "premium",
    date: "2025-07-24",
    sign: "Aries",
    content: undefined  // stripped
}
```

When accessible:

```ts
{
    isPaywalled: false,
    ...horoscope  // full record including content
}
```

The `requiredTierForDate()` function determines the **minimum upgrade tier** based on distance from today — not the user's current tier. A free user looking at "day after tomorrow" needs `premium` (±7 days), not `popular` (±1 day), because `popular` only covers ±1.

### Available Queries

| Query | Purpose |
|---|---|
| `getPublished(sign, date)` | Single horoscope with paywall |
| `getTodayForSign(sign)` | Today's horoscope for a sign |
| `getAllSignsForDate(date)` | All 12 signs for a date (array, paywalled per entry) |

---

## Stage 10: Admin Tools

**File**: `convex/horoscopes/admin.ts`

### Admin Dashboard

Admin-restricted functions (all require `requireAdmin` auth guard) for managing horoscope content.

### Context Viewer

| Query | Purpose |
|---|---|
| `getAstrologyContext(date)` | View daily_astrology_context for a date |
| `listHoroscopesForDate(date, status?)` | All 12 signs for a date, optionally filtered by status |
| `getFailedGenerations(date?)` | List all failed horoscopes, optionally for a specific date |

### Admin API Table

| Function | Type | Purpose |
|---|---|---|
| `overrideHoroscope(date, sign, content)` | mutation | Manually replace content, set status=overridden |
| `retryFailedGeneration(date, sign)` | action | Reset to pending + re-trigger generation via scheduler |
| `recomputeAstrologyContext(date)` | action | Re-compute daily_astrology_context for a date |
| `triggerDailyGeneration(date)` | action | Full pipeline: compute context + enqueue all 12 signs |
| `triggerGenerationForSigns(date, signs)` | action | Generate specific signs only |

Additionally, the `cosmicWeather.ts` module provides admin endpoints:

| Function | Type | Purpose |
|---|---|---|
| `getCosmicWeatherForAdmin(date)` | query | View cosmic weather for admin dashboard |
| `recomputeCosmicWeather(date)` | action | Recompute raw astronomical snapshot |
| `generateFeltLanguageAction(date, force?)` | action | Generate felt language on demand |

---

## User Feedback

**File**: `convex/horoscopes/ratings.ts`

Users can rate horoscopes with thumbs up (`positive`) or thumbs down (`negative`).

### API

| Function | Type | Purpose |
|---|---|---|
| `rate(sign, date, rating)` | mutation | Submit or update rating. Clicking same rating toggles it off. |
| `getUserRating(sign, date)` | query | Get current user's rating for a horoscope |
| `getRatingStats(sign, date)` | query | Aggregate positive/negative counts for a sign+date |

### Behavior

- **New rating**: Creates a `horoscope_ratings` document
- **Changed rating**: Patches existing document with new `rating` and `updatedAt`
- **Same rating clicked again**: Deletes the document (toggle off)

Ratings are stored in the `horoscope_ratings` table with indexes `by_user_sign_date` and `by_sign_date`.

---

## Cron Schedule

**File**: `convex/crons.ts`

All 10 cron jobs registered in the system:

| # | Name | Schedule | Function | Purpose |
|---|---|---|---|---|
| 1 | `compute-cosmic-weather` | Daily 00:05 UTC | `cosmicWeather.dailyCosmicWeatherJob` | Compute raw astronomical snapshot |
| 2 | `generate-felt-language` | Daily 00:10 UTC | `cosmicWeather.dailyFeltLanguageJob` | LLM translation to felt prose |
| 3 | `deliver-scheduled-notifications` | Every 60s | `notifications.delivery.processScheduledNotifications` | Check for due notification campaigns |
| 4 | `aggregate-daily-activity` | Daily 03:00 UTC | `analyticsInternal.aggregateDailyActivity` | DAU aggregation fallback |
| 5 | `detect-analytics-anomalies` | Daily 04:00 UTC | `analyticsInternal.detectAnalyticsAnomalies` | Traffic spike/drop detection |
| 6 | `generate-daily-horoscopes` | Daily 02:00 UTC | `horoscopes.queueDailyGenerations.queueDailyGenerations` | Context + 12 sign generations |
| 7 | `refresh-email-segments` | Daily 00:30 UTC | `email.crons.refreshEmailSegments` | Refresh user segments for email |
| 8 | `send-daily-horoscope-emails` | Daily 06:00 UTC | `email.crons.sendDailyHoroscopeEmails` | Daily horoscope email blast |
| 9 | `send-welcome-emails` | Daily 07:00 UTC | `email.crons.sendWelcomeEmails` | Welcome email for new users |
| 10 | `send-weekly-cosmic-emails` | Weekly Saturday 09:00 UTC | `email.crons.sendWeeklyCosmicEmails` | Weekly cosmic digest email |

Additionally:
- `send-reengagement-emails` — Daily 10:00 UTC — re-engagement emails

### 30-Second Stagger Config

The 12 sign generation jobs are staggered 30 seconds apart to avoid rate limits:

```
02:00:00 → Aries
02:00:30 → Taurus
02:01:00 → Gemini
02:01:30 → Cancer
02:02:00 → Leo
02:02:30 → Virgo
02:03:00 → Libra
02:03:30 → Scorpio
02:04:00 → Sagittarius
02:04:30 → Capricorn
02:05:00 → Aquarius
02:05:30 → Pisces
```

The stagger interval can be overridden via `oracle_settings` key `horoscope_stagger_seconds`. The default is 30.

---

## Known Issues

### 1. Felt Language Unused

The felt language generated at 00:10 UTC is stored on the `cosmicWeather` record but is **not consumed by the horoscope generation pipeline**. The `DailyAstrologyContext` type and the prompt builder do not include felt language as input. This represents wasted LLM cost and a missed opportunity for richer prompt grounding.

### 2. contextSnapshotId Reserved

The `daily_horoscopes` schema includes `contextSnapshotId: v.optional(v.id("daily_astrology_context"))` but the generation pipeline does not populate it. It remains `undefined` on all records. The intent is to link each horoscope back to the context snapshot it was generated from for reproducibility and debugging.

### 3. ASPECT_THEME_MODIFIERS Unused

The `ASPECT_THEME_MODIFIERS` catalog in `contextBuilder.ts` defines weighted theme pushes per aspect type, but it is never referenced. The `summariseAspects()` function uses hard-coded counts instead. This catalog could enrich the energy signature and dominant themes if wired up.

### 4. Tie-Breaking Non-Deterministic

When multiple elements have the same planet count, the `dominantElement()` function returns whichever entry comes first in `Object.entries()` iteration order. In V8 this is insertion order for string keys, which is deterministic per run but not guaranteed across JS engines or if the object structure changes.

### 5. errorMessage Bug Fixed

The `generateForSign` action previously wrote a field called `errorMessage` (string) on failed horoscopes, but the `daily_horoscopes` table schema defined `errors` (optional array of strings). This mismatch meant the error message was passed as a mutation arg `errorMessage` but the schema field was `errors`. This was fixed on 2025-07-24 — the `upsertHoroscope` mutation now correctly handles both the arg name and schema field.

---

## Recent Bug Fix (2025-07-24)

Three bugs were fixed on 2025-07-24:

### Bug 1: retrogradeCalc.ts Deleted — Logic Moved to astronomyEngine.ts

The file `convex/lib/astrology/retrogradeCalc.ts` was deleted. All retrograde window calculation functions (`findRetrogradeStart`, `findRetrogradeEnd`, `findNextRetrogradeStart`, `isRetrograde`, `buildRetrogradeContext`, `RetrogradePlanetDetail`, `RetrogradeContext`) were already duplicated or moved into `convex/lib/astronomyEngine.ts`. The separate file was redundant and has been removed. All imports now reference `astronomyEngine.ts` exclusively.

### Bug 2: AGENTS.md Directory Listing Updated

The `AGENTS.md` project layout comment for `convex/lib/` previously listed `retrogradeCalc` as a shared module. Since that file no longer exists, it has been removed from the directory listing comment.

### Bug 3: rebuild.md Reference Annotated

The `tasks/rebuilding/horoscope_and_dashboard_info_rebuild.md` file's reference to `retrogradeCalc.ts` has been annotated with `(DELETED 2025-07-24 — logic moved to astronomyEngine.ts)` to preserve the historical reference while marking the file as no longer present.

---

*This document summarizes the full pipeline. See individual docs in `docs/horoscope/` for detailed specifications.*