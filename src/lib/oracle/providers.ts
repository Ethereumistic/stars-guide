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
    const validated = parsed.filter(p =>
      p && typeof p === 'object' &&
      typeof p.id === 'string' &&
      typeof p.name === 'string' &&
      PROVIDER_TYPES.includes(p.type) &&
      typeof p.baseUrl === 'string' &&
      typeof p.apiKeyEnvVar === 'string'
    );
    return validated.length > 0 ? (validated as ProviderConfig[]) : DEFAULT_PROVIDERS;
  } catch {
    return DEFAULT_PROVIDERS;
  }
}

export function parseModelChain(raw: string | undefined): ModelChainEntry[] {
  if (!raw) return DEFAULT_MODEL_CHAIN;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_MODEL_CHAIN;
    const validated = parsed.filter(e =>
      e && typeof e === 'object' &&
      typeof e.providerId === 'string' &&
      typeof e.model === 'string'
    );
    return validated.length > 0 ? (validated as ModelChainEntry[]) : DEFAULT_MODEL_CHAIN;
  } catch {
    return DEFAULT_MODEL_CHAIN;
  }
}

export function validateProvidersConfig(providers: any[]): string[] {
  const errors: string[] = [];
  if (!Array.isArray(providers)) return ["Providers config must be an array."];

  const seenIds = new Set<string>();

  providers.forEach((p, idx) => {
    if (!p || typeof p !== 'object') {
      errors.push(`Provider at index ${idx} is not an object.`);
      return;
    }
    if (!p.id || typeof p.id !== 'string') {
      errors.push(`Provider at index ${idx} must have a valid 'id'.`);
    } else {
      if (seenIds.has(p.id)) {
        errors.push(`Duplicate provider ID found: ${p.id}.`);
      }
      seenIds.add(p.id);
    }
    if (!p.name || typeof p.name !== 'string') {
      errors.push(`Provider at index ${idx} must have a valid 'name'.`);
    }
    if (!PROVIDER_TYPES.includes(p.type)) {
      errors.push(`Provider '${p.id}' has an invalid type: ${p.type}.`);
    }
    if (!p.baseUrl || typeof p.baseUrl !== 'string' || !p.baseUrl.startsWith('http')) {
      errors.push(`Provider '${p.id}' has an invalid baseUrl.`);
    }

    // apiKeyEnvVar: non-empty for non-Ollama
    if (p.type !== 'ollama') {
      if (!p.apiKeyEnvVar || typeof p.apiKeyEnvVar !== 'string') {
        errors.push(`Provider '${p.id}' must specify an apiKeyEnvVar.`);
      }
    } else {
      if (p.apiKeyEnvVar && typeof p.apiKeyEnvVar !== 'string') {
        errors.push(`Provider '${p.id}' apiKeyEnvVar must be a string if provided.`);
      }
    }
  });

  return errors;
}

export function validateModelChain(chain: any[], providers: ProviderConfig[]): string[] {
  const errors: string[] = [];
  if (!Array.isArray(chain)) return ["Model chain must be an array."];

  const providerIds = new Set(providers.map(p => p.id));
  const seenCombos = new Set<string>();

  chain.forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') {
      errors.push(`Chain entry at index ${idx} is not an object.`);
      return;
    }
    if (!entry.providerId || typeof entry.providerId !== 'string') {
      errors.push(`Chain entry at index ${idx} missing 'providerId'.`);
    } else if (!providerIds.has(entry.providerId)) {
      errors.push(`Chain entry at index ${idx} references unknown providerId: ${entry.providerId}.`);
    }

    if (!entry.model || typeof entry.model !== 'string') {
      errors.push(`Chain entry at index ${idx} missing 'model'.`);
    }

    if (entry.providerId && entry.model) {
      const combo = `${entry.providerId}::${entry.model}`;
      if (seenCombos.has(combo)) {
        errors.push(`Duplicate model chain entry: ${entry.providerId} / ${entry.model}.`);
      }
      seenCombos.add(combo);
    }
  });

  return errors;
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
 * Preset defaults when adding a new provider by type.
 * Used by the admin UI to pre-fill the form.
 */
export const PROVIDER_TYPE_PRESETS: Record<
  ProviderType,
  { defaultName: string; defaultBaseUrl: string; defaultApiKeyEnvVar: string }
> = {
  openrouter: {
    defaultName: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultApiKeyEnvVar: "OPENROUTER_API_KEY",
  },
  ollama: {
    defaultName: "Ollama",
    defaultBaseUrl: "http://localhost:11434/v1",
    defaultApiKeyEnvVar: "OLLAMA_API_KEY",
  },
  openai_compatible: {
    defaultName: "OpenAI Compatible",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultApiKeyEnvVar: "OPENAI_API_KEY",
  },
};

/**
 * Human-readable labels and descriptions for each provider type.
 */
export const PROVIDER_TYPE_INFO: Record<
  ProviderType,
  { label: string; description: string; keyOptional: boolean }
> = {
  openrouter: {
    label: "OpenRouter",
    description: "Aggregator that proxies to many model providers.",
    keyOptional: false,
  },
  ollama: {
    label: "Ollama",
    description: "Local or cloud-hosted Ollama. API key is optional for local instances.",
    keyOptional: true,
  },
  openai_compatible: {
    label: "OpenAI Compatible",
    description: "Any OpenAI-compatible API endpoint (OpenAI, Together, Groq, etc.).",
    keyOptional: false,
  },
};

/**
 * Known popular models per provider type (for admin UI suggestions).
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
    "llama3.3",
    "llama3.3:70b",
    "mistral",
    "mistral-nemo",
    "qwen2.5",
    "qwen2.5:72b",
    "gemma2",
    "gemma2:27b",
    "phi3",
    "phi3.5",
    "codestral",
    "deepseek-r1",
    "deepseek-r1:70b",
    "command-r",
    "llava",
    "nomic-embed-text",
  ],
  openai_compatible: [
    "glm-5.1:cloud",
    "minimax-m2.7:cloud",
  ],
};