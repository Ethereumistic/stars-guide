/**
 * Oracle Provider System — Backward-compatible re-exports.
 *
 * All types, constants, and helpers now live in the shared AI registry
 * at @/lib/ai/registry. This file re-exports everything so existing
 * oracle components continue to work without changes.
 *
 * New code should import directly from @/lib/ai/registry or @/components/ai.
 */

export {
  // Types
  type ProviderConfig,
  type ProviderType,

  // Constants
  PROVIDER_TYPES,
  PROVIDER_TYPE_INFO,
  DEFAULT_PROVIDERS,

  // Parsing & Validation
  parseProvidersConfig,
  validateProvidersConfig,

  // Request helpers
  buildProviderHeaders,
  buildProviderUrl,
} from "../ai/registry";

// ─── ORACLE-SPECIFIC (not shared) ────────────────────────────────────────

import { type ProviderConfig, type ProviderType } from "../ai/registry";

export interface ModelChainEntry {
  providerId: string;
  model: string;
}

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
  if (index < 26) return String.fromCharCode(65 + index);
  return String(index);
}

export function parseModelChain(raw: string | undefined): ModelChainEntry[] {
  if (!raw) return DEFAULT_MODEL_CHAIN;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_MODEL_CHAIN;
    const validated = parsed.filter(
      (e: any) =>
        e &&
        typeof e === "object" &&
        typeof e.providerId === "string" &&
        typeof e.model === "string"
    );
    return validated.length > 0 ? (validated as ModelChainEntry[]) : DEFAULT_MODEL_CHAIN;
  } catch {
    return DEFAULT_MODEL_CHAIN;
  }
}

export function validateModelChain(
  chain: any[],
  providers: ProviderConfig[]
): string[] {
  const errors: string[] = [];
  if (!Array.isArray(chain)) return ["Model chain must be an array."];

  const providerIds = new Set(providers.map((p) => p.id));
  const seenCombos = new Set<string>();

  chain.forEach((entry, idx) => {
    if (!entry || typeof entry !== "object") {
      errors.push(`Chain entry at index ${idx} is not an object.`);
      return;
    }
    if (!entry.providerId || typeof entry.providerId !== "string") {
      errors.push(`Chain entry at index ${idx} missing 'providerId'.`);
    } else if (!providerIds.has(entry.providerId)) {
      errors.push(
        `Chain entry at index ${idx} references unknown providerId: ${entry.providerId}.`
      );
    }

    if (!entry.model || typeof entry.model !== "string") {
      errors.push(`Chain entry at index ${idx} missing 'model'.`);
    }

    if (entry.providerId && entry.model) {
      const combo = `${entry.providerId}::${entry.model}`;
      if (seenCombos.has(combo)) {
        errors.push(
          `Duplicate model chain entry: ${entry.providerId} / ${entry.model}.`
        );
      }
      seenCombos.add(combo);
    }
  });

  return errors;
}

/**
 * Preset defaults when adding a new provider by type.
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
 * Backward compat: flat model ID list per provider type.
 * Prefer using getModelsForProviderType() from @/lib/ai/registry for
 * rich metadata with capability badges.
 */
import { getModelIdsForProviderType } from "../ai/registry";
export const KNOWN_MODELS_PER_PROVIDER_TYPE: Record<ProviderType, string[]> = {
  openrouter: getModelIdsForProviderType("openrouter"),
  ollama: getModelIdsForProviderType("ollama"),
  openai_compatible: getModelIdsForProviderType("openai_compatible"),
};
