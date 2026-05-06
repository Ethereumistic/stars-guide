/**
 * LLM Intent Router Prompt
 *
 * System prompt and user-message builder for the fast, cheap pre-call that
 * classifies user intent using semantic understanding instead of regex.
 *
 * The LLM call is tiny (~200 tokens input, ~50 output) and designed to run
 * on a fast/cheap model (Gemini Flash). It returns structured JSON that
 * maps directly to IntentRouterResult.
 */

import type { PipelineKey } from "./pipelineTypes";

// ── Available features passed to the prompt ─────────────────────────────────

interface FeatureAvailability {
  birthChart: boolean;
  journalRecall: boolean;
  binauralBeats: boolean;
}

// ── System prompt ───────────────────────────────────────────────────────────

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

// ── User message builder ────────────────────────────────────────────────────

/**
 * Build the user message for the intent router LLM call.
 * Includes feature availability so the model knows what's enabled.
 */
export function buildIntentRouterUserMessage(
  question: string,
  features: FeatureAvailability,
): string {
  const available: string[] = [];
  const unavailable: string[] = [];

  if (features.birthChart) {
    available.push("birth_chart");
  } else {
    unavailable.push("birth_chart");
  }

  if (features.journalRecall) {
    available.push("journal_recall");
  } else {
    unavailable.push("journal_recall");
  }

  // Binaural beats is always "available" — it doesn't need stored data
  available.push("binaural_beats");

  const parts = [
    `Available features: ${available.join(", ")}`,
  ];

  if (unavailable.length > 0) {
    parts.push(`Unavailable features (do NOT assign): ${unavailable.join(", ")}`);
  }

  parts.push(`User message: "${question}"`);

  return parts.join("\n");
}

// ── Full prompt builder ─────────────────────────────────────────────────────

/**
 * Build the complete prompt for the intent router LLM call.
 */
export function buildIntentRouterPrompt(
  question: string,
  features: FeatureAvailability,
): { systemPrompt: string; userMessage: string } {
  return {
    systemPrompt: INTENT_ROUTER_SYSTEM_PROMPT,
    userMessage: buildIntentRouterUserMessage(question, features),
  };
}

// ── Response parser ─────────────────────────────────────────────────────────

interface RawIntentRouterResponse {
  intents: Array<{
    pipeline: string;
    confidence: number;
    depth: string | null;
  }>;
}

const VALID_PIPELINES: Set<string> = new Set([
  "birth_chart",
  "journal_recall",
  "binaural_beats",
  "generic_chat",
]);

/**
 * Parse the LLM response into a valid RawIntentRouterResponse.
 * Handles edge cases: markdown fences, extra whitespace, trailing text.
 * Returns null if the response cannot be parsed.
 */
export function parseIntentRouterResponse(raw: string): RawIntentRouterResponse | null {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Try to find the JSON object
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
    return null;
  }

  const jsonStr = cleaned.substring(jsonStart, jsonEnd + 1);

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate structure
    if (!parsed || !Array.isArray(parsed.intents)) {
      return null;
    }

    // Validate each intent
    const validatedIntents: RawIntentRouterResponse["intents"] = [];
    for (const intent of parsed.intents) {
      if (!intent.pipeline || !VALID_PIPELINES.has(intent.pipeline)) {
        continue; // Skip invalid pipeline names
      }
      if (typeof intent.confidence !== "number" || intent.confidence < 0 || intent.confidence > 1) {
        intent.confidence = 0.5; // Default to threshold
      }
      validatedIntents.push({
        pipeline: intent.pipeline,
        confidence: intent.confidence,
        depth: (intent.depth === "full" || intent.depth === "core") ? intent.depth : null,
      });
    }

    if (validatedIntents.length === 0) {
      return null;
    }

    return { intents: validatedIntents };
  } catch {
    return null;
  }
}

/**
 * Map a parsed LLM response to our internal ScoredIntent format.
 */
export function mapLLMIntentsToScoredIntents(
  parsed: RawIntentRouterResponse,
  hasBirthData: boolean,
): Array<{
  pipelineKey: PipelineKey;
  confidence: number;
  reason: string;
  metadata?: Record<string, unknown>;
}> {
  return parsed.intents
    .filter((intent) => {
      // Skip birth_chart if explicitly unavailable (though we allow detection
      // intent regardless and let the pipeline handle missing data)
      // Skip journal_recall if no consent
      return true; // Let pipeline composition handle availability
    })
    .map((intent) => {
      const metadata: Record<string, unknown> = {};
      if (intent.pipeline === "birth_chart" && intent.depth) {
        metadata.depth = intent.depth;
      }
      if (intent.pipeline === "birth_chart") {
        metadata.hasBirthData = hasBirthData;
      }

      return {
        pipelineKey: intent.pipeline as PipelineKey,
        confidence: intent.confidence,
        reason: "llm_intent_router",
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
      };
    });
}

// ── Export the system prompt for direct use ──────────────────────────────────

export { INTENT_ROUTER_SYSTEM_PROMPT };