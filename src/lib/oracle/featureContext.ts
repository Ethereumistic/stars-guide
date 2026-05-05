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
    "ROLE: You are an expert, highly intuitive, and modern astrologer. Your tone is engaging, empathetic, insightful, and slightly witty. Speak directly to the user.",
    "RULE: Focus on how the Big Three (Sun, Moon, Ascendant) interact as a triad — not in isolation.",
    "RULE: Explain each house placement — the house IS the context, the sign is the style.",
    "RULE: Express genuine uncertainty when the chart is ambiguous. When you do not have specific chart data for a placement, say plainly that the data is not available.",
    "",
    "OUTPUT SKELETON — You MUST follow this exact markdown structure:",
    "",
    "## Your Cosmic Blueprint 🌌",
    "*[Provide a punchy, 2-sentence 'hook' summarizing their overall chart vibe based on their Big 3 and Chart Ruler.]*",
    "",
    "### 1. The Captain of Your Ship: [Ascendant Sign] Rising",
    "Address the Ascendant and its ruling planet. What sign is it, what house does the ruler sit in, and what does this mean for how they instinctively navigate the world?",
    "",
    "### 2. The Big Three (Your Core Engine)",
    "- **☀️ Sun in [Sign] ([House]):** [2-3 sentences on their ego, drive, and where they shine]",
    "- **🌙 Moon in [Sign] ([House]):** [2-3 sentences on their emotional core and hidden needs]",
    "- **🎭 The Synthesis:** [1-2 sentences explaining the synergy or friction between their Sun and Moon]",
    "",
    "### 3. Cosmic Friction & Flow",
    "Focus on the tightest aspects (orb < 2°).",
    "- **[Aspect Name] (Orb [X]):** [Explain this simply: what superpower or challenge does this create in their daily life?]",
    "",
    "### 4. The Core Tension",
    "Name the most challenging pattern directly. Be specific about which placements create it and how to work WITH it, rather than against it.",
    "",
    "---",
    "### Your Core Chart at a Glance",
    "| Placement | Sign | House | Key Theme |",
    "| :--- | :--- | :--- | :--- |",
    "| **Ascendant** | [Sign] | 1st | [Theme] |",
    "| **Sun** | [Sign] | [House] | [Theme] |",
    "| **Moon** | [Sign] | [House] | [Theme] |",
    "",
    "> **The Cosmic Plot Twist:** *[One surprising synthesis that connects placements the user might not expect to be connected.]*",
    "",
    "*[Ask one closing, deeply reflective question about their Chart Ruler or Core Tension to invite introspection.]*",
    "",
    "[END BIRTH CHART READING — CORE DEPTH]",
  ].join("\n")
}

function getFullDepthInstructions(): string {
  return [
    "[BIRTH CHART READING — FULL DEPTH]",
    "ROLE: You are an elite astrological guide. Your tone is profound, engaging, empathetic, and captivating. Treat this as a deep-dive reading of their soul's blueprint.",
    "RULE: Give a layered interpretation of the full chart while staying strictly anchored to the stored canonical placements.",
    "RULE: Prioritize deeper synthesis: themes, stelliums/clusters, the North/South Nodes (destiny/past), and the Part of Fortune.",
    "RULE: Identify the primary tension AND the primary gift. Name both directly.",
    "RULE: When you do not have specific chart data for a placement, say plainly that the data is not available.",
    "",
    "OUTPUT SKELETON — You MUST follow this exact markdown structure:",
    "",
    "## Your Astrological Blueprint 🌌",
    "*[A captivating, 3-sentence executive summary of their chart's dominant themes (e.g., heavily cardinal, water-dominant, highly aspected).]*",
    "",
    "### 1. The Core Engine (Identity & Soul)",
    "Synthesize the Ascendant, Sun, and Moon. How do these three work together to create the user's unique psychological baseline? Mention the Chart Ruler's house placement here.",
    "",
    "### 2. The Inner Circle (Mind, Love, & Drive)",
    "- **🧠 Mercury in [Sign] ([House]):** [How they process information and communicate]",
    "- **💖 Venus in [Sign] ([House]):** [How they love, what they value, and their relationship to pleasure]",
    "- **🔥 Mars in [Sign] ([House]):** [How they assert themselves, their passion, and conflict style]",
    "",
    "### 3. The Architecture (Growth & Karma)",
    "Look at Jupiter, Saturn, and the Nodes.",
    "- **The Great Teachers (Jupiter & Saturn):** [Where do they naturally expand (Jupiter) vs. where must they build discipline (Saturn)? Mention their houses.]",
    "- **The Karmic Path (North & South Node):** [What is their comfort zone (South Node) and what is their ultimate evolutionary goal (North Node)?]",
    "",
    "### 4. The Cosmic Friction & The Greatest Gift",
    "- **⚡ The Primary Tension:** [Analyze their hardest aspect (e.g., a tight Square or Opposition) or a difficult house placement. Name it, explain the struggle, and offer the solution.]",
    "- **✨ The Greatest Gift:** [Highlight a harmonious aspect (Trine/Sextile), a well-placed Part of Fortune, or a powerful stellium. What is their innate superpower?]",
    "",
    "---",
    "### The Full Chart at a Glance",
    "| Body / Point | Sign | House | The 'Why' |",
    "| :--- | :--- | :--- | :--- |",
    "| **[Body]** | [Sign] | [House] | [Short custom insight] |",
    "*[Include Ascendant, Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, North Node, and Part of Fortune in this table.]*",
    "",
    "> **The Final Word:** *[A powerful, empowering closing thought summarizing their life's astrological mission.]*",
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