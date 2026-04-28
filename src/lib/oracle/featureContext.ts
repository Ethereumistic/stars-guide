import type { OracleFeatureKey, BirthChartDepth } from "./features"
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

// ── Universal Birth Context Builder ──────────────────────────────────────────
// ALWAYS returns the full chart regardless of depth.
// The instruction block (not data) controls what the AI focuses on.

export function buildUniversalBirthContext(birthData: OracleBirthData): string {
  const lines = [
    "Treat the stored chart data below as canonical truth. Do not invent different signs, houses, or aspects.",
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
        .map((h) => `H${h.id}:${getSignName(h.signId)}`)
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
  return lines.join("\n")
}

// ── Depth-Specific Instruction Blocks ────────────────────────────────────────
// These are injected into the system prompt based on session.birthChartDepth.
// The birth DATA is the same for both depths — only instructions differ.

function getCoreDepthInstructions(): string {
  return [
    "[BIRTH CHART READING — CORE DEPTH]",
    "Focus on how the Big Three (Sun, Moon, Ascendant) interact as a triad — not in isolation.",
    "Explain each house placement — the house IS the context, the sign is the style.",
    "For aspects, prioritize the tightest orbs. Name what the aspect creates in the person's life.",
    "Identify the primary tension or friction point and name it directly.",
    "Express genuine uncertainty when the chart is ambiguous.",
    "When you do not have specific chart data for a placement, say plainly that the data is not available.",
    "",
    "Output format — follow this skeleton:",
    "## 1. [Chart Ruler / Core Identity]",
    "Address the Ascendant and its ruling planet. What sign, what house, what that means for how the person shows up in the world.",
    "",
    "## 2. [The Big Three]",
    "- **Sun in [Sign] ([House]):** [2-3 sentence reading]",
    "- **Moon in [Sign] ([House]):** [2-3 sentence reading]",
    "- **Ascendant [Sign]:** [2-3 sentence reading]",
    "*How these three interact:* [1-2 sentences synthesizing the triad]",
    "",
    "## 3. [Key Aspects]",
    "For each tight-aspect (orb < 2°):",
    "- **[Aspect Name] (Orb [X]):** [What this creates in their life]",
    "",
    "## 4. [The Tension / Friction]",
    "Name the most challenging pattern. Be specific about which placements create it and how it manifests.",
    "",
    "---",
    "### Your Chart at a Glance",
    "| Placement | Sign | House | Key Theme |",
    "|---|---|---|---|",
    "| **Ascendant** | [Sign] | 1st | [Theme] |",
    "| **Sun** | [Sign] | [House] | [Theme] |",
    "| **Moon** | [Sign] | [House] | [Theme] |",
    "",
    "**The most interesting part?** [One surprising synthesis that connects placements the user might not expect to be connected.]",
    "",
    "[One closing question that invites reflection.]",
    "",
    "[END BIRTH CHART READING — CORE DEPTH]",
  ].join("\n")
}

function getFullDepthInstructions(): string {
  return [
    "[BIRTH CHART READING — FULL DEPTH]",
    "Give a layered interpretation of the full chart while staying anchored to the stored placements.",
    "Prioritize deeper synthesis: themes, clusters, houses, aspects, Nodes, Part of Fortune.",
    "Identify the primary tension AND the primary gift. Name both directly.",
    "Express genuine uncertainty when the chart is ambiguous.",
    "When you do not have specific chart data for a placement, say plainly that the data is not available.",
    "",
    "[END BIRTH CHART READING — FULL DEPTH]",
  ].join("\n")
}

/**
 * Get the instruction block for a given birth chart depth.
 * Returns the instruction text, or undefined if depth is not applicable.
 */
export function getBirthChartDepthInstructions(depth: BirthChartDepth): string {
  return depth === "full" ? getFullDepthInstructions() : getCoreDepthInstructions()
}

/**
 * Get default birth chart instructions for when no DB injection exists.
 */
export function getDefaultBirthInstructions(depth: BirthChartDepth): string {
  return getBirthChartDepthInstructions(depth)
}

// ── Legacy feature context builder ──────────────────────────────────────────
// Kept for backward compatibility with any code that still calls buildFeatureContext.
// Now delegates to the universal context builder for birth chart features.

function buildCoreFeatureContext(birthData: OracleBirthData): string {
  const instructions = getCoreDepthInstructions()
  const data = buildUniversalBirthContext(birthData)
  return `${instructions}\n\n${data}`
}

function buildFullFeatureContext(birthData: OracleBirthData): string {
  const instructions = getFullDepthInstructions()
  const data = buildUniversalBirthContext(birthData)
  return `${instructions}\n\n${data}`
}

/**
 * Build feature-specific context for legacy call sites.
 * For birth_chart features, this now returns full data + depth-appropriate instructions.
 * Handles old feature keys (birth_chart_core, birth_chart_full) for backward compat.
 * For other features, returns an empty string.
 */
export function buildFeatureContext(
  featureKey: OracleFeatureKey | string,
  birthData: OracleBirthData,
): string {
  // Handle both the new unified key and legacy keys from sessions created before v2
  if (featureKey === "birth_chart" || featureKey === "birth_chart_core") {
    return buildCoreFeatureContext(birthData)
  }
  if (featureKey === "birth_chart_full") {
    return buildFullFeatureContext(birthData)
  }
  return ""
}