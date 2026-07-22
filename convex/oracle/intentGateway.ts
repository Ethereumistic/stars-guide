"use node";

import type { ActionCtx } from "../_generated/server";
import { makeFunctionReference } from "convex/server";
import type { IntentRouterResult } from "../../src/lib/oracle/pipelineTypes";
import {
  hasExplicitDeterministicIntent,
  pipelineIsExcluded,
  scoreIntents,
} from "../../src/lib/oracle/intentRouter";
import {
  detectExplicitCapabilityExclusions,
  isCosmicWeatherRequest,
} from "../../src/lib/oracle/requestPlanner";
import {
  buildIntentRouterPrompt,
  mapLLMIntentsToScoredIntents,
  parseIntentRouterResponse,
} from "../../src/lib/oracle/intentRouterPrompt";

const CONFIDENCE_THRESHOLD = 0.5;

const invokeAIGatewayRef = makeFunctionReference<"action", {
  feature: string;
  mode?: "chat" | "json" | "stream" | "embedding" | "image";
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  overrides?: {
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    thinkingMode?: "auto" | "disabled" | "low" | "medium" | "high";
  };
}, {
  content: string;
  providerId: string;
  model: string;
  tier: string;
}>("aiGateway/runtime:invokeAIGateway");

export async function scoreIntentsWithGateway(ctx: ActionCtx, params: {
  question: string;
  hasBirthData: boolean;
  hasJournalConsent: boolean;
  currentFeatureKey: string | null;
}): Promise<IntentRouterResult> {
  const fallback = () => scoreIntents(params);
  const excluded = new Set(detectExplicitCapabilityExclusions(params.question));
  const deterministic = fallback();

  if (
    params.currentFeatureKey
    || isCosmicWeatherRequest(params.question)
    || hasExplicitDeterministicIntent(deterministic)
  ) {
    return deterministic;
  }

  const { systemPrompt, userMessage } = buildIntentRouterPrompt(params.question, {
    birthChart: !excluded.has("natal_chart"),
    journalRecall: params.hasJournalConsent && !excluded.has("journal_recall"),
    binauralBeats: true,
    synastry: params.hasBirthData,
  });

  try {
    const result = await ctx.runAction(invokeAIGatewayRef, {
      feature: "oracle_intent",
      mode: "json",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      overrides: {
        temperature: 0.1,
        maxTokens: 150,
        timeoutMs: 3000,
        thinkingMode: "disabled",
      },
    });

    const parsed = parseIntentRouterResponse(result.content);
    if (!parsed) {
      console.warn("[IntentRouter] Gateway response could not be parsed; falling back to regex");
      return fallback();
    }

    const mapped = mapLLMIntentsToScoredIntents(parsed, params.hasBirthData);
    const gated = mapped.filter((intent) => {
      if (pipelineIsExcluded(intent.pipelineKey, excluded)) return false;
      return intent.pipelineKey !== "journal_recall" || params.hasJournalConsent;
    });
    const filtered = gated
      .filter((intent) => intent.confidence >= CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.confidence - a.confidence);
    const nonGeneric = filtered.filter((intent) => intent.pipelineKey !== "generic_chat");
    const finalIntents = nonGeneric.length > 0 ? nonGeneric : filtered;

    if (finalIntents.length === 0) {
      return fallback();
    }

    console.log(`[IntentRouter] Gateway routing successful: ${finalIntents.map((intent) => `${intent.pipelineKey}(${intent.confidence.toFixed(2)}:${intent.reason})`).join(", ")}`);
    return {
      intents: finalIntents,
      hasMatch: true,
      primary: finalIntents[0],
    };
  } catch (error) {
    console.warn("[IntentRouter] Gateway call failed; falling back to regex", error);
    return fallback();
  }
}
