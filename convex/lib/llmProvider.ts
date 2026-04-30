/**
 * llmProvider.ts — Shared provider routing for all LLM calls in the horoscope engine.
 *
 * Reads provider configs from oracle_settings and routes API calls to the
 * correct endpoint with the correct headers and API key.
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
 * Generic LLM API call — routes to the correct provider endpoint.
 * Returns the raw parsed JSON response (not the full API envelope).
 */
export async function callLLMEndpoint(opts: {
    provider: LLMProvider;
    model: string;
    messages: { role: string; content: string }[];
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    title?: string;
}): Promise<{ content: string; raw: any }> {
    const apiKey = process.env[opts.provider.apiKeyEnvVar] || "";
    const url = buildProviderUrl(opts.provider);
    const headers = buildProviderHeaders(opts.provider, apiKey, opts.title);

    const payload: any = {
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);

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
    let content = message?.content;

    if (!content) {
        // Reasoning models (GLM, DeepSeek R1, etc.) may put chain-of-thought
        // in a `reasoning` field and leave `content` empty if they ran out of
        // tokens before generating the final answer. Check for reasoning content
        // to give a clearer error.
        const reasoning = message?.reasoning;
        if (reasoning) {
            console.error(
                `Empty content from ${opts.provider.name} but model produced ${reasoning.length} chars of reasoning. ` +
                `The model likely hit the max_tokens limit during chain-of-thought. ` +
                `Consider increasing maxTokens. Reasoning preview: ${reasoning.slice(0, 500)}`
            );
        } else {
            console.error(`Empty response from ${opts.provider.name}. Full response:`, JSON.stringify(data).slice(0, 2000));
        }
        throw new Error(`Empty response from ${opts.provider.name}`);
    }

    return { content, raw: data };
}
