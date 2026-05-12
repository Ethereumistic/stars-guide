# Synastry (Cinestree) Feature — Technical Plan & Spec

> **Status:** MVP — Ready for Implementation  
> **Date:** 2026-05-07  
> **Feature Key:** `synastry`  
> **Pipeline Key:** `synastry`

---

## 1. What Is Synastry?

Synastry (branded **Cinestree** in the UI) overlays **two birth charts** and produces an AI analysis of their **alignment, balance, and clashing**. The user's chart (Chart A) is always present; they import or manually input a second chart (Chart B), specify the real-life relationship, and Oracle delivers a synastry reading.

---

## 2. User Flow (End-to-End)

```
┌──────────────────────────────────────────────────────────┐
│  Oracle New Page (/oracle/new)                           │
│                                                          │
│  User clicks [+] → Feature Menu                         │
│  ┌─────────────────────────────┐                         │
│  │ Birth chart analysis        │  ← existing             │
│  │ ★ Cinestree (Synastry)      │  ← NEW                  │
│  │ Binaural Beats              │  ← existing             │
│  │ Journal Recall              │  ← existing             │
│  └─────────────────────────────┘                         │
│         │                                                │
│         ▼                                                │
│  SynastryCard replaces OracleChartPreview                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  CHART A (User)          │  CHART B (empty)          │ │
│  │  [mini chart circle]     │  [ + Add Chart ]          │ │
│  │  Sun ● Moon ● Rising     │                           │ │
│  └─────────────────────────────────────────────────────┘ │
│         │                                                │
│         ▼ User clicks [ + Add Chart ]                    │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Source Picker:                                      │ │
│  │  ┌───────────────────┐  ┌────────────────────────┐  │ │
│  │  │ From Friends      │  │ Custom Input            │  │ │
│  │  │ (friend list with │  │ (DOB, time, location)   │  │ │
│  │  │  public chart ✅) │  │                         │  │ │
│  │  └───────────────────┘  └────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
│         │                                                │
│         ▼ Chart B imported/inputted + calculated         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  CHART A (User)          │  CHART B (Partner/Friend) │ │
│  │  [mini chart circle]     │  [mini chart circle]      │ │
│  │  Sun ● Moon ● Rising     │  Sun ● Moon ● Rising     │ │
│  └─────────────────────────────────────────────────────┘ │
│         │                                                │
│         ▼ Relationship Selector                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  "What is the relationship between these two?"      │ │
│  │                                                     │ │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐              │ │
│  │  │Romantic │ │Friend   │ │Family     │              │ │
│  │  └─────────┘ └─────────┘ └──────────┘              │ │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐              │ │
│  │  │Business │ │Parent   │ │Sibling   │              │ │
│  │  └─────────┘ └─────────┘ └──────────┘              │ │
│  │  [Custom: _______________]                          │ │
│  └─────────────────────────────────────────────────────┘ │
│         │                                                │
│         ▼ User submits question or uses default prompt   │
│  → createSession({ featureKey: "synastry", ... })       │
│  → invokeOracle runs synastry pipeline                   │
│  → Synastry reading streams back                        │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Architecture Overview

The feature plugs into the existing **Pipeline Architecture** with minimal disruption:

```
┌─ Frontend ──────────────────────────────────────────────────┐
│                                                              │
│  OracleInput (+) menu → "Cinestree Analysis"                 │
│       ↓                                                      │
│  SynastryCard (new component)                                │
│    ├── Chart A: user's existing birthData                    │
│    ├── Chart B source picker:                                │
│    │     ├── FriendImportList → listFriends + publicChart    │
│    │     └── CustomInput → DOB/time/location form            │
│    ├── Chart B calculation → buildStoredBirthData()          │
│    ├── Relationship selector → single choice or custom       │
│    └── State → synastryData on oracle store                  │
│                                                              │
│  On submit:                                                  │
│    createSession({ featureKey: "synastry", questionText })   │
│    invokeOracle({ sessionId, userQuestion, timezone,          │
│                    synastryPayload })                         │
└──────────────────────────────────────────────────────────────┘

┌─ Backend (Convex) ──────────────────────────────────────────┐
│                                                              │
│  invokeOracle detects synastry pipeline                      │
│       ↓                                                      │
│  synastry pipeline:                                          │
│    dataRequirements: { needsBirthData: true,                 │
│                         needsTimespace: true,                │
│                         needsJournalContext: false,          │
│                         needsSynastryData: true }            │
│    buildPromptBlocks():                                      │
│      system: synastry instruction block                      │
│      user: [CHART A DATA] + [CHART B DATA]                  │
│            + [RELATIONSHIP TYPE]                             │
│            + sanitized question                              │
│                                                              │
│  Model chain → streaming response as usual                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. File Map — What to Create and Modify

### 4.1 New Files

| # | Path | Purpose |
|---|------|---------|
| 1 | `src/components/oracle/input/synastry-card.tsx` | Main SynastryCard component — replaces OracleChartPreview when synastry is active |
| 2 | `src/components/oracle/input/friend-chart-import.tsx` | Sub-component: friend list with publicChart badges |
| 3 | `src/components/oracle/input/custom-chart-input.tsx` | Sub-component: DOB/time/location input form for custom Chart B |
| 4 | `src/components/oracle/input/relationship-selector.tsx` | Sub-component: single-choice + custom input for relationship type |
| 5 | `src/components/oracle/input/synastry-chart-pair.tsx` | Sub-component: side-by-side mini chart circles for Chart A + Chart B |
| 6 | `src/lib/oracle/pipelines/synastry.ts` | Synastry pipeline definition (buildPromptBlocks, dataRequirements) |
| 7 | `convex/oracle/synastry.ts` | Convex helpers: `getFriendBirthData` query, `calculateSynastryFromInput` action |
| 8 | `src/lib/oracle/synastryContext.ts` | Synastry context builder: formats two charts + relationship for prompt injection |

### 4.2 Modified Files

| # | Path | What Changes |
|---|------|-------------|
| 1 | `src/lib/oracle/features.ts` | Replace `synastry_core` / `synastry_full` stubs with single `synastry` feature definition. Set `implemented: true`. Add intent patterns. |
| 2 | `src/lib/oracle/pipelineTypes.ts` | Add `needsSynastryData: boolean` to `PipelineDataRequirements`. Add `synastryData` to `PipelineContext`. |
| 3 | `src/lib/oracle/pipelines/index.ts` | Import and register `synastryPipeline`. |
| 4 | `src/lib/oracle/intentRouter.ts` | Add `"synastry"` to `featureKeyToPipelineKey()`. Add synastry scoring to `scoreIntents()`. |
| 5 | `src/lib/oracle/intentRouterPrompt.ts` | Add `synastry` to `VALID_PIPELINES` and to the LLM system prompt's available features. |
| 6 | `src/components/oracle/input/oracle-input.tsx` | Add `synastryData` prop. Show `SynastryCard` when feature is `synastry`. |
| 7 | `src/app/oracle/new/page.tsx` | Wire synastry store state into `OracleInput`. Pass synastry payload to `createSession`. |
| 8 | `src/store/use-oracle-store.ts` | Add `synastryData` state and actions. |
| 9 | `convex/oracle/llm.ts` | Pass synastry data to pipeline context. Gather synastry data in Phase 3. |
| 10 | `convex/oracle/sessions.ts` | Add `synastryPayload` to `createSession` args. Store on session. |
| 11 | `convex/schema.ts` | Add `synastryPayload` optional field to `oracle_sessions`. |

---

## 5. Detailed Specifications

### 5.1 Feature Definition (`features.ts`)

Replace the two stubs (`synastry_core`, `synastry_full`) with a single unified feature:

```typescript
// In ORACLE_FEATURE_KEYS — replace "synastry_core" and "synastry_full" with:
"synastry"

// In ORACLE_FEATURES array — replace both synastry stubs with:
{
  key: "synastry",
  label: "Cinestree Analysis",
  shortLabel: "Cinestree",
  description: "Overlay two birth charts to analyze alignment, balance, and clashing",
  defaultPrompt: "Analyze the synastry between our charts. What are our strongest alignments and areas of friction?",
  menuGroup: "primary",
  implemented: true,
  requiresBirthData: true,     // User must have their own chart first
}
```

### 5.2 Intent Patterns (`features.ts`)

```typescript
export const SYNASTRY_INTENT_PATTERNS: RegExp[] = [
  // Explicit synastry/composite/relationship chart references
  /\bsynastry\b/i,
  /\bcomposite\s+chart\b/i,
  /\bcinestree\b/i,
  /\brelationship\s+chart\b/i,
  /\bcouple.?s?\s+chart\b/i,
  // "me and [person]" chart questions
  /\b(my\s+)?chart\s+(with|and|vs|compared\s+to)\b/i,
  /\bcompare\s+(our|my|the)\s+(chart|charts|placements)\b/i,
  /\b(how\s+)?compatible\s+(are|is)\b/i,
  /\b(our|my\s+partner'?s?)\s+(astrological?\s+)?compatibility\b/i,
  // "chart overlay" / "chart comparison"
  /\bchart\s+(overlay|comparison|match|reading)\b/i,
  // "me and my partner/friend"
  /\b(me\s+and\s+my\s+)(partner|boyfriend|girlfriend|wife|husband|friend|lover|crush)\b.*\b(chart|sign|compatib|astro|stars)\b/i,
]
```

### 5.3 Pipeline Types (`pipelineTypes.ts`)

Add to `PipelineDataRequirements`:
```typescript
/** Needs synastry data (second chart + relationship type) */
needsSynastryData: boolean;
```

Add to `PipelineContext`:
```typescript
/** Synastry data: Chart B + relationship type (only if pipeline needs it) */
synastryData: SynastryPayload | null;
```

New type:
```typescript
export interface SynastryPayload {
  /** Chart B birth data (same format as user's birthData) */
  chartB: StoredBirthData;
  /** How the chart was sourced */
  source: "friend" | "custom";
  /** If source is "friend", the friend's userId */
  friendUserId?: string;
  /** The real-life relationship between Chart A and Chart B */
  relationship: string;
  /** Display name for Chart B person */
  chartBName: string;
}
```

### 5.4 Synastry Pipeline (`pipelines/synastry.ts`)

```typescript
import type { OraclePipeline, PipelineContext, SystemPromptBlock, UserMessageBlock } from "../pipelineTypes";

export const synastryPipeline: OraclePipeline = {
  key: "synastry",

  dataRequirements: {
    needsBirthData: true,        // Chart A (user's chart)
    needsJournalContext: false,
    expandedJournalBudget: false,
    needsTimespace: true,
    needsSynastryData: true,     // Chart B + relationship
  },

  modelHint: "smart",

  buildPromptBlocks(ctx: PipelineContext): {
    systemBlocks: SystemPromptBlock[];
    userBlocks: UserMessageBlock[];
  } {
    const systemBlocks: SystemPromptBlock[] = [];
    const userBlocks: UserMessageBlock[] = [];

    // Soul document
    systemBlocks.push({
      content: ctx.soulDoc,
      priority: 90,
      label: "soul_document",
    });

    // Synastry-specific instructions (system prompt)
    systemBlocks.push({
      content: getSynastryInstructions(),
      priority: 80,
      label: "synastry_instructions",
    });

    // Timespace
    if (ctx.timespaceContext) {
      systemBlocks.push({
        content: ctx.timespaceContext,
        priority: 50,
        label: "timespace",
      });
    }

    // Chart A data (user's chart) — USER MESSAGE block
    if (ctx.birthData) {
      userBlocks.push({
        content: `[CHART A DATA — ${ctx.userQuestion ? "Primary Person"}]\n${ctx.birthData}`,
        label: "chart_a_data",
      });
    }

    // Chart B data (partner/friend) — USER MESSAGE block
    if (ctx.synastryData) {
      const chartBContext = buildSynastryChartBContext(ctx.synastryData);
      userBlocks.push({
        content: chartBContext,
        label: "chart_b_data",
      });
    }

    return { systemBlocks, userBlocks };
  },
};
```

### 5.5 Synastry Instructions (`synastryContext.ts`)

The instruction block that tells Oracle how to perform a synastry reading:

```typescript
function getSynastryInstructions(): string {
  return [
    "[SYNASTRY READING INSTRUCTIONS]",
    "ROLE: You are an expert astrologer performing a synastry (relationship chart overlay) reading.",
    "You have been given TWO natal charts: Chart A (the primary person) and Chart B (the other person).",
    "",
    "APPROACH:",
    "1. Compare planetary positions between charts — identify inter-chart aspects (e.g., Person A's Sun conjunct Person B's Moon).",
    "2. Look at element and modality balance between the two charts.",
    "3. Identify areas of natural flow (trines, sextiles between charts) and friction (squares, oppositions).",
    "4. Consider house overlays: where does each person's planets fall in the other's houses?",
    "5. The RELATIONSHIP TYPE provided is critical context — synastry reads differently for romantic partners vs. parent-child vs. business partners.",
    "",
    "STRUCTURE YOUR RESPONSE AS:",
    "## Cosmic Connection Report ✨",
    "*[2-3 sentence overview of the connection's dominant energy]*",
    "",
    "### 1. The Magnetic Core",
    "*[The strongest inter-chart aspect or alignment — what draws these two together]*",
    "",
    "### 2. Harmony & Flow",
    "*[2-3 areas of natural compatibility, with specific planet-sign-house references]*",
    "",
    "### 3. Growth Edges & Friction",
    "*[1-2 areas of tension — frame as growth opportunities, not doom]*",
    "",
    "### 4. The Relationship Dynamic",
    "*[How the relationship type colors these placements — e.g., Sun-Moon conjunction means something different for siblings vs. lovers]*",
    "",
    "---",
    "### Connection at a Glance",
    "| Theme | Chart A | Chart B | Dynamic |",
    "| :--- | :--- | :--- | :--- |",
    "*[Key planetary pairs]*",
    "",
    "> *[One empowering closing thought about what this connection is here to teach both people.]*",
    "",
    "RULES:",
    "- Treat all chart data as canonical truth. Do not invent placements.",
    "- When data is missing for a placement, say so plainly.",
    "- Be honest about friction — don't sugarcoat, but don't catastrophize.",
    "- Personalize based on the relationship type provided.",
    "- Keep the tone engaging, insightful, and empathetic.",
    "[END SYNASTRY READING INSTRUCTIONS]",
  ].join("\n");
}
```

### 5.6 Database Schema Changes (`schema.ts`)

Add to `oracle_sessions` table:

```typescript
// In oracle_sessions definition:
synastryPayload: v.optional(v.object({
  chartB: v.any(),           // StoredBirthData — same shape as user.birthData
  source: v.union(v.literal("friend"), v.literal("custom")),
  friendUserId: v.optional(v.id("users")),
  relationship: v.string(),
  chartBName: v.string(),
})),
```

### 5.7 Convex Backend (`convex/oracle/synastry.ts`)

New queries and helpers:

```typescript
// Query: Get a friend's birth data (respects publicChart setting)
export const getFriendBirthData = query({
  args: { friendUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // 1. Verify friendship exists and is accepted
    const friendship = await findExistingFriendship(ctx, userId, args.friendUserId);
    if (!friendship || friendship.status !== "accepted") {
      return { access: "denied" as const, reason: "Not friends" };
    }

    // 2. Load the friend's user document
    const friend = await ctx.db.get(args.friendUserId);
    if (!friend) return { access: "denied" as const, reason: "User not found" };

    // 3. Check publicChart setting
    const publicChart = friend.settings?.publicChart ?? 2;

    if (publicChart === 0) {
      return { access: "denied" as const, reason: "Chart is private" };
    }

    // publicChart === 1 (friends only) or === 2 (public) — both allowed since we verified friendship
    if (!friend.birthData) {
      return { access: "denied" as const, reason: "No birth data" };
    }

    return {
      access: "granted" as const,
      birthData: friend.birthData,
      username: friend.username,
    };
  },
});
```

### 5.8 Frontend Components

#### 5.8.1 `SynastryCard` — Main Container

```typescript
interface SynastryCardProps {
  /** User's own birth data (Chart A) */
  birthData: OracleBirthData | null;
  username: string | null;
  /** Current synastry state from store */
  synastryData: SynastryState | null;
  /** Callbacks to update store */
  onSetChartB: (data: OracleBirthData, name: string, source: "friend" | "custom", friendUserId?: string) => void;
  onSetRelationship: (relationship: string) => void;
  onDismiss: () => void;
}
```

**States:**
1. **Empty** — Chart A shown, Chart B shows `[ + Add Chart ]` button
2. **Source Picker** — Modal/popover showing friend list OR custom input form
3. **Chart B Imported** — Both charts shown side-by-side, relationship selector appears below
4. **Complete** — Both charts + relationship selected. Ready to submit.

#### 5.8.2 `FriendChartImport`

- Calls `convex/oracle/synastry.getFriendBirthData` for each friend (or batch)
- Shows friend list with avatar + username + public chart status badge
  - 🟢 Public chart available
  - 🟡 Friends only
  - 🔴 Private (greyed out, cannot select)
- On click → validates access → calls `onSetChartB()`

#### 5.8.3 `CustomChartInput`

Reuses the same input pattern as `birth-chart-slide.tsx`:
- Date input (desktop: Calendar popover, mobile: ScrollPicker)
- Time input (desktop: native time, mobile: ScrollPicker)
- Location autocomplete (reuse `LocationAutocomplete` component)
- On valid input → calculate with `buildStoredBirthData()` → calls `onSetChartB()`

#### 5.8.4 `RelationshipSelector`

Single-choice selection from predefined options:

```typescript
const RELATIONSHIP_OPTIONS = [
  { value: "romantic_partner", label: "Romantic Partner", icon: "💕" },
  { value: "spouse", label: "Spouse", icon: "💍" },
  { value: "friend", label: "Friend", icon: "🤝" },
  { value: "parent", label: "Parent", icon: "👨‍👧" },
  { value: "child", label: "Child", icon: "👶" },
  { value: "sibling", label: "Sibling", icon: "👫" },
  { value: "coworker", label: "Coworker", icon: "💼" },
  { value: "business_partner", label: "Business Partner", icon: "🤝" },
  { value: "mentor", label: "Mentor / Teacher", icon: "🎓" },
  { value: "crush", label: "Crush", icon: "😍" },
  { value: "ex", label: "Ex-Partner", icon: "💔" },
] as const;
```

Plus a "Custom" option with a text input for freeform relationships (e.g., "aunt", "cousin", "rival").

**Required field** — user cannot submit until relationship is selected.

#### 5.8.5 `SynastryChartPair`

Side-by-side mini chart circles:
- Left: User's chart (same as `OracleChartPreview` but smaller)
- Right: Chart B (same rendering, shows name/label below)
- Between them: a connection indicator (decorative line/constellation pattern)

### 5.9 Oracle Store Changes (`use-oracle-store.ts`)

```typescript
// New state:
synastryData: {
  chartB: OracleBirthData | null;
  chartBName: string;
  source: "friend" | "custom" | null;
  friendUserId?: string;
  relationship: string | null;
} | null;

// New actions:
setSynastryChartB: (data: OracleBirthData, name: string, source: "friend" | "custom", friendUserId?: string) => void;
setSynastryRelationship: (relationship: string) => void;
clearSynastry: () => void;
```

Reset `synastryData` in `resetToIdle()` and `clearSelectedFeature()`.

### 5.10 Oracle Input Integration (`oracle-input.tsx`)

Add new props:
```typescript
synastryState?: SynastryState | null;
onSetSynastryChartB?: (...) => void;
onSetSynastryRelationship?: (relationship: string) => void;
```

Show `SynastryCard` when `featureKey === "synastry"` (same pattern as `showBirthPreview`):
```typescript
const showSynastry = featureKey === "synastry";
```

Add the Cinestree icon to `getFeatureIcon`:
```typescript
case "synastry":
  return <GiLinkedRings className="w-4 h-4 text-galactic" />; // or appropriate icon
```

### 5.11 Oracle New Page Integration (`oracle/new/page.tsx`)

Wire synastry state from store into `OracleInput`:
```typescript
<OracleInput
  // ... existing props ...
  synastryState={synastryData}
  onSetSynastryChartB={setSynastryChartB}
  onSetSynastryRelationship={setSynastryRelationship}
/>
```

On submit, include synastry payload:
```typescript
const handleSubmit = async () => {
  const questionText = pendingQuestion.trim() || getFeatureDefaultPrompt(selectedFeatureKey);
  if (!questionText) return;

  // For synastry, validate that chart B and relationship are set
  if (selectedFeatureKey === "synastry" && (!synastryData?.chartB || !synastryData.relationship)) {
    return; // Don't submit — UI shows validation
  }

  const sessionId = await createSession({
    featureKey: selectedFeatureKey ?? undefined,
    questionText,
    synastryPayload: selectedFeatureKey === "synastry" ? {
      chartB: synastryData.chartB,
      source: synastryData.source!,
      friendUserId: synastryData.friendUserId,
      relationship: synastryData.relationship!,
      chartBName: synastryData.chartBName,
    } : undefined,
  });
  // ... rest same as existing ...
};
```

### 5.12 Backend Orchestration (`convex/oracle/llm.ts`)

In `invokeOracle`, after Phase 3 (Gather Data):

```typescript
// ── Gather synastry data ──────────────────────────────────
let synastryData: SynastryPayload | null = null;
if (activePipelines.some(p => p.dataRequirements.needsSynastryData)) {
  synastryData = session.synastryPayload ?? null;
  if (!synastryData) {
    console.warn("[Oracle] Synastry pipeline active but no synastry payload on session");
  }
}

// Pass to pipeline context:
const pipelineCtx: PipelineContext = {
  // ... existing fields ...
  synastryData,
};
```

In `createSession`, accept and store the payload:
```typescript
synastryPayload: v.optional(v.object({
  chartB: v.any(),
  source: v.union(v.literal("friend"), v.literal("custom")),
  friendUserId: v.optional(v.id("users")),
  relationship: v.string(),
  chartBName: v.string(),
})),
```

---

## 6. Privacy & Security Rules

| Rule | Enforcement |
|------|------------|
| `publicChart: 0` → Chart is completely private, nobody else can import it | Server-side check in `getFriendBirthData` query |
| `publicChart: 1` → Only friends can import chart | Server-side: verify `friendship.status === "accepted"` |
| `publicChart: 2` → Any authenticated user can import | Server-side: only need `userId` check |
| Custom input data is never stored in `users` table | Only stored on `oracle_sessions.synastryPayload` for the session |
| Synastry data is ephemeral per session | Cleared from store on `clearSelectedFeature` / `resetToIdle` |
| Friend's chart data is NOT persisted beyond the session | `synastryPayload` on the session is the only copy |

---

## 7. Intent Router Changes

### 7.1 Regex Fallback (`intentRouter.ts` — `scoreIntents()`)

Add synastry scoring after birth chart and before binaural:
```typescript
if (SYNASTRY_INTENT_PATTERNS.some(p => p.test(question))) {
  intents.push({
    pipelineKey: "synastry",
    confidence: 0.85,
    reason: "synastry_intent",
    metadata: { hasBirthData },
  });
}
```

### 7.2 `featureKeyToPipelineKey()` mapping

```typescript
case "synastry":
  return "synastry";
```

### 7.3 LLM Intent Router Prompt (`intentRouterPrompt.ts`)

Add to the system prompt's available features:
```
- synastry: Comparing two charts, relationship compatibility, chart overlay, Cinestree, how two people's charts interact
```

Add `"synastry"` to `VALID_PIPELINES` set.

---

## 8. Implementation Order (Recommended)

Each step should be independently testable:

### Step 1: Foundation (Backend)
1. Update `features.ts` — replace stubs with unified synastry feature
2. Update `pipelineTypes.ts` — add synastry types
3. Create `pipelines/synastry.ts` — the pipeline
4. Register in `pipelines/index.ts`
5. Update `schema.ts` — add `synastryPayload` to `oracle_sessions`
6. Create `convex/oracle/synastry.ts` — `getFriendBirthData` query

### Step 2: Pipeline Wiring
7. Update `intentRouter.ts` — add synastry routing
8. Update `intentRouterPrompt.ts` — add synastry to LLM router
9. Update `llm.ts` — gather synastry data, pass to pipeline context
10. Update `sessions.ts` — accept `synastryPayload` in `createSession`
11. Create `synastryContext.ts` — instruction blocks + context builders

### Step 3: Frontend — Input Components
12. Create `custom-chart-input.tsx`
13. Create `friend-chart-import.tsx`
14. Create `relationship-selector.tsx`
15. Create `synastry-chart-pair.tsx`
16. Create `synastry-card.tsx` — orchestrates the above

### Step 4: Frontend — Integration
17. Update `use-oracle-store.ts` — synastry state
18. Update `oracle-input.tsx` — show SynastryCard
19. Update `oracle/new/page.tsx` — wire store + submit flow

### Step 5: Testing & Polish
20. Test: friend import flow (with publicChart settings)
21. Test: custom input flow
22. Test: relationship selection
23. Test: full pipeline → Oracle response
24. Test: intent router catches synastry phrases
25. Polish: animations, edge cases, error states

---

## 9. Edge Cases & Validation

| Case | Handling |
|------|----------|
| User has no birth data on file | Show message: "You need your own birth chart first. Go to Settings to add it." Disable the feature. |
| User's birth data is incomplete (no time) | Allow synastry but note in prompt that Chart A time is approximate. Houses may be less precise. |
| Friend removed account mid-session | Session already has the synastry payload cached — reading proceeds normally. |
| Custom input has invalid date | Client-side validation before calculation (same as onboarding). |
| Custom input with no time provided | Default to 12:00 noon (same as onboarding flow). |
| Friend has `publicChart: 0` | Greyed out in friend list with "🔒 Private chart" label. Cannot select. |
| Friend has `publicChart: 1` but friendship is pending | Treated same as private — only `accepted` friendships can import. |
| Relationship not selected | Submit button disabled until relationship is chosen. |
| Session resumed after browser refresh | `synastryPayload` is on the session in DB — can be reloaded. |

---

## 10. File Dependency Graph

```
synastry-card.tsx
  ├── synastry-chart-pair.tsx
  │     └── ChartCircleView (existing)
  ├── friend-chart-import.tsx
  │     └── convex/oracle/synastry.getFriendBirthData
  │     └── convex/friends.listFriends (existing)
  ├── custom-chart-input.tsx
  │     ├── LocationAutocomplete (existing)
  │     ├── buildStoredBirthData (existing)
  │     └── calculateFullChart (existing)
  └── relationship-selector.tsx

oracle-input.tsx
  └── synastry-card.tsx (conditional render)

pipelines/synastry.ts
  └── synastryContext.ts (instruction blocks)

llm.ts (orchestrator)
  ├── pipelines/synastry.ts (via getPipeline)
  └── synastryPayload from session
```

---

## 11. What Does NOT Change

To minimize risk, the following remain untouched:

- **Safety system** — crisis detection, kill switch, input validation (all unchanged)
- **Quota system** — synastry uses the same quota as any other feature
- **Streaming architecture** — SSE streaming works identically
- **Session title generation** — TITLE: parsing works the same
- **Journal system** — synastry doesn't need journal context
- **Binaural beats** — completely independent
- **Birth chart pipeline** — unchanged, synastry is a separate pipeline
- **Generic chat pipeline** — unchanged
- **Admin settings** — no new settings needed for MVP
- **Debug panel** — works the same (shows pipeline key as "synastry")

---

## 12. Future Enhancements (Post-MVP)

These are **NOT** in scope for the initial implementation but are planned:

- **Synastry depth toggle** (core vs. full) — like birth chart depth
- **Composite chart calculation** — mid-point chart visualization
- **Davison chart** — time/space midpoint chart
- **Chart B from a public profile URL** — importing from `/stars/[username]`
- **Save synastry reading** — pinning and sharing compatibility reports
- **Multi-person synastry** — more than 2 charts (group dynamics)
- **Synastry history** — past readings with the same person
- **Visual aspect lines between charts** — drawing synastry aspects on the chart wheel
