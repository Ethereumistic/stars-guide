/**
 * AI Registry — Single Source of Truth
 *
 * Central registry for all AI provider types, provider configs, model
 * definitions, and capability badges. Shared across Oracle, Horoscope,
 * and any future features that need AI providers/models.
 *
 * Usage:
 *   import { KNOWN_MODELS, getModelsForProvider, findModelMeta } from "@/lib/ai/registry";
 */

// ─── PROVIDER TYPES ─────────────────────────────────────────────────────────

export const PROVIDER_TYPES = ["openrouter", "ollama", "openai_compatible"] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKeyEnvVar: string;
}

// ─── MODEL CAPABILITIES ─────────────────────────────────────────────────────

export type ModelCapability =
  | "thinking"     // Reasoning model — may produce empty `content` if tokens exhausted on chain-of-thought
  | "vision"       // Can process images
  | "code"         // Optimized for code generation
  | "fast"         // Optimized for low-latency responses
  | "free"         // Free tier (e.g. OpenRouter :free suffix)
  | "embedding"    // Embedding model — NOT suitable for chat/generation
  | "tool_use";    // Supports function/tool calling

export interface ModelCapabilityMeta {
  label: string;
  shortLabel: string;
  color: string;        // Tailwind text color class
  bgColor: string;      // Tailwind bg class
  borderColor: string;  // Tailwind border class
  description: string;
  warning?: string;     // If set, show this warning when selected for generation tasks
}

export const MODEL_CAPABILITIES: Record<ModelCapability, ModelCapabilityMeta> = {
  thinking: {
    label: "Thinking",
    shortLabel: "THINK",
    color: "text-purple-400",
    bgColor: "bg-purple-500/15",
    borderColor: "border-purple-500/30",
    description: "Reasoning model that produces chain-of-thought before answering.",
    warning:
      "Thinking/reasoning models may produce empty responses if they exhaust their token budget on chain-of-thought. Not recommended for structured output tasks like horoscope generation.",
  },
  vision: {
    label: "Vision",
    shortLabel: "VIS",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/15",
    borderColor: "border-cyan-500/30",
    description: "Can process and analyze images.",
  },
  code: {
    label: "Code",
    shortLabel: "CODE",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
    borderColor: "border-emerald-500/30",
    description: "Optimized for code generation and analysis.",
  },
  fast: {
    label: "Fast",
    shortLabel: "FAST",
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
    borderColor: "border-amber-500/30",
    description: "Optimized for low-latency responses.",
  },
  free: {
    label: "Free",
    shortLabel: "FREE",
    color: "text-green-400",
    bgColor: "bg-green-500/15",
    borderColor: "border-green-500/30",
    description: "Available on the free tier.",
  },
  embedding: {
    label: "Embedding",
    shortLabel: "EMB",
    color: "text-gray-400",
    bgColor: "bg-gray-500/15",
    borderColor: "border-gray-500/30",
    description: "Embedding model — not suitable for text generation.",
    warning:
      "Embedding models cannot generate text. Do not use for chat, horoscopes, or any generation task.",
  },
  tool_use: {
    label: "Tool Use",
    shortLabel: "TOOL",
    color: "text-orange-400",
    bgColor: "bg-orange-500/15",
    borderColor: "border-orange-500/30",
    description: "Supports function/tool calling.",
  },
};

// ─── MODEL REGISTRY ─────────────────────────────────────────────────────────

export interface ModelVariant {
  /** Tag suffix appended after `:` — e.g. "e2b" makes the full ID "gemma4:e2b" */
  id: string;
  /** Human-readable label shown in the dropdown */
  name: string;
}

export interface AIModelEntry {
  /** Model base ID (e.g. "gemma4"). If variants exist, the full ID becomes "{id}:{variantId}". */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Capability badges */
  capabilities: ModelCapability[];
  /** Short description for tooltips */
  description?: string;
  /**
   * Available weight/size variants. If set, the user MUST pick one
   * and the model ID becomes `{id}:{variantId}`.
   * If omitted, the model ID is used as-is.
   */
  variants?: ModelVariant[];
}

/**
 * Known models per provider type.
 *
 * These are PRESETS — users can always type a custom model ID.
 * Each entry includes capability badges so the UI can warn about
 * reasoning models, embedding models, etc.
 */
export const KNOWN_MODELS: Record<ProviderType, AIModelEntry[]> = {
  openrouter: [
    {
      id: "google/gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      capabilities: ["fast", "vision", "tool_use"],
      description: "Fast, capable, great for most tasks.",
    },
    {
      id: "google/gemini-2.5-flash:free",
      name: "Gemini 2.5 Flash (Free)",
      capabilities: ["fast", "free"],
      description: "Free tier Gemini 2.5 Flash.",
    },
    {
      id: "google/gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      capabilities: ["vision", "thinking", "tool_use"],
      description: "Google's most capable model with reasoning.",
    },
    {
      id: "anthropic/claude-sonnet-4",
      name: "Claude Sonnet 4",
      capabilities: ["vision", "code", "tool_use"],
      description: "Balanced performance and quality from Anthropic.",
    },
    {
      id: "anthropic/claude-sonnet-4:free",
      name: "Claude Sonnet 4 (Free)",
      capabilities: ["free"],
      description: "Free tier Claude Sonnet 4.",
    },
    {
      id: "x-ai/grok-4.1-fast",
      name: "Grok 4.1 Fast",
      capabilities: ["fast", "tool_use"],
      description: "Fast Grok model from xAI.",
    },
    {
      id: "x-ai/grok-4.1",
      name: "Grok 4.1",
      capabilities: ["tool_use"],
      description: "Full Grok model from xAI.",
    },
    {
      id: "deepseek/deepseek-r1-0528:free",
      name: "DeepSeek R1 (Free)",
      capabilities: ["thinking", "free"],
      description: "Reasoning model — produces chain-of-thought before answering.",
    },
    {
      id: "deepseek/deepseek-chat-v3-0324:free",
      name: "DeepSeek V3 (Free)",
      capabilities: ["free", "fast"],
      description: "Fast DeepSeek chat model, free tier.",
    },
    {
      id: "qwen/qwen3-235b-a22b-07-25:free",
      name: "Qwen3 235B (Free)",
      capabilities: ["thinking", "free"],
      description: "Large Qwen3 model with reasoning. Free tier.",
    },
    {
      id: "meta-llama/llama-4-maverick:free",
      name: "Llama 4 Maverick (Free)",
      capabilities: ["free"],
      description: "Meta's Llama 4 Maverick. Free tier.",
    },
    {
      id: "mistralai/mistral-small-3.1-24b-instruct:free",
      name: "Mistral Small 3.1 (Free)",
      capabilities: ["fast", "free", "vision"],
      description: "Fast Mistral model with vision. Free tier.",
    },
    {
      id: "stepfun/step-3.5-flash:free",
      name: "Step 3.5 Flash (Free)",
      capabilities: ["fast", "free"],
      description: "Fast Step model. Free tier.",
    },
    {
      id: "arcee-ai/trinity-large-preview:free",
      name: "Arcee Trinity (Free)",
      capabilities: ["free"],
      description: "Arcee Trinity large preview. Free tier.",
    },
    {
      id: "z-ai/glm-4.5-air:free",
      name: "GLM 4.5 Air (Free)",
      capabilities: ["free"],
      description: "Z-AI GLM 4.5 Air. Free tier.",
    },
  ],

  ollama: [
    {
      id: "deepseek-v4-flash",
      name: "DeepSeek V4 Flash",
      capabilities: ["fast", "thinking"],
      description:
        "284B MoE (13B activated), 1M-token context. 3 thinking modes: no-thinking for fast answers, thinking for logical analysis.",
    },
    {
      id: "deepseek-v4-pro",
      name: "DeepSeek V4 Pro",
      capabilities: ["thinking", "tool_use"],
      description:
        "Frontier MoE model with 1M-token context and three reasoning modes. Full-power DeepSeek V4.",
    },
    {
      id: "nemotron3",
      name: "Nemotron 3 Nano Omni",
      capabilities: ["vision", "tool_use", "thinking"],
      variants: [
        { id: "33b", name: "33B" },
      ],
      description:
        "NVIDIA multimodal model — unifies video, audio, image, and text understanding. Enterprise Q&A, summarization, transcription.",
    },
    {
      id: "granite4.1",
      name: "Granite 4.1",
      capabilities: ["tool_use"],
      variants: [
        { id: "3b", name: "3B" },
        { id: "8b", name: "8B" },
        { id: "30b", name: "30B" },
      ],
      description:
        "IBM's dense decoder-only models (3B/8B/30B). Multilingual, RAG, tool usage, structured JSON output. 512K context.",
    },
    {
      id: "mistral-medium-3.5",
      name: "Mistral Medium 3.5",
      capabilities: ["vision", "tool_use", "thinking"],
      variants: [
        { id: "128b", name: "128B" },
      ],
      description:
        "128B flagship merging instruction-following, reasoning, and coding in a single set of weights.",
    },
    {
      id: "qwen3.6",
      name: "Qwen 3.6",
      capabilities: ["thinking", "code"],
      variants: [
        { id: "27b", name: "27B" },
        { id: "35b", name: "35B" },
      ],
      description:
        "Substantial upgrades in agentic coding and thinking preservation. Frontend workflows and repo-level reasoning.",
    },
    {
      id: "kimi-k2.6",
      name: "Kimi K2.6",
      capabilities: ["thinking"],
      description:
        "Native multimodal agentic model. Long-horizon coding, coding-driven design, autonomous execution, swarm orchestration.",
    },
    {
      id: "glm-5.1",
      name: "GLM 5.1",
      capabilities: ["tool_use", "thinking", "code"],
      description:
        "Zhipu's next-gen flagship for agentic engineering. State-of-the-art on SWE-Bench Pro. Strong coding capabilities.",
    },
    {
      id: "gemma4",
      name: "Gemma 4",
      capabilities: ["vision", "tool_use", "thinking"],
      variants: [
        { id: "e2b", name: "E2B" },
        { id: "e4b", name: "E4B" },
        { id: "26b", name: "26B" },
        { id: "31b", name: "31B" },
      ],
      description:
        "Google's frontier-level open model. Reasoning, agentic workflows, coding, and multimodal understanding.",
    },
    {
      id: "translategemma",
      name: "Translate Gemma",
      capabilities: ["vision"],
      variants: [
        { id: "4b", name: "4B" },
        { id: "12b", name: "12B" },
        { id: "27b", name: "27B" },
      ],
      description:
        "Open translation model built on Gemma 3. Supports 55 languages. Specialized — not for general chat.",
    },
    {
      id: "glm-ocr",
      name: "GLM OCR",
      capabilities: ["vision", "tool_use"],
      description:
        "Multimodal OCR model for complex document understanding. Built on GLM-V encoder–decoder. Specialized — not for general chat.",
    },
    {
      id: "minimax-m2.7",
      name: "MiniMax M2.7",
      capabilities: ["tool_use", "thinking"],
      description:
        "MiniMax M2-series for coding, agentic workflows, and professional productivity.",
    },
  ],

  openai_compatible: [
    {
      id: "deepseek-v4-flash",
      name: "DeepSeek V4 Flash",
      capabilities: ["fast", "thinking"],
      description:
        "284B MoE (13B activated), 1M-token context. 3 thinking modes: no-thinking for fast answers, thinking for logical analysis.",
    },
    {
      id: "deepseek-v4-pro",
      name: "DeepSeek V4 Pro",
      capabilities: ["thinking", "tool_use"],
      description:
        "Frontier MoE model with 1M-token context and three reasoning modes. Full-power DeepSeek V4.",
    },
    {
      id: "nemotron3",
      name: "Nemotron 3 Nano Omni",
      capabilities: ["vision", "tool_use", "thinking"],
      variants: [
        { id: "33b", name: "33B" },
      ],
      description:
        "NVIDIA multimodal model — unifies video, audio, image, and text understanding. Enterprise Q&A, summarization, transcription.",
    },
    {
      id: "granite4.1",
      name: "Granite 4.1",
      capabilities: ["tool_use"],
      variants: [
        { id: "3b", name: "3B" },
        { id: "8b", name: "8B" },
        { id: "30b", name: "30B" },
      ],
      description:
        "IBM's dense decoder-only models (3B/8B/30B). Multilingual, RAG, tool usage, structured JSON output. 512K context.",
    },
    {
      id: "mistral-medium-3.5",
      name: "Mistral Medium 3.5",
      capabilities: ["vision", "tool_use", "thinking"],
      variants: [
        { id: "128b", name: "128B" },
      ],
      description:
        "128B flagship merging instruction-following, reasoning, and coding in a single set of weights.",
    },
    {
      id: "qwen3.6",
      name: "Qwen 3.6",
      capabilities: ["thinking", "code"],
      variants: [
        { id: "27b", name: "27B" },
        { id: "35b", name: "35B" },
      ],
      description:
        "Substantial upgrades in agentic coding and thinking preservation. Frontend workflows and repo-level reasoning.",
    },
    {
      id: "kimi-k2.6",
      name: "Kimi K2.6",
      capabilities: ["thinking"],
      description:
        "Native multimodal agentic model. Long-horizon coding, coding-driven design, autonomous execution, swarm orchestration.",
    },
    {
      id: "glm-5.1",
      name: "GLM 5.1",
      capabilities: ["tool_use", "thinking", "code"],
      description:
        "Zhipu's next-gen flagship for agentic engineering. State-of-the-art on SWE-Bench Pro. Strong coding capabilities.",
    },
    {
      id: "gemma4",
      name: "Gemma 4",
      capabilities: ["vision", "tool_use", "thinking"],
      variants: [
        { id: "e2b", name: "E2B" },
        { id: "e4b", name: "E4B" },
        { id: "26b", name: "26B" },
        { id: "31b", name: "31B" },
      ],
      description:
        "Google's frontier-level open model. Reasoning, agentic workflows, coding, and multimodal understanding.",
    },
    {
      id: "translategemma",
      name: "Translate Gemma",
      capabilities: ["vision"],
      variants: [
        { id: "4b", name: "4B" },
        { id: "12b", name: "12B" },
        { id: "27b", name: "27B" },
      ],
      description:
        "Open translation model built on Gemma 3. Supports 55 languages. Specialized — not for general chat.",
    },
    {
      id: "glm-ocr",
      name: "GLM OCR",
      capabilities: ["vision", "tool_use"],
      description:
        "Multimodal OCR model for complex document understanding. Built on GLM-V encoder–decoder. Specialized — not for general chat.",
    },
    {
      id: "minimax-m2.7",
      name: "MiniMax M2.7",
      capabilities: ["tool_use", "thinking"],
      description:
        "MiniMax M2-series for coding, agentic workflows, and professional productivity.",
    },
  ],
};

// ─── PROVIDER TYPE METADATA ─────────────────────────────────────────────────

export interface ProviderTypeInfo {
  label: string;
  description: string;
  keyOptional: boolean;
  defaultName: string;
  defaultBaseUrl: string;
  defaultApiKeyEnvVar: string;
}

export const PROVIDER_TYPE_INFO: Record<ProviderType, ProviderTypeInfo> = {
  openrouter: {
    label: "OpenRouter",
    description: "Aggregator that proxies to many model providers.",
    keyOptional: false,
    defaultName: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultApiKeyEnvVar: "OPENROUTER_API_KEY",
  },
  ollama: {
    label: "Ollama",
    description: "Local or cloud-hosted Ollama. API key is optional for local instances.",
    keyOptional: true,
    defaultName: "Ollama",
    defaultBaseUrl: "http://localhost:11434/v1",
    defaultApiKeyEnvVar: "OLLAMA_API_KEY",
  },
  openai_compatible: {
    label: "OpenAI Compatible",
    description: "Any OpenAI-compatible API endpoint (OpenAI, Together, Groq, etc.).",
    keyOptional: false,
    defaultName: "OpenAI Compatible",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultApiKeyEnvVar: "OPENAI_API_KEY",
  },
};

// ─── DEFAULTS ───────────────────────────────────────────────────────────────

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    type: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnvVar: "OPENROUTER_API_KEY",
  },
];

// ─── LOOKUP HELPERS ─────────────────────────────────────────────────────────

/**
 * Get the list of known model entries for a given provider type.
 * Returns an empty array for unknown provider types.
 */
export function getModelsForProviderType(providerType: ProviderType): AIModelEntry[] {
  return KNOWN_MODELS[providerType] ?? [];
}

/**
 * Get known model entries filtered by the provider type of a specific provider config.
 */
export function getModelsForProvider(provider: ProviderConfig): AIModelEntry[] {
  return getModelsForProviderType(provider.type);
}

/**
 * Find the registry metadata for a specific model ID across all provider types.
 * Handles both bare IDs ("gemma4") and tagged IDs ("gemma4:e2b").
 * Matches against the base `id` field of each entry.
 */
export function findModelMeta(modelId: string): AIModelEntry | undefined {
  const baseId = modelId.split(":")[0];
  for (const providerType of PROVIDER_TYPES) {
    const found = KNOWN_MODELS[providerType].find((m) => m.id === baseId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Find the registry metadata for a model ID within a specific provider type.
 * Handles both bare IDs and tagged IDs.
 */
export function findModelMetaForProvider(
  modelId: string,
  providerType: ProviderType
): AIModelEntry | undefined {
  const baseId = modelId.split(":")[0];
  return KNOWN_MODELS[providerType]?.find((m) => m.id === baseId);
}

/**
 * Get the plain string IDs for a provider type (backward compat).
 */
export function getModelIdsForProviderType(providerType: ProviderType): string[] {
  return getModelsForProviderType(providerType).map((m) => m.id);
}

/**
 * Check if a model has a specific capability.
 */
export function modelHasCapability(
  modelId: string,
  capability: ModelCapability,
  providerType?: ProviderType
): boolean {
  const meta = providerType
    ? findModelMetaForProvider(modelId, providerType)
    : findModelMeta(modelId);
  return meta?.capabilities.includes(capability) ?? false;
}

/**
 * Get warnings for a model (aggregates all capability warnings).
 */
export function getModelWarnings(modelId: string, providerType?: ProviderType): string[] {
  const meta = providerType
    ? findModelMetaForProvider(modelId, providerType)
    : findModelMeta(modelId);
  if (!meta) return [];
  return meta.capabilities
    .map((cap) => MODEL_CAPABILITIES[cap].warning)
    .filter((w): w is string => !!w);
}

// ─── PARSING / VALIDATION ───────────────────────────────────────────────────

export function parseProvidersConfig(raw: string | undefined): ProviderConfig[] {
  if (!raw) return DEFAULT_PROVIDERS;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PROVIDERS;
    const validated = parsed.filter(
      (p: any) =>
        p &&
        typeof p === "object" &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        PROVIDER_TYPES.includes(p.type) &&
        typeof p.baseUrl === "string" &&
        typeof p.apiKeyEnvVar === "string"
    );
    return validated.length > 0 ? (validated as ProviderConfig[]) : DEFAULT_PROVIDERS;
  } catch {
    return DEFAULT_PROVIDERS;
  }
}

export function validateProvidersConfig(providers: any[]): string[] {
  const errors: string[] = [];
  if (!Array.isArray(providers)) return ["Providers config must be an array."];

  const seenIds = new Set<string>();

  providers.forEach((p, idx) => {
    if (!p || typeof p !== "object") {
      errors.push(`Provider at index ${idx} is not an object.`);
      return;
    }
    if (!p.id || typeof p.id !== "string") {
      errors.push(`Provider at index ${idx} must have a valid 'id'.`);
    } else {
      if (seenIds.has(p.id)) {
        errors.push(`Duplicate provider ID found: ${p.id}.`);
      }
      seenIds.add(p.id);
    }
    if (!p.name || typeof p.name !== "string") {
      errors.push(`Provider at index ${idx} must have a valid 'name'.`);
    }
    if (!PROVIDER_TYPES.includes(p.type)) {
      errors.push(`Provider '${p.id}' has an invalid type: ${p.type}.`);
    }
    if (!p.baseUrl || typeof p.baseUrl !== "string" || !p.baseUrl.startsWith("http")) {
      errors.push(`Provider '${p.id}' has an invalid baseUrl.`);
    }
    if (p.type !== "ollama") {
      if (!p.apiKeyEnvVar || typeof p.apiKeyEnvVar !== "string") {
        errors.push(`Provider '${p.id}' must specify an apiKeyEnvVar.`);
      }
    } else {
      if (p.apiKeyEnvVar && typeof p.apiKeyEnvVar !== "string") {
        errors.push(`Provider '${p.id}' apiKeyEnvVar must be a string if provided.`);
      }
    }
  });

  return errors;
}

// ─── PROVIDER REQUEST HELPERS ───────────────────────────────────────────────

export function buildProviderHeaders(
  provider: ProviderConfig,
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

export function buildProviderUrl(provider: ProviderConfig): string {
  let base = provider.baseUrl.replace(/\/+$/, "");
  if (!base.endsWith("/chat/completions")) {
    base += "/chat/completions";
  }
  return base;
}
