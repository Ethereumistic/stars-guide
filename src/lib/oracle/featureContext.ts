import type { OracleFeatureKey } from "./features"
import type {
  LegacyPlacement,
  StoredBirthData,
  StoredChartAspect,
  StoredChartPlanet,
} from "../birth-chart/types"
import { compositionalSigns } from "../../astrology/signs"

export type OracleBirthData = StoredBirthData

interface PlacementSummary {
  body: string
  sign: string
  house: number | null
  longitude?: number
  retrograde?: boolean
  dignity?: string | null
}

function getSignName(signId: string): string {
  return compositionalSigns.find((sign) => sign.id === signId)?.name ?? signId
}

function getBodyLabel(id: string): string {
  return id
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function degreeInSign(longitude: number): string {
  const normalized = ((longitude % 30) + 30) % 30
  return `${normalized.toFixed(2)}°`
}

function formatBirthHeader(birthData: OracleBirthData): string[] {
  const bornAt = birthData.time
    ? `${birthData.date} at ${birthData.time}`
    : `${birthData.date} (time unavailable)`

  const location = `${birthData.location.city}, ${birthData.location.country}`
  const timezone = birthData.timezone ? ` | Timezone: ${birthData.timezone}` : ""

  return [`Birth data: ${bornAt}`, `Location: ${location}${timezone}`]
}

function legacyPlacementToSummary(placement: LegacyPlacement): PlacementSummary {
  return {
    body: placement.body,
    sign: placement.sign,
    house: Number.isFinite(placement.house) ? placement.house : null,
  }
}

function chartPlacementToSummary(planet: StoredChartPlanet): PlacementSummary {
  return {
    body: getBodyLabel(planet.id),
    sign: getSignName(planet.signId),
    house: Number.isFinite(planet.houseId) ? planet.houseId : null,
    longitude: planet.longitude,
    retrograde: planet.retrograde,
    dignity: planet.dignity,
  }
}

function getAscendantSummary(birthData: OracleBirthData): PlacementSummary | null {
  if (birthData.chart?.ascendant) {
    return {
      body: "Ascendant",
      sign: getSignName(birthData.chart.ascendant.signId),
      house: 1,
      longitude: birthData.chart.ascendant.longitude,
      retrograde: false,
      dignity: null,
    }
  }

  const legacyAscendant = birthData.placements.find((entry) => entry.body === "Ascendant")
  return legacyAscendant ? legacyPlacementToSummary(legacyAscendant) : null
}

function getPlacement(birthData: OracleBirthData, body: string): PlacementSummary | null {
  if (body === "Ascendant") {
    return getAscendantSummary(birthData)
  }

  if (birthData.chart) {
    const id = body.toLowerCase().replace(/ /g, "_")
    const planet = birthData.chart.planets.find((entry) => entry.id === id)
    if (planet) {
      return chartPlacementToSummary(planet)
    }
  }

  const placement = birthData.placements.find((entry) => entry.body === body)
  return placement ? legacyPlacementToSummary(placement) : null
}

function getAllPlacements(birthData: OracleBirthData): PlacementSummary[] {
  if (!birthData.chart) {
    return birthData.placements.map(legacyPlacementToSummary)
  }

  const placements: PlacementSummary[] = []
  const ascendant = getAscendantSummary(birthData)
  if (ascendant) {
    placements.push(ascendant)
  }

  placements.push(...birthData.chart.planets.map(chartPlacementToSummary))
  return placements
}

function formatPlacementLine(placement: PlacementSummary): string {
  const houseText =
    placement.house === null ? "House unknown" : `House ${placement.house}`

  const degreeText =
    typeof placement.longitude === "number"
      ? ` ${degreeInSign(placement.longitude)}`
      : ""

  const motionText =
    placement.retrograde === undefined
      ? ""
      : placement.retrograde
        ? ", retrograde"
        : ", direct"

  const dignityText = placement.dignity ? `, dignity: ${placement.dignity}` : ""

  return `- ${placement.body}: ${placement.sign}${degreeText} (${houseText}${motionText}${dignityText})`
}

function formatAspectLine(aspect: StoredChartAspect): string {
  return `- ${getBodyLabel(aspect.planet1)} ${aspect.type} ${getBodyLabel(aspect.planet2)} (orb ${aspect.orb.toFixed(2)}°)`
}

function buildCoreFeatureContext(birthData: OracleBirthData): string {
  const lines = [
    "[FEATURE CONTEXT]",
    "Feature: Birth chart analysis",
    "Treat the stored chart data below as canonical truth. Do not invent different signs, houses, or aspects.",
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

  if (birthData.chart?.aspects.length) {
    lines.push("")
    lines.push("Most relevant stored aspects:")
    lines.push(
      ...birthData.chart.aspects
        .slice()
        .sort((a, b) => a.orb - b.orb)
        .slice(0, 4)
        .map(formatAspectLine),
    )
  }

  lines.push("")
  lines.push(
    "Reading scope: Focus on personality, emotional nature, outward style, and how the houses shape expression.",
  )
  lines.push("[END FEATURE CONTEXT]")

  return lines.join("\n")
}

function buildFullFeatureContext(birthData: OracleBirthData): string {
  const lines = [
    "[FEATURE CONTEXT]",
    "Feature: Deep birth chart analysis",
    "Treat the stored chart data below as canonical truth. Do not override it with model guesses.",
    "Prioritize a deeper synthesis of the full natal chart, with special attention to repeated themes, clusters, houses, aspects, nodes, and Part of Fortune when present.",
    ...formatBirthHeader(birthData),
    "",
    "Canonical stored placements:",
  ]

  const placements = getAllPlacements(birthData)

  if (placements.length === 0) {
    lines.push("- No placements were stored for this user.")
  } else {
    lines.push(...placements.map(formatPlacementLine))
  }

  if (birthData.chart?.houses.length) {
    lines.push("")
    lines.push("House signatures:")
    lines.push(
      birthData.chart.houses
        .map((house) => `H${house.id}:${getSignName(house.signId)}`)
        .join(" | "),
    )
  }

  if (birthData.chart?.aspects.length) {
    lines.push("")
    lines.push("Stored aspects:")
    lines.push(
      ...birthData.chart.aspects
        .slice()
        .sort((a, b) => a.orb - b.orb)
        .slice(0, 8)
        .map(formatAspectLine),
    )
  }

  lines.push("")
  lines.push(
    "Reading scope: give a layered interpretation of the full chart while staying anchored to the stored placements, houses, and aspects above.",
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

