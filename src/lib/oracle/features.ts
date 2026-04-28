export const ORACLE_FEATURE_KEYS = [
  "attach_files",
  "birth_chart",
  "synastry_core",
  "synastry_full",
  "sign_card_image",
  "binaural_beat",
  "journal_recall",
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
  requiresJournalConsent?: boolean
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
    key: "birth_chart",
    label: "Birth chart analysis",
    shortLabel: "Birth chart",
    description: "Sun, Moon, Ascendant, and full chart synthesis",
    defaultPrompt:
      "Analyze my birth chart through my Sun, Moon, and Ascendant, including the houses they fall in.",
    menuGroup: "primary",
    implemented: true,
    requiresBirthData: true,
    fallbackInjectionText: [
      "[BIRTH CHART READING — CORE DEPTH]",
      "You are performing a Birth Chart analysis.",
      "Reading instructions:",
      "- Focus on how the Big Three (Sun, Moon, Ascendant) interact as a triad — not in isolation.",
      "- Explain each house placement — the house IS the context, the sign is the style.",
      "- For aspects, prioritize the tightest orbs. Name what the aspect creates in the person's life.",
      "- Identify the primary tension or friction point and name it directly.",
      "- When you do not have specific chart data for a placement, say plainly that the data is not available.",
      "Treat the stored chart data as canonical truth. Do not invent different signs, houses, or aspects.",
      "[END BIRTH CHART READING — CORE DEPTH]",
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
  {
    key: "journal_recall",
    label: "Cosmic Recall",
    shortLabel: "Recall",
    description: "Search your journal entries for patterns tied to astrological events",
    defaultPrompt: "Look through my journal and help me find patterns",
    fallbackInjectionText: [
      "[COSMIC RECALL MODE]",
      "The user has asked you to search their journal for patterns and correlations with astrological events.",
      "Use the journal context below to identify recurring emotional themes, astrological correlations, and growth patterns.",
      "Cite specific entries by date and relate them to the astrological weather at the time.",
      "[END COSMIC RECALL MODE]",
    ].join("\n"),
    menuGroup: "primary",
    implemented: true,
    requiresBirthData: false,
    requiresJournalConsent: true,
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
): featureKey is "birth_chart" {
  return featureKey === "birth_chart"
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

export type BirthChartDepth = "core" | "full"

export interface ToolIntentResult {
  /** The tool to auto-activate, or null if no match */
  featureKey: OracleFeatureKey | null
  /** For birth_chart only: reading depth */
  depth?: BirthChartDepth
  /** Why this decision was made */
  reason: string
}

/**
 * Regex patterns for deep/full birth chart readings.
 * More specific — checked before core patterns.
 * If the user explicitly asks for "deep", "full", "all placements", specific
 * planets beyond the Big Three, houses, or aspects → classify as full depth.
 */
const BIRTH_CHART_FULL_PATTERNS: RegExp[] = [
  /\b(deep|full|complete|detailed|thorough|comprehensive|layered)\s+(analysis|reading|interpretation|dive)\s+(of\s+)?my\s+(chart|birth\s*chart|natal\s*chart)/i,
  /\b(deep\s*dive|go\s+deep|deep\s*reading)\s+(into\s+)?my\s+(chart|birth\s*chart|natal\s*chart|placements)/i,
  /\b(all\s+(my\s+)?placements|every\s+placement|full\s+natal|entire\s+chart)\b/i,
  /\b(read|analyze|interpret)\s+my\s+(entire|whole|full)\s+(chart|birth\s*chart|natal\s*chart)/i,
  /\b(venus|mars|mercury|jupiter|saturn|uranus|neptune|pluto)\s+(in\s+my\s+chart|placement|house)/i,
  /\bwhat\s+about\s+my\s+(nodes|north\s+node|south\s+node|part\s+of\s+fortune|chiron)\b/i,
  /\bmy\s+(houses|house\s+placements|house\s+signatures)\b/i,
  /\b(aspects|conjunction|trine|square|opposition|sextile)\s+in\s+my\s+chart\b/i,
  /\bsynthesize\s+my\s+(full\s+)?chart\b/i,
  /\bchart\s+ruler|dispositor|domicile|detriment|exaltation|fall\b/i,
]

/**
 * Regex patterns for core birth chart readings.
 * Broader — any mention of "my birth chart", "analyze my chart", etc.
 * Also catches requests about specific placements (Sun, Moon, Rising)
 * which don't need the full depth treatment.
 */
const BIRTH_CHART_CORE_PATTERNS: RegExp[] = [
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

/**
 * Regex patterns for Cosmic Recall (journal search intent).
 * Checked before birth chart patterns because journal intent is explicit
 * ("journal", "entries", "Cosmic Recall"), preventing ambiguous queries
 * like "What did I journal about my chart?" from being misclassified as
 * a birth chart request.
 */
const JOURNAL_RECALL_PATTERNS: RegExp[] = [
  /\b(cosmic\s+recall)\b/i,
  /\brecall\s+my\s+journal\b/i,
  /\blook\s+(through|in|at)\s+my\s+journal\b/i,
  /\b(search|find|scan)\s+(through\s+)?my\s+journal\b/i,
  /\bwhat\s+did\s+i\s+(write|journal|record)\s+(about\s+)?(on\s+)?/i,
  /\b(my\s+journal\s+entries?|entries?\s+in\s+my\s+journal)\b/i,
  /\b(patterns?|themes?|recurring|trends?)\s+(in\s+)?my\s+journal\b/i,
  /\b(connect|correlate|relate)\s+my\s+journal\s+(to\s+)?(astro|astrology|transits?)\b/i,
  /\bwhat\s+was\s+i\s+(experiencing|feeling|going\s+through)\s+(based\s+on\s+)?my\s+journal\b/i,
  /\b(my\s+journal\s+says?|according\s+to\s+my\s+journal)\b/i,
  /\b(what\s+happened|what\s+did\s+i\s+do|how\s+was\s+i)\s+(on|around|last)\s+/i,
  /\b(week\s+ago|month\s+ago|last\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b.*\b(journal|felt|experienced)\b/i,
  /\b(dig\s+into|go\s+back\s+to|remember)\s+(my\s+)?(journal|entries|feelings\s+from)\b/i,
]

/**
 * Classify user intent from their question text to auto-activate features.
 *
 * Priority order:
 * 1. If a feature is already active on the session → no re-classification
 * 2. Journal recall patterns (explicit journal intent wins over broad chart intent)
 * 3. Birth chart full patterns (more specific — "deep dive", "all placements", etc.)
 * 4. Birth chart core patterns (broader — "analyze my chart", "my Sun sign", etc.)
 * 5. No match → null
 *
 * Consent gates:
 * - Birth chart requires `hasBirthData === true`
 * - Journal recall requires `hasJournalConsent === true`
 */
export function classifyOracleToolIntent(
  question: string,
  currentFeatureKey: string | null,
  hasBirthData: boolean,
  hasJournalConsent: boolean,
): ToolIntentResult {
  // If feature already active, don't override
  if (currentFeatureKey) {
    return { featureKey: null, reason: "manual" }
  }

  // 1. Journal recall — explicit journal intent wins over broad chart intent
  if (hasJournalConsent) {
    if (JOURNAL_RECALL_PATTERNS.some((p) => p.test(question))) {
      return { featureKey: "journal_recall", reason: "journal_intent" }
    }
  }

  // 2. Birth chart full — more specific patterns ("deep dive", "all placements", etc.)
  if (hasBirthData) {
    if (BIRTH_CHART_FULL_PATTERNS.some((p) => p.test(question))) {
      return { featureKey: "birth_chart", depth: "full", reason: "deep_chart_intent" }
    }

    // 3. Birth chart core — broader patterns ("analyze my chart", "my Sun sign", etc.)
    if (BIRTH_CHART_CORE_PATTERNS.some((p) => p.test(question))) {
      return { featureKey: "birth_chart", depth: "core", reason: "core_chart_intent" }
    }
  }

  // 4. No match
  return { featureKey: null, reason: "no_match" }
}

/**
 * @deprecated Use classifyOracleToolIntent instead.
 * Kept temporarily for any remaining import sites.
 */
export function classifyUserIntent(
  question: string,
  currentFeatureKey: string | null,
  hasBirthData: boolean,
): IntentClassification {
  const result = classifyOracleToolIntent(question, currentFeatureKey, hasBirthData, false)
  return { autoFeatureKey: result.featureKey }
}

export interface IntentClassification {
  autoFeatureKey: OracleFeatureKey | null
}