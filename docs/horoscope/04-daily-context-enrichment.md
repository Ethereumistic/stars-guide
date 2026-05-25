# Daily Context Enrichment

Source: `convex/horoscopes/computeDailyContext.ts`

This action enriches the raw astronomical snapshot with astrological
interpretation layers — retrograde context, void-of-course moon, sign
ingress, dominant element, stellium detection, and the energy signature.
It is called **before** any horoscope generation.

## When It Runs

1. Automatically at 02:00 UTC as step 1 of `queueDailyGenerations`
2. On-demand via admin panel "Recompute Context" button
3. Fallback: `generateForSign` computes it if no context exists yet

## Flow

```
1. Read cosmicWeather for date (via internal query)
2. Compute raw snapshot via computeSnapshot(date)
3. Build retrograde context via buildRetrogradeContext(today)
4. Detect void-of-course moon window via isVoidOfCourse(today)
5. Find next moon sign ingress via nextMoonIngress(today)
6. Build context enrichment via buildContext(snapshot, moonPhaseName)
7. Map snapshot to daily_astrology_context schema
8. Upsert to daily_astrology_context table
```

## Step Details

### Step 1 — Read Cosmic Weather

Fetches the existing `cosmicWeather` record for the date. If missing, logs a
warning and returns early (no context can be built without raw astronomy data).

### Step 2 — Compute Snapshot

Calls `computeSnapshot(date)` from `astronomyEngine.ts`. This returns planet
positions, moon phase, and active aspects. Even though the cosmicWeather
record already has this data, the snapshot is recomputed to ensure the
enrichment layer always works from fresh, identical data.

### Step 3 — Retrograde Context

`buildRetrogradeContext(today)` returns:
- `current`: planets retrograde right now
- `upcoming`: planets turning retrograde within 30 days
- `recentDirect`: planets that turned direct within 14 days

See [06-retrograde-context.md](./06-retrograde-context.md) for full details.

### Step 4 — Void-of-Course Moon

`isVoidOfCourse(after)` determines if the Moon is currently void-of-course.

**Algorithm:**
1. Start from today at noon UTC
2. Step forward in 6-hour increments
3. At each step, check if Moon makes a major aspect (60°/90°/120°/180°) with
   any tracked planet (Mercury–Neptune, excluding Sun)
4. Orb threshold: 3°
5. If the Moon changes signs **before** making any aspect → void-of-course
6. Returns `{ start, end, inSign, untilSign }` or null

Note: The Sun is excluded because `EclipticLongitude()` throws for it, and
Sun-Moon aspects (New Moon/Full Moon) are not considered for VoC detection.

### Step 5 — Moon Next Ingress

`nextMoonIngress(after)` finds when the Moon will next change signs.

**Algorithm:**
1. Start from today at noon UTC
2. Step forward in 6-hour increments (max 240 steps = 60 days)
3. At each step, compute Moon's ecliptic longitude
4. When the sign index changes, return `{ date, fromSign, toSign }`

### Step 6 — Context Enrichment via buildContext()

`buildContext(snapshot, moonPhaseName)` from `contextBuilder.ts` computes:
- `dominantElement` — element with most planets
- `dominantThemes` — union of all planet theme keywords
- `energySignature` — composite token string (see [05-energy-signature.md])
- `stelliumSign` — sign with 3+ planets, or null
- `aspectSummary` — pattern descriptors (e.g. "dynamic_tension")

See [05-energy-signature.md](./05-energy-signature.md) for full details.

### Step 7 — Schema Mapping

The raw snapshot shape differs from the `daily_astrology_context` table schema.
Key mapping transformations:

| Snapshot Field | Context Field | Transformation |
|----------------|---------------|----------------|
| `a.planet1/planet2/aspect/orbDegrees` | `planetA/planetB/aspectType/orb` | Renamed |
| (none) | `influence` | Derived: square/opposition→"challenging", trine/sextile→"harmonious", conjunction→"dynamic" |
| `p.degreeInSign` | `p.degree` | Renamed |
| `p.isRetrograde` | `p.retrograde` | Renamed |
| (computed) | `moonPhase.emoji` | Lookup from `MOON_EMOJI` map |
| (optional) | `voidOfCourseMoon` | Structured object |
| (optional) | `moonNextIngress` | Structured object |

### Step 8 — Upsert

Writes to `daily_astrology_context` table. If a record for the date already
exists, it is **patched** (idempotent). This means re-running the computation
updates the record without duplicating.

## Moon Phase Emoji Map

```typescript
const MOON_EMOJI: Record<string, string> = {
    "New Moon": "🌑",
    "Waxing Crescent": "🌒",
    "First Quarter": "🌓",
    "Waxing Gibbous": "🌔",
    "Full Moon": "🌕",
    "Waning Gibbous": "🌖",
    "Last Quarter": "🌗",
    "Waning Crescent": "🌘",
};
```

Fallback: `"🌙"` if phase name not found in the map.