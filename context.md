# Code Context — Synastry Feature Implementation

## Files Retrieved

1. `src/lib/oracle/features.ts` (full file) — Feature definitions, intent classification patterns, synastry stubs
2. `src/lib/oracle/pipelineTypes.ts` (full file) — Pipeline architecture types (already includes `synastry` in PipelineKey)
3. `src/lib/oracle/pipelines/index.ts` (full file) — Pipeline registry (where synastry pipeline will be registered)
4. `src/lib/oracle/intentRouter.ts` (full file) — Intent routing with LLM + regex fallback (synastry_core/synastry_full map to null)
5. `src/lib/oracle/intentRouterPrompt.ts` (full file) — LLM router prompt (does NOT mention synastry yet)
6. `src/store/use-oracle-store.ts` (full file) — Zustand oracle store
7. `src/components/oracle/input/oracle-input.tsx` (full file) — Oracle input UI with feature menu
8. `src/app/oracle/new/page.tsx` (full file) — New session page
9. `convex/oracle/llm.ts` (full file) — Main LLM orchestration (invokeOracle action)
10. `convex/oracle/sessions.ts` (full file) — Session creation, messages, mutations
11. `convex/schema.ts` (full file) — Database schema
12. `src/lib/oracle/pipelines/birthChart.ts` (full file) — Reference pipeline pattern
13. `src/lib/oracle/pipelines/genericChat.ts` (full file) — Another reference pipeline
14. `src/lib/oracle/featureContext.ts` (full file) — Birth data context builder, depth instructions
15. `src/lib/oracle/synastryContext.ts` — **DOES NOT EXIST** (needs to be created)
16. `convex/oracle/synastry.ts` — **DOES NOT EXIST** (needs to be created)

---

## File 1: `src/lib/oracle/features.ts` (full)

```typescript
export const ORACLE_FEATURE_KEYS = [
  "attach_files",
  "birth_chart",
  "synastry_core",
  "synastry_full",
  "sign_card_image",
  "binaural_beats",
  "journal_recall",
] as const

export type OracleFeatureKey = (typeof ORACLE_FEATURE_KEYS)[number]

export type OracleFeatureMenuGroup = "primary" | "more"

export interface OracleFeatureDefinition {
  key: OracleFeatureKey
  label: string
  shortLabel: string
  description: string
  defaultPrompt?: string
  fallbackInjectionText?: string
  menuGroup: OracleFeatureMenuGroup
  implemented: boolean
  requiresBirthData: boolean
  requiresJournalConsent?: boolean
}

export const ORACLE_FEATURES: readonly OracleFeatureDefinition[] = [
  {
    key: "attach_files",
    label: "Add photos & files",
    shortLabel: "Photos & files",
    description: "Attach visual or supporting files to Oracle",
    menuGroup: "primary",
    implemented: false,
    requiresBirthData: false,
  },
  {
    key: "birth_chart",
    label: "Birth chart analysis",
    shortLabel: "Birth chart",
    description: "Sun, Moon, Ascendant, and full chart synthesis",
    defaultPrompt:
      "Analyze my birth chart through my Sun, Moon, and Ascendant, including the houses they fall in.",
    menuGroup: "primary",
    implemented: true,
    requiresBirthData: true,
    fallbackInjectionText: [
      "[BIRTH CHART READING — CORE DEPTH]",
      "You are performing a Birth Chart analysis.",
      "Reading instructions:",
      "- Focus on how the Big Three (Sun, Moon, Ascendant) interact as a triad — not in isolation.",
      "- Explain each house placement — the house IS the context, the sign is the style.",
      "- For aspects, prioritize the tightest orbs. Name what the aspect creates in the person's life.",
      "- Identify the primary tension or friction point and name it directly.",
      "- When you do not have specific chart data for a placement, say plainly that the data is not available.",
      "Treat the stored chart data as canonical truth. Do not invent different signs, houses, or aspects.",
      "[END BIRTH CHART READING — CORE DEPTH]",
    ].join("\n"),
  },
  {
    key: "synastry_core",
    label: "Synastry analysis",
    shortLabel: "Synastry analysis",
    description: "Relationship chart comparison",
    menuGroup: "more",
    implemented: false,
    requiresBirthData: true,
  },
  {
    key: "synastry_full",
    label: "Deep synastry analysis",
    shortLabel: "Deep synastry analysis",
    description: "Full relationship chart comparison",
    menuGroup: "more",
    implemented: false,
    requiresBirthData: true,
  },
  {
    key: "sign_card_image",
    label: "Create sign card image",
    shortLabel: "Create sign card image",
    description: "Generate a shareable sign card visual",
    menuGroup: "more",
    implemented: false,
    requiresBirthData: true,
  },
  {
    key: "binaural_beats",
    label: "Binaural Beats",
    shortLabel: "Binaural Beats",
    description: "Generate binaural beat sessions for focus, meditation, or sleep",
    menuGroup: "primary",
    implemented: true,
    requiresBirthData: false,
  },
  {
    key: "journal_recall",
    label: "Journal Recall",
    shortLabel: "Journal Recall",
    description: "Search your journal entries for patterns tied to astrological events",
    defaultPrompt: "Look through my journal and help me find patterns",
    fallbackInjectionText: [
      "[COSMIC RECALL MODE]",
      "The user has asked you to search their journal for patterns and correlations with astrological events.",
      "Use the journal context below to identify recurring emotional themes, astrological correlations, and growth patterns.",
      "Cite specific entries by date and relate them to the astrological weather at the time.",
      "[END COSMIC RECALL MODE]",
    ].join("\n"),
    menuGroup: "primary",
    implemented: true,
    requiresBirthData: false,
    requiresJournalConsent: true,
  },
] as const

const featureMap = new Map(
  ORACLE_FEATURES.map((feature) => [feature.key, feature]),
)

export function getOracleFeature(
  featureKey?: string | null,
): OracleFeatureDefinition | null {
  if (!featureKey) {
    return null
  }

  return featureMap.get(featureKey as OracleFeatureKey) ?? null
}

export function isOracleFeatureKey(value?: string | null): value is OracleFeatureKey {
  return Boolean(value && featureMap.has(value as OracleFeatureKey))
}

export function isBirthChartFeature(
  featureKey?: string | null,
): featureKey is "birth_chart" {
  return featureKey === "birth_chart"
}

export function getFeatureDefaultPrompt(
  featureKey?: string | null,
): string {
  return getOracleFeature(featureKey)?.defaultPrompt ?? ""
}

export function isImplementedFeature(featureKey?: string | null): boolean {
  return Boolean(getOracleFeature(featureKey)?.implemented)
}

// ── Intent Classification (Implicit Feature Activation) ────────────────────

export type BirthChartDepth = "core" | "full"

export interface ToolIntentResult {
  /** The tool to auto-activate, or null if no match */
  featureKey: OracleFeatureKey | null
  /** For birth_chart only: reading depth */
  depth?: BirthChartDepth
  /** Why this decision was made */
  reason: string
}

export const BIRTH_CHART_INTENT_PATTERNS: RegExp[] = [
  /\b(analy[sz]e|read|interpret|explain|review|look\s+at|do|give\s+me|get|show|tell\s+me\s+about)\b.*\b(birth\s*chart|brith\s*chart|natal\s*chart|chart)\b/i,
  /\b(birth\s*chart|brith\s*chart|natal\s*chart|natal)\b.*\b(analysis|reading|interpretation|look|overview|deep|full|detailed|in\s+depth)\b/i,
  /\bmy\s+?(birth\s*chart|brith\s*chart|natal\s*chart|chart)\b/i,
  /\bread\s+my\s+(chart|birth\s*chart|natal\s*chart)/i,
  /\bwhat\b.*\bmy\s*(chart|placements|stars|birth\s*chart)\b/i,
  /\bwhat\s+(does|do)\s+my\s+(chart|placements|stars)\b/i,
  /\b(dive|deep\s*dive|go\s+deep)\s+into\s+my\s+(chart|placements|birth\s*chart)/i,
  /\b(sun|moon|venus|mars|mercury|jupiter|saturn|uranus|neptune|pluto|ascendant|rising|nodes|north\s+node|south\s+node|chiron|part\s+of\s+fortune|midheaven)\b.*\b(chart|house|placement|natal)\b/i,
  /\b(chart|natal)\b.*\b(sun|moon|venus|mars|mercury|jupiter|saturn|uranus|neptune|pluto|ascendant|rising|nodes|chiron)\b/i,
  /\b(aspects?|conjunction|trine|square|opposition|sextile)\s+(in\s+)?my\s+chart\b/i,
  /\bmy\s+(houses?|house\s+placements?|house\s+signatures?)\b/i,
  /\bwhat\s+about\s+my\s+(nodes|north\s+node|south\s+node|part\s+of\s+fortune|chiron|houses?|placements?|aspects?)\b/i,
  /\b(chart\s+ruler|dispositor|domicile|detriment|exaltation|fall\s*\b)/i,
  /\bsynthesize\s+my\s+(full\s+)?chart\b/i,
]

export const DEPTH_SIGNAL_FULL_PATTERNS: RegExp[] = [
  /\bin\s+depth\b/i,
  /\b(deep|full|full[y]|complete|detailed|detailedl[y]|thorough|thoroughl[y]|comprehensive|comprehensively|layered|in-?depth|exhaustive|extensively|extensive)\b/i,
  /\b(all\s+(my\s+)?placements|every\s+placement|entire\s+chart|whole\s+chart|full\s+natal|my\s+placements)\b/i,
  /\b(venus|mars|mercury|jupiter|saturn|uranus|neptune|pluto)\s+(in\s+my\s+)?(chart|placement|house|sign)\b/i,
  /\bwhat\s+about\s+my\s+(nodes|north\s+node|south\s+node|part\s+of\s+fortune|chiron)\b/i,
  /\bmy\s+(houses|house\s+placements|house\s+signatures|all\s+houses)\b/i,
  /\b(aspects|conjunction|trine|square|opposition|sextile)\s+(in\s+)?my\s+chart\b/i,
  /\bsynthesize\s+my\s+(full\s+)?chart\b/i,
  /\bsynthesize\b/i,
  /\b(chart\s+ruler|dispositor|domicile|detriment|exaltation|fall)\b/i,
]

export const BINAURAL_INTENT_PATTERNS: RegExp[] = [
  /\b(generate|create|make|craft|compose)\s+(me\s+)?(a\s+)?(binaural\s+)?beat/i,
  /\b(generate|create|make)\s+(me\s+)?(a\s+)?(sound|frequency|tone|audio)\s+(for|tuned|aligned)/i,
  /\bbinaural\b.*\b(for|tuned|aligned|my|generate|create|me)\b/i,
  /\b(frequency|frequencies)\s+(for|tuned|aligned|to\s+my)\b/i,
  /\b(sleep|meditation|focus|concentration|relaxation|peak)\s+(frequency|frequencies|beat|beats|tone|tones|sound|sounds)\b/i,
  /\b(beat|beats|tone|tones)\s+(for|to\s+help|to\s+aid)\s+(sleep|meditation|focus|concentration|relaxation)\b/i,
  /\bbinaural\b.*\b(my\s+)?(chart|sign|birth|sun|moon|rising|placement|element)\b/i,
  /\b(frequency|sound|beat)\s+(for|aligned|tuned)\s+.*\b(sign|chart|moon|sun|mercury|venus|mars|retrograde|transit)\b/i,
  /\b(sound\s+healing|frequency\s+healing|solfeggio|healing\s+frequency|healing\s+sound)\b/i,
  /\b(sleep\s+frequency|meditation\s+frequency|focus\s+frequency)\b/i,
  /\bbinaural\s+beat/i,
]

export const JOURNAL_RECALL_PATTERNS: RegExp[] = [
  /\b(cosmic\s+recall)\b/i,
  /\brecall\s+my\s+journal\b/i,
  /\blook\s+(through|in|at)\s+my\s+journal\b/i,
  /\b(search|find|scan)\s+(through\s+)?my\s+journal\b/i,
  /\bwhat\s+did\s+i\s+(write|journal|record)\s+(about\s+)?(on\s+)?/i,
  /\b(my\s+journal\s+entries?|entries?\s+in\s+my\s+journal)\b/i,
  /\b(patterns?|themes?|recurring|trends?)\s+(in\s+)?my\s+journal\b/i,
  /\b(connect|correlate|relate)\s+my\s+journal\s+(to\s+)?(astro|astrology|transits?)\b/i,
  /\bwhat\s+was\s+i\s+(experiencing|feeling|going\s+through)\s+(based\s+on\s+)?my\s+journal\b/i,
  /\b(my\s+journal\s+says?|according\s+to\s+my\s+journal)\b/i,
  /\b(what\s+happened|what\s+did\s+i\s+do|how\s+was\s+i)\s+(on|around|last)\s+/i,
  /\b(week\s+ago|month\s+ago|last\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b.*\b(journal|felt|experienced)\b/i,
  /\b(dig\s+into|go\s+back\s+to|remember)\s+(my\s+)?(journal|entries|feelings\s+from)\b/i,
]

export function classifyOracleToolIntent(
  question: string,
  currentFeatureKey: string | null,
  hasBirthData: boolean,
  hasJournalConsent: boolean,
): ToolIntentResult {
  if (currentFeatureKey) {
    return { featureKey: null, reason: "manual" }
  }

  if (hasJournalConsent) {
    if (JOURNAL_RECALL_PATTERNS.some((p) => p.test(question))) {
      return { featureKey: "journal_recall", reason: "journal_intent" }
    }
  }

  if (hasBirthData) {
    if (BIRTH_CHART_INTENT_PATTERNS.some((p) => p.test(question))) {
      if (DEPTH_SIGNAL_FULL_PATTERNS.some((p) => p.test(question))) {
        return { featureKey: "birth_chart", depth: "full", reason: "deep_chart_intent" }
      }
      return { featureKey: "birth_chart", depth: "core", reason: "core_chart_intent" }
    }
  }

  if (BINAURAL_INTENT_PATTERNS.some((p) => p.test(question))) {
    return { featureKey: "binaural_beats", reason: "binaural_intent" }
  }

  return { featureKey: null, reason: "no_match" }
}

/** @deprecated Use classifyOracleToolIntent instead. */
export function classifyUserIntent(
  question: string,
  currentFeatureKey: string | null,
  hasBirthData: boolean,
): IntentClassification {
  const result = classifyOracleToolIntent(question, currentFeatureKey, hasBirthData, false)
  return { autoFeatureKey: result.featureKey }
}

export interface IntentClassification {
  autoFeatureKey: OracleFeatureKey | null
}
```

---

## File 2: `src/lib/oracle/pipelineTypes.ts` (full)

```typescript
/**
 * Oracle Pipeline Architecture — Shared Types
 * This file is TYPES ONLY — no behavior, no Convex runtime imports.
 */

export type PipelineKey =
  | "generic_chat"
  | "birth_chart"
  | "journal_recall"
  | "binaural_beats"
  | "synastry"
  | "cosmic_weather";

export type ModelHint = "fast" | "smart" | "creative";

export interface PipelineDataRequirements {
  needsBirthData: boolean;
  needsJournalContext: boolean;
  expandedJournalBudget: boolean;
  needsTimespace: boolean;
}

export interface SystemPromptBlock {
  content: string;
  priority: number;
  label: string;
}

export interface UserMessageBlock {
  content: string;
  label: string;
}

export interface PipelineContext {
  userQuestion: string;
  timezone: string;
  isFirstResponse: boolean;
  featureKey: string | null;
  birthChartDepth: "core" | "full" | null;
  birthData: string | null;
  rawBirthData: unknown | null;
  journalContext: string | null;
  timespaceContext: string | null;
  soulDoc: string;
  featureInjection: string | null;
}

export interface PostResponseAction {
  type: "store_binaural_params" | "custom";
  payload?: unknown;
}

export interface OraclePipeline {
  key: PipelineKey;
  dataRequirements: PipelineDataRequirements;
  modelHint: ModelHint;
  buildPromptBlocks(ctx: PipelineContext): {
    systemBlocks: SystemPromptBlock[];
    userBlocks: UserMessageBlock[];
  };
  afterResponse?(response: string, ctx: PipelineContext): PostResponseAction[];
}

export interface ScoredIntent {
  pipelineKey: PipelineKey;
  confidence: number;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface IntentRouterResult {
  intents: ScoredIntent[];
  hasMatch: boolean;
  primary: ScoredIntent | null;
}
```

---

## File 3: `src/lib/oracle/pipelines/index.ts` (full)

```typescript
import type { PipelineKey, OraclePipeline } from "../pipelineTypes";
import { genericChatPipeline } from "./genericChat";
import { birthChartPipeline } from "./birthChart";
import { journalRecallPipeline } from "./journalRecall";
import { binauralBeatsPipeline } from "./binauralBeats";

const pipelineRegistry = new Map<PipelineKey, OraclePipeline>();

function registerPipeline(pipeline: OraclePipeline): void {
  if (pipelineRegistry.has(pipeline.key)) {
    throw new Error(`Pipeline "${pipeline.key}" is already registered`);
  }
  pipelineRegistry.set(pipeline.key, pipeline);
}

registerPipeline(genericChatPipeline);
registerPipeline(birthChartPipeline);
registerPipeline(journalRecallPipeline);
registerPipeline(binauralBeatsPipeline);

export function getPipeline(key: PipelineKey): OraclePipeline | undefined {
  return pipelineRegistry.get(key);
}

export function getAllPipelines(): OraclePipeline[] {
  return Array.from(pipelineRegistry.values());
}
```

---

## File 4: `src/lib/oracle/intentRouter.ts` (full)

```typescript
/**
 * Intent Router — Multi-Intent Scorer with LLM Support
 *
 * Primary path: LLM-based intent classification using a fast, cheap model.
 * Fallback path: Regex-based classification.
 */

import type { IntentRouterResult, ScoredIntent, PipelineKey } from "./pipelineTypes";
import type { ProviderConfig, ModelChainEntry } from "./providers";
import { buildProviderHeaders, buildProviderUrl } from "./providers";
import {
  BIRTH_CHART_INTENT_PATTERNS,
  DEPTH_SIGNAL_FULL_PATTERNS,
  JOURNAL_RECALL_PATTERNS,
  BINAURAL_INTENT_PATTERNS,
} from "./features";
import {
  buildIntentRouterPrompt,
  parseIntentRouterResponse,
  mapLLMIntentsToScoredIntents,
} from "./intentRouterPrompt";

const CONFIDENCE_THRESHOLD = 0.5;

function featureKeyToPipelineKey(featureKey: string): PipelineKey | null {
  switch (featureKey) {
    case "birth_chart":
    case "birth_chart_core":
    case "birth_chart_full":
      return "birth_chart";
    case "journal_recall":
      return "journal_recall";
    case "binaural_beats":
      return "binaural_beats";
    // Not yet implemented as pipelines — fall through to generic
    case "synastry_core":
    case "synastry_full":
    case "sign_card_image":
    case "attach_files":
      return null;
    default:
      return null;
  }
}

export function scoreIntents(params: {
  question: string;
  hasBirthData: boolean;
  hasJournalConsent: boolean;
  currentFeatureKey: string | null;
}): IntentRouterResult {
  const { question, hasBirthData, hasJournalConsent, currentFeatureKey } = params;

  if (currentFeatureKey) {
    const pipelineKey = featureKeyToPipelineKey(currentFeatureKey);
    if (pipelineKey) {
      const metadata: Record<string, unknown> = {};
      if (currentFeatureKey === "birth_chart_full") metadata.depth = "full";
      else if (currentFeatureKey === "birth_chart_core") metadata.depth = "core";

      return {
        intents: [{ pipelineKey, confidence: 1.0, reason: "manual_selection", ...(Object.keys(metadata).length > 0 ? { metadata } : {}) }],
        hasMatch: true,
        primary: { pipelineKey, confidence: 1.0, reason: "manual_selection", ...(Object.keys(metadata).length > 0 ? { metadata } : {}) },
      };
    }
  }

  const intents: ScoredIntent[] = [];

  if (BIRTH_CHART_INTENT_PATTERNS.some((p) => p.test(question))) {
    const isFull = DEPTH_SIGNAL_FULL_PATTERNS.some((p) => p.test(question));
    const baseConfidence = isFull ? 0.9 : 0.7;
    intents.push({
      pipelineKey: "birth_chart",
      confidence: baseConfidence,
      reason: isFull ? "deep_chart_intent" : "core_chart_intent",
      metadata: { depth: isFull ? "full" : "core", hasBirthData },
    });
  }

  if (hasJournalConsent && JOURNAL_RECALL_PATTERNS.some((p) => p.test(question))) {
    intents.push({ pipelineKey: "journal_recall", confidence: 0.8, reason: "journal_intent" });
  }

  if (BINAURAL_INTENT_PATTERNS.some((p) => p.test(question))) {
    intents.push({ pipelineKey: "binaural_beats", confidence: 0.85, reason: "binaural_intent" });
  }

  const filtered = intents
    .filter((i) => i.confidence >= CONFIDENCE_THRESHOLD)
    .sort((a, b) => b.confidence - a.confidence);

  if (filtered.length === 0) {
    return {
      intents: [{ pipelineKey: "generic_chat", confidence: 1.0, reason: "fallback_no_match" }],
      hasMatch: false,
      primary: { pipelineKey: "generic_chat", confidence: 1.0, reason: "fallback_no_match" },
    };
  }

  return { intents: filtered, hasMatch: true, primary: filtered[0] };
}

const INTENT_ROUTER_TIMEOUT_MS = 3000;
const INTENT_ROUTER_MAX_TOKENS = 150;

export async function scoreIntentsWithLLM(params: {
  question: string;
  hasBirthData: boolean;
  hasJournalConsent: boolean;
  currentFeatureKey: string | null;
  providers: ProviderConfig[];
  modelChain: ModelChainEntry[];
}): Promise<IntentRouterResult> {
  const { question, hasBirthData, hasJournalConsent, currentFeatureKey, providers, modelChain } = params;

  if (currentFeatureKey) {
    const pipelineKey = featureKeyToPipelineKey(currentFeatureKey);
    if (pipelineKey) {
      const metadata: Record<string, unknown> = {};
      if (currentFeatureKey === "birth_chart_full") metadata.depth = "full";
      else if (currentFeatureKey === "birth_chart_core") metadata.depth = "core";
      return {
        intents: [{ pipelineKey, confidence: 1.0, reason: "manual_selection", ...(Object.keys(metadata).length > 0 ? { metadata } : {}) }],
        hasMatch: true,
        primary: { pipelineKey, confidence: 1.0, reason: "manual_selection", ...(Object.keys(metadata).length > 0 ? { metadata } : {}) },
      };
    }
  }

  const llmResult = await callIntentRouterLLM(question, hasBirthData, hasJournalConsent, providers, modelChain);

  if (llmResult) {
    const mappedIntents = mapLLMIntentsToScoredIntents(llmResult, hasBirthData);
    if (mappedIntents.length > 0) {
      const gatedIntents = mappedIntents.filter((intent) => {
        if (intent.pipelineKey === "journal_recall" && !hasJournalConsent) return false;
        return true;
      });

      const filtered = gatedIntents
        .filter((i) => i.confidence >= CONFIDENCE_THRESHOLD)
        .sort((a, b) => b.confidence - a.confidence);

      if (filtered.length > 0) {
        const nonGeneric = filtered.filter((i) => i.pipelineKey !== "generic_chat");
        const finalIntents = nonGeneric.length > 0 ? nonGeneric : filtered;

        return { intents: finalIntents, hasMatch: true, primary: finalIntents[0] };
      }
    }
  }

  return scoreIntents({ question, hasBirthData, hasJournalConsent, currentFeatureKey });
}

async function callIntentRouterLLM(
  question: string, hasBirthData: boolean, hasJournalConsent: boolean,
  providers: ProviderConfig[], modelChain: ModelChainEntry[],
): Promise<ReturnType<typeof parseIntentRouterResponse>> {
  const { systemPrompt, userMessage } = buildIntentRouterPrompt(question, {
    birthChart: true, journalRecall: hasJournalConsent, binauralBeats: true,
  });

  for (const entry of modelChain) {
    const provider = providers.find((p) => p.id === entry.providerId);
    if (!provider) continue;
    const apiKey = process.env[provider.apiKeyEnvVar];
    if (provider.type !== "ollama" && !apiKey) continue;
    const url = buildProviderUrl(provider);
    const headers = buildProviderHeaders(provider, apiKey);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), INTENT_ROUTER_TIMEOUT_MS);
      const response = await fetch(url, {
        method: "POST", headers,
        body: JSON.stringify({ model: entry.model, messages: [{ role: "system" as const, content: systemPrompt }, { role: "user" as const, content: userMessage }], temperature: 0.1, max_tokens: INTENT_ROUTER_MAX_TOKENS, stream: false }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) continue;
      const data = await response.json() as any;
      const content = data?.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") continue;

      const parsed = parseIntentRouterResponse(content);
      if (!parsed) continue;
      return parsed;
    } catch (error: any) {
      continue;
    }
  }
  return null;
}
```

---

## File 5: `src/lib/oracle/intentRouterPrompt.ts` (full)

```typescript
import type { PipelineKey } from "./pipelineTypes";

interface FeatureAvailability {
  birthChart: boolean;
  journalRecall: boolean;
  binauralBeats: boolean;
}

const INTENT_ROUTER_SYSTEM_PROMPT = `You are an intent classifier for an astrological AI called Oracle.

Given a user's message, classify which feature(s) they want. Respond with ONLY valid JSON — no markdown, no explanation, no code fences.

Available features:
- birth_chart: Chart reading, natal analysis, placement interpretation, transit analysis, anything about the user's astrological chart, signs, planets, houses
- journal_recall: Searching through the user's personal journal entries for patterns, themes, or emotional correlations with astrology
- binaural_beats: Sound/frequency generation, meditation audio, binaural beats, sleep sounds, focus tones
- generic_chat: General conversation, casual chat, questions that don't match other features

Rules:
- Match INTENT, not spelling. Typos like "analize" = analyze, "bierht" = birth, "brith" = birth, "sjgn" = sign, "placment" = placement
- Match SEMANTICS, not keywords. "what do my stars say about love?" = birth_chart. "read my sky map" = birth_chart. "mi carta astral" = birth_chart.
- "look through my journal for patterns with my Venus" = journal_recall AND birth_chart (compose multiple intents)
- If uncertain between generic_chat and another feature, prefer generic_chat
- Chart depth: mention of "deep", "detailed", "full", "complete", "thorough", "comprehensive", "in depth", "in-depth" → depth "full"; otherwise → depth "core"
- If a feature is marked as unavailable below, do NOT assign it
- Always assign at least one intent; if nothing matches, use generic_chat
- Multiple intents ARE allowed when the message clearly references multiple features

Respond with ONLY this JSON object (no other text):
{"intents":[{"pipeline":"birth_chart","confidence":0.9,"depth":"core"},{"pipeline":"generic_chat","confidence":0.3,"depth":null}]}`;

export function buildIntentRouterUserMessage(question: string, features: FeatureAvailability): string {
  const available: string[] = [];
  const unavailable: string[] = [];
  if (features.birthChart) available.push("birth_chart"); else unavailable.push("birth_chart");
  if (features.journalRecall) available.push("journal_recall"); else unavailable.push("journal_recall");
  available.push("binaural_beats");
  const parts = [`Available features: ${available.join(", ")}`];
  if (unavailable.length > 0) parts.push(`Unavailable features (do NOT assign): ${unavailable.join(", ")}`);
  parts.push(`User message: "${question}"`);
  return parts.join("\n");
}

export function buildIntentRouterPrompt(question: string, features: FeatureAvailability): { systemPrompt: string; userMessage: string } {
  return { systemPrompt: INTENT_ROUTER_SYSTEM_PROMPT, userMessage: buildIntentRouterUserMessage(question, features) };
}

interface RawIntentRouterResponse {
  intents: Array<{ pipeline: string; confidence: number; depth: string | null }>;
}

const VALID_PIPELINES: Set<string> = new Set(["birth_chart", "journal_recall", "binaural_beats", "generic_chat"]);

export function parseIntentRouterResponse(raw: string): RawIntentRouterResponse | null {
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) return null;
  const jsonStr = cleaned.substring(jsonStart, jsonEnd + 1);
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !Array.isArray(parsed.intents)) return null;
    const validatedIntents: RawIntentRouterResponse["intents"] = [];
    for (const intent of parsed.intents) {
      if (!intent.pipeline || !VALID_PIPELINES.has(intent.pipeline)) continue;
      if (typeof intent.confidence !== "number" || intent.confidence < 0 || intent.confidence > 1) intent.confidence = 0.5;
      validatedIntents.push({ pipeline: intent.pipeline, confidence: intent.confidence, depth: (intent.depth === "full" || intent.depth === "core") ? intent.depth : null });
    }
    if (validatedIntents.length === 0) return null;
    return { intents: validatedIntents };
  } catch { return null; }
}

export function mapLLMIntentsToScoredIntents(parsed: RawIntentRouterResponse, hasBirthData: boolean): Array<{ pipelineKey: PipelineKey; confidence: number; reason: string; metadata?: Record<string, unknown> }> {
  return parsed.intents.map((intent) => {
    const metadata: Record<string, unknown> = {};
    if (intent.pipeline === "birth_chart" && intent.depth) metadata.depth = intent.depth;
    if (intent.pipeline === "birth_chart") metadata.hasBirthData = hasBirthData;
    return { pipelineKey: intent.pipeline as PipelineKey, confidence: intent.confidence, reason: "llm_intent_router", ...(Object.keys(metadata).length > 0 ? { metadata } : {}) };
  });
}

export { INTENT_ROUTER_SYSTEM_PROMPT };
```

---

## File 6: `src/store/use-oracle-store.ts` (full)

```typescript
import { create } from "zustand";
import { Id } from "../../convex/_generated/dataModel";
import type { OracleFeatureKey, BirthChartDepth } from "@/lib/oracle/features";
import { detectTimezone } from "@/lib/timezone";

export type OracleState = "idle" | "oracle_responding" | "conversation_active";

export interface TimingMetrics {
    promptBuildMs: number;
    requestQueueMs: number;
    ttftMs: number;
    initialDecodeMs: number;
    totalMs: number;
}

export interface DebugModelOverride {
    providerId: string;
    model: string;
}

interface OracleStore {
    sessionId: Id<"oracle_sessions"> | null;
    state: OracleState;
    selectedFeatureKey: OracleFeatureKey | null;
    birthChartDepth: BirthChartDepth;
    pendingQuestion: string;
    isStreaming: boolean;
    quotaRemaining: number | null;
    quotaResetAt: number | null;
    quotaExhausted: boolean;
    timezone: string;
    debugOpen: boolean;
    debugModelOverride: DebugModelOverride | null;
    debugLastMetrics: TimingMetrics | null;
    debugDebugModelUsed: string | null;
    debugClientTiming: { requestStartMs: number | null; firstContentMs: number | null; completeMs: number | null };
    debugPromptTokens: number | null;
    debugCompletionTokens: number | null;

    setSelectedFeature: (featureKey: OracleFeatureKey | null) => void;
    setBirthChartDepth: (depth: BirthChartDepth) => void;
    clearSelectedFeature: () => void;
    hydrateSessionFeature: (featureKey: OracleFeatureKey | null) => void;
    setPendingQuestion: (text: string) => void;
    setOracleResponding: () => void;
    setIsStreaming: (streaming: boolean) => void;
    setSessionId: (id: Id<"oracle_sessions">) => void;
    setConversationActive: () => void;
    setQuota: (remaining: number | null, resetAt: number | null) => void;
    setTimezone: (tz: string) => void;
    resetToIdle: () => void;
    setDebugOpen: (open: boolean) => void;
    setDebugModelOverride: (override: DebugModelOverride | null) => void;
    setDebugLastMetrics: (metrics: TimingMetrics | null) => void;
    setDebugDebugModelUsed: (model: string | null) => void;
    setDebugClientTiming: (timing: { requestStartMs: number | null; firstContentMs: number | null; completeMs: number | null }) => void;
    setDebugPromptTokens: (tokens: number | null) => void;
    setDebugCompletionTokens: (tokens: number | null) => void;
}

export const useOracleStore = create<OracleStore>((set, get) => ({
    sessionId: null,
    state: "idle",
    selectedFeatureKey: null,
    birthChartDepth: "core",
    pendingQuestion: "",
    isStreaming: false,
    quotaRemaining: null,
    quotaResetAt: null,
    quotaExhausted: false,
    timezone: typeof window !== "undefined" ? detectTimezone() : "UTC",
    debugOpen: true,
    debugModelOverride: null,
    debugLastMetrics: null,
    debugDebugModelUsed: null,
    debugClientTiming: { requestStartMs: null, firstContentMs: null, completeMs: null },
    debugPromptTokens: null,
    debugCompletionTokens: null,

    setSelectedFeature: (featureKey) => set({ selectedFeatureKey: featureKey }),
    setBirthChartDepth: (depth) => set({ birthChartDepth: depth }),
    clearSelectedFeature: () => set({ selectedFeatureKey: null }),
    hydrateSessionFeature: (featureKey) => set({ selectedFeatureKey: featureKey, birthChartDepth: "core" }),
    setPendingQuestion: (text) => set({ pendingQuestion: text }),
    setOracleResponding: () => set({ state: "oracle_responding" }),
    setIsStreaming: (streaming) => set({ isStreaming: streaming }),
    setSessionId: (id) => set({ sessionId: id }),
    setConversationActive: () => set({ state: "conversation_active" }),
    setQuota: (remaining, resetAt) => set({ quotaRemaining: remaining, quotaResetAt: resetAt, quotaExhausted: remaining !== null && remaining <= 0 }),
    setTimezone: (tz: string) => set({ timezone: tz }),
    resetToIdle: () => set({ sessionId: null, state: "idle", selectedFeatureKey: null, birthChartDepth: "core", pendingQuestion: "", isStreaming: false }),
    setDebugOpen: (open) => set({ debugOpen: open }),
    setDebugModelOverride: (override) => set({ debugModelOverride: override }),
    setDebugLastMetrics: (metrics) => set({ debugLastMetrics: metrics }),
    setDebugDebugModelUsed: (model) => set({ debugDebugModelUsed: model }),
    setDebugClientTiming: (timing) => set({ debugClientTiming: timing }),
    setDebugPromptTokens: (tokens) => set({ debugPromptTokens: tokens }),
    setDebugCompletionTokens: (tokens) => set({ debugCompletionTokens: tokens }),
}));
```

---

## File 7: `src/components/oracle/input/oracle-input.tsx` (full)

```tsx
"use client"

import * as React from "react"
import { Plus, Send, Sparkles, X } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { GiMazeCornea, GiMusicalNotes, GiScrollUnfurled } from "react-icons/gi"

import { OracleChartPreview } from "@/components/oracle/input/oracle-chart-preview"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { OracleBirthData } from "@/lib/oracle/featureContext"
import { ORACLE_FEATURES, type OracleFeatureKey, type BirthChartDepth, getOracleFeature, isBirthChartFeature } from "@/lib/oracle/features"
import { BinauralBeatsCard } from "@/components/oracle/input/binaural-beats-card"
import type { BinauralBeatParams } from "@/lib/binaural-presets"

interface OracleInputProps {
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  disabled?: boolean
  canSubmit?: boolean
  inputRef?: React.RefObject<HTMLInputElement | null>
  featureKey?: OracleFeatureKey | null
  onFeatureSelect: (featureKey: OracleFeatureKey) => void
  onFeatureClear: () => void
  birthData?: OracleBirthData | null
  username?: string | null
  onBinauralGenerate?: (params: BinauralBeatParams) => void
  birthChartDepth?: BirthChartDepth
  onBirthChartDepthChange?: (depth: BirthChartDepth) => void
}

export function OracleInput({
  value, onValueChange, onSubmit, placeholder, disabled = false, canSubmit = false, inputRef,
  featureKey, onFeatureSelect, onFeatureClear, birthData, username,
  onBinauralGenerate, birthChartDepth = "core", onBirthChartDepthChange,
}: OracleInputProps) {
  const activeFeature = getOracleFeature(featureKey)
  const showBirthPreview = isBirthChartFeature(featureKey)
  const showBinauralBeats = featureKey === "binaural_beats"
  const showFeatureBadge = activeFeature && !showBirthPreview

  const consent = useQuery(api.journal.consent.getConsent)

  function isFeatureDisabled(feat: typeof ORACLE_FEATURES[number]): boolean {
    if (!feat.implemented) return true
    if (feat.requiresJournalConsent) {
      if (consent === undefined || consent === null || !consent.oracleCanReadJournal) return true
    }
    return false
  }

  function getFeatureDisabledReason(feat: typeof ORACLE_FEATURES[number]): string | null {
    if (!feat.implemented) return "Coming soon"
    if (feat.requiresJournalConsent) {
      if (consent === undefined) return "Loading…"
      if (consent === null || !consent?.oracleCanReadJournal) return "Requires journal access — enable in Journal Settings"
    }
    return null
  }

  function getFeatureIcon(key: OracleFeatureKey) {
    switch (key) {
      case "birth_chart": return <GiMazeCornea className="w-4 h-4 text-galactic" />
      case "binaural_beats": return <GiMusicalNotes className="w-4 h-4 text-galactic" />
      case "journal_recall": return <GiScrollUnfurled className="w-4 h-4 text-galactic" />
      default: return <Sparkles className="w-4 h-4 text-galactic" />
    }
  }

  const primaryFeatureItems = ORACLE_FEATURES.filter((feature) => feature.menuGroup === "primary")

  return (
    <div className="space-y-3">
      {showFeatureBadge ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-galactic/35 bg-galactic/12 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl">
            <Sparkles className="size-3.5 text-galactic" />
            <span className="tracking-wide">{activeFeature.shortLabel}</span>
            <button type="button" onClick={onFeatureClear} className="rounded-full p-0.5 text-white/45 transition hover:bg-white/10 hover:text-white" aria-label={`Clear ${activeFeature.shortLabel}`}>
              <X className="size-3.5" />
            </button>
          </div>
          <span className="text-[11px] uppercase tracking-[0.24em] text-white/35">Feature mode</span>
        </div>
      ) : null}

      {showBirthPreview ? (
        <OracleChartPreview birthData={birthData} username={username} depth={birthChartDepth} onDepthChange={onBirthChartDepthChange} onDismiss={onFeatureClear} />
      ) : null}

      {showBinauralBeats ? (
        <BinauralBeatsCard onDismiss={onFeatureClear} onGenerate={onBinauralGenerate} />
      ) : null}

      <div className="relative group">
        <div className="absolute -inset-1 bg-linear-to-r from-galactic/20 via-primary/10 to-galactic/20 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
        <div className="relative flex items-center bg-background/90 backdrop-blur-2xl border border-white/10 focus-within:border-galactic/50 rounded-2xl p-1.5 shadow-xl transition-all h-14 gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="shrink-0 text-white/40 hover:text-white hover:bg-white/10 focus-visible:ring-0 transition-colors h-10 w-10 rounded-xl" aria-label="Open Oracle feature menu">
                <Plus className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 border-galactic/20 bg-background/95 backdrop-blur-xl" align="start">
              {primaryFeatureItems.map((feature) => {
                const disabled = isFeatureDisabled(feature)
                const reason = getFeatureDisabledReason(feature)
                return (
                  <DropdownMenuItem key={feature.key} disabled={disabled} className="gap-2.5 cursor-pointer text-white/80 hover:text-white focus:text-white" onSelect={() => !disabled && onFeatureSelect(feature.key)}>
                    {getFeatureIcon(feature.key)}
                    <span className="text-sm">{feature.label}</span>
                    {reason && <span className="ml-auto text-[10px] text-white/30">{reason}</span>}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Input ref={inputRef} type="text" value={value} onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && canSubmit && !disabled) onSubmit() }}
            placeholder={placeholder} disabled={disabled}
            className="flex-1 bg-transparent border-none outline-none hover:bg-transparent hover:border-0 hover:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder:text-white/30 text-sm md:text-base font-sans px-2 shadow-none disabled:opacity-50"
            aria-label="Oracle message input" />

          <Button type="button" size="icon" onClick={onSubmit} disabled={!canSubmit || disabled}
            className={`shrink-0 rounded-xl transition-all h-10 w-10 ${canSubmit && !disabled ? "bg-galactic text-white shadow-[0_0_15px_rgba(157,78,221,0.5)] hover:bg-galactic/90" : "bg-white/10 text-white/30 hover:bg-white/20 hover:text-white/50"}`}
            aria-label="Send message">
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

## File 8: `src/app/oracle/new/page.tsx` (full)

This is a large file (~280 lines). Key points:
- Uses `useMutation(api.oracle.sessions.createSession)` to create sessions
- Passes `featureKey` and `questionText` to `createSession`
- Uses `OracleInput` with feature selection callbacks
- On submit: `createSession({ featureKey: selectedFeatureKey ?? undefined, questionText })` → `setSessionId` → `router.push`
- Binaural beats has special handling (no AI invocation)

(Full source available in the read above — see the complete file content in the tool output.)

---

## File 9: `convex/oracle/llm.ts` (full)

This is the main LLM orchestration file (~600 lines). Key architecture:

**Phase 0:** Safety gates (input validation, kill switch, crisis detection)
**Phase 1:** Load context (session, config, user, legacy feature key migration, journal consent)
**Phase 2:** Intent routing via `scoreIntentsWithLLM()` → resolves pipelines
**Phase 3:** Gather data (birth data, journal context, timespace, feature injection) based on pipeline requirements
**Phase 4:** Build prompt (pipeline-driven `buildPromptBlocks`, sort by priority, prepend safety)
**Phase 5:** Provider selection + LLM call (streaming with SSE)
**Post-process:** Quota, title, timing, pipeline `afterResponse` hooks

Key integration points for synastry:
- `featureKeyToPipelineKey()` in intentRouter.ts maps `synastry_core`/`synastry_full` → `null` (needs to change to `"synastry"`)
- Feature injection loading in PHASE 3 only handles `birth_chart` and `journal_recall` (needs synastry addition)
- `rawBirthData: unknown | null` on PipelineContext — a synastry pipeline would need a SECOND person's birth data

(Full source available in the read above.)

---

## File 10: `convex/oracle/sessions.ts` (full)

Key functions:
- `createSession`: Takes `featureKey?: string, questionText: string` — stores featureKey on session
- `getSessionWithMessages`: Returns session with all messages ordered by createdAt
- `updateSessionFeature`: Patches `featureKey` on session
- `updateSessionBirthChartDepth`: Patches `birthChartDepth` on session (internal)
- `addMessage`: Standard message insert with optional metadata (model, tokens, fallback tier, audio)
- `createStreamingMessage` / `updateStreamingContent` / `finalizeStreamingMessage`: Streaming support

Session schema fields relevant to synastry:
- `featureKey: v.optional(v.string())` — already supports any string, including "synastry_core"/"synastry_full"
- `birthChartDepth: v.optional(v.union(v.literal("core"), v.literal("full")))` — could be reused or extended for synastry depth

---

## File 11: `convex/schema.ts` (relevant sections)

**oracle_sessions table:**
```typescript
oracle_sessions: defineTable({
    userId: v.id("users"),
    title: v.string(),
    titleGenerated: v.optional(v.boolean()),
    featureKey: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("completed")),
    messageCount: v.number(),
    primaryModelUsed: v.optional(v.string()),
    usedFallback: v.optional(v.boolean()),
    birthChartDepth: v.optional(v.union(v.literal("core"), v.literal("full"))),
    starType: v.optional(v.union(v.literal("beveled"), v.literal("cursed"))),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastMessageAt: v.number(),
}).index("by_user", ["userId"]).index("by_user_updated", ["userId", "updatedAt"]),
```

**oracle_messages table:** Has `sessionId`, `role`, `content`, LLM metadata, timing, audio fields.

**oracle_feature_injections table:**
```typescript
oracle_feature_injections: defineTable({
    featureKey: v.string(),
    contextText: v.string(),
    isActive: v.boolean(),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
}).index("by_feature", ["featureKey"]),
```

**users.birthData:** Contains full chart data including `placements`, `chart` (with planets, houses, aspects), `location`.

**No `synastry_partners` or similar table exists** — would need to be added for partner birth data storage.

---

## File 12: `src/lib/oracle/pipelines/birthChart.ts` (reference pipeline)

```typescript
import type { OraclePipeline, PipelineContext, SystemPromptBlock, UserMessageBlock } from "../pipelineTypes";
import { getBirthChartDepthInstructions } from "../featureContext";

export const birthChartPipeline: OraclePipeline = {
  key: "birth_chart",
  dataRequirements: {
    needsBirthData: true,
    needsJournalContext: true,
    expandedJournalBudget: false,
    needsTimespace: true,
  },
  modelHint: "smart",

  buildPromptBlocks(ctx: PipelineContext): { systemBlocks: SystemPromptBlock[]; userBlocks: UserMessageBlock[] } {
    const systemBlocks: SystemPromptBlock[] = [];

    systemBlocks.push({ content: ctx.soulDoc, priority: 90, label: "soul_document" });

    const depth = ctx.birthChartDepth ?? "core";
    const depthInstructions = ctx.featureInjection ?? getBirthChartDepthInstructions(depth);
    systemBlocks.push({ content: depthInstructions, priority: 80, label: `birth_chart_depth_${depth}` });

    if (ctx.timespaceContext) {
      systemBlocks.push({ content: ctx.timespaceContext, priority: 50, label: "timespace" });
    }

    if (ctx.journalContext) {
      systemBlocks.push({ content: ctx.journalContext, priority: 40, label: "journal_context" });
    }

    const userBlocks: UserMessageBlock[] = [];
    if (ctx.birthData) {
      userBlocks.push({ content: `[BIRTH CHART DATA]\n${ctx.birthData}`, label: "birth_chart_data" });
    } else {
      systemBlocks.push({
        content: ["[CHART DATA UNAVAILABLE]", "The user has requested a birth chart reading but does not have birth data on file.",
          "Ask them for their birth date, exact birth time, and birth city/country.",
          "Do NOT invent or assume any placements, signs, or houses.",
          "Once they provide their data, you will be able to give them the reading described above.",
          "[END CHART DATA UNAVAILABLE]"].join("\n"),
        priority: 75, label: "birth_data_unavailable",
      });
    }

    return { systemBlocks, userBlocks };
  },
};
```

---

## File 13: `src/lib/oracle/pipelines/genericChat.ts` (reference)

```typescript
import type { OraclePipeline, PipelineContext, SystemPromptBlock, UserMessageBlock } from "../pipelineTypes";

export const genericChatPipeline: OraclePipeline = {
  key: "generic_chat",
  dataRequirements: {
    needsBirthData: false,
    needsJournalContext: true,
    expandedJournalBudget: false,
    needsTimespace: true,
  },
  modelHint: "fast",
  buildPromptBlocks(ctx: PipelineContext): { systemBlocks: SystemPromptBlock[]; userBlocks: UserMessageBlock[] } {
    const systemBlocks: SystemPromptBlock[] = [];
    systemBlocks.push({ content: ctx.soulDoc, priority: 90, label: "soul_document" });
    if (ctx.timespaceContext) systemBlocks.push({ content: ctx.timespaceContext, priority: 50, label: "timespace" });
    if (ctx.journalContext) systemBlocks.push({ content: ctx.journalContext, priority: 40, label: "journal_context" });
    return { systemBlocks, userBlocks: [] };
  },
};
```

---

## File 14: `src/lib/oracle/featureContext.ts` (key exports)

Key exports for synastry:
- `OracleBirthData` type alias for `StoredBirthData`
- `buildUniversalBirthContext(birthData: OracleBirthData): string` — formats all chart data as text
- `getBirthChartDepthInstructions(depth: BirthChartDepth): string` — core/full instruction blocks

(Full source available in the read above.)

---

## Architecture

### Pipeline System
1. **Pipeline Registry** (`pipelines/index.ts`): Map of `PipelineKey → OraclePipeline`. Add a new pipeline by creating a file and calling `registerPipeline()`.
2. **Intent Router** (`intentRouter.ts`): Classifies user questions → `PipelineKey`. Uses LLM (primary) or regex (fallback). `featureKeyToPipelineKey()` maps session feature keys to pipeline keys.
3. **LLM Orchestrator** (`convex/oracle/llm.ts`): `invokeOracle` action — loads context, routes intent, gathers data per pipeline requirements, builds prompt blocks, calls LLM, handles streaming, post-processes.
4. **Feature Definitions** (`features.ts`): `ORACLE_FEATURES` array defines all features with `implemented` flag, menu group, data requirements.

### Data Flow for Synastry
1. User selects synastry feature (or auto-detected) → stored as `featureKey` on session
2. `createSession({ featureKey: "synastry_core", questionText })` → Convex mutation
3. `invokeOracle` → intent router → resolves `synastry` pipeline
4. Pipeline's `dataRequirements` tells orchestrator what to gather (birth data, partner data)
5. Pipeline's `buildPromptBlocks()` produces system + user blocks
6. LLM receives the full prompt and generates synastry reading

### What's Missing for Synastry
1. **`synastryContext.ts`** — needs to be created. Should compute synastry aspects between two charts.
2. **`convex/oracle/synastry.ts`** — needs to be created. Partner data lookup/storage.
3. **`src/lib/oracle/pipelines/synastry.ts`** — needs to be created. The pipeline itself.
4. **Pipeline registry** — needs `registerPipeline(synastryPipeline)` added.
5. **`features.ts`** — synastry entries exist but `implemented: false`. Need to set `true`.
6. **`intentRouter.ts`** — `featureKeyToPipelineKey()` returns `null` for `synastry_core`/`synastry_full`. Needs to return `"synastry"`.
7. **`intentRouterPrompt.ts`** — LLM prompt doesn't mention synastry. Needs synastry feature description.
8. **`pipelineTypes.ts`** — `PipelineKey` already includes `"synastry"` ✅
9. **`PipelineContext`** — Only has `birthData` (string) and `rawBirthData` (unknown). Needs partner data fields.
10. **`convex/oracle/llm.ts`** — Feature injection loading only handles birth_chart and journal_recall. Needs synastry.
11. **Schema** — No `synastry_partners` table for storing partner birth data.
12. **UI** — Need partner input UI (name + birth data entry).

---

## Start Here

**`src/lib/oracle/pipelines/birthChart.ts`** — This is the best reference for creating the synastry pipeline. Follow the exact same `OraclePipeline` interface pattern. The key difference is the synastry pipeline needs TWO sets of birth data and will compute inter-chart aspects.

**`src/lib/oracle/featureContext.ts`** — The `buildUniversalBirthContext()` function formats birth data into text. The synastry pipeline will use this (or a similar function) for both charts, plus a cross-aspect computation.

---

## Files That Don't Exist Yet (need creation)

- `src/lib/oracle/synastryContext.ts` — Synastry computation (cross-chart aspects, compatibility scoring)
- `convex/oracle/synastry.ts` — Partner data storage/lookup mutations & queries
- `src/lib/oracle/pipelines/synastry.ts` — The synastry pipeline implementing `OraclePipeline`
