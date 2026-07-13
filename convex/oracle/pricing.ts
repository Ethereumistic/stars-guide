/**
 * Oracle Model Pricing — Cost-Based Quota V2
 *
 * Pure pricing lookup module. No DB reads inside.
 * All cost values are in MICRODOLLARS (1 USD = 1,000,000 microdollars).
 * This avoids floating-point precision issues with sub-cent amounts.
 *
 * Usage:
 *   import { calculateCostMicro, DEFAULT_MODEL_PRICING, PRICING_TABLE_SETTINGS_KEY } from "./pricing";
 *   const cost = calculateCostMicro(model, promptTokens, completionTokens);
 */

export const PRICING_TABLE_SETTINGS_KEY = "model_pricing";

/**
 * Default pricing in USD per 1,000,000 tokens (→ divide by 1,000,000 for per-token).
 * Sources: OpenRouter API docs, model provider pricing pages (mid-2025).
 */
export const DEFAULT_MODEL_PRICING: Record<
  string,
  { promptPer1M: number; completionPer1M: number }
> = {
  // Google Gemini
  "google/gemini-2.5-flash": { promptPer1M: 0.15, completionPer1M: 0.6 },
  "google/gemini-2.5-flash:free": { promptPer1M: 0.0, completionPer1M: 0.0 },
  "google/gemini-2.5-pro": { promptPer1M: 1.25, completionPer1M: 10.0 },
  "google/gemini-2.0-flash": { promptPer1M: 0.1, completionPer1M: 0.4 },
  "google/gemini-2.0-flash-exp": { promptPer1M: 0.15, completionPer1M: 0.6 },

  // Anthropic Claude
  "anthropic/claude-sonnet-4": { promptPer1M: 3.0, completionPer1M: 15.0 },
  "anthropic/claude-sonnet-4:free": { promptPer1M: 0.0, completionPer1M: 0.0 },
  "anthropic/claude-sonnet-3.7": { promptPer1M: 3.0, completionPer1M: 15.0 },
  "anthropic/claude-opus-3.5": { promptPer1M: 15.0, completionPer1M: 75.0 },
  "anthropic/claude-3.5-sonnet": { promptPer1M: 3.0, completionPer1M: 15.0 },

  // xAI Grok
  "x-ai/grok-4.1-fast": { promptPer1M: 0.2, completionPer1M: 1.0 },
  "x-ai/grok-4.1": { promptPer1M: 3.0, completionPer1M: 15.0 },
  "x-ai/grok-3": { promptPer1M: 3.0, completionPer1M: 15.0 },
  "x-ai/grok-3-beta": { promptPer1M: 3.0, completionPer1M: 15.0 },

  // DeepSeek
  "deepseek/deepseek-r1-0528": { promptPer1M: 0.55, completionPer1M: 2.2 },
  "deepseek/deepseek-r1-0528:free": { promptPer1M: 0.0, completionPer1M: 0.0 },
  "deepseek/deepseek-chat-v3-0324": { promptPer1M: 0.27, completionPer1M: 1.1 },
  "deepseek/deepseek-chat-v3-0324:free": { promptPer1M: 0.0, completionPer1M: 0.0 },

  // OpenAI (fallback chains)
  "openai/gpt-4o-mini": { promptPer1M: 0.15, completionPer1M: 0.6 },
  "openai/gpt-4o": { promptPer1M: 2.5, completionPer1M: 10.0 },
  "openai/gpt-4-turbo": { promptPer1M: 10.0, completionPer1M: 30.0 },

  // Meta Llama (for future extension)
  "meta/llama-4-scout": { promptPer1M: 0.2, completionPer1M: 0.8 },
  "meta/llama-4-maverick": { promptPer1M: 0.4, completionPer1M: 1.6 },

  // Mistral
  "mistral/mistral-large": { promptPer1M: 2.0, completionPer1M: 6.0 },
  "mistral/mistral-small": { promptPer1M: 0.2, completionPer1M: 0.6 },
};

/** Fallback pricing for unknown models — conservative default to avoid under-billing. */
const DEFAULT_UNKNOWN_PROMPT_PER_1M = 3.0;
const DEFAULT_UNKNOWN_COMPLETION_PER_1M = 15.0;

/** Minimum cost in microdollars for any Oracle call, even if model is free.
 *  Prevents infinite spam on zero-cost models.
 *  100 microdollars = $0.0001 */
export const BURST_MIN_COST_MICRO = 100;

/**
 * Calculate USD cost in microdollars for an LLM response.
 *
 * @param modelUsed       - Full model string (e.g. "google/gemini-2.5-flash")
 * @param promptTokens    - Number of prompt tokens (undefined = 0)
 * @param completionTokens - Number of completion tokens (undefined = 0)
 * @param pricingTable    - Optional override pricing table (defaults to DEFAULT_MODEL_PRICING)
 * @returns Cost in microdollars (integer), with a small minimum for every
 * successful Oracle generation so missing usage metadata and free models
 * cannot bypass rate limits.
 */
export function calculateCostMicro(
  modelUsed: string,
  promptTokens: number | undefined,
  completionTokens: number | undefined,
  pricingTable?: Record<string, { promptPer1M: number; completionPer1M: number }>,
): number {
  // Free models do not have a token cost, but still consume the minimum
  // allowance unit so they cannot provide unlimited Oracle generations.
  if (modelUsed.endsWith(":free")) {
    return BURST_MIN_COST_MICRO;
  }

  const table = pricingTable ?? DEFAULT_MODEL_PRICING;
  // Gateway model identifiers may be prefixed with the transport provider,
  // for example "openrouter/google/gemini-2.5-flash". Prefer the exact key,
  // then the provider-agnostic model key used by the pricing table.
  const unprefixedModel = modelUsed.includes("/")
    ? modelUsed.slice(modelUsed.indexOf("/") + 1)
    : modelUsed;
  const pricing = table[modelUsed] ?? table[unprefixedModel] ?? {
    promptPer1M: DEFAULT_UNKNOWN_PROMPT_PER_1M,
    completionPer1M: DEFAULT_UNKNOWN_COMPLETION_PER_1M,
  };

  const pt = promptTokens ?? 0;
  const ct = completionTokens ?? 0;

  if (pt === 0 && ct === 0) return BURST_MIN_COST_MICRO;

  // Convert $/1M → microdollars directly:
  //   (promptPer1M dollars / 1M tokens) * promptTokens * 1e6 microdollars/dollar
  //   = promptPer1M * promptTokens  (both $/1M and microdollars factor cancel)
  // Same for completion. Use integer arithmetic to stay precise.
  const promptMicro = pricing.promptPer1M * pt;
  const completionMicro = pricing.completionPer1M * ct;

  return Math.max(BURST_MIN_COST_MICRO, Math.round(promptMicro + completionMicro));
}
