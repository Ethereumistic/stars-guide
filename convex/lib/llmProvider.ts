/**
 * llmProvider.ts — Shared provider routing for all LLM calls.
 *
 * Used server-side (Convex actions) to resolve provider configs and make
 * HTTP requests to OpenAI-compatible chat completions endpoints.
 *
 * Now supports thinking/reasoning mode control via the `thinkingMode` parameter,
 * which sends provider-specific parameters to disable or control chain-of-thought.
 */

export interface LLMProvider {
  id: string;
  name: string;
  type: string; // "openrouter" | "ollama" | "openai_compatible"
  baseUrl: string;
  apiKeyEnvVar: string;
}

/** Fallback when no providers are configured or providerId is not found */
export const DEFAULT_PROVIDER: LLMProvider = {
  id: "openrouter",
  name: "OpenRouter (fallback)",
  type: "openrouter",
  baseUrl: "https://openrouter.ai/api/v1",
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

/**
 * Thinking mode for LLM calls.
 * - "auto": Don't send any thinking-related params (model default)
 * - "disabled": Force thinking OFF (think: false / no reasoning)
 * - "low": Minimal reasoning
 * - "medium": Balanced reasoning
 * - "high": Deep reasoning
 */
export type ThinkingMode = "auto" | "disabled" | "low" | "medium" | "high";

/**
 * Parse the providers_config JSON stored in oracle_settings.
 * Returns the array of LLMProvider objects.
 */
export function parseProvidersConfig(raw: string | undefined): LLMProvider[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p: any) =>
        p &&
        typeof p === "object" &&
        typeof p.id === "string" &&
        typeof p.baseUrl === "string" &&
        typeof p.apiKeyEnvVar === "string"
    );
  } catch {
    return [];
  }
}

/**
 * Find a provider by ID, falling back to the first available, then DEFAULT.
 */
export function resolveProvider(
  providers: LLMProvider[],
  providerId?: string
): LLMProvider {
  if (providerId) {
    const found = providers.find((p) => p.id === providerId);
    if (found) return found;
    console.warn(
      `Provider "${providerId}" not found in oracle_settings, falling back.`
    );
  }
  if (providers.length > 0) return providers[0];
  return DEFAULT_PROVIDER;
}

/**
 * Build the full chat completions URL for a provider.
 */
export function buildProviderUrl(provider: LLMProvider): string {
  let base = provider.baseUrl.replace(/\/+$/, "");
  if (!base.endsWith("/chat/completions")) {
    base += "/chat/completions";
  }
  return base;
}

/**
 * Build request headers based on provider type.
 */
export function buildProviderHeaders(
  provider: LLMProvider,
  apiKey: string | undefined,
  title?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (provider.type === "openrouter") {
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    headers["HTTP-Referer"] = "https://stars.guide";
    headers["X-Title"] = title ?? "Stars.Guide";
  } else if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  return headers;
}

/**
 * Apply thinking mode settings to the request payload.
 * Returns a new payload object with thinking/reasoning params added.
 *
 * Provider-specific behavior:
 * - Ollama: Uses `think` parameter (boolean or "low"/"medium"/"high")
 * - OpenRouter: Uses `reasoning_effort` in extra body + provider params
 * - OpenAI Compatible: Attempts Ollama-style `think` param first
 */
function applyThinkingMode(
  payload: any,
  provider: LLMProvider,
  thinkingMode: ThinkingMode
): any {
  if (thinkingMode === "auto") return payload;

  const p = { ...payload };

  if (provider.type === "ollama") {
    // Ollama supports `think` as boolean or "low"/"medium"/"high"
    if (thinkingMode === "disabled") {
      p.think = false;
    } else {
      p.think = thinkingMode; // "low", "medium", or "high"
    }
  } else if (provider.type === "openrouter") {
    // OpenRouter: use reasoning_effort for supported models
    // Also pass through in body for models that support it
    if (thinkingMode === "disabled") {
      // For OpenRouter "disabled", we send reasoning_effort: "none"
      // Some models don't support this, but it's the best we can do
      p.reasoning_effort = "none";
    } else if (thinkingMode === "low" || thinkingMode === "medium" || thinkingMode === "high") {
      p.reasoning_effort = thinkingMode;
    }
  } else {
    // OpenAI compatible — send BOTH parameters for maximum compatibility.
    //
    // The openai_compatible type is a catch-all. Different providers support
    // different thinking parameters:
    //   - Ollama Cloud endpoints: need `think` (boolean or string)
    //   - OpenAI-style endpoints: need `reasoning_effort` (only on o-series)
    //   - Together/Groq/Fireworks: ignore both params (thinking can't be controlled)
    //
    // Sending both is safe: unknown params are silently ignored by compliant
    // OpenAI API servers. Only the one the provider understands will take effect.
    if (thinkingMode === "disabled") {
      p.think = false;
      p.reasoning_effort = "none";
    } else {
      p.think = thinkingMode;
      p.reasoning_effort = thinkingMode;
    }
  }

  return p;
}

/**
 * Generic LLM API call — routes to the correct provider endpoint.
 * Returns the raw parsed JSON response (not the full API envelope).
 *
 * Now supports `thinkingMode` to control reasoning behavior.
 */
export async function callLLMEndpoint(opts: {
  provider: LLMProvider;
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  title?: string;
  /**
   * Thinking/reasoning mode control.
   * - "auto" (default): Don't send any thinking parameters — model default
   * - "disabled": Force thinking OFF for structured output tasks
   * - "low"/"medium"/"high": Control reasoning depth
   */
  thinkingMode?: ThinkingMode;
}): Promise<{ content: string | null; reasoning: string | null; raw: any }> {
  const apiKey = process.env[opts.provider.apiKeyEnvVar] || "";
  const url = buildProviderUrl(opts.provider);
  const headers = buildProviderHeaders(opts.provider, apiKey, opts.title);

  let payload: any = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1024,
  };
  // NOTE: response_format { type: "json_object" } is NOT sent.
  // Many OpenAI-compatible providers (Ollama, many OpenRouter models)
  // don't support it and silently return content: null, causing
  // "Empty response" errors. The prompt already instructs JSON output
  // and sanitizeLLMJson handles any markdown wrapping.

  // Apply thinking mode settings
  payload = applyThinkingMode(payload, opts.provider, opts.thinkingMode ?? "auto");

  const controller = new AbortController();
  const timeoutMs = 120_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (fetchError: unknown) {
    clearTimeout(timeoutId);
    const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
    throw new Error(`LLM fetch failed (${opts.provider.name}): ${msg}`);
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `LLM API error ${response.status} from ${url}: ${errorBody}`
    );
  }

  const data = (await response.json()) as any;
  const message = data?.choices?.[0]?.message;
  const content = message?.content ?? null;
  const reasoning = message?.reasoning ?? message?.thinking ?? null;

  if (!content && !reasoning) {
    console.error(`Empty response from ${opts.provider.name}. Full response:`, JSON.stringify(data).slice(0, 2000));
    throw new Error(`Empty response from ${opts.provider.name}`);
  }

  if (!content && reasoning) {
    // Reasoning models (GLM, DeepSeek R1, etc.) may put chain-of-thought
    // in a `reasoning` or `thinking` field and leave `content` empty if they
    // ran out of tokens before generating the final answer.
    console.error(
      `Empty content from ${opts.provider.name} but model produced ${reasoning.length} chars of reasoning. ` +
      `The model likely hit the max_tokens limit during chain-of-thought. ` +
      `Consider: (1) setting thinkingMode to "disabled" or "low", ` +
      `(2) increasing maxTokens, or (3) using a non-reasoning model. ` +
      `Reasoning preview: ${reasoning.slice(0, 500)}`
    );
    throw new Error(
      `Empty content from ${opts.provider.name} — model exhausted token budget on ` +
      `chain-of-thought (${reasoning.length} chars reasoning, 0 chars content). ` +
      `Set thinkingMode to "disabled" or "low" for structured output tasks.`
    );
  }

  return { content, reasoning, raw: data };
}