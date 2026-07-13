"use node";

import { makeFunctionReference } from "convex/server";
import {
  buildProviderHeaders,
  buildProviderUrl,
  type LLMProvider,
  type ThinkingMode,
} from "../lib/llmProvider";

const getFeatureProfileInternal = makeFunctionReference<"query">(
  "aiGateway/admin:getFeatureProfileInternal",
);
const listEnabledProvidersInternal = makeFunctionReference<"query">(
  "aiGateway/admin:listEnabledProvidersInternal",
);
const logGatewayEventInternal = makeFunctionReference<"mutation">(
  "aiGateway/admin:logGatewayEventInternal",
);
const getProviderHealthInternal = makeFunctionReference<"query">(
  "aiGateway/admin:getProviderHealthInternal",
);
const recordProviderHealthInternal = makeFunctionReference<"mutation">(
  "aiGateway/admin:recordProviderHealthInternal",
);

type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  cache_control?: { type: string };
};

type ChainEntry = {
  providerId: string;
  model: string;
};

type StreamCallbacks = {
  onStart?: (metadata: { providerId: string; model: string; tier: string; fetchStartTime: number }) => Promise<void> | void;
  onToken?: (token: string) => Promise<void> | void;
  onReasoningToken?: (token: string) => Promise<void> | void;
  onComplete?: (result: StreamAIGatewayResult) => Promise<void> | void;
  onError?: (error: { message: string; providerId?: string; model?: string; tier?: string; partial: boolean }) => Promise<void> | void;
};

export type StreamAIGatewayResult = {
  content: string;
  reasoning?: string;
  providerId: string;
  model: string;
  tier: string;
  promptTokens?: number;
  completionTokens?: number;
  fetchStartTime: number;
  firstTokenTime?: number;
  initialDecodeTime?: number;
  partial: boolean;
};

function tierForIndex(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index);
}

function parseChain(raw: string): ChainEntry[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is ChainEntry =>
        entry &&
        typeof entry === "object" &&
        typeof entry.providerId === "string" &&
        typeof entry.model === "string",
    );
  } catch {
    return [];
  }
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

function classifyStreamError(error: unknown, emittedContent: boolean) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  const retryable = !emittedContent && (
    lower.includes("timeout") ||
    lower.includes("abort") ||
    lower.includes("fetch failed") ||
    lower.includes("429") ||
    lower.includes("500") ||
    lower.includes("502") ||
    lower.includes("503") ||
    lower.includes("504") ||
    lower.includes("empty")
  );
  const errorType =
    lower.includes("api key") || lower.includes("unauthorized") || lower.includes("401")
      ? "auth"
      : lower.includes("400")
        ? "bad_request"
        : retryable
          ? "retryable_stream_error"
          : emittedContent
            ? "partial_stream_error"
            : "stream_error";
  return { message, errorType, retryable };
}

function applyThinkingMode(payload: any, provider: LLMProvider, thinkingMode: ThinkingMode): any {
  if (thinkingMode === "auto") return payload;
  const next = { ...payload };
  if (provider.type === "ollama") {
    next.think = thinkingMode === "disabled" ? false : thinkingMode;
  } else if (provider.type === "openrouter") {
    next.reasoning_effort = thinkingMode === "disabled" ? "none" : thinkingMode;
  } else {
    next.think = thinkingMode === "disabled" ? false : thinkingMode;
    next.reasoning_effort = thinkingMode === "disabled" ? "none" : thinkingMode;
  }
  return next;
}

async function readStreamChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("LLM stream idle timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function streamAIGateway(ctx: any, args: {
  feature: string;
  messages: AIMessage[];
  callbacks?: StreamCallbacks;
  overrides?: {
    providerId?: string;
    model?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    timeoutMs?: number;
    thinkingMode?: ThinkingMode;
  };
}): Promise<StreamAIGatewayResult> {
  const profile = await ctx.runQuery(getFeatureProfileInternal, { featureKey: args.feature }) as {
    enabled: boolean;
    mode: string;
    chainJson: string;
    temperature: number;
    topP?: number;
    maxTokens: number;
    timeoutMs: number;
    thinkingMode: ThinkingMode;
  } | null;
  if (!profile || !profile.enabled) {
    await ctx.runMutation(logGatewayEventInternal, {
      featureKey: args.feature,
      mode: "stream",
      status: "blocked",
      errorType: "profile_disabled",
      errorMessage: `AI feature profile "${args.feature}" is missing or disabled.`,
    });
    throw new Error(`AI feature profile "${args.feature}" is missing or disabled.`);
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
  const chain = args.overrides?.providerId && args.overrides?.model
    ? [{ providerId: args.overrides.providerId, model: args.overrides.model }]
    : configuredChain;
  if (chain.length === 0) {
    throw new Error(`AI feature profile "${args.feature}" has no valid model chain.`);
  }

  const healthRows = await ctx.runQuery(getProviderHealthInternal, { featureKey: args.feature }) as Array<{
    providerId: string;
    model: string;
    cooldownUntil?: number;
  }>;
  const cooldownByEntry = new Map(
    healthRows
      .filter((row) => row.cooldownUntil && row.cooldownUntil > Date.now())
      .map((row) => [`${row.providerId}/${row.model}`, row.cooldownUntil as number]),
  );

  let lastError = "no provider attempted";
  for (let index = 0; index < chain.length; index++) {
    const entry = chain[index];
    const tier = tierForIndex(index);
    const cooldownUntil = cooldownByEntry.get(`${entry.providerId}/${entry.model}`);
    if (cooldownUntil && !(args.overrides?.providerId && args.overrides?.model)) {
      lastError = `Provider "${entry.providerId}" model "${entry.model}" is cooling down.`;
      await ctx.runMutation(logGatewayEventInternal, {
        featureKey: args.feature, mode: "stream", providerId: entry.providerId,
        model: entry.model, tier, status: "blocked", errorType: "provider_cooldown",
        errorMessage: lastError,
      });
      continue;
    }
    const row = providerById.get(entry.providerId);
    if (!row) {
      lastError = `Provider "${entry.providerId}" is missing or disabled.`;
      await ctx.runMutation(logGatewayEventInternal, {
        featureKey: args.feature, mode: "stream", providerId: entry.providerId,
        model: entry.model, tier, status: "failure", errorType: "provider_unavailable",
        errorMessage: lastError,
      });
      continue;
    }

    const provider = toRuntimeProvider(row);
    const apiKey = process.env[provider.apiKeyEnvVar] || "";
    if (provider.type !== "ollama" && !apiKey) {
      lastError = `API key ${provider.apiKeyEnvVar} not set for provider "${provider.id}".`;
      await ctx.runMutation(logGatewayEventInternal, {
        featureKey: args.feature, mode: "stream", providerId: provider.id,
        model: entry.model, tier, status: "failure", errorType: "auth",
        errorMessage: lastError,
      });
      continue;
    }

    const fetchStartTime = Date.now();
    let fullContent = "";
    let reasoning = "";
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    let firstTokenTime: number | undefined;
    let initialDecodeTime: number | undefined;
    try {
      await args.callbacks?.onStart?.({ providerId: provider.id, model: entry.model, tier, fetchStartTime });
      let payload = applyThinkingMode({
        model: entry.model,
        messages: args.messages,
        temperature: args.overrides?.temperature ?? profile.temperature,
        max_tokens: args.overrides?.maxTokens ?? profile.maxTokens,
        ...(typeof (args.overrides?.topP ?? profile.topP) === "number" ? { top_p: args.overrides?.topP ?? profile.topP } : {}),
        stream: true,
      }, provider, args.overrides?.thinkingMode ?? profile.thinkingMode);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), args.overrides?.timeoutMs ?? profile.timeoutMs);
      const response = await fetch(buildProviderUrl(provider), {
        method: "POST",
        headers: buildProviderHeaders(provider, apiKey, "Stars.Guide Oracle Chat"),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`LLM stream error ${response.status}: ${(await response.text()).slice(0, 1000)}`);
      }
      if (!response.body) {
        throw new Error("No response body for stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await readStreamChunk(reader, 15_000);
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta ?? {};
            const token = delta.content;
            const reasoningToken = delta.reasoning ?? delta.thinking;
            if (typeof reasoningToken === "string" && reasoningToken) {
              reasoning += reasoningToken;
              await args.callbacks?.onReasoningToken?.(reasoningToken);
            }
            if (typeof token === "string" && token) {
              fullContent += token;
              if (firstTokenTime === undefined) firstTokenTime = Date.now();
              if (initialDecodeTime === undefined && fullContent.length >= 200) initialDecodeTime = Date.now();
              await args.callbacks?.onToken?.(token);
            }
            if (parsed.usage) {
              promptTokens = parsed.usage.prompt_tokens;
              completionTokens = parsed.usage.completion_tokens;
            }
          } catch {
            // Ignore partial or provider-specific frames.
          }
        }
      }

      if (!fullContent) {
        throw new Error("Empty content from stream");
      }

      const result = {
        content: fullContent,
        reasoning: reasoning || undefined,
        providerId: provider.id,
        model: entry.model,
        tier,
        promptTokens,
        completionTokens,
        fetchStartTime,
        firstTokenTime,
        initialDecodeTime: initialDecodeTime ?? Date.now(),
        partial: false,
      };
      await ctx.runMutation(logGatewayEventInternal, {
        featureKey: args.feature,
        mode: "stream",
        providerId: provider.id,
        model: entry.model,
        tier,
        status: "success",
        durationMs: Date.now() - fetchStartTime,
        promptTokens,
        completionTokens,
      });
      await ctx.runMutation(recordProviderHealthInternal, {
        featureKey: args.feature,
        providerId: provider.id,
        model: entry.model,
        success: true,
      });
      await args.callbacks?.onComplete?.(result);
      return result;
    } catch (error) {
      const classified = classifyStreamError(error, fullContent.length > 0);
      lastError = classified.message;
      await ctx.runMutation(logGatewayEventInternal, {
        featureKey: args.feature,
        mode: "stream",
        providerId: provider.id,
        model: entry.model,
        tier,
        status: "failure",
        errorType: classified.errorType,
        errorMessage: classified.message.slice(0, 2000),
        durationMs: Date.now() - fetchStartTime,
      });
      await ctx.runMutation(recordProviderHealthInternal, {
        featureKey: args.feature,
        providerId: provider.id,
        model: entry.model,
        success: false,
        errorType: classified.errorType,
        errorMessage: classified.message,
      });
      await args.callbacks?.onError?.({ message: classified.message, providerId: provider.id, model: entry.model, tier, partial: fullContent.length > 0 });
      if (fullContent.length > 0 || !classified.retryable) {
        return {
          content: fullContent,
          reasoning: reasoning || undefined,
          providerId: provider.id,
          model: entry.model,
          tier,
          promptTokens,
          completionTokens,
          fetchStartTime,
          firstTokenTime,
          initialDecodeTime,
          partial: true,
        };
      }
    }
  }

  throw new Error(`AI gateway stream failed for "${args.feature}": ${lastError}`);
}
