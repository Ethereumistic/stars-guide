# Database Storage — Convex Tables and Indexes

## Table: `cosmicWeather`

The raw astronomical snapshot. Computed once daily at 00:05 UTC.

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | "YYYY-MM-DD" UTC — primary lookup key |
| `planetPositions` | array | `{ planet, sign, degreeInSign, isRetrograde }[]` |
| `moonPhase` | object | `{ name, illuminationPercent }` |
| `activeAspects` | array | `{ planet1, planet2, aspect, orbDegrees }[]` |
| `generatedAt` | number | `Date.now()` audit timestamp |
| `feltLanguage` | optional string | LLM-translated emotional prose |
| `feltLanguageGeneratedAt` | optional number | Timestamp of felt language generation |

**Index:** `by_date` on `["date"]` (unique)

**Written by:** `cosmicWeather.upsertSnapshot` (internal mutation)
**Read by:** `cosmicWeather.getForDate`, `cosmicWeather.getForPublicDate`,
admin queries, journal astro context builder

---

## Table: `daily_astrology_context`

Enriched context derived from cosmic weather. Computed before horoscope
generation (at 02:00 UTC or on-demand).

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | "YYYY-MM-DD" UTC |
| `moonPhase` | object | `{ name, illumination, emoji }` |
| `planetPositions` | array | `{ planet, sign, degree, retrograde }[]` |
| `activeAspects` | array | `{ planetA, planetB, aspectType, orb, influence }[]` |
| `retrogradeContext` | object | `{ current[], upcoming[], recentDirect[] }` |
| `dominantThemes` | string[] | e.g. `["identity", "communication", "action"]` |
| `energySignature` | string | e.g. `"fire, outward, intense, concentrated"` |
| `voidOfCourseMoon` | optional object | `{ isVoid, windowStart?, windowEnd?, inSign?, untilSign? }` |
| `moonNextIngress` | optional object | `{ timestamp, fromSign, toSign }` |
| `dominantElement` | optional string | "fire" \| "earth" \| "air" \| "water" |
| `stelliumSign` | optional string | Sign with 3+ planets |
| `aspectSummary` | optional string[] | e.g. `["focal_point", "dynamic_tension"]` |
| `generatedAt` | number | `Date.now()` audit timestamp |

**Index:** `by_date` on `["date"]` (unique)

**Written by:** `computeDailyContext.upsertDailyContext` (internal mutation)
**Read by:** `generateForSign` (loads context for prompt), admin context viewer

---

## Table: `daily_horoscopes`

Final AI-generated horoscope content per sign per date.

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | "YYYY-MM-DD" UTC |
| `sign` | string | One of 12 canonical sign names |
| `status` | union | "pending" \| "generated" \| "failed" \| "overridden" |
| `generatedAt` | optional number | `Date.now()` when content was successfully generated |
| `generationDurationMs` | optional number | LLM call duration in milliseconds |
| `content` | any | v2.0 JSON: `{ hook, bodyText, mantra, dailyPillars, domainScores }` |
| `contextSnapshotId` | optional id | Reference to `daily_astrology_context` (optional link) |
| `modelUsed` | optional string | e.g. "gemma3:27b" |
| `promptVersion` | optional string | e.g. "v2.0" |
| `errors` | optional string[] | Error messages if generation failed |

**Indexes:**
- `by_date_sign` on `["date", "sign"]` — unique compound index for sign+date lookup
- `by_date` on `["date"]` — for fetching all signs for a date

**Written by:** `generateForSign.upsertHoroscope`, `queueDailyGenerations.markQueued`,
admin `overrideHoroscope`

**Read by:** Public queries (`getPublished`, `getTodayForSign`, `getAllSignsForDate`),
admin queries (`listHoroscopesForDate`, `getFailedGenerations`)

---

## Upsert Pattern

All three tables use an **idempotent upsert pattern**:

```typescript
const existing = await ctx.db
    .query("tableName")
    .withIndex("by_date", (q) => q.eq("date", args.date))
    .unique();

if (existing) {
    await ctx.db.patch(existing._id, args);
} else {
    await ctx.db.insert("tableName", args);
}
```

For `daily_horoscopes`, the upsert uses `by_date_sign` index and only patches
if the existing status is `"pending"` or `"failed"` (won't overwrite a
`"generated"` record with stale data from a retry).

## Admin Override

The `overrideHoroscope` mutation patches an existing record with:
- `status: "overridden"` — permanently marks it as admin-edited
- `content: args.content` — the manually provided content

If no record exists for that date+sign, a new record is inserted. Overridden
records are treated the same as "generated" by public queries.