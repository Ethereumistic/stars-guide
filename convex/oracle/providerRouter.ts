/**
 * Concurrency-Aware Provider Router
 *
 * Tracks active LLM calls per provider and selects the best available
 * provider from the model chain. Designed for Convex's Node runtime —
 * in-memory state persists across action invocations within the same process.
 *
 * If Convex restarts, in-flight requests get errors and the state resets.
 * This is acceptable: queued callers will retry naturally.
 *
 * The router does NOT implement queuing — that's the caller's responsibility
 * (exponential backoff retry loop in invokeOracle, Task 05).
 *
 * IMPORTANT: The caller MUST call releaseProvider() in ALL exit paths
 * (success, error, catch) using try/finally. Failure to release leaks slots.
 */

import {
  type ModelChainEntry,
  type ProviderConfig,
  tierForIndex,
} from "../../lib/oracle/providers";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Model hint from a pipeline — reserved for future use (Task 05+). */
export type ModelHint = "fast" | "smart" | "creative";

/** Result of a successful provider selection. */
export interface ProviderSelection {
  /** The chain entry that was selected (providerId + model). */
  entry: ModelChainEntry;
  /** The full provider config for the selected provider. */
  provider: ProviderConfig;
  /** Tier label ("A", "B", etc.) derived from chain position. */
  tier: string;
  /** Whether this selection came from a queue wait. Always false for now. */
  wasQueued: boolean;
  /** How long this request waited in queue, if applicable. */
  queueWaitMs?: number;
}

// ─── In-Memory Concurrency State ────────────────────────────────────────────

/**
 * Active call count per provider.
 * Key = provider.id, Value = number of in-flight LLM calls.
 * Persists for the life of the Convex process (Node runtime).
 */
const activeCalls = new Map<string, number>();

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Select the best available provider from the model chain.
 *
 * Walks the chain in order. For each entry, checks if its provider has
 * an available slot (active < maxConcurrent, or unlimited if maxConcurrent
 * is undefined). Claims a slot by incrementing the active count.
 *
 * @param chain       - The model chain (ordered list of providerId+model pairs).
 * @param providers   - All configured providers (to look up maxConcurrent).
 * @param modelHint   - Pipeline preference hint. Accepted but currently ignored;
 *                       selection follows chain order regardless.
 * @returns A ProviderSelection if a slot was found, or null if all providers
 *          are at capacity.
 */
export function selectProvider(
  chain: ModelChainEntry[],
  providers: ProviderConfig[],
  modelHint?: ModelHint,
): ProviderSelection | null {
  // Walk the chain in priority order
  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];

    // Find the provider config for this chain entry
    const provider = providers.find((p) => p.id === entry.providerId);
    if (!provider) {
      // Provider not found in config — skip this chain entry
      continue;
    }

    const active = activeCalls.get(provider.id) ?? 0;
    const max = provider.maxConcurrent;

    // undefined maxConcurrent means unlimited — always has capacity
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

    // Provider is at capacity — try next in chain
  }

  // All providers at capacity
  return null;
}

/**
 * Release a provider slot after an LLM call completes (success or failure).
 * Decrements the active count for the provider. Never drops below zero.
 *
 * MUST be called in try/finally on ALL exit paths of a provider call.
 */
export function releaseProvider(providerId: string): void {
  const active = activeCalls.get(providerId) ?? 0;
  if (active <= 1) {
    activeCalls.delete(providerId);
  } else {
    activeCalls.set(providerId, active - 1);
  }
}

/**
 * Get current concurrency status for all providers that have
 * been seen by the router. Used by the admin debug panel.
 *
 * @returns Record mapping provider ID → { active, max }.
 *          max is undefined for unlimited providers.
 */
export function getConcurrencyStatus(): Record<
  string,
  { active: number; max: number | undefined }
> {
  const status: Record<string, { active: number; max: number | undefined }> = {};
  for (const [providerId, active] of activeCalls) {
    // We don't have the provider configs here to look up maxConcurrent,
    // so we report the active count and let the caller cross-reference.
    status[providerId] = { active, max: undefined };
  }
  return status;
}

/**
 * Get concurrency status enriched with maxConcurrent from provider configs.
 * Includes ALL configured providers (even those with zero active calls).
 *
 * @param providers - The full list of configured providers.
 * @returns Record mapping provider ID → { active, max }.
 */
export function getConcurrencyStatusWithProviders(
  providers: ProviderConfig[],
): Record<string, { active: number; max: number | undefined }> {
  const status: Record<string, { active: number; max: number | undefined }> = {};

  // Start with all configured providers (showing zero if never seen)
  for (const provider of providers) {
    status[provider.id] = {
      active: activeCalls.get(provider.id) ?? 0,
      max: provider.maxConcurrent,
    };
  }

  // Also include any providers that have active calls but aren't in
  // the config (edge case: provider was removed while calls are in flight)
  for (const [providerId, active] of activeCalls) {
    if (!(providerId in status)) {
      status[providerId] = { active, max: undefined };
    }
  }

  return status;
}

/**
 * Reset all concurrency tracking. Only for testing or admin "reset" operations.
 */
export function resetConcurrency(): void {
  activeCalls.clear();
}