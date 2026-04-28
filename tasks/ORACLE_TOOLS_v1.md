# Oracle Tools Auto-Activation Plan v2

> **Goal:** Make every Oracle tool accessible via natural language text, so users never need to click the `[+]` button. Unify birth chart features into a single tool with dynamic depth. Make birth data and journal context universal — always available when the user has provided them, regardless of which feature is "active."
>
> **Status:** Architecture approved. Ready for implementation by another agent.
>
> **Audience:** Another AI agent / developer who will implement the changes.
>
> **Last updated:** 2026-04-28

---

## Table of Contents

1. [Conceptual Overview](#1-conceptual-overview)
2. [Philosophy: Universal Context + Dynamic Instructions](#2-philosophy-universal-context--dynamic-instructions)
3. [The Four Active Tools](#3-the-four-active-tools)
4. [What Changed From v1](#4-what-changed-from-v1)
5. [Naming Convention: Birth vs Natal](#5-naming-convention-birth-vs-natal)
6. [Current Tool Inventory](#6-current-tool-inventory)
7. [The Injection Pipeline (New Architecture)](#7-the-injection-pipeline-new-architecture)
8. [Unified Intent Classification](#8-unified-intent-classification)
9. [Per-Tool Implementation Spec](#9-per-tool-implementation-spec)
10. [Session State & Persistence Rules](#10-session-state--persistence-rules)
11. [Cross-Context Mixing](#11-cross-context-mixing)
12. [Edge Cases & Guardrails](#12-edge-cases--guardrails)
13. [File-by-File Change Log](#13-file-by-file-change-log)
14. [Testing Checklist](#14-testing-checklist)
15. [Future Work](#15-future-work)

---

## 1. Conceptual Overview

The Oracle has two ways to activate a tool:

| Method | User Action | Current Status |
|--------|-------------|--------------|
| **Manual** | Click `[+]` → Choose a feature | Works for all implemented features |
| **Automatic** | Type a request in natural language | Partially works |

Automatic activation requires the server to read the user question, classify its intent, and silently attach the same context blocks that manual feature selection would have attached.

**The v2 architecture shift:**
- **Birth data** (what was internally called "natal data") is no longer feature-gated. If the user has saved a birth chart, the AI sees it on every message.
- **"Birth chart core" and "deep birth chart analysis" are not separate features.** They are one `birth_chart` tool with two instruction depths.
- **Journal context** is always injected if consent is granted, regardless of active feature.
- **Tool mixing is native.** A Cosmic Recall session can reference the user's birth chart because the birth data is always present.

---

## 2. Philosophy: Universal Context + Dynamic Instructions

### The Wrong Way (Current)

```
User clicks "Birth chart core"
  → activeFeature = "birth_chart_core"
  → if activeFeature.requiresBirthData → buildCoreFeatureContext(birthData)
  → inject 3 placements + 4 aspects

User clicks "Deep birth chart analysis"
  → activeFeature = "birth_chart_full"
  → if activeFeature.requiresBirthData → buildFullFeatureContext(birthData)
  → inject 14 placements + 12 houses + 8 aspects
```

**Problem:** The same raw `birthData` produces two different formatted strings. One throws away most of the data. The other uses it all. This means:
- A Cosmic Recall session CANNOT reference Venus because natal context is empty.
- The AI literally does not see most placements in "core" mode even though the data exists.
- Depth is controlled by data scope, not instructions.

### The Right Way (v2)

```
User has birthData saved
  → ALWAYS inject full birth data (all placements + houses + aspects)
  → Instruction block says: "Focus on Sun/Moon/Ascendant" (core) OR "Synthesize everything" (full)
```

**Benefits:**
- Token cost difference: ~275 tokens (~0.03 cents). Negligible.
- The AI always has the full picture. If a user in "core" mode asks *"What about my Venus?"*, the AI sees Venus.
- Feature mixing works automatically. Cosmic Recall + birth data, synastry + birth data, etc.
- Simpler code. One data builder, one feature, two instruction templates.

---

## 3. The Four Active Tools

| Tool Key | Label | Manual? | Auto? | Injects |
|----------|-------|---------|-------|---------|
| `birth_chart` | Birth chart analysis | ✅ | ✅ | `birthContext` (always full data) + `instructionDepth` |
| `journal_recall` | Cosmic Recall | ✅ | ✅ | `journalContext` (expanded budget) + feature instructions |
| `timespace` | Current spacetime / cosmic weather | N/A | ✅ | `timespaceContext` |
| `attachment` | Files / Photos | ❌ | N/A | Out of scope |

**Note:** `synastry_core`, `synastry_full`, `sign_card_image`, `binaural_beat` are unimplemented and out of scope.

---

## 4. What Changed From v1

| Topic | v1 Plan | v2 Plan |
|-------|---------|---------|
| Birth chart tools | Two separate features (`core` + `full`) | One unified tool with dynamic `depth` field |
| Birth data injection | Gated by `activeFeature.requiresBirthData` | **Universal** — injected whenever `user.birthData` exists |
| Journal context | Only expanded for `journal_recall` | Always injected if consent granted; budget varies by feature |
| Cross-context | Impossible (single `featureKey`) | Native (birth data + journal data + timespace coexist) |
| Intent classifier | Returns `autoFeatureKey` | Returns `{ featureKey, depth?, reason }` |
| Naming | Mixed "natal" / "birth" internally | Unified to "birth" internally; "natal" kept only in user-facing regex patterns |

---

## 5. Naming Convention: Birth vs Natal

| Context | Term | Reason |
|---------|------|--------|
| **Internal code** (`ctx`, params, files) | `birthContext`, `birthData`, `buildBirthContext`, `[BIRTH CHART DATA]` | One consistent term. No ambiguity. |
| **User-facing regex patterns** | Keep `natal\s*chart` as a synonym | Users DO say "natal chart." We must continue matching that. |
| **AI prompt text** | "birth placements", "birth chart data" | The AI sees what we write in prompts. Use "birth" consistently. |

**Files renamed:**
- `src/lib/oracle/natalCalculator.ts` → `src/lib/oracle/birthCalculator.ts`
- `NatalContext` → `BirthContext`
- `calculateNatalContext` → `calculateBirthContext`
- `formatNatalContext` → `formatBirthContext`
- `calculateDegradedNatalContext` → `calculateDegradedBirthContext`
- `---NATAL CONTEXT---` prompt tags → `---BIRTH CONTEXT---`
- `[NATAL CHART DATA]` prompt tags → `[BIRTH CHART DATA]`
- `sanitizeUserQuestion` regex: `NATAL` → `BIRTH`

---

## 6. Current Tool Inventory

### `birth_chart` (Unified — replaces `birth_chart_core` + `birth_chart_full`)

- **Requires:** `user.birthData`
- **Data injected:** ALWAYS the full chart — all 14 placements, 12 houses, top 8 aspects, house signatures. The same data for both depths.
- **Instruction difference:**
  - `depth: "core"` → Focus on Sun/Moon/Ascendant triad, output skeleton with 4 sections, tightest aspects only.
  - `depth: "full"` → Full synthesis, all placements, Nodes, Part of Fortune, themes/clusters, no rigid skeleton.

### `journal_recall`

- **Requires:** `journal_consent.oracleCanReadJournal === true`
- **Data injected:** Expanded journal context (8,000 char budget, 20 entries, 1,000 chars each) + standard journal context (4,000 char budget, 10 entries, 500 chars each) if Cosmic Recall is active.
- **Feature instructions:** `[COSMIC RECALL MODE]` — search for patterns, cite dates, connect to astrological weather.

### `timespace`

- **Requires:** Nothing
- **Data injected:** Always: user's local datetime + timezone. Conditionally: cosmic weather snapshot (planetary positions, moon phase, active transits) if temporal intent detected.
- **Already fully implemented.** No changes needed.

---

## 7. The Injection Pipeline (New Architecture)

```
User submits question
    ↓
[llm.ts] Load user (birthData, journal consent)
    ↓
[llm.ts] classifyOracleToolIntent(question, session.featureKey, hasBirthData, hasJournalConsent)
    ↓
If intent matches and session has no feature:
    → runMutation(api.oracle.sessions.updateSessionFeature, { featureKey, depth? })
    → activeFeature = getOracleFeature(featureKey)
    ↓
[llm.ts] ALWAYS build birthContext if user.birthData exists
    → birthContext = buildUniversalBirthContext(user.birthData)  // full chart, all placements
    ↓
[llm.ts] Load feature injection text (dynamic depth for birth_chart)
    → if birth_chart + depth=core → load core instructions
    → if birth_chart + depth=full → load full instructions
    → if journal_recall → load cosmic recall instructions
    ↓
[llm.ts] Journal context (always, if consent)
    → assembleJournalContext(userId, expandedBudget: isCosmicRecall)
    ↓
[llm.ts] Timespace context (always)
    → buildTimespaceContext(timezone, question)
    ↓
[llm.ts] buildPrompt({
    soulDoc,
    featureInjection,
    birthContext,
    journalContext,
    timespaceContext,
    userQuestion
  })
    ↓
LLM call
```

**Critical change:** `birthContext` is built **before** feature selection check, not inside it. It is independent of `activeFeature`.

---

## 8. Unified Intent Classification

### Interface

```typescript
export type BirthChartDepth = "core" | "full";

export interface ToolIntentResult {
  /** The tool to auto-activate, or null if no match */
  featureKey: OracleFeatureKey | null;
  /** For birth_chart only: reading depth */
  depth?: BirthChartDepth;
  /** Why this decision was made */
  reason: string;
}

export function classifyOracleToolIntent(
  question: string,
  currentFeatureKey: string | null,
  hasBirthData: boolean,
  hasJournalConsent: boolean,
): ToolIntentResult
```

### Priority Order

1. **If `currentFeatureKey` exists** → return `{ featureKey: null, reason: "manual" }`
2. **Journal Recall patterns** → if matched AND `hasJournalConsent` → `{ featureKey: "journal_recall", reason: "journal_intent" }`
3. **Birth Chart Full patterns** → if matched AND `hasBirthData` → `{ featureKey: "birth_chart", depth: "full", reason: "deep_chart_intent" }`
4. **Birth Chart Core patterns** → if matched AND `hasBirthData` → `{ featureKey: "birth_chart", depth: "core", reason: "core_chart_intent" }`
5. **No match** → `{ featureKey: null, reason: "no_match" }`

### Why Journal Before Birth Chart

Journal intent is explicit ("journal", "entries", "Cosmic Recall"). Birth chart intent is broader ("chart", "placements"). Running journal first prevents a journal question like *"What did I journal about my chart?"* from being treated as a birth chart request.

### Pattern Sets

**`BIRTH_CHART_FULL_PATTERNS`** (check before core — more specific):
```typescript
const BIRTH_CHART_FULL_PATTERNS: RegExp[] = [
  /\b(deep|full|complete|detailed|thorough|comprehensive|layered)\s+(analysis|reading|interpretation|dive)\s+(of\s+)?my\s+(chart|birth\s*chart|natal\s*chart)/i,
  /\b(deep\s*dive|go\s+deep|deep\s*reading)\s+(into\s+)?my\s+(chart|birth\s*chart|natal\s*chart|placements)/i,
  /\b(all\s+(my\s+)?placements|every\s+placement|full\s+natal|entire\s+chart)\b/i,
  /\b(read|analyze|interpret)\s+my\s+(entire|whole|full)\s+(chart|birth\s*chart|natal\s*chart)/i,
  /\b(venus|mars|mercury|jupiter|saturn|uranus|neptune|pluto)\s+(in\s+my\s+chart|placement|house)/i,
  /\bwhat\s+about\s+my\s+(nodes|north\s+node|south\s+node|part\s+of\s+fortune|chiron)\b/i,
  /\bmy\s+(houses|house\s+placements|house\s+signatures)\b/i,
  /\b(aspects|conjunction|trine|square|opposition|sextile)\s+in\s+my\s+chart\b/i,
  /\bsynthesize\s+my\s+(full\s+)?chart\b/i,
  /\bchart\s+ruler|dispositor|domicile|detriment|exaltation|fall\b/i,
];
```

**`BIRTH_CHART_CORE_PATTERNS`**:
```typescript
const BIRTH_CHART_CORE_PATTERNS: RegExp[] = [
  /\b(analyze|read|interpret|explain|tell me about)\b.*\b(birth\s*chart|natal\s*chart|chart)\b/i,
  /\bmy\s*(sun|moon|ascendant|rising|venus|mars|mercury|jupiter|saturn)\b.*\b(sign|placement|house)\b/i,
  /\bwhat\b.*\bmy\s*(chart|placements|stars|birth\s*chart)\b.*\b(say|say about|show|mean|reveal|tell)\b/i,
  /\bread\s+my\s+(chart|birth\s+chart|natal\s+chart)/i,
  /\bmy\s+birth\s+chart\b/i,
  /\b(dive|deep\s*dive|go\s+deep)\s+into\s+my\s+(chart|placements|birth\s+chart)/i,
  /\bwhat\s+(does|do)\s+my\s+(chart|placements|stars)\b/i,
  /\b(analyze|read|interpret)\s+my\s+(chart|birth\s+chart|natal\s+chart)/i,
  /\b(full|deep|complete|detailed)\s+(chart|birth\s*chart|natal)\s*(analysis|reading|interpretation)/i,
];
```

**`JOURNAL_RECALL_PATTERNS`**:
```typescript
const JOURNAL_RECALL_PATTERNS: RegExp[] = [
  /\b(cosmic\s+recall)\b/i,
  /\brecall\s+my\s+journal\b/i,
  /\blook\s+(through|in|at)\s+my\s+journal\b/i,
  /\b(search|find|scan)\s+(through\s+)?my\s+journal\b/i,
  /\bwhat\s+did\s+i\s+(write|journal|record)\s+(about\s+)?(on\s+)?/i,
  /\b(my\s+journal\s+entries?|entries?\s+in\s+my\s+journal)\b/i,
  /\b(patterns?|themes?|recurring|trends?)\s+(in\s+)?my\s+journal\b/i,
  /\b(connect|correlate|relate)\s+my\s+journal\s+(to\s+)?(astro|astrology|transits?)\b/i,
  /\bwhat\s+was\s+i\s+(experiencing|feeling|going\s+through)\s+(based\s+on\s+)?my\s+journal\b/i,
  /\b(my\s+journal\s+says?|according\s+to\s+my\s+journal)\b/i,
  /\b(what\s+happened|what\s+did\s+i\s+do|how\s+was\s+i)\s+(on|around|last)\s+/i,
  /\b(week\s+ago|month\s+ago|last\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b.*\b(journal|felt|experienced)\b/i,
  /\b(dig\s+into|go\s+back\s+to|remember)\s+(my\s+)?(journal|entries|feelings\s+from)\b/i,
];
```

---

## 9. Per-Tool Implementation Spec

### 9.1 Tool: `timespace` — No Changes Required ✅

Already fully automatic. Documented for reference.

### 9.2 Tool: `birth_chart` — Major Refactor

#### Step 1: Merge features in `src/lib/oracle/features.ts`

Replace the two features with one:

```typescript
{
  key: "birth_chart",
  label: "Birth chart analysis",
  shortLabel: "Birth chart",
  description: "Sun, Moon, Ascendant, and full chart synthesis",
  defaultPrompt: "Analyze my birth chart through my Sun, Moon, and Ascendant, including the houses they fall in.",
  menuGroup: "primary",
  implemented: true,
  requiresBirthData: true,
  fallbackInjectionText: "[BIRTH CHART ANALYSIS MODE]\nYou are performing a Birth Chart analysis...",
}
```

Remove `birth_chart_core` and `birth_chart_full` from `ORACLE_FEATURE_KEYS`.

Update `isBirthChartFeature`:
```typescript
export function isBirthChartFeature(
  featureKey?: string | null,
): featureKey is "birth_chart" {
  return featureKey === "birth_chart";
}
```

#### Step 2: Add `depth` field to session schema

`convex/schema.ts:oracle_sessions` needs a new optional field:

```typescript
birthChartDepth: v.optional(v.union(v.literal("core"), v.literal("full"))),
```

Also add the corresponding mutations:
- `updateSessionBirthChartDepth` in `convex/oracle/sessions.ts`

#### Step 3: New universal birth context builder

In `src/lib/oracle/featureContext.ts`, add:

```typescript
export function buildUniversalBirthContext(birthData: OracleBirthData): string {
  const lines = [
    "[BIRTH CHART DATA]",
    "Treat the stored chart data below as canonical truth. Do not invent different signs, houses, or aspects.",
    ...formatBirthHeader(birthData),
    "",
    "Canonical stored placements:",
  ];

  const placements = getAllPlacements(birthData);
  lines.push(...placements.map(formatPlacementLine));

  if (birthData.chart?.houses.length) {
    lines.push("", "House signatures:");
    lines.push(birthData.chart.houses.map((h) => `H${h.id}:${getSignName(h.signId)}`).join(" | "));
  }

  if (birthData.chart?.aspects.length) {
    lines.push("", "Stored aspects:");
    lines.push(
      ...birthData.chart.aspects.slice().sort((a, b) => a.orb - b.orb).slice(0, 8).map(formatAspectLine),
    );
  }

  lines.push("", "[END BIRTH CHART DATA]");
  return lines.join("\n");
}
```

**This ALWAYS returns the full chart.** No more throwing away data.

#### Step 4: Dynamic instruction injections

Add two new entries to `oracle_feature_injections` (or hardcode as fallback):

**Core instructions** (`birth_chart_depth_core`):
```
[BIRTH CHART READING — CORE DEPTH]
Focus on how the Big Three (Sun, Moon, Ascendant) interact as a triad.
Explain each house placement — the house IS the context, the sign is the style.
For aspects, prioritize the tightest orbs. Name what the aspect creates.
Identify the primary tension or friction point and name it directly.
Output format: 1) Chart Ruler / Core Identity, 2) The Big Three, 3) Key Aspects, 4) Tension/Friction.
[END BIRTH CHART READING — CORE DEPTH]
```

**Full instructions** (`birth_chart_depth_full`):
```
[BIRTH CHART READING — FULL DEPTH]
Give a layered interpretation of the full chart while staying anchored to the stored placements.
Prioritize deeper synthesis: themes, clusters, houses, aspects, Nodes, Part of Fortune.
Identify the primary tension AND the primary gift. Name both directly.
[END BIRTH CHART READING — FULL DEPTH]
```

These instruction blocks are swapped based on `session.birthChartDepth` (or default to `core` for manual menu selection without depth qualifier).

#### Step 5: Update `convex/oracle/llm.ts`

Replace the feature-gated natal context block with universal birth context:

```typescript
// ── Universal birth context (always inject full data if available) ───────────
let birthContext = "";
if (user?.birthData) {
  birthContext = buildUniversalBirthContext(user.birthData);
}

// ── Dynamic feature injection ────────────────────────────────────────────
let featureInjection = "";
if (activeFeature?.key === "birth_chart") {
  const depth = session.birthChartDepth ?? "core";
  const depthInstructions = await ctx.runQuery(
    api.oracle.features.getFeatureInjection,
    { featureKey: `birth_chart_depth_${depth}` },
  );
  featureInjection = depthInstructions?.contextText ?? getDefaultBirthInstructions(depth);
} else if (activeFeature) {
  const featureRecord = await ctx.runQuery(api.oracle.features.getFeatureInjection, {
    featureKey: activeFeature.key,
  });
  featureInjection = featureRecord?.contextText ?? activeFeature.fallbackInjectionText ?? "";
}
```

### 9.3 Tool: `journal_recall` — New Auto-Activation

**Requires:**
1. `hasJournalConsent === true`
2. Question matches `JOURNAL_RECALL_PATTERNS`

**Data budget:**
- Normal session with journal consent: standard budget (4,000 chars, 10 entries)
- Cosmic Recall session (`journal_recall` active): expanded budget (8,000 chars, 20 entries)

**Behavior when consent is missing:**
- Do NOT auto-activate.
- The AI responds without journal context.
- Optional future UX: the AI could tell the user to enable journal access, but this is out of scope for v2.

---

## 10. Session State & Persistence Rules

### 10.1 Rule: Auto-Activation Sets `session.featureKey` AND `session.birthChartDepth`

When `classifyOracleToolIntent` returns a result:

```typescript
if (intent.featureKey) {
  await ctx.runMutation(api.oracle.sessions.updateSessionFeature, {
    sessionId: args.sessionId,
    featureKey: intent.featureKey,
  });
  if (intent.depth) {
    await ctx.runMutation(api.oracle.sessions.updateSessionBirthChartDepth, {
      sessionId: args.sessionId,
      depth: intent.depth,
    });
  }
}
```

### 10.2 Rule: Birth Data is Session-Agnostic

`birthContext` is **not persisted on the session**. It is rebuilt on every message from `user.birthData`. This ensures:
- If the user updates their birth data mid-session, the next message sees the new chart.
- No stale data.
- No token overhead beyond the single prompt build.

### 10.3 Rule: First Message = Classification Gate (with relaxation)

Auto-classification runs on the **first message** in a session. If `session.featureKey` is already set (manually or from prior auto-activation), skip classification.

**Relaxed rule for generic sessions:** If `featureKey === null`, reclassify on ANY message. This covers:
- Message 1: *"Hey"* → no tool
- Message 2: *"Analyze my birth chart"* → auto-activate `birth_chart`

Once a tool is set, it stays locked.

### 10.4 Rule: One Active Tool Per Session

The schema currently supports one `featureKey` per session. This is fine for v2.

Multi-tool sessions (e.g., birth chart + synastry) are out of scope.

---

## 11. Cross-Context Mixing

This is the biggest UX win of v2.

### What works now

| Session type | Birth data visible | Journal visible | Timespace visible |
|--------------|-------------------|-----------------|-------------------|
| Generic chat (no tool) | ✅ (if saved) | ✅ (if consent) | ✅ |
| `birth_chart` | ✅ | ✅ (if consent) | ✅ |
| `journal_recall` | ✅ (if saved) | ✅ | ✅ |

### Example: Cosmic Recall + Birth Chart

User: *"Look through my journal and tell me why my relationships have been so intense lately."*

**Injected context:**
```
[SYSTEM PROMPT]
[COSMIC RECALL MODE] instructions
...
[BIRTH CHART DATA]
Sun: Gemini (H11) | Moon: Cancer (H12) | ... all placements ...
House signatures: H1:Leo | ...
Stored aspects: Sun conjunction Venus (orb 1.66°) | ...
[END BIRTH CHART DATA]
[JOURNAL CONTEXT]
... recent entries ...
[END JOURNAL CONTEXT]
[CURRENT SPACE-TIME]
User's local time: Monday, April 27, 2026 at 5:12 PM EDT
...
[END CURRENT SPACE-TIME]

USER MESSAGE
Look through my journal and tell me why my relationships have been so intense lately.
```

The AI can now:
1. Search journal entries for relationship mentions.
2. See that the user has Sun-Venus conjunction in Gemini (H11 — house of friendship/community).
3. Check if any transits are currently activating Venus.
4. Give an answer that connects journal patterns + birth chart + current transits.

**This is the future of the Oracle.**

---

## 12. Edge Cases & Guardrails

### 12.1 Ambiguous Queries

**Example:** *"Tell me about my chart and my journal."*

- Priority order: journal wins (`journal_recall`).
- Birth data is still injected universally, so the AI sees the chart even though the active tool is Cosmic Recall.
- **No data loss.** This is the whole point of universal context.

### 12.2 Missing Birth Data

If the user asks *"analyze my chart"* but has no `birthData`:
- Intent classification returns `null`.
- No `birthContext` is built.
- The AI responds generically. No harm done.

### 12.3 Missing Journal Consent

If the user asks *"what did I journal about last week"* but has no consent:
- Intent classification returns `null` (consent gate blocks activation).
- No `journalContext` is built.
- The AI responds without journal data.

### 12.4 Follow-Up Reclassification

**Example:**
- Message 1: *"Hey"*
- Message 2: *"Analyze my birth chart"*
- Message 3: *"What about my journal from last month?"*

With relaxed rule (§10.3):
- Message 2: `featureKey` set to `birth_chart`.
- Message 3: `featureKey` is already set → skip reclassification.
- Result: Message 3 is treated as a birth chart follow-up, NOT a Cosmic Recall request.

**Resolution:** Accept this for v2. Users who want to switch tools start a new session. This is the same behavior as clicking `[+]` → selecting a new feature in the current UI.

### 12.5 Token Budget for Universal Birth Data

Full birth data injection costs ~450 tokens vs. ~175 tokens for the old core-only data.

**Mitigation:**
- The prompt builder already limits context window size (see `MAX_CONTEXT_CHARS = 16000` in `llm.ts`).
- If conversation history is long, older messages are dropped first.
- Birth data is rebuilt fresh per-message, not appended to history.
- **Net impact:** ~0.03 cents extra per message. Negligible.

---

## 13. File-by-File Change Log

### File 1: `convex/schema.ts`

**Add to `oracle_sessions`:**
```typescript
birthChartDepth: v.optional(v.union(v.literal("core"), v.literal("full"))),
```

### File 2: `src/lib/oracle/features.ts`

1. Remove `"birth_chart_core"` and `"birth_chart_full"` from `ORACLE_FEATURE_KEYS`.
2. Add `"birth_chart"`.
3. Replace the two feature definitions with the unified one (§9.2).
4. Rename `classifyUserIntent` → `classifyOracleToolIntent`.
5. Update interface to include `depth` and `reason`.
6. Add `BIRTH_CHART_FULL_PATTERNS` and `JOURNAL_RECALL_PATTERNS`.
7. Update `isBirthChartFeature` to only match `"birth_chart"`.

### File 3: `src/lib/oracle/featureContext.ts`

1. Add `buildUniversalBirthContext(birthData)` — always full chart (§9.2).
2. Optionally deprecate `buildCoreFeatureContext` and `buildFullFeatureContext` (or remove entirely).
3. Update any comment references from "natal" to "birth".

### File 4: `convex/oracle/llm.ts`

**Major refactor:**

1. Update import from `classifyUserIntent` to `classifyOracleToolIntent`.
2. After loading user, always build `birthContext` if `user.birthData` exists:
   ```typescript
   let birthContext = "";
   if (user?.birthData) {
     birthContext = buildUniversalBirthContext(user.birthData);
   }
   ```
3. Run intent classification with `hasJournalConsent`:
   ```typescript
   const journalConsent = user ? await ctx.runQuery(api.journal.consent.getConsent) : null;
   const hasJournalConsent = journalConsent?.oracleCanReadJournal === true;
   
   const intent = classifyOracleToolIntent(
     args.userQuestion,
     session.featureKey ?? null,
     Boolean(user?.birthData),
     hasJournalConsent,
   );
   ```
4. If intent matches, update session feature AND depth:
   ```typescript
   if (intent.featureKey) {
     await ctx.runMutation(api.oracle.sessions.updateSessionFeature, {
       sessionId: args.sessionId,
       featureKey: intent.featureKey,
     });
     if (intent.depth) {
       await ctx.runMutation(internal.oracle.sessions.updateSessionBirthChartDepth, {
         sessionId: args.sessionId,
         depth: intent.depth,
       });
     }
     activeFeature = getOracleFeature(intent.featureKey);
   }
   ```
5. Replace feature-gated natal context with universal birth context.
6. For `birth_chart` active feature, load depth-specific instructions instead of generic feature injection.
7. Pass `birthContext` instead of `natalContext` to `buildPrompt`.

### File 5: `convex/oracle/sessions.ts`

Add new mutation:
```typescript
export const updateSessionBirthChartDepth = internalMutation({
  args: {
    sessionId: v.id("oracle_sessions"),
    depth: v.union(v.literal("core"), v.literal("full")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { birthChartDepth: args.depth });
  },
});
```

### File 6: `lib/oracle/promptBuilder.ts`

**Already renamed in this pass:** `natalContext` → `birthContext`, `[NATAL CHART DATA]` → `[BIRTH CHART DATA]`.

No further changes needed for v2.

### File 7: `src/components/oracle/input/oracle-input.tsx`

Update the `[+]` menu to show only the unified `birth_chart` feature instead of two separate options.

Change:
```typescript
const activeFeature = getOracleFeature(featureKey)
const showBirthPreview = isBirthChartFeature(featureKey)
```

This already works because `isBirthChartFeature` will return true for `"birth_chart"`.

### File 8: `src/lib/oracle/birthCalculator.ts` (renamed from `natalCalculator.ts`)

**Already renamed in this pass.** All internal names updated.

### File 9: `lib/oracle/soul.ts`

**Already updated in this pass.** "natal placements" → "birth placements".

### File 10: `convex/oracle/features.ts` (table queries)

Ensure `getFeatureInjection` query works with new `birth_chart_depth_core` and `birth_chart_depth_full` keys (if using DB injection). If using hardcoded fallback text, no DB changes needed.

---

## 14. Testing Checklist

### 14.1 Naming Verification

Run this grep and confirm only user-facing regex patterns contain "natal":
```bash
grep -rni "natal" src/lib/oracle/ convex/oracle/ lib/oracle/
# Expected: only features.ts intent classification regexes
```

### 14.2 Birth Chart Core

| Prompt | Expected `featureKey` | Expected `depth` |
|--------|----------------------|------------------|
| "analyze my birth chart" | `birth_chart` | `core` |
| "tell me about my Sun sign" | `birth_chart` | `core` |
| "what does my chart say about me" | `birth_chart` | `core` |
| "read my chart" | `birth_chart` | `core` |

**Verify:** The AI sees ALL placements (not just Sun/Moon/Ascendant), but the instruction block tells it to focus on the Big Three.

### 14.3 Birth Chart Full

| Prompt | Expected `featureKey` | Expected `depth` |
|--------|----------------------|------------------|
| "deep dive into my birth chart" | `birth_chart` | `full` |
| "full chart analysis" | `birth_chart` | `full` |
| "analyze ALL my placements" | `birth_chart` | `full` |
| "what about my Venus and Mars" | `birth_chart` | `full` |
| "read my entire natal chart" | `birth_chart` | `full` |
| "synthesize my full chart" | `birth_chart` | `full` |

**Verify:** The AI receives full instruction block (no rigid skeleton) + same full data as core.

### 14.4 Cosmic Recall

| Prompt | Expected `featureKey` |
|--------|----------------------|
| "cosmic recall" | `journal_recall` |
| "look through my journal" | `journal_recall` |
| "what did I journal about last week" | `journal_recall` |
| "find patterns in my journal" | `journal_recall` |
| "what was I experiencing on March 15" | `journal_recall` |

**Verify:** `journalContext` is present in the system prompt. `birthContext` is also present if user has birth data.

### 14.5 Cross-Context Mixing

1. User with birthData + journal consent starts session.
2. Types: *"look through my journal and tell me how my Sun-Venus conjunction shows up"*
3. Verify:
   - `session.featureKey === "journal_recall"`
   - `birthContext` is non-empty in the prompt
   - `journalContext` is non-empty in the prompt
   - AI can reference both Venus placement and journal entries.

### 14.6 Negative Tests (No Auto-Activation)

| Prompt | Expected `featureKey` |
|--------|----------------------|
| "What's astrology?" | `null` |
| "Tell me about Pisces" | `null` |
| "I was reading about birth charts" | `null` |
| "analyze my birth chart" (no birthData) | `null` |
| "look through my journal" (no consent) | `null` |

### 14.7 Session Persistence

1. Start new session → send *"analyze my birth chart"*
2. Verify `featureKey === "birth_chart"`, `depth === "core"`
3. Send follow-up: *"what about my Moon?"*
4. Verify session still has `featureKey === "birth_chart"`, `birthContext` re-injected.

---

## 15. Future Work

- **Multi-tool per message:** Allow one user message to activate multiple instruction blocks (e.g., synastry + birth chart + journal).
- **Inline tool switching:** *"Actually, switch to Cosmic Recall"* — parse tool-switch intent mid-session.
- **NLU classifier:** If regex false-positive rate grows, replace patterns with a lightweight local model or a one-shot LLM call.
- **Attachment tool:** When `attach_files` is implemented, allow image analysis alongside text.
- **Instruction templates from DB:** Currently, birth chart instructions are hardcoded. Admin should be able to edit them via the settings panel.

---

*End of document. Naming refactor and architecture update complete.*
