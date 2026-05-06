# Task 03: Define Pipeline Interface & Types

> **Type:** Additive (new file, types only)
> **File created:** `src/lib/oracle/pipelineTypes.ts`
> **No behavior change.** Just TypeScript interfaces and types.

---

## What You're Doing

Defining the shared contract that all Oracle pipelines must implement. This is the foundation for Tasks 04 and 05 — every pipeline (generic chat, birth chart, journal recall, binaural beats) will implement this interface.

---

## The Pipeline Interface

Create `src/lib/oracle/pipelineTypes.ts` with the following types:

```typescript
/**
 * Oracle Pipeline Architecture — Shared Types
 *
 * A pipeline is a self-contained module that knows how to:
 * 1. Declare what data it needs
 * 2. Contribute blocks to the system prompt and user message
 * 3. Express model preferences
 * 4. Handle post-response processing
 *
 * Pipelines are resolved by the Intent Router (Task 05) and composed
 * by the invokeOracle orchestrator.
 */

import type { Id } from "../../convex/_generated/dataModel";

// ── Pipeline Identity ─────────────────────────────────────────────────────

/**
 * Unique identifier for a pipeline.
 * Matches OracleFeatureKey for feature-based pipelines, or custom values
 * for implicit pipelines like "generic_chat".
 */
export type PipelineKey =
  | "generic_chat"
  | "birth_chart"
  | "journal_recall"
  | "binaural_beats"
  | "synastry"
  | "cosmic_weather";

// ── Model Hints ───────────────────────────────────────────────────────────

/**
 * Hint to the provider router about what kind of model this pipeline prefers.
 * The router uses this when multiple providers have available slots.
 */
export type ModelHint = "fast" | "smart" | "creative";

// ── Data Requirements ─────────────────────────────────────────────────────

/**
 * What a pipeline needs to gather before it can build its prompt blocks.
 * The orchestrator reads this and fetches the data on the pipeline's behalf.
 */
export interface PipelineDataRequirements {
  /** Needs the user's birth chart data */
  needsBirthData: boolean;
  /** Needs journal context (requires consent check) */
  needsJournalContext: boolean;
  /** If needsJournalContext, use expanded budget */
  expandedJournalBudget: boolean;
  /** Needs timespace context (timezone + cosmic weather) */
  needsTimespace: boolean;
}

// ── Prompt Contributions ──────────────────────────────────────────────────

/**
 * A block to be injected into the system prompt.
 * Blocks are concatenated in priority order.
 */
export interface SystemPromptBlock {
  /** The text to inject */
  content: string;
  /** Higher priority = earlier in the prompt. 0 = append at end before directives. */
  priority: number;
  /** Optional label for debugging */
  label: string;
}

/**
 * Optional user message data to inject before the sanitized question.
 * Example: birth chart data block.
 */
export interface UserMessageBlock {
  /** The text to inject before the user's question */
  content: string;
  /** Label for debugging */
  label: string;
}

// ── Pipeline Context ──────────────────────────────────────────────────────

/**
 * Context provided BY the orchestrator TO the pipeline.
 * Contains all the gathered data the pipeline requested.
 */
export interface PipelineContext {
  /** The user's raw question */
  userQuestion: string;
  /** The user's timezone (from client) */
  timezone: string;
  /** Is this the first response in the session? */
  isFirstResponse: boolean;
  /** Session's feature key (from manual selection or auto-activation) */
  featureKey: string | null;
  /** Session's birth chart depth (for birth_chart pipeline) */
  birthChartDepth: "core" | "full" | null;
  /** Birth data context string (pre-built by orchestrator) */
  birthData: string | null;
  /** Journal context string (pre-built by orchestrator, consent-gated) */
  journalContext: string | null;
  /** Timespace context string (pre-built by orchestrator) */
  timespaceContext: string | null;
  /** The soul document from oracle_settings */
  soulDoc: string;
  /** Feature injection text from DB or hardcoded fallback */
  featureInjection: string | null;
}

// ── Post-Response ─────────────────────────────────────────────────────────

/**
 * Actions a pipeline wants to take after the LLM response is generated.
 * The orchestrator executes these in order.
 */
export interface PostResponseAction {
  /** Type of action */
  type: "store_binaural_params" | "custom";
  /** Arbitrary payload for the action */
  payload?: any;
}

// ── Pipeline Definition ───────────────────────────────────────────────────

/**
 * A self-contained Oracle pipeline.
 *
 * Each pipeline knows:
 * - Its identity (key)
 * - What data it needs (dataRequirements)
 * - How to turn that data into prompt blocks (buildPromptBlocks)
 * - What kind of model it prefers (modelHint)
 * - What to do after the response (afterResponse)
 */
export interface OraclePipeline {
  /** Unique identifier */
  key: PipelineKey;

  /** What data this pipeline needs from the orchestrator */
  dataRequirements: PipelineDataRequirements;

  /** Preferred model characteristic */
  modelHint: ModelHint;

  /**
   * Build prompt blocks from the gathered context.
   *
   * @param ctx - The pipeline context with all requested data
   * @returns System prompt blocks and optional user message block
   */
  buildPromptBlocks(ctx: PipelineContext): {
    systemBlocks: SystemPromptBlock[];
    userBlocks: UserMessageBlock[];
  };

  /**
   * Optional post-response hook.
   * Called after the LLM response is finalized.
   *
   * @param response - The full LLM response content
   * @param ctx - The pipeline context
   * @returns Actions for the orchestrator to execute
   */
  afterResponse?(response: string, ctx: PipelineContext): PostResponseAction[];
}

// ── Intent Router Types ───────────────────────────────────────────────────

/**
 * A scored intent from the intent router.
 */
export interface ScoredIntent {
  /** Which pipeline this intent maps to */
  pipelineKey: PipelineKey;
  /** Confidence score 0-1 */
  confidence: number;
  /** Why this intent was matched */
  reason: string;
  /** Additional data from the match (e.g., birth chart depth) */
  metadata?: Record<string, any>;
}

/**
 * Result from the intent router.
 */
export interface IntentRouterResult {
  /** All matched intents, sorted by confidence (highest first) */
  intents: ScoredIntent[];
  /** Whether ANY intent matched */
  hasMatch: boolean;
  /** The primary (highest-confidence) intent */
  primary: ScoredIntent | null;
}
```

---

## Design Notes

### Why `priority` on SystemPromptBlock?
Different pipelines contribute blocks that need specific ordering. Birth chart depth instructions should come before journal context. Safety rules always come first (handled by the orchestrator, not pipelines). Priority numbers:
- `100` = safety-adjacent (feature instructions)
- `50` = context data (timespace, journal)
- `0` = append at end

The orchestrator sorts blocks by priority descending before concatenation.

### Why `UserMessageBlock` separate from `SystemPromptBlock`?
Birth chart data goes in the user message (design decision #5 in the existing architecture — "The model treats chart data as user-provided facts, not system instructions"). This separation preserves that design decision.

### Why `afterResponse` is optional?
Only binaural beats currently needs post-response processing (storing the generated audio params). Most pipelines just contribute prompt blocks and are done.

### Why `PipelineContext` is pre-built by the orchestrator?
Pipelines don't have access to Convex `ctx` (queries/mutations). The orchestrator gathers the data and passes it in. This keeps pipelines pure functions — easier to test, easier to compose.

---

## Verification

After creating this file:
1. Run `npx tsc --noEmit` to verify all types compile
2. Verify no import errors — the file should be self-contained except for Convex's `Id` type
3. No existing code changes — this is purely additive

---

## What NOT to Do

- Do NOT implement any pipeline logic yet (that's Task 04)
- Do NOT implement the intent router yet (that's Task 05)
- Do NOT change any existing files
- Do NOT add this file to any imports yet
