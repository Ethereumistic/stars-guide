import type { OracleFeatureKey } from "./features"

export interface OracleBirthData {
  date: string
  time?: string
  location: {
    lat: number
    long: number
    city: string
    country: string
  }
  placements: Array<{
    body: string
    sign: string
    house: number
  }>
}

interface PlacementSummary {
  body: string
  sign: string
  house: number | null
}

function formatBirthHeader(birthData: OracleBirthData): string[] {
  const bornAt = birthData.time
    ? `${birthData.date} at ${birthData.time}`
    : `${birthData.date} (time unavailable)`

  return [
    `Birth data: ${bornAt}`,
    `Location: ${birthData.location.city}, ${birthData.location.country}`,
  ]
}

function getPlacement(
  birthData: OracleBirthData,
  body: string,
): PlacementSummary | null {
  const placement = birthData.placements.find((entry) => entry.body === body)
  if (!placement) {
    return null
  }

  return {
    body,
    sign: placement.sign,
    house: Number.isFinite(placement.house) ? placement.house : null,
  }
}

function formatPlacementLine(placement: PlacementSummary): string {
  const houseText =
    placement.house === null ? "House unknown" : `House ${placement.house}`
  return `- ${placement.body}: ${placement.sign} (${houseText})`
}

function buildCoreFeatureContext(birthData: OracleBirthData): string {
  const lines = [
    "[FEATURE CONTEXT]",
    "Feature: Birth chart analysis",
    "Treat the stored placements below as canonical truth. Do not invent different signs or houses.",
    "Prioritize a reading of the Sun, Moon, and Ascendant, explain their houses, and synthesize how those three placements interact.",
    ...formatBirthHeader(birthData),
    "",
    "Canonical primary placements:",
  ]

  const corePlacements = ["Sun", "Moon", "Ascendant"]
    .map((body) => getPlacement(birthData, body))
    .filter((placement): placement is PlacementSummary => placement !== null)

  if (corePlacements.length === 0) {
    lines.push("- No Sun, Moon, or Ascendant placements were stored for this user.")
  } else {
    lines.push(...corePlacements.map(formatPlacementLine))
  }

  lines.push("")
  lines.push(
    "Reading scope: Focus on personality, emotional nature, outward style, and how the three houses shape expression.",
  )
  lines.push("[END FEATURE CONTEXT]")

  return lines.join("\n")
}

function buildFullFeatureContext(birthData: OracleBirthData): string {
  const lines = [
    "[FEATURE CONTEXT]",
    "Feature: Deep birth chart analysis",
    "Treat the stored placements below as canonical truth. Do not override them with model guesses.",
    "Prioritize a deeper synthesis of the full natal chart, with special attention to repeated themes, clusters, and how the houses shape the story.",
    ...formatBirthHeader(birthData),
    "",
    "Canonical stored placements:",
  ]

  if (birthData.placements.length === 0) {
    lines.push("- No placements were stored for this user.")
  } else {
    lines.push(
      ...birthData.placements.map((placement) =>
        formatPlacementLine({
          body: placement.body,
          sign: placement.sign,
          house: Number.isFinite(placement.house) ? placement.house : null,
        }),
      ),
    )
  }

  lines.push("")
  lines.push(
    "Computed enrichment status: unavailable in this build, so rely on the canonical stored placements above.",
    "Do not invent degrees, aspects, or extra chart geometry that were not explicitly provided.",
  )
  lines.push("")
  lines.push(
    "Reading scope: give a layered interpretation of the full chart, but stay anchored to the stored placement data.",
  )
  lines.push("[END FEATURE CONTEXT]")

  return lines.join("\n")
}

export function buildFeatureContext(
  featureKey: OracleFeatureKey,
  birthData: OracleBirthData,
): string {
  switch (featureKey) {
    case "birth_chart_core":
      return buildCoreFeatureContext(birthData)
    case "birth_chart_full":
      return buildFullFeatureContext(birthData)
    default:
      return ""
  }
}
