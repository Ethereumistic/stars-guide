# Oracle AI System — Intent Classification (Intent Router)

> The intent router determines which Oracle pipeline(s) to activate based on the user's message. It uses a fast LLM call for semantic understanding, falling back to regex patterns on failure.

---

## Architecture: Two-Path Router

```
User message arrives
       │
       ├── Session already has featureKey?
       │     YES → manual_selection, confidence 1.0, NO LLM CALL NEEDED
       │     NO → run intent router
       │
       ▼
  ┌─────────────────────────────────────────────────────────┐
  │  PRIMARY PATH: scoreIntentsWithLLM()                     │
  │                                                          │
  │  Fast LLM call (~200 tokens input, ~50 output)          │
  │  • Model: first available from model_chain               │
  │  • Temperature: 0.1 (deterministic classification)      │
  │  • max_tokens: 150                                       │
  │  • stream: false                                         │
  │  • Timeout: 3000ms                                       │
  │  • Cost: ~$0.00005 per call                              │
  │                                                          │
  │  Handles: typos, creative phrasing, multi-intent,        │
  │           non-English fragments, semantic understanding   │
  │                                                          │
  │  ON FAILURE (timeout, error, invalid JSON):              │
  │  └─→ FALLBACK PATH: scoreIntents()                       │
  │       Regex patterns from features.ts                    │
  │       Exact matching only, no semantic awareness          │
  └─────────────────────────────────────────────────────────┘
       │
       ▼
  IntentRouterResult: all detected intents sorted by confidence
       │
       ▼
  Filter by confidence ≥ 0.5, sort by confidence descending
       │
       ▼
  Resolve to active pipelines
       │
       ▼
  Persist primary intent as session.featureKey
```

---

## Why LLM Instead of Regex

The regex-based classifier (`classifyOracleToolIntent()` in `features.ts`) had fundamental flaws:

| Input | Regex Result | LLM Result |
|-------|-------------|------------|
| "analize my bierht chart" | `generic_chat` (miss) | `birth_chart` (hit) |
| "tell me what the stars say about love" | `generic_chat` (miss) | `birth_chart` (hit) |
| "look through my journal for patterns with my Venus" | `journal_recall` (partial miss) | `journal_recall` + `birth_chart` (both) |
| "mi carta astral" | `generic_chat` (miss) | `birth_chart` (hit) |
| "make me a sleep sound" | `binaural_beats` (maybe) | `binaural_beats` (confident) |
| "hey what's up" | `generic_chat` (correct) | `generic_chat` (correct) |

Regex needs exact matches — a single typo collapses the entire classification. The LLM understands semantic intent regardless of spelling.

---

## Files

| File | Role |
|------|------|
| `src/lib/oracle/intentRouter.ts` | `scoreIntentsWithLLM()` (LLM primary) + `scoreIntents()` (regex fallback) |
| `src/lib/oracle/intentRouterPrompt.ts` | System prompt, user message builder, JSON parser for the LLM call |
| `src/lib/oracle/features.ts` | Regex patterns (still used as fallback) + legacy `classifyOracleToolIntent()` (still used by admin debug page) |
| `src/lib/oracle/pipelineTypes.ts` | `IntentRouterResult`, `ScoredIntent`, `PipelineKey` types |

---

## The LLM Intent Router Prompt

The system prompt instructs the LLM to classify intent into one or more of four pipelines:

```
Available features:
- birth_chart: Chart reading, natal analysis, placement interpretation, transit analysis
- journal_recall: Journal pattern search, Cosmic Recall, emotional themes
- binaural_beats: Sound/frequency generation, meditation audio, binaural beats
- generic_chat: General conversation, casual chat
```

Key prompt rules:
- Match **intent**, not spelling — "analize" = analyze, "bierht" = birth
- Match **semantics**, not keywords — "what do my stars say about love?" = birth_chart
- Multiple features CAN be active simultaneously
- Chart depth: "deep"/"detailed"/"full" → depth=full, otherwise → depth=core
- If uncertain between generic_chat and another feature, prefer generic_chat

The user message includes feature availability (birth_chart always available, journal_recall requires consent) and the raw user message.

Response format: `{"intents":[{"pipeline":"birth_chart","confidence":0.9,"depth":"core"},...]}`

---

## Multi-Intent Scoring

The router returns ALL matched intents, not just one:

```typescript
interface IntentRouterResult {
  intents: ScoredIntent[];      // All intents, sorted by confidence (highest first)
  hasMatch: boolean;             // Whether ANY non-generic intent matched
  primary: ScoredIntent | null;  // The highest-confidence intent
}

interface ScoredIntent {
  pipelineKey: PipelineKey;      // "birth_chart" | "journal_recall" | "binaural_beats" | "generic_chat"
  confidence: number;            // 0-1
  reason: string;                // "llm_intent_router" | "manual_selection" | regex reasons
  metadata?: Record<string, unknown>;  // e.g., { depth: "full", hasBirthData: true }
}
```

This enables **pipeline composition**: a message like "search my journal for patterns with my Venus placement" can activate both `journal_recall` and `birth_chart` simultaneously. The orchestrator merges their data requirements and prompt blocks.

---

## Consent Gates

Consent gates are applied **after** routing, not before:

- **journal_recall**: If `hasJournalConsent === false`, the intent is filtered out from results even if the LLM detected it. The LLM doesn't know about consent state.
- **birth_chart**: Always detected regardless of birth data availability. If the user has no stored birth data, the pipeline injects a `[CHART DATA UNAVAILABLE]` system block instructing the AI to ask for it, rather than responding generically.

This is a critical design decision: **intent detection is never gated on data availability**. The AI should respond in chart-reading format and ask for data, not fall back to generic chat.

---

## Manual Selection Override

If `currentFeatureKey` is already set on the session (from a prior message or manual `[+]` menu selection), the router returns immediately:

```typescript
// Manual selection — no LLM call needed
{
  intents: [{ pipelineKey: "birth_chart", confidence: 1.0, reason: "manual_selection" }],
  hasMatch: true,
  primary: { pipelineKey: "birth_chart", confidence: 1.0, reason: "manual_selection" }
}
```

This means the LLM call only happens on the **first message** of a new session (when no feature is set yet). Subsequent messages use the persisted feature, adding zero latency.

---

## Regex Fallback Patterns

The regex patterns in `features.ts` serve as the **fallback path**. They are preserved exactly as they were and used when:

1. **LLM call times out** (3-second limit)
2. **LLM call errors** (network, rate limit, 5xx)
3. **LLM returns invalid JSON** (malformed response, extra text)
4. **All providers fail** (no available model)

The regex patterns cover common phrasings with exact matches:

- **BIRTH_CHART_INTENT_PATTERNS**: `"analyze my birth chart"`, `"my natal chart"`, `"what does my chart say"`, etc.
- **DEPTH_SIGNAL_FULL_PATTERNS**: `"in depth"`, `"detailed"`, `"full chart"`, `"all my placements"`, etc.
- **JOURNAL_RECALL_PATTERNS**: `"cosmic recall"`, `"search my journal"`, `"patterns in my journal"`, etc.
- **BINAURAL_INTENT_PATTERNS**: `"binaural beat"`, `"sleep frequency"`, `"meditation sound"`, etc.

### Regex Limitations (Why LLM Is Primary)

| Scenario | Regex | LLM |
|----------|-------|-----|
| Exact match: "analyze my birth chart" | ✅ | ✅ |
| Typo: "analize my bierht chart" | ❌ | ✅ |
| Creative: "what do my stars say about love?" | ❌ | ✅ |
| Multi-intent: "journal patterns with my Venus" | partial | ✅ (both) |
| Non-English: "mi carta astral" | ❌ | ✅ |
| Abbreviation: "do my chart" | ✅ (pattern match) | ✅ |

---

## Pipeline Resolution

After intent routing, the orchestrator resolves intents to active pipelines:

```typescript
const activePipelines: OraclePipeline[] = intentResult.intents
  .filter((i) => i.confidence >= 0.5)
  .map((intent) => getPipeline(intent.pipelineKey))
  .filter((p): p is OraclePipeline => p !== undefined);
```

Four pipelines are currently registered:

| Pipeline | key | Data Requirements | modelHint |
|----------|-----|-------------------|-----------|
| Birth Chart | `birth_chart` | birth data, journal, timespace | `"smart"` |
| Journal Recall | `journal_recall` | journal (expanded), timespace | `"smart"` |
| Binaural Beats | `binaural_beats` | birth data, timespace | `"creative"` |
| Generic Chat | `generic_chat` | timespace only | `"fast"` |

Each pipeline provides:
- `buildPromptBlocks(ctx)` → system blocks + user blocks
- `afterResponse?(content, ctx)` → post-processing hooks (e.g., binaural params)
- `dataRequirements` → what data the orchestrator should gather
- `modelHint` → preference for provider selection

---

## Wiring — Intent Routing in the invokeOracle Pipeline

```
invokeOracle entry
       │
       ├── ... (kill switch, crisis, input validation, load session/settings/user) ...
       │
       ├── Check journal consent (needed before routing)
       │       └── hasJournalConsent = consent?.oracleCanReadJournal === true
       │
       ├── Resolve current feature from session
       │       └── resolvedFeatureKey = session.featureKey (with legacy migration)
       │
       ├── Has birth data? hasBirthData = Boolean(user?.birthData)
       │
       ├── Intent routing:
       │       │
       │       ├── If currentFeatureKey is set:
       │       │       └── manual_selection, confidence 1.0 → NO LLM CALL
       │       │
       │       ├── Otherwise: scoreIntentsWithLLM()
       │       │       ├── Try LLM call with providers/modelChain from runtime settings
       │       │       │   ├── Build prompt: system (classifier) + user (message + features)
       │       │       │   ├── Call first available provider (timeout: 3s)
       │       │       │   ├── Parse JSON response → ScoredIntent[]
       │       │       │   ├── Filter by confidence ≥ 0.5
       │       │       │   ├── Gate journal_recall by consent
       │       │       │   └── Return IntentRouterResult
       │       │       │
       │       │       └── On LLM failure → scoreIntents() (regex fallback)
       │       │
       │       └── Result: IntentRouterResult with sorted intents
       │
       ├── Resolve pipelines from intents
       │       └── activePipelines = intents ≥0.5 confidence → pipeline objects
       │
       ├── Persist auto-activated feature
       │       └── updateSessionFeature(sessionId, primaryIntent.pipelineKey)
       │       └── updateSessionBirthChartDepth(sessionId, depth) if birth_chart
       │
       ├── Gather data per pipeline requirements
       │       ├── needsBirthData → buildUniversalBirthContext()
       │       ├── needsJournalContext → assembleJournalContext()
       │       └── needsTimespace → buildTimespaceContext()
       │
       ├── Build pipeline context (PipelineContext)
       │
       ├── Compose prompt blocks from ALL active pipelines
       │       ├── System blocks sorted by priority (safety first)
       │       └── User blocks from all pipelines + sanitized question
       │
       └── Continue to model chain → stream response

Key connections:
  - Journal consent check MUST happen before routing (gates journal_recall in results)
  - Routing writes back to oracle_sessions (featureKey + birthChartDepth)
  - Pipeline resolution reads feature injection from DB or hardcoded fallback
  - Birth data availability does NOT gate birth_chart detection — the pipeline handles missing data
  - The intent router LLM call uses the SAME model chain and providers as the main Oracle call
  - Only runs on the first message per session (subsequent messages use persisted featureKey)
```

---

## Logging

The intent router produces two log lines per message:

1. **Intent result**: `[Oracle] Intent: ["birth_chart(0.90:llm_intent_router)","journal_recall(0.70:llm_intent_router)"], hasBirthData=true, hasJournalConsent=true`
2. **Active pipelines**: `[Oracle] Active pipelines: birth_chart[needsBirth=true], journal_recall[needsBirth=false]`

On LLM failure, the router logs:
- `[IntentRouter] LLM call to {provider}/{model} returned {status}: ...` (on HTTP error)
- `[IntentRouter] LLM call to {provider}/{model} timed out after 3000ms` (on timeout)
- `[IntentRouter] Using regex fallback for intent classification` (on all providers failed)
- `[IntentRouter] LLM routing successful: birth_chart(0.90:llm_intent_router)` (on success)

---

## Reclassification

If `session.featureKey` is already set (manually or from prior auto-activation), the router short-circuits with `manual_selection` and makes **no LLM call**. This means:

- Once a feature is set, it stays locked for the session
- Subsequent messages add **zero latency** (no intent router call)
- Users who want to switch tools start a new session (same behavior as clicking `[+]` → selecting a new feature)

When no feature is set, intent routing runs on every message (not just the first). This covers:
- Message 1: "Hey" → `generic_chat`
- Message 2: "Analyze my birth chart" → `birth_chart` (auto-activates and persists)

Once activated, the featureKey persists for the session.