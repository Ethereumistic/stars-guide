# Task 05: Build Intent Router + Refactor invokeOracle

> **Type:** BEHAVIOR CHANGE — This is the switchover task
> **Files changed:** `convex/oracle/llm.ts` (major refactor)
> **Files created:** `src/lib/oracle/intentRouter.ts`
> **This is the only risky task.** Tasks 01–04 are additive. This task wires everything together and replaces the monolithic `invokeOracle` with the new pipeline architecture.

---

## What You're Doing

Two things in this task:
1. Build the Intent Router (multi-intent scorer that replaces `classifyOracleToolIntent`)
2. Refactor `invokeOracle` to use pipelines + provider router

**Do the Intent Router first** (it's standalone and testable), then refactor `invokeOracle`.

---

## Part A: Build the Intent Router

**File:** `src/lib/oracle/intentRouter.ts`

### What It Replaces

The current `classifyOracleToolIntent()` returns exactly ONE feature (or null). It's a priority ladder: journal_recall > birth_chart > binaural > no match.

### What It Does Differently

The intent router **scores ALL matching intents** and returns them sorted by confidence. Multiple intents can match simultaneously.

```typescript
import type { IntentRouterResult, ScoredIntent, PipelineKey } from "./pipelineTypes";

/**
 * Score user intent against all known pipelines.
 *
 * Returns ALL matching intents sorted by confidence.
 * The orchestrator activates all pipelines with confidence >= 0.5.
 *
 * This replaces the single-pick classifyOracleToolIntent().
 */
export function scoreIntents(params: {
  question: string;
  hasBirthData: boolean;
  hasJournalConsent: boolean;
  currentFeatureKey: string | null;
}): IntentRouterResult;
```

### Scoring Logic

```
1. If currentFeatureKey is set (manual selection) →
   Return ONLY that feature with confidence 1.0
   (preserve existing invariant: never override manual selection)

2. Score each pipeline independently:

   GENERIC_CHAT:
     - Always gets a base score of 0.3
     - Boosted to 0.8+ if question has NO astrological intent signals
     - This is the fallback — it's always present but usually loses to specific intents

   BIRTH_CHART:
     - Phase 1: Does the question express chart intent?
       Reuse existing BIRTH_CHART_INTENT_PATTERNS from features.ts
       Match → base score 0.7
     - Phase 2: Depth signals
       Reuse existing DEPTH_SIGNAL_FULL_PATTERNS from features.ts
       Match → boost to 0.9, set metadata.depth = "full"
       No depth signals → set metadata.depth = "core"
     - Consent gate: hasBirthData === false → score 0 (skip)
     - Specificity boost: question mentions specific planet beyond Big Three → +0.1

   JOURNAL_RECALL:
     - Reuse existing JOURNAL_RECALL_PATTERNS from features.ts
     - Match → score 0.8
     - Consent gate: hasJournalConsent === false → score 0 (skip)

   BINAURAL_BEATS:
     - Reuse existing BINAURAL_INTENT_PATTERNS from features.ts
     - Match → score 0.85

3. Filter: only return intents with score > 0.5
4. Sort by score descending
5. If NO intent scores > 0.5 → return generic_chat with score 1.0
```

### Migration Note

The existing regex patterns (`BIRTH_CHART_INTENT_PATTERNS`, `DEPTH_SIGNAL_FULL_PATTERNS`, `JOURNAL_RECALL_PATTERNS`, `BINAURAL_INTENT_PATTERNS`) are currently defined in `src/lib/oracle/features.ts`. 

**Do NOT duplicate them.** Import them from features.ts:

```typescript
import {
  BIRTH_CHART_INTENT_PATTERNS,
  DEPTH_SIGNAL_FULL_PATTERNS,
  JOURNAL_RECALL_PATTERNS,
  BINAURAL_INTENT_PATTERNS,
} from "./features";
```

Wait — these patterns are currently NOT exported from `features.ts`. You need to **export them** (add `export` keyword). This is a safe change — adding exports doesn't break anything.

### Composition Example

Input: "Look through my journal and tell me why my relationships have been intense based on my Venus placement"

Result:
```typescript
{
  intents: [
    { pipelineKey: "journal_recall", confidence: 0.8, reason: "journal_intent" },
    { pipelineKey: "birth_chart", confidence: 0.8, reason: "chart_intent", metadata: { depth: "full" } },
  ],
  hasMatch: true,
  primary: { pipelineKey: "journal_recall", confidence: 0.8, reason: "journal_intent" },
}
```

The orchestrator activates BOTH pipelines. The birth chart pipeline injects chart data into the user message. The journal recall pipeline adds Cosmic Recall mode instructions to the system prompt. The AI sees both.

---

## Part B: Refactor invokeOracle

**File:** `convex/oracle/llm.ts`

### What Stays The Same (DO NOT TOUCH)

- `CRISIS_PATTERNS` — unchanged
- `MAX_USER_QUESTION_LENGTH` — unchanged
- `simpleHash()` — unchanged
- `TimingMetrics` interface — unchanged
- `LLMResponse` interface — unchanged
- `callProviderStreaming()` function — **COMPLETELY UNCHANGED** — this is the streaming infrastructure, it works perfectly
- The entire streaming path (SSE parsing, flush intervals, createStreamingMessage, updateStreamingContent, finalizeStreamingMessage) — unchanged

### What Changes

The `invokeOracle` action handler body is rewritten to use the pipeline architecture. The function signature and return type stay the same.

### New invokeOracle Flow

```typescript
export const invokeOracle = action({
  args: { /* SAME AS BEFORE */ },
  handler: async (ctx, args): Promise<LLMResponse> => {
    const actionStartTime = Date.now();

    // ════════════════════════════════════════════════════════════════
    // PHASE 0: SAFETY GATES (unchanged — copy from existing code)
    // ════════════════════════════════════════════════════════════════
    // 1. Input validation
    // 2. Kill switch
    // 3. Crisis detection
    // ... exact same code as before ...

    // ════════════════════════════════════════════════════════════════
    // PHASE 1: LOAD CONTEXT (unchanged — copy from existing code)
    // ════════════════════════════════════════════════════════════════
    // 4. Load session + messages
    // 5. Load runtime settings
    // 6. Load user
    // 7. Check journal consent

    // ════════════════════════════════════════════════════════════════
    // PHASE 2: INTENT ROUTING (NEW)
    // ════════════════════════════════════════════════════════════════
    const intentResult = scoreIntents({
      question: args.userQuestion,
      hasBirthData: Boolean(user?.birthData),
      hasJournalConsent,
      currentFeatureKey: session.featureKey ?? null,
    });

    // Resolve pipelines for all matched intents
    const activePipelines = intentResult.intents
      .filter(i => i.confidence >= 0.5)
      .map(intent => getPipeline(intent.pipelineKey))
      .filter((p): p is OraclePipeline => p !== undefined);

    // If no pipeline matched, use generic chat
    if (activePipelines.length === 0) {
      activePipelines.push(getPipeline("generic_chat")!);
    }

    // Determine primary pipeline (for model hint)
    const primaryPipeline = activePipelines[0];

    // ════════════════════════════════════════════════════════════════
    // PHASE 3: GATHER DATA (NEW — pipeline-driven)
    // ════════════════════════════════════════════════════════════════

    // Merge data requirements from ALL active pipelines
    const needsBirth = activePipelines.some(p => p.dataRequirements.needsBirthData);
    const needsJournal = activePipelines.some(p => p.dataRequirements.needsJournalContext);
    const expandedJournal = activePipelines.some(p => p.dataRequirements.expandedJournalBudget);
    const needsTimespace = activePipelines.some(p => p.dataRequirements.needsTimespace);

    // Gather birth data ONLY if a pipeline needs it
    let birthData: string | null = null;
    if (needsBirth && user?.birthData) {
      birthData = buildUniversalBirthContext(user.birthData);
    }

    // Gather journal context (if any pipeline needs it and consent exists)
    let journalContext: string | null = null;
    if (needsJournal && user?._id && hasJournalConsent) {
      try {
        journalContext = await ctx.runQuery(
          internal.journal.context.assembleJournalContext,
          { userId: user._id, expandedBudget: expandedJournal },
        );
      } catch (e) {
        console.error("Journal context assembly failed (non-blocking):", e);
      }
    }

    // Gather timespace context
    let timespaceContext: string | null = null;
    if (needsTimespace) {
      try {
        const tsResult = buildTimespaceContext(
          args.timezone || "UTC",
          args.userQuestion,
        );
        timespaceContext = tsResult.context;
      } catch (e) {
        console.error("Timespace context assembly failed (non-blocking):", e);
      }
    }

    // Load feature injection from DB (for pipelines that use it)
    let featureInjection: string | null = null;
    const primaryIntent = intentResult.primary;
    if (primaryIntent?.pipelineKey === "birth_chart") {
      const depth = primaryIntent.metadata?.depth ?? session.birthChartDepth ?? "core";
      try {
        const depthRecord = await ctx.runQuery(api.oracle.features.getFeatureInjection, {
          featureKey: `birth_chart_depth_${depth}`,
        });
        featureInjection = depthRecord?.contextText ?? null;
      } catch (e) {
        // Fall back to hardcoded — pipeline handles this
      }
    } else if (primaryIntent?.pipelineKey === "journal_recall") {
      try {
        const record = await ctx.runQuery(api.oracle.features.getFeatureInjection, {
          featureKey: "journal_recall",
        });
        featureInjection = record?.contextText ?? null;
      } catch (e) {}
    } else if (primaryIntent?.pipelineKey === "binaural_beats") {
      // Binaural generates its own injection in the pipeline
    }

    // ════════════════════════════════════════════════════════════════
    // PHASE 4: BUILD PROMPT (NEW — pipeline-driven)
    // ════════════════════════════════════════════════════════════════

    const pipelineCtx: PipelineContext = {
      userQuestion: args.userQuestion,
      timezone: args.timezone || "UTC",
      isFirstResponse,
      featureKey: session.featureKey,
      birthChartDepth: session.birthChartDepth ?? primaryIntent?.metadata?.depth ?? null,
      birthData,
      journalContext,
      timespaceContext,
      soulDoc: config.soulDoc,
      featureInjection,
    };

    // Collect prompt blocks from ALL pipelines
    const allSystemBlocks: SystemPromptBlock[] = [];
    const allUserBlocks: UserMessageBlock[] = [];
    for (const pipeline of activePipelines) {
      const blocks = pipeline.buildPromptBlocks(pipelineCtx);
      allSystemBlocks.push(...blocks.systemBlocks);
      allUserBlocks.push(...blocks.userBlocks);
    }

    // Sort system blocks by priority (descending)
    allSystemBlocks.sort((a, b) => b.priority - a.priority);

    // Build the final system prompt
    // Safety rules are ALWAYS first (prepend them, not a pipeline concern)
    const systemPrompt = [
      ORACLE_SAFETY_RULES,                          // Always first, hardcoded
      ...allSystemBlocks.map(b => b.content),        // Pipeline blocks sorted by priority
      isFirstResponse ? ORACLE_TITLE_DIRECTIVE : "", // Title on first response
      (isFirstResponse && journalContext) ? JOURNAL_PROMPT_DIRECTIVE : "", // Journal prompt on first
    ].filter(Boolean).join("\n\n");

    // Build the user message
    const sanitizedQuestion = sanitizeUserQuestion(args.userQuestion);
    const userMessage = [
      ...allUserBlocks.map(b => b.content),
      sanitizedQuestion,
    ].filter(Boolean).join("\n\n");

    const promptBuildEndTime = Date.now();

    // ════════════════════════════════════════════════════════════════
    // PHASE 5: PROVIDER SELECTION + LLM CALL (USING PROVIDER ROUTER)
    // ════════════════════════════════════════════════════════════════

    // Debug model override (unchanged logic)
    let modelChain = config.modelChain;
    let debugModelUsed: string | null = null;
    if (args.debugModelOverride) {
      modelChain = [
        { providerId: args.debugModelOverride.providerId, model: args.debugModelOverride.model },
        ...modelChain,
      ];
      debugModelUsed = `${args.debugModelOverride.providerId}/${args.debugModelOverride.model}`;
    }

    // Conversation history (unchanged logic — copy from existing)
    // ... same history truncation code ...

    // Try the provider router first, fall back to sequential chain
    const selection = selectProvider(modelChain, config.providers, primaryPipeline.modelHint);
    
    let result = null;
    if (selection) {
      // Got a slot — call the provider
      try {
        result = await callProviderStreaming(
          ctx, selection.provider, selection.entry.model,
          { systemPrompt, userMessage },
          llmConfig, conversationHistory, args.sessionId,
          selection.tier, systemPromptHash,
          { actionStartTime, promptBuildEndTime },
        );
      } catch (error) {
        console.error(`Oracle ${selection.provider.id}/${selection.entry.model} failed:`, error);
      } finally {
        releaseProvider(selection.provider.id);
      }
    }

    // If router-selected provider failed, try remaining chain entries
    if (!result) {
      for (let i = 0; i < modelChain.length; i++) {
        const entry = modelChain[i];
        // Skip the one we already tried
        if (selection && entry.providerId === selection.provider.id && entry.model === selection.entry.model) continue;
        
        const provider = config.providers.find(p => p.id === entry.providerId);
        if (!provider) continue;
        const tier = tierForIndex(i);

        const retrySelection = selectProvider([entry], [provider]);
        if (!retrySelection) continue;

        try {
          result = await callProviderStreaming(
            ctx, provider, entry.model,
            { systemPrompt, userMessage },
            llmConfig, conversationHistory, args.sessionId,
            tier, systemPromptHash,
            { actionStartTime, promptBuildEndTime },
          );
          if (result) break;
        } catch (error) {
          console.error(`Oracle ${provider.id}/${entry.model} (tier ${tier}) failed:`, error);
        } finally {
          releaseProvider(provider.id);
        }
      }
    }

    // ════════════════════════════════════════════════════════════════
    // PHASE 6: POST-PROCESS (NEW — pipeline afterResponse hooks)
    // ════════════════════════════════════════════════════════════════

    if (!result) {
      // Hardcoded fallback (unchanged — copy from existing code)
      // ...
    }

    // Success path:
    
    // Quota increment (unchanged)
    if (isFirstResponse) {
      await ctx.runMutation(api.oracle.quota.incrementQuota, {});
    }

    // Title generation (unchanged)
    // ...

    // Timing metrics (unchanged)
    // ...

    // Pipeline afterResponse hooks (NEW)
    for (const pipeline of activePipelines) {
      if (pipeline.afterResponse) {
        const actions = pipeline.afterResponse(result.contentWithoutTitle, pipelineCtx);
        for (const action of actions) {
          if (action.type === "store_binaural_params" && result.messageId) {
            await ctx.runMutation(internal.oracle.sessions.patchMessageBinauralParams, {
              messageId: result.messageId,
              binauralParams: action.payload,
            });
          }
        }
      }
    }

    // Return (unchanged structure)
    // ...
  },
});
```

### Key Behavioral Changes to Document

| Behavior | Before | After |
|----------|--------|-------|
| Generic chat ("hey what's up") | Gets full birth chart data in user message | Gets NO birth data. Just soul + timespace + journal (if consented). |
| "Analyze my chart" | Birth chart auto-activated via regex | Birth chart pipeline activated via intent router. Same result. |
| "Look through my journal about my relationships" | Journal recall auto-activated ONLY | Journal recall + birth chart BOTH activated (journal mentions relationships, chart has relationship data). |
| Multiple features detected | Only ONE feature activated (priority ladder) | ALL matching features activated (pipelines compose). |
| Provider selection | Sequential chain, no concurrency awareness | Concurrency-aware provider router with slot tracking. |
| No available provider slot | Fails through chain, hits fallback | Retries with backoff up to 30s, then fallback. |

### Session Feature Persistence

The intent router's result should still be persisted to the session (same as the current auto-activation):

```typescript
// Persist auto-activated feature to session
if (!session.featureKey && intentResult.primary?.pipelineKey !== "generic_chat") {
  const featureKey = intentResult.primary?.pipelineKey;
  if (featureKey) {
    await ctx.runMutation(api.oracle.sessions.updateSessionFeature, {
      sessionId: args.sessionId,
      featureKey: featureKey,
    });
    if (intentResult.primary?.metadata?.depth) {
      await ctx.runMutation(internal.oracle.sessions.updateSessionBirthChartDepth, {
        sessionId: args.sessionId,
        depth: intentResult.primary.metadata.depth,
      });
    }
  }
}
```

### Legacy Migration

Keep the existing legacy migration for `birth_chart_core` / `birth_chart_full` → `birth_chart`. It runs before intent routing:

```typescript
let resolvedFeatureKey = session.featureKey;
if (resolvedFeatureKey === "birth_chart_core" || resolvedFeatureKey === "birth_chart_full") {
  resolvedFeatureKey = "birth_chart";
  // ... same migration code as before ...
}
```

---

## Critical: What Must NOT Change

1. **`callProviderStreaming` function** — Do not modify this function at all. It works perfectly. Copy the call signature exactly.
2. **Streaming mutations** — `createStreamingMessage`, `updateStreamingContent`, `finalizeStreamingMessage`, `patchMessageTiming` — all unchanged.
3. **Safety gates** — Kill switch, crisis detection, input validation — same code, same order.
4. **The `LLMResponse` return type** — Same shape, same fields. The frontend depends on this.
5. **The action's `args`** — Same argument signature. The frontend calls this action.
6. **Debug model override** — Same logic, just integrated with the provider router.

---

## Verification Checklist

After completing this task, verify ALL of the following:

### Functional Verification
- [ ] Kill switch works (set in admin → Oracle returns fallback)
- [ ] Crisis detection works (send "I want to die" → crisis response)
- [ ] Input validation works (>2000 chars → error)
- [ ] Generic chat works ("hey what's up" → normal response, NO chart mentions)
- [ ] Birth chart auto-activation works ("analyze my chart" → chart reading)
- [ ] Birth chart core depth works (no depth signals → core instructions)
- [ ] Birth chart full depth works ("deep analysis" → full instructions)
- [ ] Journal Recall works ("look through my journal" → Cosmic Recall mode)
- [ ] Binaural beats work ("generate a beat for sleep" → audio + message)
- [ ] Manual feature selection works (click [+] → birth chart → ask → reading)
- [ ] Follow-up messages work (ask question → get answer → ask follow-up)
- [ ] Streaming works (tokens appear incrementally in the UI)
- [ ] Title generation works (first response → session gets a title)
- [ ] Journal prompt suggestion works (first response with journal → prompt suggested)
- [ ] Quota increment works (successful response → quota decrements)
- [ ] Fallback chain works (Tier A fails → Tier B → Tier C → fallback)

### Behavioral Change Verification
- [ ] Generic chat does NOT contain birth chart data (check debug panel — no birth data in user message)
- [ ] Generic chat does NOT talk about placements unless asked
- [ ] Birth chart session DOES contain birth data in user message
- [ ] Journal recall + birth chart question activates BOTH pipelines

### Provider Router Verification
- [ ] First call selects Tier A
- [ ] If Tier A fails, falls back to Tier B
- [ ] Debug model override still works
- [ ] Timing metrics still recorded

### Debug Panel Verification
- [ ] Timing metrics display correctly
- [ ] Model used shows correctly
- [ ] Token counts display correctly
- [ ] System prompt hash displays correctly

---

## Rollback Plan

If something goes wrong, the old `invokeOracle` code should be preserved in a comment block or in a git stash. You can restore it by reverting this single file (`convex/oracle/llm.ts`). No schema changes, no database changes — pure code revert.

The key safety property: **the function signature and return type don't change**, so the frontend doesn't need any modification.
