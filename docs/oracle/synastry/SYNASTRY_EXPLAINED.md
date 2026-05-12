# Synastry — How It Works

> Last updated: 2026-05-08  
> Feature key: `synastry` · Pipeline key: `synastry` · Status: **Fully implemented**

---

## Overview

Synastry is Oracle's chart-overlay feature. It overlays **two birth charts** and produces an AI reading of their **alignment, balance, and clashing**. Chart A is always the user's own chart; Chart B is supplied either manually (date/time/location) or imported from a friend.

---

## Data Flow

```
User selects "Synastry" feature
        │
        ▼
SynastryCard renders (replaces OracleChartPreview)
   ┌────┴────┐
   │ Chart A  │    ← user's own birthData (always present)
   │ Chart B  │    ← added via Manual Input or Friend Import
   └────┬────┘
        │
        ▼ Relationship Selector
   "Romantic Partner", "Friend", "Parent", etc.
        │
        ▼ User submits question (or uses default prompt)
        │
   createSession({
     featureKey: "synastry",
     questionText,
     synastryPayload: { chartB, source, relationship, chartBName }
   })
        │
        ▼ invokeOracle detects synastry pipeline
        │
   ┌─ Backend Pipeline ─────────────────────────┐
   │  1. Intent router → "synastry" (confidence) │
   │  2. Gather: birthData (Chart A)             │
   │  3. Gather: synastryPayload (Chart B)        │
   │  4. Gather: timespace                        │
   │  5. Build prompt:                           │
   │     - System: soul doc + synastry instruct.  │
   │     - User: Chart A data + Chart B data      │
   │     - User: relationship type + question     │
   │  6. LLM call → streaming response            │
   └──────────────────────────────────────────────┘
```

---

## File Map

### New Files

| File | Purpose |
|------|---------|
| `src/lib/oracle/pipelines/synastry.ts` | Pipeline definition: `dataRequirements`, `buildPromptBlocks()`, Chart A/B context assembly |
| `src/lib/oracle/synastryContext.ts` | `getSynastryInstructions()` system prompt block, `buildSynastryChartBContext()` user message formatter |
| `convex/oracle/synastry.ts` | `getFriendBirthData` query — single friend privacy-gated access; `getFriendsBirthDataBatch` query — batch access for all friends |
| `src/components/oracle/input/synastry-card.tsx` | Main SynastryCard component — Chart A/B pair, manual input with chart calculation, friend import, relationship selector, animations |
| `src/components/oracle/input/friend-chart-import.tsx` | Friend import component — batch query for all friends' chart access status, displays availablity badges |

### Modified Files

| File | What Changed |
|------|-------------|
| `src/lib/oracle/features.ts` | Replaced `synastry_core`/`synastry_full` with unified `synastry` feature. Added `SYNASTRY_INTENT_PATTERNS`, `isSynastryFeature()`. Updated `classifyOracleToolIntent()`. |
| `src/lib/oracle/pipelineTypes.ts` | Added `needsSynastryData: boolean` to `PipelineDataRequirements`. Added `SynastryPayload` interface. Added `synastryData: SynastryPayload \| null` to `PipelineContext`. |
| `src/lib/oracle/pipelines/birthChart.ts` | Added `needsSynastryData: false`. |
| `src/lib/oracle/pipelines/genericChat.ts` | Added `needsSynastryData: false`. |
| `src/lib/oracle/pipelines/journalRecall.ts` | Added `needsSynastryData: false`. |
| `src/lib/oracle/pipelines/binauralBeats.ts` | Added `needsSynastryData: false`. |
| `src/lib/oracle/pipelines/index.ts` | Imported and registered `synastryPipeline`. |
| `src/lib/oracle/intentRouter.ts` | Added `synastry` case to `featureKeyToPipelineKey()`. Added `SYNASTRY_INTENT_PATTERNS` regex scoring. |
| `src/lib/oracle/intentRouterPrompt.ts` | Added `synastry` to available features, `VALID_PIPELINES`, LLM system prompt, and `FeatureAvailability`. |
| `convex/oracle/llm.ts` | Added `needsSynastryData` check. Gathers `synastryPayload` from session. Passes `synastryData` to `PipelineContext`. Imported `SynastryPayload`. |
| `convex/oracle/sessions.ts` | `createSession` now accepts `synastryPayload` and stores it on the session document. |
| `convex/schema.ts` | Added `synastryPayload` optional field to `oracle_sessions` table. |
| `src/store/use-oracle-store.ts` | Added `SynastryState` interface (typed `chartB` as `StoredBirthData \| null`), `synastryData` state, `setSynastryChartB`, `setSynastryRelationship`, `clearSynastry`, `clearSynastryChartB`. Resets on `clearSelectedFeature` and `resetToIdle`. |
| `src/components/oracle/input/oracle-input.tsx` | Conditional render of `SynastryCard` for `synastry` feature. Added `onClearSynastryChartB` prop. Typed `onSetSynastryChartB` with `StoredBirthData`. |
| `src/app/oracle/new/page.tsx` | Wired synastry state from store → OracleInput. Creates `synastryPayload` on session creation. Validates chart B + relationship before submit. Wired `clearSynastryChartB`. |
| `src/lib/oracle/synastryContext.ts` | Improved `buildSynastryChartBContext()` — added graceful degradation: parses `placements` array if `buildUniversalBirthContext` throws, falls back to raw date/time/location if both fail. |

---

## Key Types

### `SynastryPayload` (pipelineTypes.ts)

```typescript
export interface SynastryPayload {
  chartB: unknown;            // StoredBirthData — same shape as user.birthData
  source: "friend" | "custom";
  friendUserId?: string;      // Convex Id<"users"> — only if source === "friend"
  relationship: string;       // e.g., "romantic_partner", "friend", "parent"
  chartBName: string;         // Display name for Chart B person
}
```

### `SynastryState` (use-oracle-store.ts)

```typescript
export interface SynastryState {
  chartB: StoredBirthData | null;  // Fully calculated chart data (was `any`)
  chartBName: string;
  source: "friend" | "custom" | null;
  friendUserId?: string;
  relationship: string | null;
}
```

### `SynastryPayload` on session (schema.ts)

```typescript
synastryPayload: v.optional(v.object({
  chartB: v.any(),
  source: v.union(v.literal("friend"), v.literal("custom")),
  friendUserId: v.optional(v.id("users")),
  relationship: v.string(),
  chartBName: v.string(),
}))
```

---

## Pipeline Behavior

### Data Requirements

```typescript
dataRequirements: {
  needsBirthData: true,        // Chart A (the user's chart)
  needsJournalContext: false,
  expandedJournalBudget: false,
  needsTimespace: true,
  needsSynastryData: true,     // Chart B + relationship type
}
```

### System Prompt Blocks (priority order)

| Priority | Label | Content |
|----------|-------|---------|
| 90 | `soul_document` | Oracle persona |
| 80 | `synastry_instructions` | How to perform a synastry reading |
| 50 | `timespace` | Timezone + cosmic weather |

### User Message Blocks

| Label | Content |
|-------|---------|
| `chart_a_data` | User's birth chart data (via `buildUniversalBirthContext`) |
| `chart_b_data` | Partner's chart data + relationship context (via `buildSynastryChartBContext`) |
| _(implicit)_ | Sanitized question text |

### Synastry Instructions Structure

The LLM is instructed to produce:

1. **Cosmic Connection Report** — 2-3 sentence overview
2. **The Magnetic Core** — Strongest inter-chart aspect
3. **Harmony & Flow** — 2-3 areas of natural compatibility
4. **Growth Edges & Friction** — 1-2 areas of tension framed as growth
5. **The Relationship Dynamic** — How relationship type colors placements
6. **Connection at a Glance** — Table of key planetary pairs
7. **Closing thought** — Empowering summary

---

## Intent Detection

### Regex Fallback

Synastry intent is detected by `SYNASTRY_INTENT_PATTERNS` in `features.ts`, checked **before** birth chart patterns (so "my chart with my partner" routes to synastry, not birth_chart).

Key patterns:
- `\bsynastry\b`, `\bcomposite\s+chart\b`
- `\bcompatible\s+(are|is)\b`, `\bchart\s+(overlay|comparison|match|reading)\b`
- `\b(my\s+)?chart\s+(with|and|vs)\b`

### LLM Intent Router

The LLM prompt includes `synastry` as an available feature with description:
> "Comparing two charts, relationship compatibility, chart overlay, synastry, how two people's charts interact, synastry reading, couple's chart"

---

## Privacy Model

| `publicChart` value | Meaning | Who can import |
|---------------------|---------|---------------|
| 0 | Private | Nobody |
| 1 | Friends only | Accepted friends only |
| 2 | Public (default) | Any authenticated user |

Custom input data is **never** stored in the `users` table — it's only on `oracle_sessions.synastryPayload` for the session lifetime.

---

## Frontend Components

### SynastryCard (`synastry-card.tsx`)

The `SynastryCard` component renders conditionally inside `OracleInput` when `featureKey === "synastry"`. It has these visual states:

1. **No birth data** — Message telling user to add their own birth data first
2. **Add Chart B** — Source mode tabs: "Manual Input" or "From Friends"
   - **Manual Input**: Name, date, time (optional), location (with autocomplete), "Add Chart" button
   - **From Friends**: Friend import list with access status badges
3. **Chart B Imported** — Both charts shown side-by-side with Big Three signs
   - Removing Chart B: Hover-reveal "×" button on Chart B circle
4. **Select Relationship** — Grid of preset relationships + custom input
5. **Complete** — Both charts + relationship selected. Pulsing connection symbol (⟷). Submit button enabled.

### Manual Input Chart Calculation

When the user provides birth data via manual input, `SynastryCard` calls `buildStoredBirthData()` (from `src/lib/birth-chart/storage.ts`) to calculate a complete `EnrichedBirthData` object including:

- Full planetary positions (sign, house, longitude, retrograde status, dignities)
- Ascendant calculation
- Whole Sign house system
- Aspects between planets

This ensures the LLM receives complete chart data for the synastry reading, and the Chart B circle view renders actual planetary positions.

**Time handling**: If birth time is not provided, defaults to 12:00 PM noon. A warning note appears: "No time set — using 12:00 PM. House placements may be less precise."

**Location handling**: Uses the Nominatim-based `searchLocations()` function for search-as-you-type city autocomplete. Selected cities provide latitude/longitude coordinates for accurate house calculation. If no location is selected, coordinates default to (0, 0) with a warning about reduced house accuracy.

### Friend Import (`friend-chart-import.tsx`)

Uses `getFriendsBirthDataBatch` query for efficient single-query friend data retrieval. Each friend row shows:

- 🟢 **Available** — Friend has a public/friends-only chart with birth data
- 🔴 **Private** — Friend's chart setting is `publicChart: 0`
- 🟡 **No Data** — Friend hasn't added their birth data yet

Available friends show their Sun sign for quick reference. Clicking an available friend sets Chart B directly (no calculation needed — the data comes from their stored `birthData`).

### Chart B Removal

Hovering over Chart B's circle reveals a "×" button. Clicking it calls `clearSynastryChartB()` from the store, which preserves the relationship selection but clears the Chart B data, returning to the "add_chart" step.

---

## Chart Calculation Flow (Custom Input)

```
User enters: Name, Date, [Time], [Location]
        │
        ▼ handleCustomInput()
        │
   Time missing? Default to "12:00"
        │
        ▼ buildStoredBirthData({
   │     date: "1990-04-14",
   │     time: "15:30",
   │     location: { lat, long, city, country }
   │   })
        │
        ▼ resolveBirthDateTime()
   │   → computes timezone via lat/long
   │   → converts local time → UTC
        │
        ▼ calculateFullChartFromUtcDate()
   │   → ascendant, planets, houses, aspects
        │
        ▼ buildLegacyPlacements()
   │   → creates { body, sign, house } array
        │
        ▼ Full EnrichedBirthData stored in synastryData.chartB
        │
        ▼ Chart B circle view renders with real data
   │   Big Three shows actual Sun/Moon/Rising signs
   │   LLM receives complete placement data
```

## Animations

- `motion/react` fade-in when feature is selected
- `AnimatePresence` transitions between steps (add_chart ↔ select_relationship)
- Smooth scale animation on Chart B circle when it appears
- Pulsing connection symbol (⟷) when both charts are present
- Hover-reveal Chart B removal button

## Error Handling

- **Calculation failure**: If `buildStoredBirthData()` throws (e.g., invalid date), an inline error message appears with retry guidance
- **Location without coordinates**: If user types a city name but doesn't select from autocomplete, a warning appears noting reduced house accuracy
- **Time unavailable**: If user doesn't provide birth time, a subtle note explains "using 12:00 PM" and house placement limitations
- **Friend import loading**: Skeleton rows shown while `getFriendsBirthDataBatch` resolves
- **Empty friends list**: "You don't have any friends yet" with guidance
- **Chart B Context fallback**: `buildSynastryChartBContext()` gracefully degrades if `buildUniversalBirthContext()` throws — tries legacy placements, then raw date/time/location