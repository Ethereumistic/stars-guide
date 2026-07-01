# Oracle Pipeline & Streaming Documentation Review

> Verification of docs (`ORACLE_EXPLAINED.md`, `00-MASTER-WIRING-GUIDE.md`, `20-resilient-model-chain.md`) against actual source code.
> Date: 2026-06-04

---

## A. PROMPT ASSEMBLY — `promptComposer.ts` & `PromptComposer`

### A1. `promptComposer.ts` does not exist
**DOCS CLAIM** (ORACLE_EXPLAINED.md line 277):
> `src/lib/oracle/promptComposer.ts` — Block collection, sorting, and rendering

Also references a `PromptComposer` class that "collects all blocks, sorts them by priority, applies conditional gates, and renders the final `[SYSTEM]` / `[USER]` split."

**CODE REALITY**: No file `promptComposer.ts` exists anywhere in the project (`find` returned no results). There is no `PromptComposer` class. The prompt composition is done **inline in `convex/oracle/llm.ts`** (Phase 4, lines ~380-450):
- Pipeline blocks are collected by iterating `activePipelines` and calling `pipeline.buildPromptBlocks(pipelineCtx)`
- System blocks are sorted with `allSystemBlocks.sort((a, b) => b.priority - a.priority)`
- Final system prompt is built by joining blocks with `\n\n` (with safety rules hardcoded at position 0)
- Title directive and journal prompt directive are appended conditionally
- User message is built by joining user blocks with sanitized question

**SEVERITY: CRITICAL** — Documentation describes an entire module and class that don't exist. Any developer following the docs would look for a file that isn't there and a class that doesn't exist.

### A2. `buildPrompt()` function does not exist in promptBuilder.ts
**DOCS CLAIM** (ORACLE_EXPLAINED.md lines 943, 1444):
- "journalContext is passed to `buildPrompt()` and inserted into the system prompt."
- "promptBuildEndTime (after `buildPrompt()` returns)"

**CODE REALITY**: `src/lib/oracle/promptBuilder.ts` exists but exports **no `buildPrompt()` function**. It exports `parseTitleFromResponse`, `parseJournalPromptFromResponse`, `deriveTitleFromContent`, `sanitizeUserQuestion`, `ORACLE_TITLE_DIRECTIVE`, and `JOURNAL_PROMPT_DIRECTIVE`. `llm.ts` imports only these utility functions — it never calls `buildPrompt`. All prompt assembly is done inline in `llm.ts`.

**SEVERITY: HIGH** — Multiple doc references to a function that was removed during the v3 pipeline migration. The doc section 4 header says "Pipeline-Based Tagged Blocks (v3)" but then references a legacy monolithic function.

### A3. `PromptBlock` type described in docs does not match actual types
**DOCS CLAIM** (ORACLE_EXPLAINED.md lines 282-288):
```typescript
interface PromptBlock {
  type: string;        // e.g. "safety", "soul", "feature_instruction", "birth_data"
  label: string;       // e.g. "soul_document", "synastry_instructions"
  priority: number;    // 90 = first, 10 = last
  scope: "system" | "user";  // Which message array it belongs to
  content: string;     // The actual text
}
```

**CODE REALITY** (`src/lib/oracle/pipelineTypes.ts`): There is no single `PromptBlock` interface. Instead, there are two separate types:
```typescript
interface SystemPromptBlock {
  content: string;
  priority: number;
  label: string;
}

interface UserMessageBlock {
  content: string;
  label: string;
}
```
- No `type` field exists
- No `scope` field exists — system vs user is determined by which array the block goes in
- `UserMessageBlock` has no `priority` — user blocks are ordered by pipeline registration, not priority

**SEVERITY: HIGH** — The doc describes a different type system than what's actually implemented. `PipelineDefinition` in docs is actually `OraclePipeline`.

---

## B. EXECUTION ORDER — 30-Step Sequence vs Actual Code

**DOCS CLAIM** (00-MASTER-WIRING-GUIDE.md, "Quick Reference: invokeOracle Execution Order"):
30 sequential steps numbered 1-30.

**CODE REALITY** (`convex/oracle/llm.ts`):

### B1. Order of steps 1-3 is reversed
| Step | Doc Order | Actual Order |
|------|-----------|--------------|
| Input validation | Step 3 | Step 1 (first thing handler does) |
| Kill switch check | Step 1 | Step 2 |
| Crisis detection | Step 2 | Step 3 |

The actual PHASE 0 in llm.ts is: validation → kill_switch → crisis. The doc reverses validation with safety gates.

**SEVERITY: MEDIUM** — Doesn't affect behavior but would confuse anyone tracing the code.

### B2. "Gather synastry data" (step 13 in guide, step 6 in doc's own numbering)
The Master Wiring Guide has a duplicate/numbering confusion: step 12 is "Gather pipeline data" and step 13 is "Build feature injection". In reality, feature injection is gathered **within** the data gathering phase (Phase 3), and synastry data is gathered as part of Phase 3, not a separate step 6.

### B3. Steps 17-23 are conflated
The doc lists as sequential: 17. Stream response, 18. Parse title, 19. Parse journal prompt, 20. Increment quota, 21. Persist timing, 22. Pipeline afterResponse, 23. Finalize message.

**CODE REALITY**:
- Streaming (step "17") happens **inside** the model chain loop (step "16") — not after it. `callProviderStreaming` is called for each tier attempt.
- Title parsing (step "18") and journal prompt parsing (step "19") happen **inside** `callProviderStreaming` — they are part of the streaming step, not separate post-processing.
- `finalizeStreamingMessage` (step "23") is called **inside** `callProviderStreaming` — before the function returns, not in the post-processing section of `invokeOracle`.
- The post-processing in `invokeOracle` is: quota increment → title generation (from parsed title) → timing metrics computation → pipeline afterResponse hooks → update session status.
- Quota increment (step "20" in guide) happens BEFORE pipeline afterResponse (step "22" in guide) in the actual code — the doc orders them: 20 then 21 then 22 then 23, but the actual order is: quota, title, timing, pipeline hooks, status update.

**SEVERITY: HIGH** — The doc's sequential 30-step model is misleading. Streaming, title parsing, journal prompt parsing, and message finalization are all internal to `callProviderStreaming`, not discrete post-processing steps.

### B4. Missing step: server-side quota pre-check (PHASE 5)
The Master Wiring Guide's 30-step list does not mention the server-side quota pre-check that happens at Phase 5 in llm.ts (between prompt building and LLM call). The ORACLE_EXPLAINED.md mentions it (step 4d in Phase 4 walkthrough), but the Master Wiring Guide omits it entirely.

**SEVERITY: MEDIUM**

---

## C. PIPELINES — Files, Exports, and Data Requirements

### C1. All 5 pipeline files exist, but at different paths
**DOCS CLAIM**: `src/lib/oracle/pipelines/birthChart.ts` etc.
**CODE REALITY**: All five exist at `src/lib/oracle/pipelines/`:
- ✅ `birthChart.ts`
- ✅ `synastry.ts`
- ✅ `journalRecall.ts`
- ✅ `genericChat.ts`
- ✅ `binauralBeats.ts`
- ✅ `index.ts` (registry)

Pipeline files also found at `lib/oracle/pipelines/index.ts` (Convex import proxy, re-exports from `src/lib/oracle/pipelines/index`).

**SEVERITY: LOW** — Paths in docs are mostly correct.

### C2. Pipelines export `const` objects, not standalone `buildPromptBlocks()` functions
**DOCS CLAIM**: "Each pipeline declares `dataRequirements` and a `buildPromptBlocks()` function."
**CODE REALITY**: Each file exports a named `const` (e.g., `export const birthChartPipeline: OraclePipeline`) which contains a `buildPromptBlocks` method as part of the `OraclePipeline` interface. There are no standalone `buildPromptBlocks()` function exports.

**SEVERITY: LOW** — The doc's phrasing is ambiguous but the concept is correct: `buildPromptBlocks` is a key method on each pipeline.

### C3. `cosmic_weather` pipeline key exists in type but is NOT implemented
**DOCS CLAIM**: Pipeline system has 5 registered pipelines.
**CODE REALITY**: `PipelineKey` type includes `"cosmic_weather"` but it is **never registered** in the pipeline registry (`index.ts`). Only 5 pipelines are registered: `generic_chat`, `birth_chart`, `journal_recall`, `binaural_beats`, `synastry`.

**SEVERITY: LOW** — The type is forward-looking. Not a doc error per se, but worth noting.

### C4. `binauralBeatsPipeline` does NOT declare `needsBirthData: true`
**DOCS CLAIM** (00-MASTER-WIRING-GUIDE.md Map 3 and Map 5):
> "binauralBeatsPipeline: needs birth data, timespace"
> "binauralBeatsPipeline: needsBirthData=true, needsTimespace=true"

**CODE REALITY** (`src/lib/oracle/pipelines/binauralBeats.ts`):
```typescript
dataRequirements: {
    needsBirthData: false,  // ← FALSE, not true
    needsJournalContext: false,
    expandedJournalBudget: false,
    needsTimespace: true,
    needsSynastryData: false,
},
```

The pipeline accesses `ctx.rawBirthData` for personalization, but does NOT declare `needsBirthData`. The orchestrator won't build a birth data context string for this pipeline. `rawBirthData` is set unconditionally on the pipeline context (not gated by any pipeline requirement), so the personalization still works — but the doc claim that it "needs birth data" in the prompt assembly sense is incorrect.

**SEVERITY: MEDIUM** — Would mislead developers about what data the orchestrator gathers for binaural beats.

### C5. Doc claims `features.ts` is at `convex/oracle/features.ts`
**DOCS CLAIM** (ORACLE_EXPLAINED.md line 52, architecture diagram):
> `oracle/features.ts — Feature injection queries`

**CODE REALITY**: No `convex/oracle/features.ts` exists. The actual file is at `src/lib/oracle/features.ts` (client-side feature definitions). Feature injection queries live in `convex/oracle/featureInjections.ts` (not `features.ts`).

**SEVERITY: MEDIUM** — Path is wrong in the architecture diagram.

---

## D. TIMING — Metrics Capture

### D1. All 5 timing metrics exist and are correctly described
**DOCS CLAIM**: `promptBuildMs`, `requestQueueMs`, `ttftMs`, `initialDecodeMs`, `totalMs`
**CODE REALITY**: All five are indeed captured in `llm.ts` with the `TimingMetrics` interface:
```typescript
interface TimingMetrics {
  promptBuildMs: number;
  requestQueueMs: number;
  ttftMs: number;
  initialDecodeMs: number;
  totalMs: number;
}
```
Formulas match the described start/end points.

**SEVERITY: NONE** — Correct.

### D2. `requestQueueMs` description slightly imprecise
**DOCS CLAIM**: "milliseconds from prompt assembly completion to LLM HTTP request start"
**CODE REALITY**: The formula is `(result.fetchStartTime ?? totalEndTime) - promptBuildEndTime`. `fetchStartTime` is captured with `Date.now()` immediately before the `fetch()` call inside `callProviderStreaming` — but by this point, the code has already resolved API keys, built headers, and constructed the request body. The doc implies it measures ONLY queue/overhead, but it includes the overhead of provider lookup, URL building, and header construction (which happens between `promptBuildEndTime` and the actual HTTP request).

**SEVERITY: LOW** — Semantic nitpick.

---

## E. STREAMING — `callProviderStreaming` & Flush Intervals

### E1. `callProviderStreaming` exists as documented
**DOCS CLAIM**: Named function `callProviderStreaming`
**CODE REALITY**: `async function callProviderStreaming(...)` at `convex/oracle/llm.ts` line 863. Correct.

**SEVERITY: NONE** — Correct.

### E2. FLUSH INTERVAL IS WRONG IN ALL DOCS — 50ms, not 100-300ms
**DOCS CLAIM** (multiple locations throughout both docs):
> "Periodic flush: Every 100ms (first 2s) then 300ms" (ORACLE_EXPLAINED.md line 508)
> "flush every 100-300ms" (ORACLE_EXPLAINED.md lines 86, 517, 1184, 1193)
> "Every 100-300ms" (MASTER-WIRING-GUIDE lines 400, 531)
> Design Decision #10: "The streaming flush interval starts at 100ms (first 2 seconds) then increases to 300ms."

**CODE REALITY** (`convex/oracle/llm.ts` lines 1022, 1130):
```typescript
const MIN_FLUSH_INTERVAL_MS = 50;  // ← 50ms, not 100-300ms

// Flush after every SSE chunk, throttled to MIN_FLUSH_INTERVAL_MS.
const now = Date.now();
if (fullContent !== lastFlushedContent && (now - lastFlushTime >= MIN_FLUSH_INTERVAL_MS || lastFlushTime === 0)) {
    await ctx.runMutation(internal.oracle.sessions.updateStreamingContent, {
        messageId, content: fullContent,
    });
    lastFlushTime = now;
    lastFlushedContent = fullContent;
}
```

There is **no two-phase algorithm** (100ms first 2s, then 300ms). There is a single flat 50ms minimum throttle between flushes. The doc's entire Design Decision #10 explaining the rationale for 100ms/300ms is describing architecture that doesn't exist.

**SEVERITY: CRITICAL** — This is described in at least 8 separate places across both docs as a key design decision. The actual code uses a single 50ms constant. This is architectural misinformation that could lead to incorrect performance tuning.

---

## F. MODEL CHAIN — Fallback, Provider Router, Intent Chain

### F1. Provider router exists and is wired correctly
**DOCS CLAIM**: `selectProvider()` and `releaseProvider()` from `convex/oracle/providerRouter.ts`
**CODE REALITY**: Both functions exist and are imported in `llm.ts`. `selectProvider()` is called to get the best provider; `releaseProvider()` is called in a `finally` block around each attempt.

**SEVERITY: NONE** — Correct.

### F2. `DEFAULT_INTENT_MODEL_CHAIN` exists
**DOCS CLAIM**: Separate chain for intent classification with defaults `google/gemini-2.5-flash` then `anthropic/claude-sonnet-4`
**CODE REALITY**: `DEFAULT_INTENT_MODEL_CHAIN` is defined in `src/lib/oracle/providers.ts` with exactly those two entries. Uses hardcoded params (temp=0.1, max_tokens=150, stream=false, timeout=3s) inside the intent router.

**SEVERITY: NONE** — Correct.

### F3. `tierForIndex()` exists
**DOCS CLAIM**: index 0 → "A", 1 → "B", ..., 25 → "Z", beyond uses numeric
**CODE REALITY**: Matches exactly in `src/lib/oracle/providers.ts`:
```typescript
export function tierForIndex(index: number): string {
  if (index < 0) return "D";
  if (index < 26) return String.fromCharCode(65 + index);
  return String(index);
}
```

**SEVERITY: NONE** — Correct.

---

## G. SESSIONS — Exported Mutations

### G1. All documented session mutations exist
**DOCS CLAIM**: `addMessage`, `createSession`, `getUserSessions`, `updateSessionFeature`, `deleteSession`, etc.
**CODE REALITY**: All exist in `convex/oracle/sessions.ts`. Full list matches:
- ✅ `getUserSessions` (query)
- ✅ `getSessionWithMessages` (query)
- ✅ `getAudioUrl` (query)
- ✅ `createSession` (mutation)
- ✅ `addMessage` (mutation)
- ✅ `updateSessionStatus` (mutation)
- ✅ `updateSessionFeature` (mutation)
- ✅ `updateSessionBirthChartDepth` (internalMutation)
- ✅ `setSessionBirthChartDepth` (mutation)
- ✅ `createStreamingMessage` (internalMutation)
- ✅ `updateStreamingContent` (internalMutation)
- ✅ `finalizeStreamingMessage` (internalMutation)
- ✅ `patchMessageTiming` (internalMutation)
- ✅ `patchMessageBinauralParams` (internalMutation)
- ✅ `deleteMessage` (internalMutation)
- ✅ `patchMessageCost` (internalMutation)
- ✅ `updateSessionTitle` (internalMutation)
- ✅ `renameSession` (mutation)
- ✅ `setSessionStarType` (mutation)
- ✅ `rateMessage` (mutation)
- ✅ `unrateMessage` (mutation)
- ✅ `deleteSession` (mutation)

**SEVERITY: NONE** — Correct.

---

## H. FILE PATHS — Documentation vs Actual Locations

### H1. `convex/oracle/features.ts` does NOT exist
**DOCS CLAIM** (ORACLE_EXPLAINED.md line 52): `oracle/features.ts` under Convex Backend section
**CODE REALITY**: No file at `convex/oracle/features.ts`. Feature-related code is split:
- `src/lib/oracle/features.ts` — client-side feature flags, intent patterns
- `convex/oracle/featureInjections.ts` — (if it exists) or feature injection is accessed directly via `api.oracle.features.getFeatureInjection` in llm.ts

**SEVERITY: MEDIUM** — Architecture diagram references a non-existent file path.

### H2. `lib/oracle/soul.ts` path is ambiguous
**DOCS CLAIM**: `lib/oracle/soul.ts` (ORACLE_EXPLAINED.md line 317)
**CODE REALITY**: Likely at `src/lib/oracle/soul.ts` — the doc omits the `src/` prefix. This is consistent with other paths in the doc.

**SEVERITY: LOW** — Most devs would infer `src/lib/oracle/soul.ts`.

### H3. `promptComposer.ts` path is completely wrong
Already covered in Section A1.

---

## I. RESILIENT MODEL CHAIN (Doc 20) — Timeouts, Idle Detection, Unified Loop

### I1. Per-tier fetch timeout (25s) — CORRECT
**DOCS CLAIM**: `TIER_FETCH_TIMEOUT_MS = 25_000`
**CODE REALITY**: `const TIER_FETCH_TIMEOUT_MS = 25_000;` in `llm.ts` line 72.

**SEVERITY: NONE** — Correct.

### I2. Stream idle timeout (15s) — CORRECT
**DOCS CLAIM**: `STREAM_IDLE_TIMEOUT_MS = 15_000` with two detection mechanisms
**CODE REALITY**: Both mechanisms exist in `callProviderStreaming`:
1. Initial idle timeout: `setTimeout` that aborts if no content received at all within 15s
2. Periodic idle check: `setInterval` every 5s checking `now - lastTokenTime > STREAM_IDLE_TIMEOUT_MS`
3. `lastTokenTime` updated on every token received
4. Both timers cleaned up in catch block and after streaming

**SEVERITY: NONE** — Correct.

### I3. Unified attempt loop — CORRECT
**DOCS CLAIM**: Single `attemptOrder` array combining router selection + chain fallback
**CODE REALITY**: Matches exactly. The `attemptOrder` array is built from:
1. Router selection first (`selectProvider`)
2. Remaining chain entries (skipping duplicates)
3. Single iteration loop with safety scanning + refusal detection

**SEVERITY: NONE** — Correct.

### I4. `MAX_REFUSAL_RETRIES` constant — EXISTS
**DOCS CLAIM**: `MAX_REFUSAL_RETRIES = 1` (doc 20)
**CODE REALITY**: `const MAX_REFUSAL_RETRIES = 1;` in `llm.ts` line 74.

**SEVERITY: NONE** — Correct.

### I5. `checkQuotaServerSide` does NOT exist
**DOCS CLAIM** (ORACLE_EXPLAINED.md lines 734, 1169):
> "A server-side pre-check also runs at the top of `invokeOracle` action to close the TOCTOU gap — called `checkQuotaServerSide` internal query."

**CODE REALITY**: There is no `checkQuotaServerSide` function anywhere. The actual quota check in `llm.ts` is:
```typescript
const quota = await ctx.runQuery(api.oracle.quota.checkQuota, {});
```
This is the **public** `checkQuota` query, not a special server-side variant. The variable is named `quota`, not `checkQuotaServerSide`.

**SEVERITY: MEDIUM** — Function name doesn't exist, but the server-side check does run as described.

---

## J. `buildPrompt()` — Does It Exist and Is It Called?

### J1. `buildPrompt()` does NOT exist in promptBuilder.ts
**DOCS CLAIM** (ORACLE_EXPLAINED.md lines 943, 1444):
- "journalContext is passed to `buildPrompt()` and inserted into the system prompt."
- Timing metric `promptBuildEndTime` measured "after `buildPrompt()` returns"

**CODE REALITY**: `src/lib/oracle/promptBuilder.ts` exports utility functions (`parseTitleFromResponse`, `parseJournalPromptFromResponse`, `deriveTitleFromContent`, `sanitizeUserQuestion`, `ORACLE_TITLE_DIRECTIVE`, `JOURNAL_PROMPT_DIRECTIVE`) but **no `buildPrompt` function**. `llm.ts` imports these utilities and does all prompt composition inline.

**SEVERITY: HIGH** — Multiple doc references to a function that was removed during the v3 pipeline migration. This is vestigial documentation from the pre-pipeline era.

---

## SUMMARY TABLE

| # | Misalignment | Severity |
|---|-------------|----------|
| A1 | `promptComposer.ts` / `PromptComposer` class do not exist — composition is inline in llm.ts | **CRITICAL** |
| A2 | `buildPrompt()` function does not exist — removed in v3 migration | **HIGH** |
| A3 | `PromptBlock` type in docs doesn't match actual `SystemPromptBlock`/`UserMessageBlock` types | **HIGH** |
| B1 | Steps 1-3 reversed (validation before safety in docs, safety before validation in code) | **MEDIUM** |
| B3 | Steps 17-23 conflated — streaming, title parsing, finalization are internal to `callProviderStreaming`, not post-processing steps | **HIGH** |
| B4 | Server-side quota pre-check omitted from Master Wiring Guide's 30-step list | **MEDIUM** |
| C4 | `binauralBeatsPipeline.needsBirthData` is `false` in code, docs say `true` | **MEDIUM** |
| C5 | Doc references `convex/oracle/features.ts` — doesn't exist; actual is `src/lib/oracle/features.ts` | **MEDIUM** |
| E2 | Flush interval is 50ms flat, NOT 100ms (first 2s) then 300ms — 8+ doc locations wrong | **CRITICAL** |
| I5 | `checkQuotaServerSide` function doesn't exist; actual code uses `api.oracle.quota.checkQuota` | **MEDIUM** |
| J1 | `buildPrompt()` function does not exist — multiple doc references are vestigial | **HIGH** |
| H1 | `convex/oracle/features.ts` referenced in architecture diagram — no such file | **MEDIUM** |
| D2 | `requestQueueMs` description slightly imprecise | **LOW** |

### Correctly Documented Items (Verified)
- ✅ `callProviderStreaming` is a named function
- ✅ `TIER_FETCH_TIMEOUT_MS = 25_000`
- ✅ `STREAM_IDLE_TIMEOUT_MS = 15_000`
- ✅ Unified `attemptOrder` loop
- ✅ `MAX_REFUSAL_RETRIES = 1`
- ✅ All 5 pipeline files exist and export `buildPromptBlocks` method
- ✅ All timing metrics (`promptBuildMs`, `requestQueueMs`, `ttftMs`, `initialDecodeMs`, `totalMs`)
- ✅ Provider router (`selectProvider`/`releaseProvider`)
- ✅ `DEFAULT_INTENT_MODEL_CHAIN` with separate defaults
- ✅ `tierForIndex()` tier labeling
- ✅ All session mutations exist (21 total)
- ✅ `DEFAULT_MODEL_CHAIN` with three tiers
