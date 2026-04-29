# Oracle AI System — Master Wiring Guide

> This document provides a complete map of how every Oracle component connects, what data flows where, and what depends on what. Use this as the entry point for understanding the system — then follow links to individual component docs for details.

---

## Document Index

| # | Document | What It Covers |
|---|----------|---------------|
| 01 | [Architecture Overview](./01-architecture-overview.md) | Three-layer architecture (Frontend → Backend → Providers), key properties |
| 02 | [Database Schema](./02-database-schema.md) | Five Convex tables, fields, relationships |
| 03 | [Admin Configuration](./03-admin-configuration.md) | Six-tab admin UI, all settings, authentication |
| 04 | [Prompt Assembly Pipeline](./04-prompt-assembly-pipeline.md) | Seven-block system prompt, two-block user message, history, sanitization |
| 05 | [Model Chain & Providers](./05-model-chain-providers.md) | Multi-provider fallback chain, request construction, API key resolution |
| 06 | [Streaming Architecture](./06-streaming-architecture.md) | SSE streaming, flush intervals, Convex mutations, timing instrumentation |
| 07 | [Safety & Crisis Detection](./07-safety-crisis-detection.md) | Hardcoded safety rules, crisis keywords, kill switch, input validation, sanitization |
| 08 | [Session Management](./08-session-management.md) | Session lifecycle, CRUD operations, legacy migration |
| 09 | [Quota System](./09-quota-system.md) | Per-role quotas, lifetime vs rolling, increment-on-success-only |
| 10 | [Feature System](./10-feature-system.md) | Seven features, selection flow, injection mechanism, default prompts |
| 11 | [Birth Context Injection](./11-birth-context-injection.md) | Universal birth data, depth instructions, data-vs-instructions separation |
| 12 | [Journal Context Injection](./12-journal-context-injection.md) | Consent-gated journal context, budgets, Cosmic Recall, journal prompts |
| 13 | [Intent Classification](./13-intent-classification.md) | Auto-activation, pattern sets, priority order, consent gates |
| 14 | [Cross-Context Mixing](./14-cross-context-mixing.md) | How birth/journal/timespace contexts coexist in prompts |
| 15 | [User-Facing Flow](./15-user-facing-flow.md) | End-to-end walkthrough from opening Oracle to seeing response |
| 16 | [Operational Controls](./16-operational-controls.md) | Kill switch, fallback text, crisis text |
| 17 | [Session Title Generation](./17-session-title-generation.md) | TITLE: parsing, fallback derivation |
| 18 | [Design Decisions](./18-design-decisions.md) | Sixteen key trade-offs and their rationale |
| 19 | [Debug Panel](./19-debug-panel.md) | Admin observability, model override, timing metrics, token counters |

---

## The Big Picture: How Everything Connects

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER (Browser)                                │
│   /oracle/new ─── /oracle/chat/[id] ─── /admin/oracle/settings            │
│   Zustand Store (pendingQuestion, selectedFeatureKey, debug state)         │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ Convex React hooks
                           │ (useQuery, useMutation, useAction)
┌──────────────────────────▼──────────────────────────────────────────────┐
│                         CONVEX BACKEND                                     │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    invokeOracle (THE ORCHESTRATOR)                   │  │
│  │                                                                      │  │
│  │  This is the central action that wires everything together.          │  │
│  │  Every other component either feeds into it or reads from it.       │  │
│  │                                                                      │  │
│  │  ORDER OF OPERATIONS:                                                │  │
│  │  1. Kill switch check ──────────▶ [7-Safety] oracle_settings        │  │
│  │  2. Crisis detection ───────────▶ [7-Safety] keyword scan           │  │
│  │  3. Input validation ───────────▶ [7-Safety] length check           │  │
│  │  4. Load session + messages ────▶ [8-Sessions] oracle_sessions      │  │
│  │  5. Load runtime settings ──────▶ [3-Admin] oracle_settings          │  │
│  │  6. Load user + birthData ──────▶ [11-BirthContext] user table       │  │
│  │  7. Build universal birth context─▶ [11-BirthContext] → user msg     │  │
│  │  8. Resolve active feature ─────▶ [10-Features] session.featureKey  │  │
│  │  9. Check journal consent ──────▶ [12-Journal] journal_consent      │  │
│  │  10. Intent classification ─────▶ [13-Intent] may update session     │  │
│  │  11. Build feature injection ──▶ [10-Features] depth instructions   │  │
│  │  12. Assemble journal context ──▶ [12-Journal] → system prompt blk4  │  │
│  │  13. Build timespace context ──▶ → system prompt blk3.5             │  │
│  │  14. Assemble full prompt ─────▶ [4-Prompt] safety+soul+feature+    │  │
│  │                                   timespace+journal+title+birth+q    │  │
│  │  15. Append debug model override ▶ [19-Debug] prepend to chain      │  │
│  │  16. Iterate model chain ──────▶ [5-ModelChain] Tier A→B→C→D        │  │
│  │  17. Stream response ──────────▶ [6-Streaming] SSE → Convex → UI   │  │
│  │  18. Parse title ──────────────▶ [17-Title] update session.title    │  │
│  │  19. Parse journal prompt ─────▶ [12-Journal] store on message     │  │
│  │  20. Increment quota ──────────▶ [9-Quota] only on success          │  │
│  │  21. Persist timing metrics ────▶ [19-Debug] patchMessageTiming      │  │
│  │  22. Finalize message ─────────▶ [6-Streaming] finalizeStreaming    │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  Supporting modules (called by invokeOracle or by the frontend):          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │ sessions.ts  │ │  quota.ts     │ │ settings.ts  │ │ debug.ts     │     │
│  │ CRUD +       │ │  checkQuota  │ │  read/write  │ │  providers   │     │
│  │ streaming    │ │  increment   │ │  settings     │ │  list query  │     │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘     │
└────────────────────────────────────────────────────────────────────────────┘
                           │ fetch (OpenAI-compatible API)
┌──────────────────────────▼──────────────────────────────────────────────┐
│                     INFERENCE PROVIDERS                                   │
│  OpenRouter, Ollama, OpenAI-compatible endpoints                          │
│  Configured via admin UI → oracle_settings → providers_config + model_chain│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Maps

### Map 1: Settings Flow (Admin → Runtime)

```
Admin UI tabs
  │
  ├── Soul tab ──────────────▶ upsertSetting("oracle_soul", ...) ──▶ oracle_settings
  ├── Providers tab ─────────▶ upsertProvidersConfig({...}) ──────▶ oracle_settings (providers_config)
  ├── Model tab ─────────────▶ upsertProvidersConfig + upsertSetting ▶ oracle_settings (model_chain, temperature, top_p, stream_enabled)
  ├── Limits tab ────────────▶ upsertSetting("max_response_tokens", ...) ──▶ oracle_settings
  ├── Quotas tab ────────────▶ upsertSetting("quota_limit_*", ...) ──────▶ oracle_settings
  └── Operations tab ───────▶ upsertSetting("kill_switch" / "crisis_response_text" / "fallback_response_text") ──▶ oracle_settings
                                                                                                │
                                                                                                ▼
                                                                                                invokeOracle reads ALL of these at runtime via loadRuntimeSettings()
                                                                                                │
                                                                                                ├── soul → [Block 2: System Prompt]
                                                                                                ├── temperature, top_p, max_tokens, stream → LLM request body
                                                                                                ├── providers_config → resolve provider for each chain entry
                                                                                                ├── model_chain → ordered fallback list
                                                                                                ├── kill_switch → early return check
                                                                                                ├── crisis_response_text → crisis response
                                                                                                ├── fallback_response_text → all-models-failed response
                                                                                                ├── max_context_messages → history truncation
                                                                                                └── quota_limit_* → quota checks
```

### Map 2: Prompt Assembly Flow (The Heart of the System)

```
invokeOracle assembles the prompt via buildPrompt() and buildSystemPrompt():

SYSTEM PROMPT (concatenation of blocks 1-6):
│
├── Block 1: [SAFETY RULES] ─────────── hardcoded in safetyRules.ts ── NOT editable
├── Block 2: [SOUL DOCUMENT] ─────────── from oracle_settings "oracle_soul" ── admin editable
├── Block 3: [FEATURE INJECTION] ─────── from active feature:
│   ├── birth_chart → depth instructions (core/full) ── oracle_feature_injections or hardcoded
│   ├── journal_recall → [COSMIC RECALL MODE] block ── oracle_feature_injections or hardcoded
│   └── (null) → no feature injection
├── Block 3.5: [TIMESPACE CONTEXT] ───── from buildTimespaceContext() ── always present, conditionally expanded
├── Block 4: [JOURNAL CONTEXT] ───────── from assembleJournalContext() ── consent-gated:
│   ├── oracleCanReadJournal === true → [JOURNAL CONTEXT] block with entry summaries
│   └── oracleCanReadJournal === false → null (no block)
├── Block 5: [TITLE DIRECTIVE] ───────── hardcoded in promptBuilder.ts ── only on first response
└── Block 6: [JOURNAL PROMPT DIRECTIVE] ── hardcoded ── only when journalContext present AND first response

USER MESSAGE (concatenation of 2 blocks):
│
├── Block 1: [BIRTH CHART DATA] ──────── from buildUniversalBirthContext(user.birthData) ── ALWAYS when birthData exists
└── Block 2: sanitized user question ──── sanitizeUserQuestion() strips [TAG...] injection attempts

CONVERSATION HISTORY (inserted between system prompt and final user message):
│
└── Last N messages from oracle_messages (N = max_context_messages, default 20)
    Truncated to MAX_CONTEXT_CHARS = 16000 (~4000 tokens)
    Last user message removed if it matches current question
```

### Map 3: Feature Activation Flow

```
Feature can be activated two ways:

  ┌─────────────────────────────────┐    ┌──────────────────────────────────┐
  │  MANUAL: User clicks [+] menu   │    │  AUTO: Intent classifier detects  │
  │  in OracleInput component       │    │  feature intent in user question   │
  │                                 │    │                                   │
  │  → onFeatureSelect(featureKey)  │    │  → classifyOracleToolIntent()     │
  │  → Zustand store update         │    │  → Consent gates:                 │
  │  → createSession(featureKey)     │    │    birth_chart requires hasBirthData│
  │    OR                           │    │    journal_recall requires          │
  │  → updateSessionFeature(mutation)│   │      hasJournalConsent             │
  │                                 │    │  → updateSessionFeature(mutation)  │
  └──────────────┬──────────────────┘    └──────────────┬───────────────────┘
                 │                                      │
                 └──────────────┬───────────────────────┘
                                │
                                ▼
                 oracle_sessions.featureKey is set
                 oracle_sessions.birthChartDepth is set (for birth_chart)
                                │
                                ▼
                 invokeOracle reads these and resolves:
                 ├── getOracleFeature(featureKey) → OracleFeatureDefinition
                 ├── For birth_chart: getBirthChartDepthInstructions(depth)
                 │   → instruction block → SYSTEM PROMPT Block 3
                 ├── For journal_recall: [COSMIC RECALL MODE] block
                 │   → instruction block → SYSTEM PROMPT Block 3
                 └── Birth data ALWAYS injected in USER MESSAGE Block 1
                    (regardless of which feature is active)
```

### Map 4: Context Mixing (The v2 Architecture)

```
Three independent context sources coexist in every prompt:

  ┌─────────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐
  │   BIRTH DATA         │  │  JOURNAL CONTEXT     │  │  TIMESPACE CONTEXT   │
  │                      │  │                      │  │                      │
  │  Source: user.birthData│  │ Source: journal entries│  │ Source: user timezone │
  │  Gate: user has       │  │ Gate: consent         │  │ Gate: always on      │
  │       birthData saved │  │     = oracleCanRead..│  │   (expanded with     │
  │                      │  │       Journal         │  │    temporal intent)   │
  │  Injected: USER MSG   │  │ Injected: SYS BLK 4 │  │  Injected: SYS BLK 3.5│
  │  Block 1              │  │                      │  │                      │
  │  Always full data    │  │ Budget:               │  │  Always local dt+tz  │
  │  (not feature-gated) │  │  Normal = 4000 chars  │  │  + cosmic weather    │
  │                      │  │  Cosmic Recall = 8000 │  │    when relevant     │
  └──────────┬───────────┘  └──────────┬───────────┘  └──────────┬──────────┘
             │                          │                          │
             └──────────────────────────┼──────────────────────────┘
                                        │
                               ALL THREE CAN COEXIST
                               in a single prompt

  This means:
  • A generic chat (no feature) still sees birth data + journal (if consented)
  • A birth_chart session still sees journal context (if consented)
  • A journal_recall session still sees full birth data (if saved)
  • Features add INSTRUCTIONS (what to focus on), not DATA (what to see)
```

### Map 5: Session Lifecycle

```
CREATE SESSION ─────────────────────────────────────────────────────────────
  │
  ├── User opens /oracle/new
  │     └── Queries: checkQuota, getSetting("kill_switch")
  │
  ├── User submits question (with optional feature selection)
  │     ├── createSession({ featureKey, questionText })
  │     │     ├── INSERT oracle_sessions (userId, featureKey, title, status="active")
  │     │     └── INSERT oracle_messages (role="user", content=questionText)
  │     │
  │     └── Navigate to /oracle/chat/{sessionId}
  │
  └── invokeOracle({ sessionId, userQuestion, timezone })
        │
        ├── [Safety checks: kill switch, crisis, input validation]
        ├── [Load settings, user, session]
        ├── [Build contexts: birth, feature, journal, timespace]
        ├── [Intent classification if no feature active]
        ├── [Assemble prompt]
        ├── [Iterate model chain → stream response]
        ├── [Parse title, parse journal prompt]
        └── [Persist: message, timing, quota, session metadata]

FOLLOW-UP MESSAGES ──────────────────────────────────────────────────────────
  │
  ├── addMessage({ sessionId, content }) → INSERT oracle_messages (role="user")
  └── invokeOracle({ sessionId, userQuestion, timezone })
        ↑ Same pipeline, but:
          • isFirstResponse = false → no title directive, no journal prompt directive
          • Full conversation history included in prompt
          • Quota NOT incremented (only first response counts)

SESSION OPERATIONS ────────────────────────────────────────────────────────────
  │
  ├── getUserSessions → last 50 sessions, ordered by recent
  ├── renameSession → update oracle_sessions.title
  ├── updateSessionFeature → change featureKey (manual or intent classification)
  ├── updateSessionBirthChartDepth → change depth (core/full)
  ├── setSessionStarType → assign "beveled" | "cursed" pin
  ├── updateSessionStatus → mark "active" | "completed"
  └── deleteSession → cascade delete messages then session
```

### Map 6: Streaming Data Flow

```
LLM Provider (SSE stream)
       │
       │  data: {"choices":[{"delta":{"content":"token"}}]}
       │
       ▼
callProviderStreaming() [convex/oracle/llm.ts]
       │
       ├── Before fetch:
       │     createStreamingMessage ──▶ INSERT oracle_messages (role="assistant", content="")
       │                                 └── Returns messageId (used for timing patches)
       │
       ├── During streaming:
       │     Every 100-300ms:
       │       updateStreamingContent ──▶ PATCH oracle_messages.content
       │       └── Triggers Convex reactivity → UI updates
       │
       │     Track: fetchStartTime, firstTokenTime, initialDecodeTime
       │     Track: promptTokens, completionTokens (from SSE usage chunk)
       │
       ├── On stream complete:
       │     parseTitleFromResponse(fullContent)
       │     parseJournalPromptFromResponse(fullContent)
       │     updateStreamingContent ──▶ PATCH oracle_messages.content (final, cleaned)
       │     finalizeStreamingMessage ──▶ PATCH oracle_messages (modelUsed, tokens, tier, hash, status)
       │     └── Also updates oracle_sessions (primaryModelUsed, usedFallback)
       │
       └── After streaming:
             patchMessageTiming ──▶ PATCH oracle_messages (timing metrics, debugModelUsed)

Client-side:
       │
       ├── requestStartMs = Date.now() ──▶ Zustand: debugClientTiming.requestStartMs
       ├── Invoke invokeOracle action
       ├── useEffect watches oracle_messages:
       │     When assistant message first has content:
       │       firstContentMs = Date.now() ──▶ Zustand: debugClientTiming.firstContentMs
       ├── Action resolves:
       │     completeMs = Date.now() ──▶ Zustand: debugClientTiming.completeMs
       │     result.timingMetrics ──▶ Zustand: debugLastMetrics
       │     result.debugModelUsed ──▶ Zustand: debugDebugModelUsed

Debug Panel reads from:
       │
       ├── Primary: oracle_messages fields (timingPromptBuildMs, etc.) via reactive query
       └── Secondary: Zustand store (debugLastMetrics, debugClientTiming)
```

---

## Critical Invariants

These are the architectural rules that must not be violated. If you're modifying the system, check these first:

| # | Invariant | Why It Matters | Enforced Where |
|---|-----------|---------------|----------------|
| 1 | **Safety rules are always Block 1, hardcoded** | Prevents admin from weakening safety; changes require code deploy | `lib/oracle/safetyRules.ts`, `lib/oracle/promptBuilder.ts` |
| 2 | **Kill switch and crisis responses never consume quota** | Users shouldn't be penalized for system-level blocks | `convex/oracle/llm.ts` (incrementQuota only after successful LLM response) |
| 3 | **Quota checks are server-authoritative** | Client can't bypass quota; client display is just a hint | `convex/oracle/quota.ts` |
| 4 | **API keys are never in the DB** | DB leak doesn't expose keys; only env var names stored | `convex/oracle/upsertProviders.ts`, `src/lib/oracle/providers.ts` |
| 5 | **Birth data is always injected when available** | Enables cross-context mixing; no data thrown away by feature selection | `convex/oracle/llm.ts` calls `buildUniversalBirthContext` regardless of feature |
| 6 | **Journal context is always injected when consented** | Even non-Cosmic-Recall sessions can reference journal patterns | `convex/oracle/llm.ts` assembles journal context whenever `hasJournalConsent === true` |
| 7 | **Journal consent is server-enforced** | Client cannot bypass consent; `requiresJournalConsent` on features is a UX hint | `convex/journal/context.ts` checks `oracleCanReadJournal` server-side |
| 8 | **Journal context is non-blocking** | Journal failures don't stop Oracle from producing a reading | `convex/oracle/llm.ts` wraps journal assembly in try/catch |
| 9 | **Intent classification never overrides manual feature selection** | Once a user picks a feature, it stays locked for the session | `classifyOracleToolIntent` returns `null` if `currentFeatureKey` is set |
| 10 | **User input is sanitized** | `[TAG...]` patterns stripped to prevent prompt injection | `lib/oracle/promptBuilder.ts` `sanitizeUserQuestion()` |
| 11 | **Model chain fallback always terminates** | If all models fail, Tier D returns hardcoded fallback text | `convex/oracle/llm.ts` fallback after chain exhaustion |
| 12 | **Streaming message finalization always happens** | Even on errors, `finalizeStreamingMessage` is called with partial or recovery content | `convex/oracle/llm.ts` error handling in streaming path |
| 13 | **Title generation only happens on first response** | Follow-up messages don't overwrite the session title | `isFirstResponse` guard in `invokeOracle` |
| 14 | **Debug model override doesn't persist to DB** | Override is client-side only (Zustand), per-session; doesn't affect other users | Zustand `debugModelOverride`, not in `oracle_settings` |

---

## Component Dependency Graph

```
                    ┌─────────────────────┐
                    │   Admin UI (tabs)    │
                    └─────────┬───────────┘
                              │ upsertSetting / upsertProvidersConfig
                              ▼
                    ┌─────────────────────┐
                    │  oracle_settings     │ ← Single source of truth for configuration
                    └─────────┬───────────┘
                              │ read by invokeOracle at runtime
                              ▼
┌──────────┐    ┌──────────────────────────────────────────────────────┐
│  Convex  │    │                   invokeOracle                       │
│  Auth    │───▶│  (THE ORCHESTRATOR — reads everything, writes result) │
│(userId)  │    └──┬───────┬────────┬────────┬───────┬───────────┬──┘
└──────────┘       │       │        │        │       │           │
                   ▼       ▼        ▼        ▼       ▼           ▼
            ┌──────────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐ ┌──────────┐
            │Sessions  │ │Quota │ │User  │ │Safety│ │Prompt  │ │Model    │
            │(CRUD)    │ │(check│ │+Birth│ │Checks│ │Builder │ │Chain    │
            │          │ │incr) │ │Data  │ │      │ │        │ │(fetch)  │
            └──────────┘ └──────┘ └──────┘ └──────┘ └───┬────┘ └──────────┘
                                                          │
                                        ┌─────────────────┼─────────────────┐
                                        │                 │                 │
                                   ┌────▼────┐      ┌─────▼────┐     ┌─────▼─────┐
                                   │ Birth   │      │ Journal  │     │ Intent    │
                                   │ Context │      │ Context  │     │ Classify  │
                                   │ Builder │      │ Builder  │     │           │
                                   └─────────┘      └─────────┘     └───────────┘
                                        │                 │                 │
                                        │                 │                 │
                                   ┌────▼─────────────────▼─────────────────▼──┐
                                   │         Cross-Context Mixing               │
                                   │  Birth + Journal + Timespace coexist        │
                                   │  in every prompt when available/consented   │
                                   └───────────────────────────────────────────┘
```

---

## Quick Reference: invokeOracle Execution Order

For any AI agent modifying or debugging the system, this is the exact sequence of operations in `invokeOracle`:

```
1.   Check kill_switch ──────────────────────▶ [if ON] return fallback, no LLM, no quota
2.   Check crisis keywords ──────────────────▶ [if match] return crisis text, no LLM, no quota
3.   Validate input length ─────────────────▶ [if >2000 chars] reject
4.   Load session + messages ────────────────▶ oracle_sessions + oracle_messages
5.   Load runtime settings ─────────────────▶ soul, temperature, top_p, model_chain, providers, limits
6.   Load user (birthData, identity) ─────────▶ users table
7.   Build universal birth context ──────────▶ [BIRTH CHART DATA] block (always if birthData exists)
8.   Resolve active feature ─────────────────▶ session.featureKey + legacy migration
9.   Check journal consent ─────────────────▶ hasJournalConsent = consent?.oracleCanReadJournal
10.  Run intent classification ──────────────▶ [if no feature] classifyOracleToolIntent()
11.  Persist auto-activated feature ──────────▶ updateSessionFeature + updateSessionBirthChartDepth
12.  Build feature injection ────────────────▶ depth-specific instructions for birth_chart, etc.
13.  Assemble journal context ──────────────▶ [JOURNAL CONTEXT] block (if consented, expanded for Cosmic Recall)
14.  Build timespace context ───────────────▶ local datetime + cosmic weather (always, conditionally expanded)
15.  Build system prompt ───────────────────▶ safety + soul + feature + timespace + journal + title/prompt dir
16.  Build user message ────────────────────▶ birth data + sanitized question
17.  Build conversation history ────────────▶ last maxContextMessages, truncated to 16000 chars
18.  Prepend debug model override ──────────▶ [if admin debug] prepend to model chain as Tier A
19.  Iterate model chain ───────────────────▶ Tier A → B → C → ... until success
20.  Stream response ───────────────────────▶ SSE → updateStreamingContent every 100-300ms
21.  Parse title ───────────────────────────▶ TITLE: line extraction + cleanup
22.  Parse journal prompt ──────────────────▶ JOURNAL_PROMPT: line extraction
23.  Finalize message ──────────────────────▶ finalizeStreamingMessage (content, model, tokens, tier, hash)
24.  Patch timing metrics ─────────────────▶ patchMessageTiming (promptBuild, queue, TTFT, decode, total)
25.  Increment quota ───────────────────────▶ only on first response, only on success
26.  Update session metadata ───────────────▶ primaryModelUsed, usedFallback, title
27.  Return to client ─────────────────────▶ { content, modelUsed, fallbackTier, timingMetrics }
```

---

## How to Use These Documents

**For a new AI agent working on Oracle:**
1. Start with this Master Wiring Guide for the big picture
2. Read [01-architecture-overview](./01-architecture-overview.md) for the layer diagram
3. Read [04-prompt-assembly-pipeline](./04-prompt-assembly-pipeline.md) — this is the heart of the system
4. Read [15-user-facing-flow](./15-user-facing-flow.md) for end-to-end understanding
5. consult specific docs as needed for the component you're modifying

**For debugging a specific issue:**
- **No response / error**: Check [05-model-chain-providers](./05-model-chain-providers.md) (fallback chain)
- **Safety/crisis**: Check [07-safety-crisis-detection](./07-safety-crisis-detection.md) (kill switch, crisis keywords)
- **Wrong context**: Check [14-cross-context-mixing](./14-cross-context-mixing.md) (which blocks appear in the prompt)
- **Quota issues**: Check [09-quota-system](./09-quota-system.md) (increment logic)
- **Session issues**: Check [08-session-management](./08-session-management.md) (lifecycle)
- **Feature not activating**: Check [13-intent-classification](./13-intent-classification.md) (pattern matching, consent gates)
- **Timing/latency**: Check [19-debug-panel](./19-debug-panel.md) (timing metrics)
- **Streaming issues**: Check [06-streaming-architecture](./06-streaming-architecture.md) (SSE, flush intervals)

**For modifying a component:**
- Check the invariant table above — your change must not violate any of them
- Check the wiring maps to understand what feeds into and reads from your component
- Check [18-design-decisions](./18-design-decisions.md) — the original architect's rationale may affect your change