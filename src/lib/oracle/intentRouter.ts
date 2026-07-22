/**
 * Intent Router — Multi-Intent Scorer with LLM Support
 *
 * Primary path: LLM-based intent classification using a fast, cheap model
 * that understands typos, creative phrasing, and semantic intent.
 *
 * Fallback path: Regex-based classification (original implementation)
 * used when the LLM call fails, times out, or returns invalid JSON.
 *
 * The LLM router handles the bug where regex completely misses natural
 * language with typos like "analize my bierht chart" — the LLM understands
 * that "analize" ≈ "analyze" and "bierht" ≈ "birth" and routes correctly.
 */

import type { IntentRouterResult, ScoredIntent, PipelineKey } from "./pipelineTypes";
import type { ProviderConfig, ModelChainEntry } from "./providers";
import { buildProviderHeaders, buildProviderUrl } from "./providers";
import {
  BIRTH_CHART_INTENT_PATTERNS,
  DEPTH_SIGNAL_FULL_PATTERNS,
  JOURNAL_RECALL_PATTERNS,
  isBinauralBeatRequest,
  SYNASTRY_INTENT_PATTERNS,
} from "./features";
import {
  buildIntentRouterPrompt,
  parseIntentRouterResponse,
  mapLLMIntentsToScoredIntents,
} from "./intentRouterPrompt";
import { detectExplicitCapabilityExclusions, isCosmicWeatherRequest } from "./requestPlanner";

/** Minimum confidence score to activate a pipeline */
const CONFIDENCE_THRESHOLD = 0.5;

export function pipelineIsExcluded(
  pipelineKey: PipelineKey,
  excluded: ReadonlySet<string>,
): boolean {
  return (pipelineKey === "birth_chart" && excluded.has("natal_chart"))
    || (pipelineKey === "journal_recall" && excluded.has("journal_recall"));
}

/**
 * Map an OracleFeatureKey from a session to a PipelineKey.
 * Handles legacy keys (birth_chart_core, birth_chart_full) and
 * unimplemented features that fall back to generic_chat.
 */
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
    case "synastry":
      return "synastry";
    // Not yet implemented as pipelines — fall through to generic
    case "sign_card_image":
    case "attach_files":
      return null;
    default:
      return null;
  }
}

// ── Regex-based scoring (original, kept as fallback) ────────────────────────

/**
 * Score user intent against all known pipelines using regex patterns.
 *
 * This is the ORIGINAL implementation, preserved as the fallback path
 * for when the LLM router is unavailable. It uses exact-pattern matching
 * and misses typos, creative phrasing, and semantic intent.
 *
 * Returns ALL matching intents sorted by confidence (highest first).
 */
export function scoreIntents(params: {
  question: string;
  hasBirthData: boolean;
  hasJournalConsent: boolean;
  currentFeatureKey: string | null;
}): IntentRouterResult {
  const { question, hasBirthData, hasJournalConsent, currentFeatureKey } = params;
  const excluded = new Set(detectExplicitCapabilityExclusions(question));

  // ── Score each pipeline independently ────────────────────────────────────
  const intents: ScoredIntent[] = [];

  if (!excluded.has("natal_chart") && BIRTH_CHART_INTENT_PATTERNS.some((p) => p.test(question))) {
    const isFull = DEPTH_SIGNAL_FULL_PATTERNS.some((p) => p.test(question));
    const baseConfidence = isFull ? 0.9 : 0.7;
    intents.push({
      pipelineKey: "birth_chart",
      confidence: baseConfidence,
      reason: isFull ? "deep_chart_intent" : "core_chart_intent",
      metadata: { depth: isFull ? "full" : "core", hasBirthData },
    });
  }

  if (!excluded.has("journal_recall") && hasJournalConsent && JOURNAL_RECALL_PATTERNS.some((p) => p.test(question))) {
    intents.push({
      pipelineKey: "journal_recall",
      confidence: 0.8,
      reason: "journal_intent",
    });
  }

  if (isBinauralBeatRequest(question)) {
    intents.push({
      pipelineKey: "binaural_beats",
      confidence: 0.85,
      reason: "binaural_intent",
    });
  }

  // Synastry — relationship/compatibility chart intent
  if (SYNASTRY_INTENT_PATTERNS.some((p) => p.test(question))) {
    intents.push({
      pipelineKey: "synastry",
      confidence: 0.85,
      reason: "synastry_intent",
      metadata: { hasBirthData },
    });
  }

  // Cosmic weather is fulfilled by generic chat plus deterministic timespace
  // evidence. Mark it as an actual match so a stale session feature cannot
  // fall through and reactivate the birth-chart pipeline.
  if (intents.length === 0 && isCosmicWeatherRequest(question)) {
    intents.push({
      pipelineKey: "generic_chat",
      confidence: 1,
      reason: "cosmic_weather_intent",
    });
  }

  // ── Filter and sort ──────────────────────────────────────────────────────
  const filtered = intents
    .filter((i) => i.confidence >= CONFIDENCE_THRESHOLD)
    .sort((a, b) => b.confidence - a.confidence);

  // ── Fallback to generic_chat ─────────────────────────────────────────────
  if (filtered.length === 0) {
    const sessionPipeline = currentFeatureKey
      ? featureKeyToPipelineKey(currentFeatureKey)
      : null;
    if (sessionPipeline && !pipelineIsExcluded(sessionPipeline, excluded)) {
      const metadata: Record<string, unknown> = {};
      if (currentFeatureKey === "birth_chart_full") metadata.depth = "full";
      if (currentFeatureKey === "birth_chart_core") metadata.depth = "core";
      const fallbackIntent: ScoredIntent = {
        pipelineKey: sessionPipeline,
        confidence: 1,
        reason: "session_feature_fallback",
        ...(Object.keys(metadata).length ? { metadata } : {}),
      };
      return { intents: [fallbackIntent], hasMatch: true, primary: fallbackIntent };
    }
    return {
      intents: [
        { pipelineKey: "generic_chat", confidence: 1.0, reason: "fallback_no_match" },
      ],
      hasMatch: false,
      primary: { pipelineKey: "generic_chat", confidence: 1.0, reason: "fallback_no_match" },
    };
  }

  return {
    intents: filtered,
    hasMatch: true,
    primary: filtered[0],
  };
}

/**
 * Explicit deterministic feature requests must win over a fallible semantic
 * classifier so capability side effects (such as storing beat params) run.
 */
export function hasExplicitDeterministicIntent(result: IntentRouterResult): boolean {
  return result.intents.some((intent) =>
    intent.pipelineKey !== "generic_chat"
    && intent.reason !== "session_feature_fallback",
  );
}

// ── LLM-based scoring (primary path) ────────────────────────────────────────

/** Timeout for the intent router LLM call (ms). Short — we need this fast. */
const INTENT_ROUTER_TIMEOUT_MS = 3000;

/** Maximum tokens for the intent router response — small, structured JSON. */
const INTENT_ROUTER_MAX_TOKENS = 150;

/**
 * Score user intent using a fast LLM call with semantic understanding.
 *
 * This is the PRIMARY path for intent detection. It handles:
 * - Typos: "analize my bierht chart" → birth_chart
 * - Creative phrasing: "what do my stars say about love?" → birth_chart
 * - Compositional intent: "search my journal for Venus patterns" → journal_recall + birth_chart
 * - Non-English fragments: "mi carta astral" → birth_chart
 *
 * Falls back to regex-based scoreIntents() on any failure:
 * - LLM call timeout
 * - LLM call error (network, rate limit, etc.)
 * - Invalid JSON response
 * - No providers available
 *
 * @param params.question         - The user's raw question text
 * @param params.hasBirthData    - Whether the user has birth data on file
 * @param params.hasJournalConsent - Whether the user consented to journal reading
 * @param params.currentFeatureKey - Currently active feature (manual selection)
 * @param params.providers       - Available LLM providers
 * @param params.modelChain      - Model chain for provider selection
 */
export async function scoreIntentsWithLLM(params: {
  question: string;
  hasBirthData: boolean;
  hasJournalConsent: boolean;
  currentFeatureKey: string | null;
  providers: ProviderConfig[];
  modelChain: ModelChainEntry[];
}): Promise<IntentRouterResult> {
  const { question, hasBirthData, hasJournalConsent, currentFeatureKey, providers, modelChain } = params;
  const excluded = new Set(detectExplicitCapabilityExclusions(question));
  const deterministic = scoreIntents({ question, hasBirthData, hasJournalConsent, currentFeatureKey });

  if (currentFeatureKey || isCosmicWeatherRequest(question) || hasExplicitDeterministicIntent(deterministic)) {
    return deterministic;
  }

  // ── Try LLM-based classification ────────────────────────────────────────
  const llmResult = await callIntentRouterLLM(question, hasBirthData, hasJournalConsent, providers, modelChain);

  if (llmResult) {
    // Successfully classified via LLM
    const mappedIntents = mapLLMIntentsToScoredIntents(llmResult, hasBirthData);

    if (mappedIntents.length > 0) {
      // Apply journal consent gate: filter out journal_recall if no consent
      const gatedIntents = mappedIntents.filter((intent) => {
        if (pipelineIsExcluded(intent.pipelineKey, excluded)) return false;
        if (intent.pipelineKey === "journal_recall" && !hasJournalConsent) {
          return false;
        }
        return true;
      });

      // Filter by confidence threshold
      const filtered = gatedIntents
        .filter((i) => i.confidence >= CONFIDENCE_THRESHOLD)
        .sort((a, b) => b.confidence - a.confidence);

      if (filtered.length > 0) {
        // Ensure generic_chat is not in the list if we have real intents
        // (LLM sometimes includes it as a low-confidence fallback)
        const nonGeneric = filtered.filter((i) => i.pipelineKey !== "generic_chat");
        const finalIntents = nonGeneric.length > 0 ? nonGeneric : filtered;

        console.log(`[IntentRouter] LLM routing successful: ${finalIntents.map((i) => `${i.pipelineKey}(${i.confidence.toFixed(2)}:${i.reason})`).join(", ")}`);

        return {
          intents: finalIntents,
          hasMatch: true,
          primary: finalIntents[0],
        };
      }
    }

    // LLM returned something but nothing passed thresholds — log and fall through
    console.warn("[IntentRouter] LLM response had no valid intents above threshold, falling back to regex");
  }

  // ── Fallback to regex ───────────────────────────────────────────────────
  console.log("[IntentRouter] Using regex fallback for intent classification");
  return scoreIntents({
    question,
    hasBirthData,
    hasJournalConsent,
    currentFeatureKey,
  });
}

/**
 * Make the actual LLM call for intent classification.
 * Uses the first available provider from the model chain.
 * Returns null on any failure (network, timeout, invalid response).
 */
async function callIntentRouterLLM(
  question: string,
  hasBirthData: boolean,
  hasJournalConsent: boolean,
  providers: ProviderConfig[],
  modelChain: ModelChainEntry[],
): Promise<ReturnType<typeof parseIntentRouterResponse>> {
  // Build the prompt
  const { systemPrompt, userMessage } = buildIntentRouterPrompt(question, {
    birthChart: true, // Always offer — the pipeline handles missing data
    journalRecall: hasJournalConsent,
    binauralBeats: true, // Always available — no stored data needed
    synastry: hasBirthData, // Available if user has birth data — they need their own chart
  });

  // Try each provider in the model chain
  for (const entry of modelChain) {
    const provider = providers.find((p) => p.id === entry.providerId);
    if (!provider) continue;

    const apiKey = process.env[provider.apiKeyEnvVar];
    // Ollama may not need an API key
    if (provider.type !== "ollama" && !apiKey) continue;

    const url = buildProviderUrl(provider);
    const headers = buildProviderHeaders(provider, apiKey);

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage },
    ];

    const requestBody = {
      model: entry.model,
      messages,
      temperature: 0.1, // Low temperature — we want deterministic classification
      max_tokens: INTENT_ROUTER_MAX_TOKENS,
      stream: false, // Non-streaming for speed
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), INTENT_ROUTER_TIMEOUT_MS);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.warn(`[IntentRouter] LLM call to ${provider.id}/${entry.model} returned ${response.status}: ${errorText.slice(0, 200)}`);
        continue; // Try next provider
      }

      const data = await response.json() as any;
      const content = data?.choices?.[0]?.message?.content;

      if (!content || typeof content !== "string") {
        console.warn(`[IntentRouter] LLM call to ${provider.id}/${entry.model} returned no content`);
        continue;
      }

      const parsed = parseIntentRouterResponse(content);

      if (!parsed) {
        console.warn(`[IntentRouter] LLM response could not be parsed: ${content.slice(0, 200)}`);
        continue; // Try next provider with cleaner response
      }

      console.log(`[IntentRouter] LLM classified via ${provider.id}/${entry.model}: ${parsed.intents.map((i) => `${i.pipeline}(${i.confidence.toFixed(2)})`).join(", ")}`);
      return parsed;
    } catch (error: any) {
      if (error?.name === "AbortError") {
        console.warn(`[IntentRouter] LLM call to ${provider.id}/${entry.model} timed out after ${INTENT_ROUTER_TIMEOUT_MS}ms`);
      } else {
        console.warn(`[IntentRouter] LLM call to ${provider.id}/${entry.model} failed: ${error?.message ?? error}`);
      }
      continue; // Try next provider
    }
  }

  // All providers failed
  console.warn("[IntentRouter] All LLM providers failed for intent classification, falling back to regex");
  return null;
}
