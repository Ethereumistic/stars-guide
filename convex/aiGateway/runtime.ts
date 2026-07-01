"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { callLLMEndpoint, type LLMProvider, type ThinkingMode } from "../lib/llmProvider";

const getFeatureProfileInternal = makeFunctionReference<"query">(
  "aiGateway/admin:getFeatureProfileInternal",
);
const listEnabledProvidersInternal = makeFunctionReference<"query">(
  "aiGateway/admin:listEnabledProvidersInternal",
);
const logGatewayEventInternal = makeFunctionReference<"mutation">(
  "aiGateway/admin:logGatewayEventInternal",
);

type AIFeatureKey =
  | "oracle_chat"
  | "oracle_intent"
  | "birth_chart_report"
  | "horoscope_generation"
  | "cosmic_weather_felt_language"
  | "zeitgeist_synthesis"
  | "emotional_translation"
  | "emotional_register_classification"
  | "ai_admin_test";

type AIMode = "chat" | "json" | "stream" | "embedding" | "image";

type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChainEntry = {
  providerId: string;
  model: string;
};

function tierForIndex(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index);
}

function parseChain(raw: string): ChainEntry[] {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (entry): entry is ChainEntry =>
      entry &&
      typeof entry === "object" &&
      typeof entry.providerId === "string" &&
      typeof entry.model === "string",
  );
}

function toRuntimeProvider(provider: {
  providerId: string;
  name: string;
  type: string;
  baseUrl: string;
  apiKeyEnvVar: string;
}): LLMProvider {
  return {
    id: provider.providerId,
    name: provider.name,
    type: provider.type,
    baseUrl: provider.baseUrl,
    apiKeyEnvVar: provider.apiKeyEnvVar,
  };
}

function classifyError(error: unknown): { errorType: string; retryable: boolean; message: string } {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("api key") || lower.includes("unauthorized") || lower.includes("401")) {
    return { errorType: "auth", retryable: false, message };
  }
  if (lower.includes("400")) {
    return { errorType: "bad_request", retryable: false, message };
  }
  if (
    lower.includes("timeout") ||
    lower.includes("abort") ||
    lower.includes("fetch failed") ||
    lower.includes("429") ||
    lower.includes("500") ||
    lower.includes("502") ||
    lower.includes("503") ||
    lower.includes("504") ||
    lower.includes("empty")
  ) {
    return { errorType: "retryable_provider_error", retryable: true, message };
  }
  return { errorType: "provider_error", retryable: true, message };
}

export const invokeAIGateway = internalAction({
  args: {
    feature: v.string(),
    mode: v.optional(v.union(
      v.literal("chat"),
      v.literal("json"),
      v.literal("stream"),
      v.literal("embedding"),
      v.literal("image"),
    )),
    messages: v.array(v.object({
      role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant")),
      content: v.string(),
    })),
    overrides: v.optional(v.object({
      providerId: v.optional(v.string()),
      model: v.optional(v.string()),
      temperature: v.optional(v.number()),
      topP: v.optional(v.number()),
      maxTokens: v.optional(v.number()),
      timeoutMs: v.optional(v.number()),
      thinkingMode: v.optional(v.union(
        v.literal("auto"),
        v.literal("disabled"),
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
      )),
    })),
  },
  handler: async (ctx, args): Promise<{
    content: string;
    reasoning?: string | null;
    providerId: string;
    model: string;
    tier: string;
    promptTokens?: number;
    completionTokens?: number;
    raw?: unknown;
  }> => {
    const feature = args.feature as AIFeatureKey;
    const profile = await ctx.runQuery(getFeatureProfileInternal, {
      featureKey: feature,
    }) as {
      enabled: boolean;
      mode: AIMode;
      chainJson: string;
      temperature: number;
      maxTokens: number;
      thinkingMode: ThinkingMode;
      label: string;
    } | null;
    if (!profile || !profile.enabled) {
      await ctx.runMutation(logGatewayEventInternal, {
        featureKey: feature,
        mode: args.mode ?? "chat",
        status: "blocked",
        errorType: "profile_disabled",
        errorMessage: `AI feature profile "${feature}" is missing or disabled.`,
      });
      throw new Error(`AI feature profile "${feature}" is missing or disabled.`);
    }

    const mode = (args.mode ?? profile.mode) as AIMode;
    if (mode === "stream" || mode === "embedding" || mode === "image") {
      throw new Error(`invokeAIGateway does not support ${mode} mode yet.`);
    }

    const providers = await ctx.runQuery(listEnabledProvidersInternal, {}) as Array<{
      providerId: string;
      name: string;
      type: string;
      baseUrl: string;
      apiKeyEnvVar: string;
    }>;
    const providerById = new Map(providers.map((provider) => [provider.providerId, provider]));
    const configuredChain = parseChain(profile.chainJson);
    const chain =
      args.overrides?.providerId && args.overrides?.model
        ? [{ providerId: args.overrides.providerId, model: args.overrides.model }]
        : configuredChain;

    if (chain.length === 0) {
      throw new Error(`AI feature profile "${feature}" has no valid model chain.`);
    }

    let lastError: string | undefined;
    for (let index = 0; index < chain.length; index++) {
      const entry = chain[index];
      const providerRow = providerById.get(entry.providerId);
      const tier = tierForIndex(index);
      if (!providerRow) {
        lastError = `Provider "${entry.providerId}" is missing or disabled.`;
        await ctx.runMutation(logGatewayEventInternal, {
          featureKey: feature,
          mode,
          providerId: entry.providerId,
          model: entry.model,
          tier,
          status: "failure",
          errorType: "provider_unavailable",
          errorMessage: lastError,
        });
        continue;
      }

      const provider = toRuntimeProvider(providerRow);
      const startTime = Date.now();
      try {
        const result = await callLLMEndpoint({
          provider,
          model: entry.model,
          messages: args.messages as AIMessage[],
          temperature: args.overrides?.temperature ?? profile.temperature,
          maxTokens: args.overrides?.maxTokens ?? profile.maxTokens,
          thinkingMode: (args.overrides?.thinkingMode ?? profile.thinkingMode) as ThinkingMode,
          title: `Stars.Guide ${profile.label}`,
        });
        const content = result.content?.trim();
        if (!content) {
          throw new Error("Empty content from model");
        }
        const durationMs = Date.now() - startTime;
        const promptTokens = result.raw?.usage?.prompt_tokens;
        const completionTokens = result.raw?.usage?.completion_tokens;
        await ctx.runMutation(logGatewayEventInternal, {
          featureKey: feature,
          mode,
          providerId: provider.id,
          model: entry.model,
          tier,
          status: "success",
          durationMs,
          promptTokens: typeof promptTokens === "number" ? promptTokens : undefined,
          completionTokens: typeof completionTokens === "number" ? completionTokens : undefined,
        });
        return {
          content,
          reasoning: result.reasoning,
          providerId: provider.id,
          model: entry.model,
          tier,
          promptTokens: typeof promptTokens === "number" ? promptTokens : undefined,
          completionTokens: typeof completionTokens === "number" ? completionTokens : undefined,
          raw: result.raw,
        };
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const classified = classifyError(error);
        lastError = classified.message;
        await ctx.runMutation(logGatewayEventInternal, {
          featureKey: feature,
          mode,
          providerId: provider.id,
          model: entry.model,
          tier,
          status: "failure",
          errorType: classified.errorType,
          errorMessage: classified.message.slice(0, 2000),
          durationMs,
        });
        if (!classified.retryable) {
          break;
        }
      }
    }

    throw new Error(`AI gateway failed for "${feature}": ${lastError ?? "no provider succeeded"}`);
  },
});
