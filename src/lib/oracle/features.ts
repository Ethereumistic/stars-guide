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
 * Phase 1 patterns: Does the question express ANY birth chart intent?
 *
 * These are intentionally broad — they catch any mention of a chart
 * in a reading/analysis context. We handle common typos like
 * "brith chart" here so they aren't lost before we even get started.
 * Once chart intent is detected, we proceed to Phase 2 (depth signals)
 * to decide between core and full.
 *
 * Note: Some depth-signal phrases ALSO express chart intent on their own.
 * For example, "Venus in my chart" or "what about my nodes" are both
 * chart questions AND signals for full depth. These are included here
 * so they get caught as chart-intent first, then the same patterns
 * in DEPTH_SIGNAL_FULL_PATTERNS will also match, yielding full depth.
 */
const BIRTH_CHART_INTENT_PATTERNS: RegExp[] = [
  // Action verb + chart reference (handles word-order variations)
  /\b(analy[sz]e|read|interpret|explain|review|look\s+at|do|give\s+me|get|show|tell\s+me\s+about)\b.*\b(birth\s*chart|brith\s*chart|natal\s*chart|chart)\b/i,
  // Chart reference + action noun (reversed word order)
  /\b(birth\s*chart|brith\s*chart|natal\s*chart|natal)\b.*\b(analysis|reading|interpretation|look|overview|deep|full|detailed|in\s+depth)\b/i,
  // Possessive + chart (including bare "my chart" and typos)
  /\bmy\s+?(birth\s*chart|brith\s*chart|natal\s*chart|chart)\b/i,
  /\bread\s+my\s+(chart|birth\s*chart|natal\s*chart)/i,
  // "what does my chart..."
  /\bwhat\b.*\bmy\s*(chart|placements|stars|birth\s*chart)\b/i,
  /\bwhat\s+(does|do)\s+my\s+(chart|placements|stars)\b/i,
  // "dive/deep dive into my chart"
  /\b(dive|deep\s*dive|go\s+deep)\s+into\s+my\s+(chart|placements|birth\s*chart)/i,
  // Specific planet + chart/house/placement IS a chart question
  // Note: deliberately excludes bare "sign" — "what is my sun sign" is a horoscope
  // question, not a chart reading request. If the user wants chart analysis, they
  // say "chart", "house", "placement", or "natal".
  /\b(sun|moon|venus|mars|mercury|jupiter|saturn|uranus|neptune|pluto|ascendant|rising|nodes|north\s+node|south\s+node|chiron|part\s+of\s+fortune|midheaven)\b.*\b(chart|house|placement|natal)\b/i,
  /\b(chart|natal)\b.*\b(sun|moon|venus|mars|mercury|jupiter|saturn|uranus|neptune|pluto|ascendant|rising|nodes|chiron)\b/i,
  // Structural chart topics that inherently express chart intent
  /\b(aspects?|conjunction|trine|square|opposition|sextile)\s+(in\s+)?my\s+chart\b/i,
  /\bmy\s+(houses?|house\s+placements?|house\s+signatures?)\b/i,
  /\bwhat\s+about\s+my\s+(nodes|north\s+node|south\s+node|part\s+of\s+fortune|chiron|houses?|placements?|aspects?)\b/i,
  /\b(chart\s+ruler|dispositor|domicile|detriment|exaltation|fall\s*\b)/i,
  /\bsynthesize\s+my\s+(full\s+)?chart\b/i,
]

/**
 * Phase 2 patterns: Does the question contain depth signals for FULL?
 *
 * These are checked AFTER chart intent is detected. The key insight is
 * that depth signals can appear ANYWHERE in the question — not in a rigid
 * word order. "Analyze my chart in depth", "deep analysis of my chart",
 * "tell me about my chart in detail", "my birth chart thorough analysis"
 * — all of these express deep intent regardless of word position.
 *
 * We also include structural signals (specific planets beyond Big Three,
 * houses, aspects, nodes) that imply the user wants more than the basics.
 */
const DEPTH_SIGNAL_FULL_PATTERNS: RegExp[] = [
  // Explicit depth words ANYWHERE in the question (handles suffixed forms like "fully", "thoroughly", "detailedly")
  /\bin\s+depth\b/i,
  /\b(deep|full|full[y]|complete|detailed|detailedl[y]|thorough|thoroughl[y]|comprehensive|comprehensively|layered|in-?depth|exhaustive|extensively|extensive)\b/i,

  // Structural signals that imply beyond-Big-Three depth (also serve as chart intent)
  /\b(all\s+(my\s+)?placements|every\s+placement|entire\s+chart|whole\s+chart|full\s+natal|my\s+placements)\b/i,
  /\b(venus|mars|mercury|jupiter|saturn|uranus|neptune|pluto)\s+(in\s+my\s+)?(chart|placement|house|sign)\b/i,
  /\bwhat\s+about\s+my\s+(nodes|north\s+node|south\s+node|part\s+of\s+fortune|chiron)\b/i,
  /\bmy\s+(houses|house\s+placements|house\s+signatures|all\s+houses)\b/i,
  /\b(aspects|conjunction|trine|square|opposition|sextile)\s+(in\s+)?my\s+chart\b/i,
  /\bsynthesize\s+my\s+(full\s+)?chart\b/i,
  /\bsynthesize\b/i,
  /\b(chart\s+ruler|dispositor|domicile|detriment|exaltation|fall)\b/i,
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
 * 3. Birth chart (two-phase):
 *    Phase 1: Chart intent patterns — does the user want a chart reading at all?
 *    Phase 2: Depth signal patterns — if any depth signal found → full, else → core
 * 4. No match → null
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

  // 2 & 3. Birth chart — two-phase classification:
  //    Phase 1: Is this a chart question at all? (broad intent match)
  //    Phase 2: Does it contain depth signals? → full, otherwise → core
  //
  //    This replaces the old FULL-then-CORE tier system which failed on
  //    natural word order variations like "analyze my chart in depth"
  //    or "do a deep analysis on my birth chart".
  if (hasBirthData) {
    if (BIRTH_CHART_INTENT_PATTERNS.some((p) => p.test(question))) {
      // Chart intent detected — now check for depth signals
      if (DEPTH_SIGNAL_FULL_PATTERNS.some((p) => p.test(question))) {
        return { featureKey: "birth_chart", depth: "full", reason: "deep_chart_intent" }
      }
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