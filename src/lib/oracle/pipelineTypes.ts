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
 *
 * This file is TYPES ONLY — no behavior, no Convex runtime imports.
 */

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
  /** Needs synastry data (second chart + relationship context) */
  needsSynastryData: boolean;
}

// ── Prompt Contributions ──────────────────────────────────────────────────

/**
 * A block to be injected into the system prompt.
 * Blocks are concatenated in priority order (descending).
 */
export interface SystemPromptBlock {
  /** The text to inject */
  content: string;
  /** Higher priority = earlier in the prompt. Safety is always first (handled by orchestrator). */
  priority: number;
  /** Label for debugging */
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

// ── Synastry Payload ────────────────────────────────────────────────────────

/**
 * Synastry data payload — passed from frontend through session to pipeline.
 * Contains the second person's birth data, relationship type, category, and source metadata.
 */
export interface SynastryPayload {
  /** Second person's birth data (same format as user's birthData) */
  chartB: unknown;
  /** How the chart was sourced */
  source: "friend" | "custom";
  /** If source is "friend", the friend's userId */
  friendUserId?: string;
  /** The real-life relationship between the user and the second person (e.g. "boyfriend", "teacher") */
  relationship: string;
  /** Macro category for the relationship (e.g. "romantic", "family", "work") — may be undefined on old sessions */
  relationshipCategory?: string;
  /** Display name for the second person */
  chartBName: string;
}

// ── Pipeline Context ──────────────────────────────────────────────────────

/**
 * Context provided BY the orchestrator TO the pipeline.
 * Contains all the gathered data the pipeline requested.
 *
 * Pipelines don't have access to Convex ctx (queries/mutations).
 * The orchestrator gathers data and passes it in, keeping pipelines
 * pure functions — easier to test, easier to compose.
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
  /** Birth data context string (pre-built by orchestrator, only if a pipeline needs it) */
  birthData: string | null;
  /** Durable generated birth chart report, preferred over raw chart data when completed. */
  birthChartReport: string | null;
  /** Raw birth data object (always available if user has it, for internal computation like binaural personalization) */
  rawBirthData: unknown | null;
  /** Journal context string (pre-built by orchestrator, consent-gated) */
  journalContext: string | null;
  /** Timespace context string (pre-built by orchestrator) */
  timespaceContext: string | null;
  /** The soul document from oracle_settings */
  soulDoc: string;
  /** Feature injection text from DB or hardcoded fallback */
  featureInjection: string | null;
  /** Synastry data: second chart + relationship context (only if pipeline needs it) */
  synastryData: SynastryPayload | null;
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
  payload?: unknown;
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
   * @returns System prompt blocks and optional user message blocks
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
  metadata?: Record<string, unknown>;
}

/**
 * Result from the intent router.
 */
export interface IntentRouterResult {
  /** All matched intents, sorted by confidence (highest first) */
  intents: ScoredIntent[];
  /** Whether ANY intent matched above threshold */
  hasMatch: boolean;
  /** The primary (highest-confidence) intent */
  primary: ScoredIntent | null;
}