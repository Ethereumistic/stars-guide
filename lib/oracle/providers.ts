/**
 * Oracle Multi-Provider System
 *
 * Each provider is an OpenAI-compatible chat completions endpoint.
 * The model fallback chain references providers by ID.
 */

export const PROVIDER_TYPES = ["openrouter", "ollama", "openai_compatible"] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKeyEnvVar: string;
}

export interface ModelChainEntry {
  providerId: string;
  model: string;
}

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    type: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnvVar: "OPENROUTER_API_KEY",
  },
];

export const DEFAULT_MODEL_CHAIN: ModelChainEntry[] = [
  { providerId: "openrouter", model: "google/gemini-2.5-flash" },
  { providerId: "openrouter", model: "anthropic/claude-sonnet-4" },
  { providerId: "openrouter", model: "x-ai/grok-4.1-fast" },
];

/**
 * Tier labels for the first N chain entries.
 * Index 0 => "A", 1 => "B", ... 25 => "Z"
 */
export function tierForIndex(index: number): string {
  if (index < 0) return "D";
  if (index < 26) return String.fromCharCode(65 + index); // A-Z
  return String(index);
}

export function parseProvidersConfig(raw: string | undefined): ProviderConfig[] {
  if (!raw) return DEFAULT_PROVIDERS;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PROVIDERS;
    return parsed as ProviderConfig[];
  } catch {
    return DEFAULT_PROVIDERS;
  }
}

export function parseModelChain(raw: string | undefined): ModelChainEntry[] {
  if (!raw) return DEFAULT_MODEL_CHAIN;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_MODEL_CHAIN;
    return parsed as ModelChainEntry[];
  } catch {
    return DEFAULT_MODEL_CHAIN;
  }
}

/**
 * Build the request headers for a given provider.
 */
export function buildProviderHeaders(provider: ProviderConfig, apiKey: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (provider.type === "openrouter") {
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    headers["HTTP-Referer"] = "https://stars.guide";
    headers["X-Title"] = "Stars.Guide Oracle";
  } else if (provider.type === "ollama") {
    // Ollama may not require auth; optionally send API key if provided
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
  } else {
    // openai_compatible or any other
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
  }

  return headers;
}

/**
 * Build the full chat completions URL for a provider.
 */
export function buildProviderUrl(provider: ProviderConfig): string {
  let base = provider.baseUrl.replace(/\/+$/, "");
  if (!base.endsWith("/chat/completions")) {
    base += "/chat/completions";
  }
  return base;
}

/**
 * Known popular models per provider (for admin UI suggestions).
 */
export const KNOWN_MODELS_PER_PROVIDER_TYPE: Record<ProviderType, string[]> = {
  openrouter: [
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash:free",
    "anthropic/claude-sonnet-4",
    "x-ai/grok-4.1-fast",
    "x-ai/grok-4.1",
    "arcee-ai/trinity-large-preview:free",
    "stepfun/step-3.5-flash:free",
    "z-ai/glm-4.5-air:free",
    "meta-llama/llama-4-maverick:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "deepseek/deepseek-r1-0528:free",
    "qwen/qwen3-235b-a22b-07-25:free",
  ],
  ollama: [
    "llama3.1",
    "llama3.2",
    "mistral",
    "qwen2.5",
    "gemma2",
    "phi3",
    "codestral",
    "deepseek-r1",
    "llama3.3",
  ],
  openai_compatible: [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-3.5-turbo",
    "claude-3-5-sonnet-20241022",
    "deepseek-chat",
    "deepseek-reasoner",
  ],
};