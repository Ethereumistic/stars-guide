# Oracle AI System — Intent Classification (Auto-Activation)

> Source: ORACLE_EXPLAINED.md §13

The Oracle can automatically activate features based on the user's natural language question, without requiring the user to click the `[+]` menu. This is handled by `classifyOracleToolIntent()` in `src/lib/oracle/features.ts`.

---

## Interface

```typescript
export type BirthChartDepth = "core" | "full";

export interface ToolIntentResult {
  featureKey: OracleFeatureKey | null;  // The tool to auto-activate, or null
  depth?: BirthChartDepth;              // For birth_chart only: reading depth
  reason: string;                       // Why this decision was made
}
```

---

## Pipeline

When `invokeOracle` runs and no feature is active on the session:

1. Fetch journal consent status
2. Call `classifyOracleToolIntent(question, currentFeatureKey, hasBirthData, hasJournalConsent)`
3. If intent matches, persist both `featureKey` and `depth` to the session:
   ```typescript
   if (intent.featureKey) {
       await ctx.runMutation(api.oracle.sessions.updateSessionFeature, {
           sessionId, featureKey: intent.featureKey,
       });
       if (intent.depth) {
           await ctx.runMutation(internal.oracle.sessions.updateSessionBirthChartDepth, {
               sessionId, depth: intent.depth,
           });
       }
   }
   ```

---

## Priority Order

Classification follows a strict priority order:

1. **If feature already active** → return `{ featureKey: null, reason: "manual" }` — never override explicit user choice
2. **Journal recall patterns** → if matched AND `hasJournalConsent === true` → `{ featureKey: "journal_recall", reason: "journal_intent" }`
3. **Birth chart full patterns** → if matched AND `hasBirthData === true` → `{ featureKey: "birth_chart", depth: "full", reason: "deep_chart_intent" }`
4. **Birth chart core patterns** → if matched AND `hasBirthData === true` → `{ featureKey: "birth_chart", depth: "core", reason: "core_chart_intent" }`
5. **No match** → `{ featureKey: null, reason: "no_match" }`

**Why journal before birth chart:** Journal intent is explicit ("journal", "entries", "Cosmic Recall"). Birth chart intent is broader ("chart", "placements"). Running journal first prevents a journal question like *"What did I journal about my chart?"* from being misclassified as a birth chart request.

---

## Consent Gates

Both birth chart and journal recall are consent-gated at the classifier level:
- **No birth data** → `birth_chart` patterns return `null`, no auto-activation
- **No journal consent** → `journal_recall` patterns return `null`, no auto-activation

This means the AI responds generically without the relevant context, which is the correct behavior — the user simply hasn't provided the required data or consent.

---

## Pattern Sets

**`BIRTH_CHART_FULL_PATTERNS`** (10 patterns, checked before core — more specific):
```
"deep analysis of my chart", "deep dive into my chart", "all my placements",
"read my entire chart", "Venus in my chart", "what about my nodes",
"my houses", "aspects in my chart", "synthesize my full chart",
"chart ruler", "domicile", "exaltation"
```

**`BIRTH_CHART_CORE_PATTERNS`** (9 patterns, broader):
```
"analyze my birth chart", "my Sun sign", "what does my chart say",
"read my chart", "my birth chart", "dive into my chart",
"what do my placements", "interpret my chart", "full chart analysis"
```

**`JOURNAL_RECALL_PATTERNS`** (12 patterns, explicit journal intent):
```
"cosmic recall", "recall my journal", "look through my journal",
"search my journal", "what did I journal about", "my journal entries",
"patterns in my journal", "connect my journal to astrology",
"what was I experiencing based on my journal", "my journal says",
"what happened on [date]", "dig into my journal"
```

User-facing patterns intentionally include `natal\s*chart` as a synonym — users do say "natal chart", and the regexes match it alongside "birth chart".

---

## Reclassification

If `session.featureKey` is already set (manually or from prior auto-activation), classification is skipped. This means:
- Once a tool is set, it stays locked for the session
- Users who want to switch tools start a new session (same behavior as clicking `[+]` → selecting a new feature)

---

## Relaxed Rule for Generic Sessions

When `featureKey === null` (no feature active), classification re-runs on EVERY message (not just the first). This covers:
- Message 1: "Hey" → no tool
- Message 2: "Analyze my birth chart" → auto-activate `birth_chart`

Once a tool is activated, it persists for the session.

---

## Wiring — Intent Classification in the invokeOracle Pipeline

```
invokeOracle entry
       │
       ├── ... (kill switch, crisis, input validation) ...
       │
       ├── Check journal consent (needed before classification)
       │       └── hasJournalConsent = consent?.oracleCanReadJournal === true
       │
       ├── Resolve current feature from session
       │       └── currentFeatureKey = session.featureKey
       │
       ├── Has birth data? hasBirthData = !!user.birthData
       │
       ├── If currentFeatureKey === null:
       │       │
       │       ├── classifyOracleToolIntent(question, null, hasBirthData, hasJournalConsent)
       │       │       │
       │       │       ├── Check: feature already active? → return null (never override)
       │       │       ├── Check: journal_recall patterns + hasJournalConsent → activate journal_recall
       │       │       ├── Check: birth_chart_full patterns + hasBirthData → activate birth_chart/full
       │       │       ├── Check: birth_chart_core patterns + hasBirthData → activate birth_chart/core
       │       │       └── No match → return null
       │       │
       │       └── If intent.featureKey !== null:
       │               ├── updateSessionFeature(sessionId, featureKey) ──▶ oracle_sessions
       │               └── updateSessionBirthChartDepth(sessionId, depth) ──▶ oracle_sessions
       │
       │   (After this, the feature injection step picks up the newly set feature)
       │
       └── Continue to feature injection → prompt building → LLM call

Key connections:
  - Journal consent check MUST happen before classification (gates journal_recall auto-activation)
  - Classification writes back to oracle_sessions (featureKey + birthChartDepth)
  - Feature injection (see 10-feature-system.md) then reads these values
  - Birth data availability gates birth_chart auto-activation but NOT data injection
```