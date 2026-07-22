export const USER_TIERS = ["free", "popular", "premium"] as const;
export type UserTier = (typeof USER_TIERS)[number];

export const REASONING_EFFORTS = [
  "auto",
  "disabled",
  "low",
  "medium",
  "high",
] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export type ModelChainEntry = {
  providerId: string;
  model: string;
};

export type OracleModelOption = {
  optionKey: string;
  label: string;
  description?: string;
  badge?: string;
  logoUrl?: string;
  available: boolean;
  requiredTier?: "popular" | "premium";
  allowedReasoningEfforts: ReasoningEffort[];
  defaultReasoningEffort: ReasoningEffort;
  usageHint?: string;
};

export type OracleComposerCapabilities = {
  enabled: boolean;
  effectiveTier: UserTier;
  defaultOptionKey: string;
  options: OracleModelOption[];
};

export type UserModelOptionPolicy = {
  optionKey: string;
  enabled: boolean;
  allowedTiers: UserTier[];
  defaultForTiers: UserTier[];
  restrictReasoningEfforts?: boolean;
  allowedReasoningEfforts: ReasoningEffort[];
  defaultReasoningEffort: ReasoningEffort;
};

export function effectiveReasoningEfforts(
  option: Pick<UserModelOptionPolicy, "restrictReasoningEfforts" | "allowedReasoningEfforts">,
): ReasoningEffort[] {
  return option.restrictReasoningEfforts
    ? option.allowedReasoningEfforts
    : [...REASONING_EFFORTS];
}

export function resolveUserModelPolicy<T extends UserModelOptionPolicy>(
  options: T[],
  tier: UserTier,
  requestedOptionKey?: string,
  requestedReasoningEffort?: ReasoningEffort,
): { option: T | null; reasoningEffort: ReasoningEffort; fallbackReason?: string } {
  const enabled = options.filter((option) => option.enabled);
  const requestedConfigured = requestedOptionKey
    ? options.find((option) => option.optionKey === requestedOptionKey)
    : undefined;
  const requested = requestedConfigured?.enabled ? requestedConfigured : undefined;
  const requestedAllowed = requested?.allowedTiers.includes(tier) ?? false;
  const option = requestedAllowed
    ? requested!
    : enabled.find(
      (candidate) => candidate.allowedTiers.includes(tier) && candidate.defaultForTiers.includes(tier),
    ) ?? null;

  if (!option) {
    return {
      option: null,
      reasoningEffort: "auto",
      fallbackReason: requestedConfigured && !requestedConfigured.enabled
        ? "option_disabled"
        : requested
        ? "tier_not_allowed"
        : requestedOptionKey
          ? "option_unavailable"
          : "no_tier_default",
    };
  }

  return {
    option,
    reasoningEffort: normalizeReasoningEffort(
      requestedReasoningEffort,
      effectiveReasoningEfforts(option),
      option.defaultReasoningEffort,
    ),
    fallbackReason: requestedAllowed
      ? undefined
      : requestedConfigured && !requestedConfigured.enabled
        ? "option_disabled"
        : requested
        ? "tier_not_allowed"
        : requestedOptionKey
          ? "option_unavailable"
          : undefined,
  };
}

export const REASONING_EFFORT_LABELS: Record<ReasoningEffort, string> = {
  auto: "Auto",
  disabled: "Off",
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function normalizeReasoningEffort(
  requested: ReasoningEffort | undefined,
  allowed: ReasoningEffort[],
  fallback: ReasoningEffort,
): ReasoningEffort {
  if (requested && allowed.includes(requested)) return requested;
  if (allowed.includes(fallback)) return fallback;
  return allowed[0] ?? "auto";
}

export function minimumRequiredTier(
  allowedTiers: UserTier[],
): "popular" | "premium" | undefined {
  if (allowedTiers.includes("free")) return undefined;
  if (allowedTiers.includes("popular")) return "popular";
  return "premium";
}
