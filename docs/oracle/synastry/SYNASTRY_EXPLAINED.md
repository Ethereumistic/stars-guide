# Synastry — How It Works

> Last updated: 2026-05-08  
> Feature key: `synastry` · Pipeline key: `synastry` · Status: **Fully implemented**

---

## Overview

Synastry is Oracle's chart-overlay feature. It overlays **two birth charts** and produces an AI reading of their **alignment, balance, and clashing**. The user's chart is always present; the second person's chart is supplied either manually (date/time/location) or imported from a friend.

**Key design principle**: The Oracle addresses both people by their **relationship role and name** — never as "Chart A" or "Chart B". For example, it says "Your Sun conjuncts Alex's Moon" not "Chart A's Sun conjuncts Chart B's Moon".

---

## Data Flow

```
User selects "Synastry" feature
        │
        ▼
SynastryCard renders (replaces OracleChartPreview)
   ┌────┴────┐
   │  You    │    ← user's own birthData (always present)
   │ Import  │    ← Manual Input or Friend Import
   └────┬────┘
        │ Chart B imported → Charts collapse to mini indicators
        │
        ▼ Relationship Category Selection
   "Family", "Romantic", "Friend", "University", "Work", "Celebrity"
        │
        ▼ Specific Role Selection (within chosen category)
   e.g. "Boyfriend", "Mother", "Teacher", etc. + Custom input
        │
        ▼ User submits question (or uses default prompt)
        │
   createSession({
     featureKey: "synastry",
     questionText,
     synastryPayload: { chartB, source, relationship, relationshipCategory, chartBName }
   })
        │
        ▼ invokeOracle detects synastry pipeline
        │
   ┌─ Backend Pipeline ─────────────────────────────────┐
   │  1. Intent router → "synastry" (confidence)        │
   │  2. Gather: birthData (user's chart)               │
   │  3. Gather: synastryPayload (second person's chart) │
   │  4. Gather: timespace                               │
   │  5. Build prompt:                                   │
   │     - System: soul doc + synastry instructions      │
   │     - User: your chart data + their chart data      │
   │     - User: relationship type + category + question  │
   │  6. LLM call → streaming response                   │
   └──────────────────────────────────────────────────────┘
```

---

## Relationship Categories (Two-Layer System)

The relationship selector uses a **two-layer categorization** system. When the user imports a second chart, the chart cards collapse into compact indicators and the relationship flow takes center stage. The user first picks a **macro category**, then selects a **specific role** within it (or types a custom one).

### Layer 1 — Macro Categories

Displayed as a 3×2 grid of icon cards. Each card shows the category icon and label.

| Key | Label | Icon component | Description | Layout position |
|-----|-------|----------------|-------------|-----------------|
| `family` | Family | `MdFamilyRestroom` | Blood relatives & family | Row 1, Col 1 |
| `romantic` | Romantic | `IoHeart` | Love & partnership | Row 1, Col 2 |
| `friend` | Friend | `FaUserFriends` | Platonic bonds | Row 1, Col 3 |
| `university` | University | `FaGraduationCap` | Study & campus | Row 2, Col 1 |
| `work` | Work | `FaBriefcase` | Professional ties | Row 2, Col 2 |
| `celebrity` | Celebrity | `FaStar` | Public figures | Row 2, Col 3 |

### Layer 2 — Specific Roles

After selecting a category, a role grid appears with a **back button** (←) returning to categories. Each role shows an icon and label. A **custom input field** at the bottom lets the user type any role name, confirmed with Enter ↵.

#### Family (`key: "family"`)
| Value | Label | Icon |
|-------|-------|------|
| `mother` | Mother | `FaFemale` |
| `father` | Father | `FaMale` |
| `brother` | Brother | `FaMale` |
| `sister` | Sister | `FaFemale` |
| `grandmother` | Grandmother | `FaFemale` |
| `grandfather` | Grandfather | `FaMale` |
| `cousin` | Cousin | `FaUserFriends` |
| `uncle` | Uncle | `FaMale` |
| `aunt` | Aunt | `FaFemale` |

#### Romantic (`key: "romantic"`)
| Value | Label | Icon |
|-------|-------|------|
| `boyfriend` | Boyfriend | `FaMale` |
| `girlfriend` | Girlfriend | `FaFemale` |
| `husband` | Husband | `GiRing` |
| `wife` | Wife | `GiRing` |
| `fiance` | Fiancé(e) | `GiRing` |
| `ex_boyfriend` | Ex-Boyfriend | `GiShatteredHeart` |
| `ex_girlfriend` | Ex-Girlfriend | `GiShatteredHeart` |
| `crush` | Crush | `FaHeartPulse` |

#### Friend (`key: "friend"`)
| Value | Label | Icon |
|-------|-------|------|
| `best_friend` | Best Friend | `FaUserFriends` |
| `close_friend` | Close Friend | `FaUserFriends` |
| `friend` | Friend | `FaUserFriends` |

#### University (`key: "university"`)
| Value | Label | Icon |
|-------|-------|------|
| `teacher` | Teacher | `FaGraduationCap` |
| `professor` | Professor | `FaGraduationCap` |
| `classmate` | Classmate | `FaUserFriends` |
| `roommate` | Roommate | `FaUserFriends` |
| `study_partner` | Study Partner | `FaUserFriends` |

#### Work (`key: "work"`)
| Value | Label | Icon |
|-------|-------|------|
| `coworker` | Coworker | `FaBriefcase` |
| `boss` | Boss | `FaBriefcase` |
| `business_partner` | Business Partner | `FaHandshake` |
| `mentor` | Mentor | `FaGraduationCap` |
| `colleague` | Colleague | `FaBriefcase` |

#### Celebrity (`key: "celebrity"`)
| Value | Label | Icon |
|-------|-------|------|
| `celebrity` | Celebrity | `FaStar` |
| `public_figure` | Public Figure | `FaStar` |

### Data stored

When the user selects a role, both values are stored:

- **`relationship`**: The specific role value (e.g. `"boyfriend"`, `"teacher"`, or a custom string)
- **`relationshipCategory`**: The macro category key (e.g. `"romantic"`, `"university"`)

For **custom roles**, the user types a freeform string and it's stored as-is in `relationship`, while the `relationshipCategory` is set to whichever category they were browsing (e.g. the user types "situationship" inside the Romantic category → `relationship: "situationship"`, `relationshipCategory: "romantic"`).

When the user clicks "Change" in the ready state, `onSetRelationship("")` is called and `selectedCategory` is reset, returning them to category selection.

---

## File Map

### New Files

| File | Purpose |
|------|---------|
| `src/lib/oracle/pipelines/synastry.ts` | Pipeline definition: `dataRequirements`, `buildPromptBlocks()`, role-based context assembly |
| `src/lib/oracle/synastryContext.ts` | `getSynastryInstructions()` system prompt block (role-based labels), `buildSynastryChartBContext()` user message formatter, `getRelationshipLabel()` / `getRelationshipPhrase()` helpers |
| `convex/oracle/synastry.ts` | `getFriendBirthData` query — single friend privacy-gated access; `getFriendsBirthDataBatch` query — batch access for all friends |
| `src/components/oracle/input/synastry-card.tsx` | Main SynastryCard component — two-layer relationship categories, compact chart indicators, manual input, friend import, animations |
| `src/components/oracle/input/friend-chart-import.tsx` | Friend import component — batch query for all friends' chart access status, displays availability badges |

### Modified Files

| File | What Changed |
|------|-------------|
| `src/lib/oracle/features.ts` | Replaced `synastry_core`/`synastry_full` with unified `synastry` feature. Added `SYNASTRY_INTENT_PATTERNS`, `isSynastryFeature()`. Updated `classifyOracleToolIntent()`. |
| `src/lib/oracle/pipelineTypes.ts` | Added `needsSynastryData` to `PipelineDataRequirements`. Added `SynastryPayload` interface with `relationshipCategory` field (optional). Added `synastryData` to `PipelineContext`. |
| `src/lib/oracle/pipelines/birthChart.ts` | Added `needsSynastryData: false`. |
| `src/lib/oracle/pipelines/genericChat.ts` | Added `needsSynastryData: false`. |
| `src/lib/oracle/pipelines/journalRecall.ts` | Added `needsSynastryData: false`. |
| `src/lib/oracle/pipelines/binauralBeats.ts` | Added `needsSynastryData: false`. |
| `src/lib/oracle/pipelines/index.ts` | Imported and registered `synastryPipeline`. |
| `src/lib/oracle/intentRouter.ts` | Added `synastry` case to `featureKeyToPipelineKey()`. Added `SYNASTRY_INTENT_PATTERNS` regex scoring. |
| `src/lib/oracle/intentRouterPrompt.ts` | Added `synastry` to available features, `VALID_PIPELINES`, LLM system prompt, and `FeatureAvailability`. |
| `convex/oracle/llm.ts` | Added `needsSynastryData` check. Gathers `synastryPayload` from session. Passes `synastryData` to `PipelineContext`. Imported `SynastryPayload`. |
| `convex/oracle/sessions.ts` | `createSession` now accepts `synastryPayload` (including `relationshipCategory`) and stores it on the session document. |
| `convex/schema.ts` | Added `synastryPayload` optional field (including `relationshipCategory: v.optional(v.string())`) to `oracle_sessions` table. |
| `src/store/use-oracle-store.ts` | Added `SynastryState` interface with `relationshipCategory: string \| null`. `setSynastryRelationship` now accepts optional `category` parameter. Resets on `clearSelectedFeature` and `resetToIdle`. |
| `src/components/oracle/input/oracle-input.tsx` | Updated `onSetSynastryRelationship` prop signature to accept optional `category` parameter. |
| `src/app/oracle/new/page.tsx` | Passes `relationshipCategory` (with `"general"` fallback) in `synastryPayload` during session creation. |
| `src/lib/oracle/synastryContext.ts` | Rewritten to use **role-based labels** throughout. `getSynastryInstructions()` now receives `chartBName`, `relationship`, and `category` parameters. `buildSynastryChartBContext()` uses `getRelationshipLabel()` and `getRelationshipPhrase()` helpers. Added `RELATIONSHIP_LABELS` and `CATEGORY_LABELS` lookup maps. No more "Chart A"/"Chart B" language in prompts. |
| `src/lib/oracle/pipelines/synastry.ts` | Updated all prompt block labels and fallback messages to use role-based language. `getSynastryInstructions()` called with `synastryData` fields. User message label is `chart_a_data` → content `[YOUR CHART DATA]`. |

---

## Key Types

### `SynastryPayload` (pipelineTypes.ts)

```typescript
export interface SynastryPayload {
  chartB: unknown;            // StoredBirthData — same shape as user.birthData
  source: "friend" | "custom";
  friendUserId?: string;      // Convex Id<"users"> — only if source === "friend"
  relationship: string;       // e.g., "boyfriend", "teacher", "mother"
  relationshipCategory?: string; // e.g., "romantic", "family", "work" — optional for backward compat
  chartBName: string;         // Display name for the second person
}
```

### `SynastryState` (use-oracle-store.ts)

```typescript
export interface SynastryState {
  chartB: StoredBirthData | null;
  chartBName: string;
  source: "friend" | "custom" | null;
  friendUserId?: string;
  relationship: string | null;
  relationshipCategory: string | null;  // e.g., "romantic", "family"
}
```

### `SynastryPayload` on session (schema.ts)

```typescript
synastryPayload: v.optional(v.object({
  chartB: v.any(),
  source: v.union(v.literal("friend"), v.literal("custom")),
  friendUserId: v.optional(v.id("users")),
  relationship: v.string(),
  relationshipCategory: v.optional(v.string()),  // optional for backward compat
  chartBName: v.string(),
}))
```

> **Note**: `relationshipCategory` is `v.optional(v.string())` in the Convex schema so that sessions created before this field existed still validate. The frontend always provides it (defaulting to `"general"` if null) when creating new sessions.

---

## Pipeline Behavior

### Data Requirements

```typescript
dataRequirements: {
  needsBirthData: true,        // User's own chart
  needsJournalContext: false,
  expandedJournalBudget: false,
  needsTimespace: true,
  needsSynastryData: true,     // Second chart + relationship context
}
```

### System Prompt Blocks (priority order)

| Priority | Label | Content |
|----------|-------|---------|
| 90 | `soul_document` | Oracle persona |
| 80 | `synastry_instructions` | How to perform a synastry reading — uses role-based labels; receives `chartBName`, `relationship`, and `relationshipCategory` |
| 75 | `chart_a_unavailable` | (conditional) Fallback if user has no birth data |
| 75 | `chart_b_unavailable` | (conditional) Fallback if no second chart data |
| 50 | `timespace` | Timezone + cosmic weather |

### User Message Blocks

| Label | Content |
|-------|---------|
| `chart_a_data` | `[YOUR CHART DATA]` — user's birth chart (via `buildUniversalBirthContext`) |
| `chart_b_data` | `[THEIR {ROLE} — CHART DATA]` — second person's chart data + relationship context (via `buildSynastryChartBContext`). The header uses `getRelationshipPhrase()` to produce labels like `YOUR BOYFRIEND, ALEX — CHART DATA`. |
| _(implicit)_ | Sanitized question text |

### Role-Based Labeling

The Oracle prompt system uses role-based labels throughout. Two helper functions produce human-readable labels:

**`getRelationshipLabel(relationship, category?)`** — Maps relationship values to display text:
- Known values (`"boyfriend"` → `"boyfriend"`, `"mother"` → `"mother"`, `"best_friend"` → `"best friend"`, etc.) via the `RELATIONSHIP_LABELS` lookup map
- Custom values fall back to the string itself (capitalized)
- Total fallback: `"{category} connection"` if both are missing

**`getRelationshipPhrase(relationship, chartBName, category?)`** — Builds a possessive phrase:
- `"your boyfriend (Alex)"` for known relationships with a name
- `"your boyfriend"` for known relationships without a name
- Custom values: `"your situationship (Jordan)"`

**In the system instructions** (`getSynastryInstructions`):
- The LLM is explicitly told: `"Never use labels like 'Chart A' or 'Chart B' in your response. Use the person's name and relationship role."`
- Example: `"Your Sun conjuncts Alex's Moon"` NOT `"Chart A's Sun conjuncts Chart B's Moon"`
- The relationship type and category are both provided so the LLM can contextualize (e.g. a Sun-Moon conjunction means something different for siblings vs. lovers)

**In the user message blocks**:
- Chart A: `[YOUR CHART DATA]` (not `[CHART A DATA]`)
- Chart B: `[YOUR {RELATIONSHIP_LABEL}, {NAME} — CHART DATA]` (e.g. `[YOUR BOYFRIEND, ALEX — CHART DATA]`)
- The relationship context section includes both the specific relationship and its category

**In the relationship table**:
- Headers: `| Theme | You | {personRef} | Dynamic |` instead of `| Theme | Chart A | Chart B | Dynamic |`

### Synastry Instructions Structure

The LLM is instructed to produce:

1. **Cosmic Connection Report** — 2-3 sentence overview (using role-based names)
2. **The Magnetic Core** — Strongest inter-chart aspect
3. **Harmony & Flow** — 2-3 areas of natural compatibility
4. **Growth Edges & Friction** — 1-2 areas of tension framed as growth
5. **The Relationship Dynamic** — How the relationship type & category colors placements
6. **Connection at a Glance** — Table of key planetary pairs (role-labeled)
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

The `SynastryCard` component renders conditionally inside `OracleInput` when `featureKey === "synastry"`. It follows a **two-phase flow** controlled by the `step` state (`"add_chart"` | `"select_relationship"`):

#### Phase 1: Add Chart (`step = "add_chart"`)

- **No birth data** — Message telling user to add their own birth data first
- **Has birth data** — Two-column layout:
  - Left column: User's chart in a full `ChartPreviewCard` (with chart circle and Big Three)
  - Right column: Import panel with two tabs ("Custom" and "Friends")
    - **Custom tab**: Name, date picker, time (optional), location autocomplete, "Import" button
    - **Friends tab**: Friend list with availability badges (🟢 Available, 🔴 Private, 🟡 No Data)
- When a chart is imported via the "Friends" tab, `FriendChartImport` calls `onSetChartB(birthData, username, "friend", friendUserId)` and the step transitions to `"select_relationship"`

#### Phase 2: Select Relationship (`step = "select_relationship"`)

Charts collapse into **compact mini-indicators** and a `PanelCard` appears below for relationship selection. Three sub-states:

1. **Category selection** (`!hasRelationship && !selectedCategory`): 6 macro category cards in a 3×2 grid. Header text: "How are you connected?"

2. **Role selection** (`!hasRelationship && selectedCategory`): Grid of role icons/labels within the chosen category, plus a custom text input field at the bottom. Back button (ChevronLeft) returns to categories. Header shows the category label (e.g. "Romantic").

   - Clicking a role calls `onSetRelationship(roleValue, categoryKey)`
   - Typing a custom role and pressing Enter calls `onSetRelationship(customText, categoryKey)`

3. **Ready indicator** (`isReady && synastryData?.relationship`): Pulsing `⟷` symbol with the relationship label and icon. "Change" button resets the relationship (calls `onSetRelationship("")` and clears `selectedCategory`).

**Transitions**: The `step` state auto-transitions via a `useEffect`:
- If `chartB` appears and no `relationship` → set step to `"select_relationship"`
- If `chartB` is cleared → set step to `"add_chart"`

### Compact Chart Indicators

When in relationship selection phase, both charts render as `ChartPreviewCard` with `compact={true}`:

```
┌─────────────────────────┐  ┌─────────────────────────┐
│ You (username)           │  │ Alex                  ✕  │
│ ☉ Gemini · ☽ Cancer     │  │ ☉ Cancer · ☽ Leo        │
└─────────────────────────┘  └─────────────────────────┘
```

- Left indicator: Always shows `"You (username)"` or `"You"`
- Right indicator: Shows the imported person's display name
- Big Three shown compactly: `☉ SunSign · ☽ MoonSign · Asc Rising`
- The ✕ button on the right indicator calls `clearSynastryChartB()`, which preserves relationship selection but removes chart B data and returns to `"add_chart"` step

### ChartPreviewCard Component

Renders in two modes controlled by the `compact` boolean prop:

- **Full mode** (`compact={false}` or omitted): Header label + ChartCircleView + Big Three 3×2 grid. Used during the import phase.
- **Compact mode** (`compact={true}`): Single-line indicator with label, Big Three text, optional ✕ button. Used during relationship selection phase.

### Helper Functions

**`getSignForBody(birthData, body)`** — Resolves planet placements to zodiac sign names. Checks `placements` array first, then `chart.ascendant` for Ascendant, then `chart.planets`.

**`findCategoryForRelationship(value)`** — Scans `RELATIONSHIP_CATEGORIES` to find which category a relationship value belongs to. Returns `null` for custom values.

**`findRelationshipOption(value)`** — Finds the `RelationshipOption` object for a given value across all categories. Returns `null` for custom values.

### Manual Input Chart Calculation

When the user provides birth data via manual input, `SynastryCard` calls `buildStoredBirthData()` (from `src/lib/birth-chart/storage.ts`) to calculate a complete `EnrichedBirthData` object including:

- Full planetary positions (sign, house, longitude, retrograde status, dignities)
- Ascendant calculation
- Whole Sign house system
- Aspects between planets

**Time handling**: If birth time is not provided, defaults to 12:00 PM noon. A warning note appears: "Using 12:00 PM — house placements may be less precise."

**Location handling**: Uses the Nominatim-based `searchLocations()` function for search-as-you-type city autocomplete. Selected cities provide latitude/longitude coordinates for accurate house calculation. If no location is selected, coordinates default to (0, 0) with a warning about reduced house accuracy.

### Friend Import (`friend-chart-import.tsx`)

Uses `getFriendsBirthDataBatch` query for efficient single-query friend data retrieval. Each friend row shows:

- 🟢 **Available** — Friend has a public/friends-only chart with birth data
- 🔴 **Private** — Friend's chart setting is `publicChart: 0`
- 🟡 **No Data** — Friend hasn't added their birth data yet

Available friends show their Sun sign for quick reference. Clicking an available friend calls `onSetChartB(birthData, username, "friend", friendUserId)` directly (no calculation needed — the data comes from their stored `birthData`).

### Chart B Removal

Two removal paths:
1. **Compact indicator ✕ button** (in relationship phase) — calls `handleRemoveChartB()` which calls `clearSynastryChartB()` from the store, resets `step` to `"add_chart"`, clears `selectedCategory`, and resets custom input fields. The relationship selection is NOT preserved (because changing the person may change the relationship).
2. **Full card ✕ button** (in import phase) — same handler.

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
        ▼ step transitions to "select_relationship"
   │   Charts collapse to compact indicators
   │   Big Three shows in indicator text
   │   LLM receives complete placement data
```

## Animations

- `motion/react` fade-in (`initial={{ opacity: 0, y: 12 }}` → `animate={{ opacity: 1, y: 0 }}`) when feature is selected
- `AnimatePresence mode="wait"` transitions between steps (add_chart ↔ select_relationship)
- Chart B appearance: `initial={{ opacity: 0, scale: 0.95 }}` → `animate={{ opacity: 1, scale: 1 }}` scale animation
- Charts collapse to compact indicators when entering relationship phase
- Pulsing connection symbol (⟷) with `animate={{ scale: [1, 1.15, 1] }}` repeat animation when both charts + relationship are ready
- Category → role sub-navigation with `AnimatePresence mode="wait"` crossfade
- Category cards have `hover:border-galactic/30 hover:bg-galactic/[0.06]` interaction states

## Error Handling

- **Calculation failure**: If `buildStoredBirthData()` throws (e.g., invalid date), an inline error message appears with retry guidance
- **Location without coordinates**: If user types a city name but doesn't select from autocomplete, a warning appears noting reduced house accuracy
- **Time unavailable**: If user doesn't provide birth time, a subtle note explains "using 12:00 PM" and house placement limitations
- **Friend import loading**: Skeleton rows shown while `getFriendsBirthDataBatch` resolves
- **Empty friends list**: "You don't have any friends yet" with guidance
- **Chart B Context fallback**: `buildSynastryChartBContext()` gracefully degrades if `buildUniversalBirthContext()` throws — tries legacy placements, then raw date/time/location
- **Missing `relationshipCategory`**: Old sessions may lack this field. The pipeline treats `undefined` as `"general"` via `synastryData.relationshipCategory ?? "general"`. The `getSynastryInstructions()` and `buildSynastryChartBContext()` functions accept `category?: string` (optional) and degrade gracefully