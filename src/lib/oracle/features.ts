export const ORACLE_FEATURE_KEYS = [
  "attach_files",
  "birth_chart_core",
  "birth_chart_full",
  "synastry_core",
  "synastry_full",
  "sign_card_image",
  "binaural_beat",
] as const

export type OracleFeatureKey = (typeof ORACLE_FEATURE_KEYS)[number]

export type OracleFeatureMenuGroup = "primary" | "more"

export interface OracleFeatureDefinition {
  key: OracleFeatureKey
  label: string
  shortLabel: string
  description: string
  defaultPrompt?: string
  fallbackInjectionText?: string
  menuGroup: OracleFeatureMenuGroup
  implemented: boolean
  requiresBirthData: boolean
}

export const ORACLE_FEATURES: readonly OracleFeatureDefinition[] = [
  {
    key: "attach_files",
    label: "Add photos & files",
    shortLabel: "Photos & files",
    description: "Attach visual or supporting files to Oracle",
    menuGroup: "primary",
    implemented: false,
    requiresBirthData: false,
  },
  {
    key: "birth_chart_core",
    label: "Birth chart analysis",
    shortLabel: "Birth chart analysis",
    description: "Sun, Moon, Ascendant, and their houses",
    defaultPrompt:
      "Analyze my birth chart through my Sun, Moon, and Ascendant, including the houses they fall in.",
    menuGroup: "primary",
    implemented: true,
    requiresBirthData: true,
    fallbackInjectionText: [
      "[BIRTH CHART ANALYSIS MODE]",
      "You are performing a Birth Chart Core analysis.",
      "Reading instructions:",
      "- Focus on how the Big Three (Sun, Moon, Ascendant) interact as a triad — not in isolation.",
      "- Explain each house placement — the house IS the context, the sign is the style.",
      "- For aspects, prioritize the tightest orbs. Name what the aspect creates in the person's life.",
      "- Identify the primary tension or friction point and name it directly.",
      "- Express genuine uncertainty when the chart is ambiguous.",
      "- When you do not have specific chart data for a placement, say plainly that the data is not available.",
      "Treat the stored chart data as canonical truth. Do not invent different signs, houses, or aspects.",
      "[END BIRTH CHART ANALYSIS MODE]",
    ].join("\n"),
  },
  {
    key: "birth_chart_full",
    label: "Deep birth chart analysis",
    shortLabel: "Deep birth chart analysis",
    description: "Full natal chart analysis",
    defaultPrompt:
      "Give me a deep analysis of my full birth chart using all of my natal placements.",
    menuGroup: "primary",
    implemented: true,
    requiresBirthData: true,
    fallbackInjectionText: [
      "[DEEP BIRTH CHART ANALYSIS MODE]",
      "You are performing a Deep Birth Chart analysis.",
      "Reading instructions:",
      "- Give a layered interpretation of the full chart while staying anchored to the stored placements.",
      "- Prioritize deeper synthesis with attention to themes, clusters, houses, aspects, and Nodes.",
      "- Identify the primary tension AND the primary gift. Name both directly.",
      "- Express genuine uncertainty when the chart is ambiguous.",
      "- When you do not have specific chart data for a placement, say plainly that the data is not available.",
      "Treat the stored chart data as canonical truth. Do not override it with model guesses.",
      "[END DEEP BIRTH CHART ANALYSIS MODE]",
    ].join("\n"),
  },
  {
    key: "synastry_core",
    label: "Synastry analysis",
    shortLabel: "Synastry analysis",
    description: "Relationship chart comparison",
    menuGroup: "more",
    implemented: false,
    requiresBirthData: true,
  },
  {
    key: "synastry_full",
    label: "Deep synastry analysis",
    shortLabel: "Deep synastry analysis",
    description: "Full relationship chart comparison",
    menuGroup: "more",
    implemented: false,
    requiresBirthData: true,
  },
  {
    key: "sign_card_image",
    label: "Create sign card image",
    shortLabel: "Create sign card image",
    description: "Generate a shareable sign card visual",
    menuGroup: "more",
    implemented: false,
    requiresBirthData: true,
  },
  {
    key: "binaural_beat",
    label: "Create binaural beat",
    shortLabel: "Create binaural beat",
    description: "Generate an astrology-tuned binaural beat",
    menuGroup: "more",
    implemented: false,
    requiresBirthData: false,
  },
] as const

const featureMap = new Map(
  ORACLE_FEATURES.map((feature) => [feature.key, feature]),
)

export function getOracleFeature(
  featureKey?: string | null,
): OracleFeatureDefinition | null {
  if (!featureKey) {
    return null
  }

  return featureMap.get(featureKey as OracleFeatureKey) ?? null
}

export function isOracleFeatureKey(value?: string | null): value is OracleFeatureKey {
  return Boolean(value && featureMap.has(value as OracleFeatureKey))
}

export function isBirthChartFeature(
  featureKey?: string | null,
): featureKey is "birth_chart_core" | "birth_chart_full" {
  return featureKey === "birth_chart_core" || featureKey === "birth_chart_full"
}

export function getFeatureDefaultPrompt(
  featureKey?: string | null,
): string {
  return getOracleFeature(featureKey)?.defaultPrompt ?? ""
}

export function isImplementedFeature(featureKey?: string | null): boolean {
  return Boolean(getOracleFeature(featureKey)?.implemented)
}

// ── Intent Classification (Implicit Feature Activation) ────────────────────

/**
 * Regex patterns that indicate the user is asking about their birth chart
 * even though they haven't explicitly selected a feature via the [+] menu.
 */
const BIRTH_CHART_INTENT_PATTERNS: RegExp[] = [
  /\b(analyze|read|interpret|explain|tell me about)\b.*\b(birth\s*chart|natal\s*chart|chart)\b/i,
  /\bmy\s*(sun|moon|ascendant|rising|venus|mars|mercury|jupiter|saturn)\b.*\b(sign|placement|house)\b/i,
  /\bwhat\b.*\bmy\s*(chart|placements|stars|birth\s*chart)\b.*\b(say|say about|show|mean|reveal|tell)\b/i,
  /\bread\s+my\s+(chart|birth\s+chart|natal\s+chart)/i,
  /\bmy\s+birth\s+chart\b/i,
  /\b(dive|deep\s*dive|go\s+deep)\s+into\s+my\s+(chart|placements|birth\s+chart)/i,
  /\bwhat\s+(does|do)\s+my\s+(chart|placements|stars)\b/i,
  /\b(analyze|read|interpret)\s+my\s+(chart|birth\s+chart|natal\s+chart)/i,
  /\b(full|deep|complete|detailed)\s+(chart|birth\s*chart|natal)\s*(analysis|reading|interpretation)/i,
]

export interface IntentClassification {
  autoFeatureKey: OracleFeatureKey | null
}

/**
 * Classify user intent from their question text to auto-activate features.
 * Returns the feature key to auto-activate, or null if no auto-activation needed.
 *
 * Conditions for auto-activation:
 * - A feature is not already active on the session
 * - The user has birth data available
 * - The question matches birth chart intent patterns
 */
export function classifyUserIntent(
  question: string,
  currentFeatureKey: string | null,
  hasBirthData: boolean,
): IntentClassification {
  // If feature already active, don't override
  if (currentFeatureKey) return { autoFeatureKey: null }
  // If user has no birth data, can't auto-activate birth chart features
  if (!hasBirthData) return { autoFeatureKey: null }

  const isBirthChartIntent = BIRTH_CHART_INTENT_PATTERNS.some((p) => p.test(question))
  if (isBirthChartIntent) return { autoFeatureKey: "birth_chart_core" }

  return { autoFeatureKey: null }
}
