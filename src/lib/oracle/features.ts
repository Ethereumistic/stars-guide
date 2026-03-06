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
