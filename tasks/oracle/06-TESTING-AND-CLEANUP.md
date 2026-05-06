# Task 06: Testing, Verification & Cleanup

> **Type:** Verification + cleanup
> **No new files. Minor changes to existing files for cleanup.

---

## What You're Doing

After Task 05 wires everything together, this task verifies the system works end-to-end and cleans up deprecated code.

---

## Step 1: End-to-End Manual Testing

Test every combination listed in Task 05's "Verification Checklist." Pay special attention to:

### The "Lobotomy Fix" Test
1. Open Oracle as a user with birth data saved
2. Send: "Hey, what's up?"
3. Expected: A warm, casual response that does NOT mention Sun/Moon/Ascendant signs, does NOT reference any placements, does NOT include chart analysis
4. If the AI still talks about charts → the `genericChatPipeline` is still injecting birth data somewhere. Check the debug panel's system prompt hash and user message content.

### The Composition Test
1. Open Oracle as a user with birth data AND journal consent
2. Send: "Look through my journal and tell me how my chart affects my love life"
3. Expected: Response that references BOTH journal entries AND chart placements (e.g., "Your journal from March mentions feeling disconnected, and your Venus in Gemini in the 11th house suggests...")

### The Provider Router Test
1. Set Ollama Cloud `maxConcurrent` to 1 in admin
2. Open two browser tabs, send Oracle questions simultaneously
3. Expected: One goes to Ollama, the other falls through to the next provider (or queues briefly)
4. Check debug panel timing — the queued request should show higher `requestQueueMs`

---

## Step 2: Deprecation Cleanup

### Mark `classifyOracleToolIntent` as deprecated

In `src/lib/oracle/features.ts`, the existing `classifyOracleToolIntent` function is no longer called by `invokeOracle`. Add a JSDoc deprecation notice:

```typescript
/**
 * @deprecated Use scoreIntents() from ./intentRouter instead.
 * Kept for backward compatibility with any external import sites.
 */
export function classifyOracleToolIntent(...) { ... }
```

Do NOT delete the function. Other code may import the pattern arrays.

### Export the pattern arrays

The intent router (Task 05) imports the regex pattern arrays from `features.ts`. Ensure these are exported:

```typescript
export const BIRTH_CHART_INTENT_PATTERNS: RegExp[] = [...]
export const DEPTH_SIGNAL_FULL_PATTERNS: RegExp[] = [...]
export const JOURNAL_RECALL_PATTERNS: RegExp[] = [...]
export const BINAURAL_INTENT_PATTERNS: RegExp[] = [...]
```

These should already be exported from Task 05's work. Verify they are.

### Clean up unused imports

In `convex/oracle/llm.ts`, after the refactor:
- `classifyOracleToolIntent` should no longer be imported
- `getOracleFeature` may no longer be needed (pipelines handle their own logic)
- `isOracleFeatureKey` may no longer be needed

Remove any unused imports to keep the file clean.

---

## Step 3: Update Debug Panel (If Needed)

The admin debug panel at `/oracle` reads from `oracle_messages` fields. After the refactoring:

1. Verify `modelUsed` shows correctly (e.g., `ollama_cloud/deepseek-v4-flash`)
2. Verify `fallbackTierUsed` shows correctly (A, B, C, D)
3. Verify timing metrics display correctly
4. Verify `systemPromptHash` is populated

If the debug panel needs updates (e.g., showing which pipelines were active), add a new field:

### Optional: Add `activePipelines` to oracle_messages

In `convex/schema.ts`, add to `oracle_messages`:
```typescript
activePipelines: v.optional(v.array(v.string())), // e.g., ["birth_chart", "journal_recall"]
```

In the refactored `invokeOracle`, persist this:
```typescript
const pipelineKeys = activePipelines.map(p => p.key);
await ctx.runMutation(internal.oracle.sessions.patchMessageTiming, {
  messageId: result.messageId,
  activePipelines: pipelineKeys,
  // ... existing timing fields ...
});
```

In the debug panel, display: "Pipelines: birth_chart, journal_recall"

**This is optional.** Only do it if you want pipeline observability in the admin panel.

---

## Step 4: Update Documentation

Update the following docs to reflect the new architecture:

### `docs/oracle/ORACLE_EXPLAINED.md`
- Section 4 (Prompt Assembly): Note that birth data is now pipeline-gated, not universal
- Section 10 (Feature System): Note that features are now pipelines, not prompt injections
- Section 13 (Intent Classification): Replace with intent router documentation
- Section 14 (Cross-Context Mixing): Update to reflect pipeline composition
- Section 18 (Design Decisions): Update decision #6 (universal birth context → pipeline-gated)

### `docs/oracle/00-MASTER-WIRING-GUIDE.md`
- Update Map 3 (Feature Activation Flow): Show intent router → pipeline resolution
- Update the execution order in invokeOracle

### `docs/oracle/10-feature-system.md`
- Add pipeline architecture section
- Document the pipeline interface

### `docs/oracle/13-intent-classification.md`
- Replace with intent router documentation
- Document multi-intent scoring

---

## Step 5: Performance Baseline

After the refactoring is stable, capture baseline performance metrics:

1. Generic chat TTFT (should be FASTER — no birth data in prompt = fewer tokens)
2. Birth chart reading TTFT (should be roughly the same)
3. Provider fallback latency (should be BETTER — router skips providers at capacity)
4. Token usage comparison:
   - Generic chat: fewer prompt tokens (no birth data = ~275 fewer tokens)
   - Birth chart: same as before
   - Journal recall: same as before

Record these in a comment in the codebase or in a separate doc.

---

## Final Checklist

- [ ] All verification tests pass
- [ ] Deprecated functions marked but not deleted
- [ ] Unused imports cleaned up
- [ ] Documentation updated
- [ ] Performance baseline captured
- [ ] No console errors in production
- [ ] No TypeScript errors (`npx tsc --noEmit` passes)
- [ ] No lint errors (`npx eslint convex/oracle/llm.ts` passes)
- [ ] Debug panel works correctly
- [ ] Quota system works correctly
- [ ] Session management works correctly
- [ ] Streaming works correctly
- [ ] Title generation works correctly
