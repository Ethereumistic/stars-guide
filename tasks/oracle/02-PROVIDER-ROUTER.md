# Task 02: Build Concurrency-Aware Provider Router

> **Type:** Additive (new file, nothing uses it yet)
> **File created:** `convex/oracle/providerRouter.ts`
> **No behavior change.** This module is imported but not called until Task 05.

---

## What You're Doing

Creating a standalone module that tracks active LLM calls per provider and selects the best available provider from the model chain. This replaces the naive sequential iteration through the model chain in `invokeOracle`.

The router lives in Convex's Node runtime, so in-memory state persists for the life of the process. If Convex restarts, state resets — that's fine (in-flight requests get errors, queued requests get "try again").

---

## Interface Design

```typescript
// convex/oracle/providerRouter.ts

import { type ProviderConfig, type ModelChainEntry } from "../../lib/oracle/providers";

/** Result of provider selection */
export interface ProviderSelection {
  entry: ModelChainEntry;
  provider: ProviderConfig;
  tier: string;
  wasQueued: boolean;
  queueWaitMs?: number;
}

/**
 * Select the best available provider from the model chain.
 * 
 * Strategy:
 * 1. Find the first chain entry whose provider has an available slot
 * 2. If modelHint is provided, prefer entries matching the hint's tier range
 * 3. If all providers are at capacity, return null (caller handles queuing)
 * 
 * Increments the active count for the selected provider.
 */
export function selectProvider(
  chain: ModelChainEntry[],
  providers: ProviderConfig[],
  modelHint?: "fast" | "smart" | "creative",
): ProviderSelection | null;

/**
 * Release a provider slot after an LLM call completes (success or failure).
 * Decrements the active count for the provider.
 */
export function releaseProvider(providerId: string): void;

/**
 * Get current concurrency status for all providers.
 * Used by the admin debug panel / observability.
 */
export function getConcurrencyStatus(): Record<string, { active: number; max: number | undefined }>;

/**
 * Reset all concurrency tracking.
 * Only for testing or admin "reset" operations.
 */
export function resetConcurrency(): void;
```

---

## Implementation Details

### In-Memory State

```typescript
// Module-scoped — persists across action invocations within the same Convex process
const activeCalls = new Map<string, number>();
```

### Selection Algorithm

```typescript
export function selectProvider(chain, providers, modelHint): ProviderSelection | null {
  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    const provider = providers.find(p => p.id === entry.providerId);
    if (!provider) continue;

    const active = activeCalls.get(provider.id) ?? 0;
    const max = provider.maxConcurrent; // undefined = unlimited

    if (max === undefined || active < max) {
      // Available slot — claim it
      activeCalls.set(provider.id, active + 1);
      return {
        entry,
        provider,
        tier: tierForIndex(i),
        wasQueued: false,
      };
    }
  }

  // All providers at capacity
  return null;
}
```

### Release

```typescript
export function releaseProvider(providerId: string): void {
  const active = activeCalls.get(providerId) ?? 0;
  if (active <= 1) {
    activeCalls.delete(providerId);
  } else {
    activeCalls.set(providerId, active - 1);
  }
}
```

### Queuing

The router itself does NOT implement queuing. The queue is managed by `invokeOracle` (Task 05) because the queue needs access to the full action context (mutations, session ID, etc.). The router just says "available" or "at capacity."

If `selectProvider` returns `null`, `invokeOracle` will:
1. Wait with exponential backoff (100ms, 200ms, 400ms, max 2s)
2. Retry `selectProvider` up to 30 seconds total
3. If still no slot, fall through to the hardcoded fallback

This simple retry loop replaces the need for a formal queue data structure.

### Model Hint (Future-Facing)

The `modelHint` parameter doesn't change selection logic in this task. It's reserved for when pipelines can express preferences:
- `"fast"` → prefer fast models (Gemini Flash, Grok Fast)
- `"smart"` → prefer reasoning models (Claude Sonnet, DeepSeek Pro)  
- `"creative"` → prefer creative models

For now, the hint is accepted but ignored. Selection follows model chain order.

---

## File Structure

```
convex/oracle/providerRouter.ts
  ├── activeCalls: Map<string, number>    (module-scoped in-memory state)
  ├── selectProvider()                    (main entry point)
  ├── releaseProvider()                   (call when LLM completes)
  ├── getConcurrencyStatus()              (for debug panel)
  └── resetConcurrency()                  (for testing)
```

---

## Important: How releaseProvider Must Be Called

The caller (future `invokeOracle`) MUST call `releaseProvider()` in ALL exit paths:
- Successful stream completion
- Stream error mid-way
- Non-streaming success
- Non-streaming failure
- Any catch block

Use try/finally pattern:
```typescript
const selection = selectProvider(chain, providers);
if (!selection) { /* retry or fallback */ }

try {
  const result = await callProviderStreaming(...);
  return result;
} finally {
  releaseProvider(selection.provider.id);
}
```

---

## Verification

After creating this file:
1. Import it in a test or temporary console log to verify types compile
2. Call `getConcurrencyStatus()` — should return `{}`
3. Call `selectProvider(chain, providers)` with a mock chain — should return the first entry with active=1
4. Call `selectProvider` again — active should be 2
5. Call `releaseProvider` — active should go back to 1
6. Set `maxConcurrent: 1` on the mock provider — second `selectProvider` should return null
7. Call `releaseProvider` — then `selectProvider` should succeed again

No existing Oracle functionality changes. This module just exists, waiting to be wired in.

---

## What NOT to Do

- Do NOT modify `invokeOracle` or `callProviderStreaming` yet (that's Task 05)
- Do NOT create a database table for tracking concurrency (in-memory is correct)
- Do NOT implement the retry/queue loop in this file (it belongs in the orchestrator)
- Do NOT import this module from any existing file yet
