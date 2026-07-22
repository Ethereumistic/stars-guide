"use node";

import { makeFunctionReference } from "convex/server";
import {
  buildProviderHeaders,
  buildProviderUrl,
  type LLMProvider,
  type ThinkingMode,
} from "../lib/llmProvider";
import { GatewayStreamDeadlines } from "./streamDeadlines";
import { GatewayStreamProtocolDecoder } from "./streamProtocol";
import type {
  GatewayErrorCode,
  GatewayStreamEvent,
  StreamDecoderDiagnostics,
  StreamWireProtocol,
} from "../../src/lib/oracle/streaming/types";

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

export type StreamCallbacks = {
  onStart?: (metadata: { providerId: string; model: string; tier: string; fetchStartTime: number }) => Promise<void> | void;
  onConnected?: (metadata: { providerId: string; model: string; tier: string; connectedAt: number }) => Promise<void> | void;
  onToken?: (token: string) => Promise<void> | void;
  onReasoningToken?: (token: string) => Promise<void> | void;
  /** Phase C path: bounded in-memory handling only. The gateway never awaits it. */
  onEvent?: (event: GatewayStreamEvent) => void;
  shouldCancel?: () => boolean | Promise<boolean>;
  canFallbackAfterError?: (context: {
    code: GatewayErrorCode;
    rawContentReceived: boolean;
  }) => boolean;
  onComplete?: (result: StreamAIGatewayResult) => Promise<void> | void;
  onError?: (error: { message: string; code: GatewayErrorCode; providerId?: string; model?: string; tier?: string; partial: boolean }) => Promise<void> | void;
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
  providerConnectedTime?: number;
  firstTokenTime?: number;
  initialDecodeTime?: number;
  partial: boolean;
  errorCode?: GatewayErrorCode;
  diagnostics: StreamDecoderDiagnostics;
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

class GatewayTransportError extends Error {
  constructor(
    readonly code: GatewayErrorCode,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "GatewayTransportError";
  }
}

function classifyStreamError(
  error: unknown,
  emittedContent: boolean,
  deadlineCode?: GatewayErrorCode,
): { message: string; code: GatewayErrorCode; retryable: boolean } {
  if (error instanceof GatewayTransportError) {
    return { message: error.message, code: error.code, retryable: error.retryable };
  }
  if (deadlineCode) {
    return {
      message: deadlineCode.replaceAll("_", " "),
      code: deadlineCode,
      retryable: deadlineCode !== "cancelled",
    };
  }
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();
  const code: GatewayErrorCode = lower.includes("abort")
    ? "cancelled"
    : emittedContent
      ? "partial_stream"
      : "malformed_stream";
  return {
    message: code.replaceAll("_", " "),
    code,
    retryable: code !== "cancelled",
  };
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

function protocolForResponse(response: Response, provider: LLMProvider): StreamWireProtocol {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("ndjson") || contentType.includes("jsonl")) return "ndjson";
  if (provider.type === "ollama" && contentType.includes("json")) return "ndjson";
  return "sse";
}

function httpError(status: number): GatewayTransportError {
  if (status === 401 || status === 403) {
    return new GatewayTransportError("auth", `Provider authentication failed (${status})`, true);
  }
  if (status === 429) {
    return new GatewayTransportError("http_429", "Provider rate limited the request", true);
  }
  if (status >= 500) {
    return new GatewayTransportError("http_5xx", `Provider failed (${status})`, true);
  }
  return new GatewayTransportError("http_4xx", `Provider rejected the request (${status})`, false);
}

export async function streamAIGateway(ctx: any, args: {
  feature: string;
  messages: AIMessage[];
  callbacks?: StreamCallbacks;
  route?: {
    chain: ChainEntry[];
    optionKey?: string;
    reasoningEffort: ThinkingMode;
    effectiveUserTier: string;
  };
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
    : args.route?.chain?.length
      ? args.route.chain
      : configuredChain;
  const routeTelemetry = {
    routeKey: args.route?.optionKey,
    requestedThinkingMode: args.route?.reasoningEffort,
    effectiveUserTier: args.route?.effectiveUserTier,
  };
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
        errorMessage: lastError, ...routeTelemetry,
      });
      continue;
    }
    const row = providerById.get(entry.providerId);
    if (!row) {
      lastError = `Provider "${entry.providerId}" is missing or disabled.`;
      await ctx.runMutation(logGatewayEventInternal, {
        featureKey: args.feature, mode: "stream", providerId: entry.providerId,
        model: entry.model, tier, status: "failure", errorType: "provider_unavailable",
        errorMessage: lastError, ...routeTelemetry,
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
        errorMessage: lastError, ...routeTelemetry,
      });
      continue;
    }

    const fetchStartTime = Date.now();
    let fullContent = "";
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    let firstTokenTime: number | undefined;
    let providerConnectedTime: number | undefined;
    let initialDecodeTime: number | undefined;
    let diagnostics: StreamDecoderDiagnostics = {
      malformedFrameCount: 0,
      droppedFrameCount: 0,
      reasoningCharCount: 0,
      errorCategories: [],
    };
    let deadlines: GatewayStreamDeadlines | undefined;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let cancellationTimer: ReturnType<typeof setInterval> | undefined;
    let cancellationCheckPending = false;
    try {
      const attemptStarted: GatewayStreamEvent = {
        type: "attempt_started",
        providerId: provider.id,
        model: entry.model,
        tier,
        startedAt: fetchStartTime,
      };
      args.callbacks?.onEvent?.(attemptStarted);
      await args.callbacks?.onStart?.({ providerId: provider.id, model: entry.model, tier, fetchStartTime });
      const payload = applyThinkingMode({
        model: entry.model,
        messages: args.messages,
        temperature: args.overrides?.temperature ?? profile.temperature,
        max_tokens: args.overrides?.maxTokens ?? profile.maxTokens,
        ...(typeof (args.overrides?.topP ?? profile.topP) === "number" ? { top_p: args.overrides?.topP ?? profile.topP } : {}),
        stream: true,
      }, provider, args.overrides?.thinkingMode ?? args.route?.reasoningEffort ?? profile.thinkingMode);

      const overallDeadlineMs = Math.max(1, args.overrides?.timeoutMs ?? profile.timeoutMs);
      deadlines = new GatewayStreamDeadlines({
        connectDeadlineMs: Math.min(30_000, overallDeadlineMs),
        idleDeadlineMs: Math.min(30_000, overallDeadlineMs),
        overallDeadlineMs,
      });
      if (args.callbacks?.shouldCancel) {
        cancellationTimer = setInterval(() => {
          if (cancellationCheckPending || deadlines?.signal.aborted) return;
          cancellationCheckPending = true;
          void Promise.resolve(args.callbacks?.shouldCancel?.())
            .then((cancelled) => {
              if (cancelled) deadlines?.cancel();
            })
            .finally(() => {
              cancellationCheckPending = false;
            });
        }, 500);
      }
      const response = await fetch(buildProviderUrl(provider), {
        method: "POST",
        headers: buildProviderHeaders(provider, apiKey, "Stars.Guide Oracle Chat"),
        body: JSON.stringify(payload),
        signal: deadlines.signal,
      });
      providerConnectedTime = Date.now();
      deadlines.markConnected();
      await args.callbacks?.onConnected?.({
        providerId: provider.id,
        model: entry.model,
        tier,
        connectedAt: providerConnectedTime,
      });

      if (!response.ok) {
        throw httpError(response.status);
      }
      if (!response.body) {
        throw new GatewayTransportError("empty_response", "Provider returned no response body", true);
      }

      reader = response.body.getReader();
      const decoder = new GatewayStreamProtocolDecoder({
        protocol: protocolForResponse(response, provider),
      });
      let terminalReceived = false;
      const processEvents = async (events: GatewayStreamEvent[]) => {
        for (const event of events) {
          deadlines?.markActivity();
          // Phase C consumers keep this callback synchronous and in-memory.
          args.callbacks?.onEvent?.(event);
          if (event.type === "text_delta") {
            fullContent += event.text;
            if (firstTokenTime === undefined) firstTokenTime = event.receivedAt;
            if (initialDecodeTime === undefined && fullContent.length >= 200) {
              initialDecodeTime = event.receivedAt;
            }
            // Compatibility path only. V2 publisher consumers use onEvent.
            await args.callbacks?.onToken?.(event.text);
          } else if (event.type === "usage") {
            promptTokens = event.promptTokens ?? promptTokens;
            completionTokens = event.completionTokens ?? completionTokens;
          } else if (event.type === "done") {
            terminalReceived = true;
          } else if (event.type === "error") {
            throw new GatewayTransportError(
              event.code,
              event.code.replaceAll("_", " "),
              event.retryable,
            );
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await processEvents(decoder.push(value));
        if (decoder.terminalReceived) {
          terminalReceived = true;
          await reader.cancel("provider_done").catch(() => undefined);
          break;
        }
      }
      if (!decoder.terminalReceived) await processEvents(decoder.finish());
      diagnostics = decoder.diagnostics;

      if (!fullContent) {
        throw new GatewayTransportError(
          diagnostics.malformedFrameCount > 0 ? "malformed_stream" : "empty_response",
          diagnostics.malformedFrameCount > 0 ? "Provider stream was malformed" : "Provider returned empty content",
          true,
        );
      }
      if (!terminalReceived) {
        throw new GatewayTransportError(
          "partial_stream",
          "Provider stream ended before a terminal event",
          true,
        );
      }

      const result: StreamAIGatewayResult = {
        content: fullContent,
        providerId: provider.id,
        model: entry.model,
        tier,
        promptTokens,
        completionTokens,
        fetchStartTime,
        providerConnectedTime,
        firstTokenTime,
        initialDecodeTime: initialDecodeTime ?? Date.now(),
        partial: false,
        diagnostics,
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
        ...routeTelemetry,
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
      const classified = classifyStreamError(error, fullContent.length > 0, deadlines?.abortCode);
      lastError = classified.message;
      await ctx.runMutation(logGatewayEventInternal, {
        featureKey: args.feature,
        mode: "stream",
        providerId: provider.id,
        model: entry.model,
        tier,
        status: "failure",
        errorType: classified.code,
        errorMessage: classified.message.slice(0, 2000),
        durationMs: Date.now() - fetchStartTime,
        ...routeTelemetry,
      });
      if (classified.code !== "cancelled") {
        await ctx.runMutation(recordProviderHealthInternal, {
          featureKey: args.feature,
          providerId: provider.id,
          model: entry.model,
          success: false,
          errorType: classified.code,
          errorMessage: classified.message,
        });
      }
      await args.callbacks?.onError?.({
        message: classified.message,
        code: classified.code,
        providerId: provider.id,
        model: entry.model,
        tier,
        partial: fullContent.length > 0,
      });
      const canFallback = classified.retryable && (
        args.callbacks?.canFallbackAfterError?.({
          code: classified.code,
          rawContentReceived: fullContent.length > 0,
        }) ?? fullContent.length === 0
      );
      if (!canFallback) {
        if (fullContent.length === 0) {
          throw new GatewayTransportError(
            classified.code,
            classified.message,
            false,
          );
        }
        return {
          content: fullContent,
          providerId: provider.id,
          model: entry.model,
          tier,
          promptTokens,
          completionTokens,
          fetchStartTime,
          providerConnectedTime,
          firstTokenTime,
          initialDecodeTime,
          partial: true,
          errorCode: classified.code,
          diagnostics,
        };
      }
    } finally {
      if (cancellationTimer) clearInterval(cancellationTimer);
      deadlines?.dispose();
      if (reader) {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
    }
  }

  throw new Error(`AI gateway stream failed for "${args.feature}": ${lastError}`);
}
