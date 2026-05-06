# EPIC: Oracle Pipeline Architecture — Intent-Routing + Concurrency-Aware Providers + Pipeline-Gated Data

> **Status:** Planning
> **Scope:** Refactor the Oracle's monolithic `invokeOracle` into a modular pipeline architecture
> **Goal:** Fix the "lobotomized chart" problem, enable feature composability (synastry + journal), add concurrency-aware provider routing, and make the system extensible for future features without touching the orchestrator

---

## The Problem

### 1. Birth Chart Lobotomization
Birth chart data is injected **unconditionally** into every Oracle message (v2 design decision). Combined with the soul document instructing the AI to "always cite at least one placement," generic conversations ("hey what's up") get force-fed 14 placements + 8 aspects + 12 house signatures. The AI can't help but talk about charts.

### 2. Regex Classifier Picks ONE Feature
`classifyOracleToolIntent()` is a priority ladder that returns exactly ONE feature. A question like "Look through my journal and tell me about my relationship patterns using my chart" should activate BOTH `journal_recall` AND `birth_chart`. Currently it picks one.

### 3. Monolithic invokeOracle
`convex/oracle/llm.ts` is an 820-line function doing 27 steps. Each new feature (synastry, cosmic weather, sign cards) adds more branching. Different features need different data pipelines, different model preferences, and different post-processing — all crammed into one growing function.

### 4. No Concurrency Awareness
The model fallback chain tries Tier A, then B, then C — sequentially. With Ollama Cloud (3 slots) + z.ai GLM (1 slot), 5 simultaneous users waste time failing through tiers before finding an open slot. No queuing exists.

---

## The Architecture

### Before (current)
```
User message → invokeOracle (monolith)
  ├── Always inject birth data
  ├── Regex classify → pick ONE feature
  ├── Build prompt (one path for everything)
  ├── Try model chain sequentially
  └── Return
```

### After (target)
```
User message → invokeOracle (thin orchestrator)
  ├── Safety gate (kill switch, crisis, validation)
  ├── Intent Router → score ALL matching intents, activate MULTIPLE
  ├── Resolve Pipeline(s) from matched intents
  │     └── Each pipeline is a self-contained plugin:
  │         ├── dataSources() → what data to gather
  │         ├── promptBlocks() → what to inject into system prompt
  │         ├── modelHint → "fast" | "smart" | "creative"
  │         └── afterResponse() → post-processing (binaural audio gen, etc)
  ├── Provider Router → concurrency-aware slot selection + queuing
  │     ├── Track active calls per provider (in-memory)
  │     ├── Select provider with available slot matching model hint
  │     └── Queue if all slots full, dequeue on completion
  └── Stream response → finalize → return
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Birth data becomes pipeline-gated** | Generic chat gets NO chart data. Birth chart pipeline injects it. Fixes lobotomization. |
| **Journal context stays universal** | Journal is additive (emotional context) not directive (forces topic). Stays injected when consented. |
| **Timespace stays universal** | Current local time is always useful. Stays always-on. |
| **Intent router scores, doesn't classify** | Returns ALL matching intents with confidence. Multiple pipelines can activate. |
| **Pipelines are plugins** | Each pipeline is a module with a standard interface. Adding synastry = new pipeline file, zero changes to orchestrator. |
| **Provider router is separate from model chain** | Model chain defines ORDER and PREFERENCE. Provider router tracks CONCURRENCY. They compose. |
| **Queue is in-process** | Convex runs on Node runtime. Simple in-memory queue. No external infrastructure. If Convex restarts, queued requests get "try again" — acceptable. |
| **No Cloudflare Worker** | The Frontend → Convex → LLM Provider path is correct. Adding an edge worker breaks reactive streaming, adds auth complexity, and provides no benefit on a self-hosted VPS. |

---

## File Map: What Exists, What Changes, What's New

### Existing files that CHANGE (in task order)

| File | What changes | Task |
|------|-------------|------|
| `src/lib/ai/registry.ts` | Add `maxConcurrent` to `ProviderConfig` interface | 01 |
| `convex/schema.ts` | No change — `maxConcurrent` lives in `providers_config` JSON setting | 01 |
| `convex/oracle/upsertProviders.ts` | Validate `maxConcurrent` field | 01 |
| `src/components/ai-admin/provider-manager.tsx` | Add `maxConcurrent` number input per provider | 01 |
| `convex/oracle/llm.ts` | Refactored into thin orchestrator calling pipelines + provider router | 05 |

### New files (in task order)

| File | Purpose | Task |
|------|---------|------|
| `convex/oracle/providerRouter.ts` | Concurrency-aware provider selection + in-memory queuing | 02 |
| `src/lib/oracle/pipelineTypes.ts` | Shared pipeline interface/types | 03 |
| `src/lib/oracle/pipelines/genericChat.ts` | Generic chat pipeline — NO birth data, soul only | 04 |
| `src/lib/oracle/pipelines/birthChart.ts` | Birth chart pipeline — birth data + depth instructions | 04 |
| `src/lib/oracle/pipelines/journalRecall.ts` | Journal Recall pipeline — expanded journal + patterns | 04 |
| `src/lib/oracle/pipelines/binauralBeats.ts` | Binaural beats pipeline — deterministic + context | 04 |
| `src/lib/oracle/intentRouter.ts` | Multi-intent scoring router (replaces single-pick classifier) | 05 |

### Files that stay UNCHANGED

| File | Why it doesn't change |
|------|----------------------|
| `convex/oracle/sessions.ts` | Session CRUD stays the same. Pipelines call the same mutations. |
| `convex/oracle/settings.ts` | Settings loading stays the same. |
| `convex/oracle/quota.ts` | Quota logic stays the same. |
| `convex/oracle/timespace.ts` | Timespace context builder stays the same. Pipelines call it. |
| `convex/oracle/debug.ts` | Debug queries stay the same. |
| `lib/oracle/safetyRules.ts` | Hardcoded safety rules never change. |
| `lib/oracle/promptBuilder.ts` | `buildPrompt` and `buildSystemPrompt` stay the same. Pipelines use them. |
| `lib/oracle/featureContext.ts` | `buildUniversalBirthContext` and `getBirthChartDepthInstructions` stay the same. Pipelines call them. |
| `lib/oracle/features.ts` | `OracleFeatureKey`, `ORACLE_FEATURES` definitions stay. `classifyOracleToolIntent` gets deprecated (replaced by intent router). |
| `src/lib/oracle/providers.ts` | Types and helpers stay. `ModelChainEntry`, `tierForIndex`, etc. unchanged. |
| `src/lib/ai/registry.ts` | Model registry unchanged. Only `ProviderConfig` gets `maxConcurrent`. |

---

## Execution Order

```
Task 01: Add maxConcurrent to ProviderConfig
  ↓ (non-breaking, additive only)
Task 02: Build Provider Router (concurrency-aware)
  ↓ (standalone module, nothing uses it yet)
Task 03: Define Pipeline Interface (types only)
  ↓ (no behavior, just interfaces)
Task 04: Implement Individual Pipelines
  ↓ (standalone modules, nothing uses them yet)
Task 05: Build Intent Router + Refactor invokeOracle
  ↓ (THE BIG SWITCHOVER — all previous tasks enable this)
Task 06: Testing + Verification
```

Tasks 01–04 are **additive only** — they add new files/fields without changing existing behavior. The system works exactly as before after each of these tasks.

Task 05 is the **switchover** — it replaces the monolithic `invokeOracle` with the new pipeline architecture. This is the only risky task.

Task 06 is verification.

---

## How invokeOracle Changes (Task 05 Detail)

### Current flow (820 lines, all in one function)
```
1. Input validation
2. Kill switch
3. Crisis detection
4. Load session + messages
5. Load runtime settings
6. Load user
7. Build birth data (ALWAYS)
8. Resolve feature (legacy migration)
9. Check journal consent
10. Intent classification (single pick)
11. Auto-activate feature
12. Build feature injection
13. Build journal context
14. Build timespace context
15. Build prompt
16. Build conversation history
17. Debug model override
18. Iterate model chain
19. Stream response
20. Parse title
21. Parse journal prompt
22. Finalize message
23. Patch timing
24. Increment quota
25. Update session metadata
26. Return
```

### New flow (thin orchestrator)
```
1. Input validation (unchanged)
2. Kill switch (unchanged)
3. Crisis detection (unchanged)
4. Load session + messages (unchanged)
5. Load runtime settings (unchanged)
6. Load user (unchanged)
7. Load journal consent (unchanged)
   ── GATHER PHASE (new) ──
8. Intent Router → scored intents[]
9. For each matched intent, resolve Pipeline
10. Ask each pipeline for its data requirements
11. Gather data (birth, journal, timespace — ONLY what pipelines need)
    ── BUILD PHASE (delegated to pipelines) ──
12. Each pipeline contributes system prompt blocks
13. Build system prompt from collected blocks
14. Build user message (ONLY pipelines that inject user-message data)
15. Build conversation history (unchanged)
    ── EXECUTE PHASE (provider router) ──
16. Resolve model hint from primary pipeline
17. Provider Router selects best available slot
18. Stream response (unchanged)
    ── POST-PROCESS PHASE ──
19. Parse title (unchanged)
20. Parse journal prompt (unchanged)
21. Run each pipeline's afterResponse() hook
22. Finalize message (unchanged)
23. Patch timing (unchanged)
24. Increment quota (unchanged)
25. Return
```

The streaming infrastructure (`callProviderStreaming`, SSE parsing, Convex mutations) is **completely unchanged**. Only the orchestration logic above it changes.

---

## Data Flow: What Gets Injected Where

### Generic Chat (no feature matched)
```
System Prompt:  [Safety] + [Soul] + [Timespace] + [Journal if consented] + [Title if first]
User Message:   sanitized question only (NO birth data)
```

### Birth Chart (core or full)
```
System Prompt:  [Safety] + [Soul] + [Depth Instructions] + [Timespace] + [Journal if consented] + [Title if first]
User Message:   [Birth Chart Data] + sanitized question
```

### Journal Recall
```
System Prompt:  [Safety] + [Soul] + [Cosmic Recall Mode] + [Timespace] + [Journal expanded] + [Title if first] + [Journal prompt directive]
User Message:   sanitized question only (NO birth data unless birth_chart also matched)
```

### Birth Chart + Journal Recall (composed)
```
System Prompt:  [Safety] + [Soul] + [Depth Instructions] + [Cosmic Recall Mode] + [Timespace] + [Journal expanded] + [Title if first] + [Journal prompt directive]
User Message:   [Birth Chart Data] + sanitized question
```

This is the key change: **data injection is pipeline-gated**, not universal. Generic chat breathes. Composed features share context.

---

## Provider Router: Concurrency Model

```
Provider Pool (from oracle_settings.providers_config):
  ┌─────────────────┬──────────────────┬─────────────┐
  │ Provider         │ Max Concurrent   │ Active Now  │
  ├─────────────────┼──────────────────┼─────────────┤
  │ ollama_cloud     │ 3                │ 2           │
  │ zai_glm          │ 1                │ 1           │
  │ openrouter       │ 999              │ 0           │
  └─────────────────┴──────────────────┴─────────────┘

Total capacity: 4 concurrent (Ollama: 3 + z.ai: 1)
Overflow: openrouter (paid, always available)

When invokeOracle enters:
  1. Pipeline says modelHint = "smart"
  2. Provider Router looks at model chain:
     - Tier A: ollama_cloud/deepseek-v4 (1 slot left) → SELECT
  3. If no slots: queue request
  4. When stream completes: decrement active count, dequeue next

In-memory tracking (Convex Node runtime):
  - activeCalls: Map<providerId, number>
  - requestQueue: Array<{resolve, reject, params}>
  - All within module scope — survives across actions within same process
```

---

## Invariants That Must Not Be Violated

These are the architectural rules from the Master Wiring Guide that this refactoring MUST preserve:

1. **Safety rules are always Block 1, hardcoded** — No change
2. **Kill switch and crisis responses never consume quota** — No change
3. **Quota checks are server-authoritative** — No change
4. **API keys are never in the DB** — No change
5. **~~Birth data is always injected when available~~** — **THIS CHANGES**: Birth data becomes pipeline-gated. Generic chat does NOT get birth data. This is the entire point of the refactoring.
6. **Journal context is always injected when consented** — No change (stays universal)
7. **Journal consent is server-enforced** — No change
8. **Journal context is non-blocking** — No change
9. **Intent classification never overrides manual feature selection** — Preserved in new intent router
10. **User input is sanitized** — No change
11. **Model chain fallback always terminates** — Enhanced (provider router adds queuing, but still terminates)
12. **Streaming message finalization always happens** — No change
13. **Title generation only happens on first response** — No change
14. **Debug model override doesn't persist to DB** — No change

Invariant #5 is intentionally broken. That's the fix for the lobotomization problem.
