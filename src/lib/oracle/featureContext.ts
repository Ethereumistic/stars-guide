import type { OracleFeatureKey, BirthChartDepth } from "./features"
import type {
  LegacyPlacement,
  StoredBirthData,
  StoredChartAspect,
  StoredChartPlanet,
} from "../birth-chart/types"
import { compositionalSigns } from "../../astrology/signs"
import type { BinauralRationale } from "../binaural-presets"

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

const TRADITIONAL_RULERS: Record<string, string> = {
  aries: "Mars",
  taurus: "Venus",
  gemini: "Mercury",
  cancer: "Moon",
  leo: "Sun",
  virgo: "Mercury",
  libra: "Venus",
  scorpio: "Mars",
  sagittarius: "Jupiter",
  capricorn: "Saturn",
  aquarius: "Saturn",
  pisces: "Jupiter",
}

function formatChartRulerLine(birthData: OracleBirthData): string | null {
  const ascendant = birthData.chart?.ascendant
  if (!ascendant) return null

  const rulerBody = TRADITIONAL_RULERS[ascendant.signId]
  if (!rulerBody) return null

  const ruler = getPlacement(birthData, rulerBody)
  if (!ruler) return `${getSignName(ascendant.signId)} rising → ${rulerBody} rules the chart (ruler placement unavailable)`

  const houseText = ruler.house === null ? "house unknown" : `House ${ruler.house}`
  return `${getSignName(ascendant.signId)} rising → ${rulerBody} rules the chart; ${rulerBody} in ${ruler.sign} (${houseText})`
}

function formatConcentrationLines(placements: PlacementSummary[]): string[] {
  const countBy = <K extends string | number>(items: PlacementSummary[], getKey: (item: PlacementSummary) => K | null) => {
    const map = new Map<K, PlacementSummary[]>()
    for (const item of items) {
      const key = getKey(item)
      if (key === null) continue
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return [...map.entries()]
      .filter(([, itemsForKey]) => itemsForKey.length >= 3)
      .sort((a, b) => b[1].length - a[1].length)
  }

  const bySign = countBy(placements.filter((p) => p.body !== "Ascendant"), (p) => p.sign)
  const byHouse = countBy(placements.filter((p) => p.body !== "Ascendant"), (p) => p.house)

  return [
    ...bySign.map(([sign, entries]) => `- ${entries.map((p) => p.body).join(", ")} in ${sign}`),
    ...byHouse.map(([house, entries]) => `- ${entries.map((p) => p.body).join(", ")} in House ${house}`),
  ]
}

function formatNodalAxisLine(birthData: OracleBirthData): string | null {
  const north = getPlacement(birthData, "North Node")
  const south = getPlacement(birthData, "South Node")
  if (!north || !south) return null

  const northHouse = north.house === null ? "house unknown" : `House ${north.house}`
  const southHouse = south.house === null ? "house unknown" : `House ${south.house}`
  return `North Node in ${north.sign} (${northHouse}) / South Node in ${south.sign} (${southHouse})`
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
    lines.push("Stored aspects, sorted by orb strength:")
    lines.push(
      ...birthData.chart.aspects
        .slice()
        .sort((a, b) => a.orb - b.orb)
        .map(formatAspectLine),
    )
  }

  const chartRuler = formatChartRulerLine(birthData)
  const concentrations = formatConcentrationLines(placements)
  const nodalAxis = formatNodalAxisLine(birthData)
  if (chartRuler || concentrations.length || nodalAxis) {
    lines.push("")
    lines.push("Deterministic synthesis helpers:")
    if (chartRuler) lines.push(`- Chart ruler: ${chartRuler}`)
    if (concentrations.length) {
      lines.push("- Concentrations / clusters:")
      lines.push(...concentrations.map((line) => `  ${line}`))
    }
    if (nodalAxis) lines.push(`- Nodal axis: ${nodalAxis}`)
  }

  lines.push("")
  lines.push("Evidence rule: every major interpretation must cite one of the placements, houses, aspects, dignities, clusters, chart-ruler facts, or nodal-axis facts above. If something is not listed here, say it is not available rather than inventing it.")
  return lines.join("\n")
}

// ── Depth-Specific Instruction Blocks ────────────────────────────────────────
// These are injected into the system prompt based on session.birthChartDepth.
// The birth DATA is the same for both depths — only instructions differ.

function getCoreDepthInstructions(): string {
  return [
    "[BIRTH CHART READING — CORE DEPTH]",
    "ROLE: You are a grounded astrology mentor translating canonical chart data into a beautiful, practical reading.",
    "RULE: Accuracy is the floor. Emotional memorability is the goal. Make the user feel a coherent inner story, not a placement list.",
    "RULE: Every major claim must cite exact chart evidence nearby: placement, house, aspect with orb, dignity, chart ruler, cluster, or nodal axis.",
    "RULE: Use non-deterministic language: may, can, often, tends to. No fate, guarantees, medical/legal/financial advice, or unsupported trauma claims.",
    "RULE: If data is absent, say it is unavailable. Never invent placements, aspects, houses, chart ruler, or MC.",
    "RULE: Keep answers concise unless the user asks for a full reading.",
    "",
    "OUTPUT STYLE:",
    "- Open with one evidence-bound synthesis sentence.",
    "- Use 2–4 named signatures when the answer is broad, e.g. The Social Spark, The Hidden Ocean, The Steady Builder.",
    "- For each signature: Evidence → lived experience → gift → watch-for → practice.",
    "- Include practical next steps: emotional care, relationship practice, work rhythm, creative/boundary practice as relevant.",
    "- Prefer beautiful plain language over jargon. Precision over purple prose.",
    "",
    "RESPONSE PATTERN FOR MAJOR CLAIMS:",
    "Because [specific evidence], you may experience [pattern]. This can become [gift] when conscious, and [shadow] when stressed. A practical integration is [action/reflection].",
    "[END BIRTH CHART READING — CORE DEPTH]",
  ].join("\n")
}

function getFullDepthInstructions(): string {
  return [
    "[BIRTH CHART READING — FULL DEPTH]",
    "ROLE: You are generating a premium, evidence-first deep chart reading in conversation.",
    "RULE: Be chart-faithful, synthesis-led, emotionally memorable, practical, and non-deterministic.",
    "RULE: Build from dominant signatures: chart ruler story, Sun/Moon/Ascendant relationship, clusters, tight aspects, angular planets, 10th-house emphasis, and nodal axis.",
    "RULE: Do not call a pattern a stellium unless explicitly defined. Prefer cluster/concentration.",
    "RULE: Do not invent MC data when only whole-sign 10th-house data is available. Say 10th-house emphasis.",
    "RULE: User context can guide emphasis only; it is not chart evidence.",
    "",
    "OUTPUT SKELETON FOR FULL READINGS:",
    "## Your Chart in One Sentence",
    "One poetic but precise sentence, immediately grounded in evidence.",
    "",
    "## The Core Myth of Your Chart",
    "Narrative synthesis using Ascendant, chart ruler, Sun, Moon, tight personal aspects, and strongest clusters.",
    "",
    "## Dominant Signatures",
    "Create 3–5 signature cards. Each must include **Evidence**, lived experience, **Gift**, **Watch for**, and **Practice**.",
    "",
    "## Inner World & Emotional Care",
    "Moon, Mercury if relevant, 12th/4th/8th themes if present, Moon aspects, dignity. Include practical care instructions.",
    "",
    "## Love, Desire & Attachment",
    "Venus, Mars, 5th/7th/8th, Moon, and relevant aspects. Include relationship needs and practices. No compatibility verdicts without synastry.",
    "",
    "## Work, Calling & Public Direction",
    "10th house, Jupiter, Saturn, Sun house, 6th house. Include ideal environments and sustainable growth strategy. No fame/wealth promises.",
    "",
    "## Growth Path",
    "Nodes and repeated growth themes. Frame as invitation, not fate.",
    "",
    "## Practices for Integration",
    "5–8 concrete practices tied to chart evidence.",
    "",
    "## Reflection Prompts",
    "5–8 non-generic prompts connected to chart themes.",
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

// ── Binaural Prescription Mode Instructions ─────────────────────────────────

/**
 * Build the system prompt injection for a deterministically-generated binaural beat.
 * This is DATA context, not instructions to produce JSON — the LLM just explains it.
 */
export function getBinauralBeatContext(params: {
  leftHz: number
  rightHz: number
  waveform: string
  noiseVolume: number
  noiseCutoff: number
  durationSeconds: number
  rationale: BinauralRationale
}): string {
  const { leftHz, rightHz, waveform, noiseVolume, noiseCutoff, durationSeconds, rationale } = params
  const minutes = Math.round(durationSeconds / 60)
  const mode = rationale.stimulationMode ?? 'binaural'

  const modeDescriptions: Record<string, string> = {
    binaural: 'Binaural — two tones via headphones, perceived phantom beat via brainstem phase-locking. Requires headphones for full effect.',
    monaural: 'Monaural — two tones mixed in mono, real acoustic amplitude modulation. Works on speakers without headphones.',
    isochronic: 'Isochronic — single tone pulsing on/off at the target frequency. Strongest cortical entrainment. Works on speakers.',
  }

  // Noise-only sessions have different context
  if (rationale.noiseType && rationale.noiseType !== 'none') {
    const noiseDescriptions: Record<string, string> = {
      white: 'White noise — equal energy across all frequencies. Bright, hissing sound ideal for masking sudden environmental noises and blocking distractions.',
      pink: 'Pink noise — equal energy per octave. Balanced, warm sound that promotes relaxation, focus, and deep sleep.',
      brown: 'Brown noise — energy drops 6 dB per octave. Deep, rumbling roar ideal for profound relaxation, sleep, and tinnitus relief.',
      grey: 'Grey noise — perceptually flat to the human ear (inverse Fletcher-Munson contour). The gold standard for masking tinnitus and treating hyperacusis. Smooth, balanced, and natural-sounding.',
      blue: 'Blue noise — power increases +3 dB per octave. Airy, bright hiss effective at masking low-frequency environmental rumbles like traffic and HVAC without adding muddy bass.',
    }
    const desc = noiseDescriptions[rationale.noiseType] ?? 'Ambient noise'

    return [
      '[BINAURAL BEAT CONTEXT]',
      'A noise-only session has been generated for the user. Integrate this naturally into your response — explain what the noise type does, why it was chosen, and how it relates to their request. You do NOT need to repeat exact Hz values; the user will see a playable card with full details. Do NOT output any JSON or prescription blocks.',
      '',
      `Intent: ${rationale.intent}`,
      `Mode: Noise-only (${rationale.noiseType} noise)`,
      `Binaural carriers: MUTED (volume = 0)`,
      `Noise type: ${rationale.noiseType}`,
      `Noise volume: ${noiseVolume.toFixed(2)}`,
      `${noiseCutoff < 20000 ? `Low-pass filter: ${noiseCutoff} Hz` : 'Full spectrum (no filter)'}`,
      `Duration: ${minutes} minutes`,
      desc,
      rationale.personalization ?? '',
      '[END BINAURAL BEAT CONTEXT]',
    ].filter(Boolean).join('\n')
  }

  // Standard binaural / monaural / isochronic session
  const modeLabel = mode === 'isochronic' ? 'Isochronic tone' : mode === 'monaural' ? 'Monaural beat' : 'Binaural beat'
  const carrierInfo = mode === 'isochronic'
    ? `Carrier: ${leftHz} Hz (pulsing)`
    : `Carrier: ${leftHz} Hz (left) / ${rightHz} Hz (right)`

  return [
    '[BINAURAL BEAT CONTEXT]',
    `A ${modeLabel} session has been generated for the user. Integrate this naturally into your response — explain what the beat does, why these frequencies were chosen, and how it relates to their request. You do NOT need to repeat exact Hz values; the user will see a playable card with full details. Do NOT output any JSON or prescription blocks.`,
    '',
    `Intent: ${rationale.intent}`,
    `Stimulation mode: ${modeLabel}`,
    modeDescriptions[mode] ?? '',
    `Band: ${rationale.beatBand} (${rationale.beatHz} Hz beat frequency)`,
    carrierInfo,
    `Waveform: ${waveform}`,
    `Noise: ${noiseVolume} volume, ${noiseCutoff} Hz cutoff`,
    `Duration: ${minutes} minutes`,
    rationale.personalization ?? '',
    '[END BINAURAL BEAT CONTEXT]',
  ].filter(Boolean).join('\n')
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

const BIRTH_ENTITY_IDS = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
  "uranus", "neptune", "pluto", "chiron", "north_node", "south_node", "ascendant",
] as const

/**
 * Select a compact canonical slice for a narrow chart question.
 * Returns the full chart when no explicit entity is named or the question is broad.
 */
export function buildQuestionRelevantBirthContext(
  question: string,
  birthData: OracleBirthData,
): { context: string; mode: "focused" | "full" } {
  const normalized = question.toLowerCase().replace(/north\s+node/g, "north_node").replace(/south\s+node/g, "south_node")
  const namedBodies = BIRTH_ENTITY_IDS.filter((id) => {
    const aliases = id === "ascendant" ? ["ascendant", "rising"] : [id, id.replace(/_/g, " ")]
    return aliases.some((alias) => new RegExp(`\\b${alias}\\b`, "i").test(normalized))
  })
  const namedSigns = compositionalSigns
    .filter((sign) => new RegExp(`\\b${sign.id}\\b`, "i").test(normalized))
    .map((sign) => sign.id)
  const namedHouses = [...normalized.matchAll(/\b(?:house\s+(\d{1,2})|(\d{1,2})(?:st|nd|rd|th)\s+house)\b/g)]
    .map((match) => Number(match[1] ?? match[2]))
    .filter((house) => house >= 1 && house <= 12)
  const explicitCount = namedBodies.length + namedSigns.length + namedHouses.length
  const broadRequest = /\b(full|whole|overall|entire|complete|big three|chart overview|birth chart report|all placements|dominant themes|life purpose)\b/i.test(question)
  if (explicitCount === 0 || explicitCount > 5 || broadRequest) {
    return { context: buildUniversalBirthContext(birthData), mode: "full" }
  }

  const placements = getAllPlacements(birthData)
  const selected = placements.filter((placement) => {
    const bodyId = placement.body.toLowerCase().replace(/ /g, "_")
    const signId = placement.sign.toLowerCase()
    return namedBodies.includes(bodyId as typeof namedBodies[number])
      || namedSigns.includes(signId)
      || (placement.house !== null && namedHouses.includes(placement.house))
  })
  const selectedBodyIds = new Set(selected.map((placement) => placement.body.toLowerCase().replace(/ /g, "_")))
  const aspects = (birthData.chart?.aspects ?? [])
    .filter((aspect) => selectedBodyIds.has(aspect.planet1) || selectedBodyIds.has(aspect.planet2))
    .sort((a, b) => a.orb - b.orb)
  const houseSignatures = (birthData.chart?.houses ?? []).filter((house) => namedHouses.includes(house.id))
  if (!selected.length && !houseSignatures.length) {
    return { context: buildUniversalBirthContext(birthData), mode: "full" }
  }

  const lines = [
    "Treat this focused slice of the stored chart as canonical truth. The durable report supplies broader context; do not invent omitted raw facts.",
    ...formatBirthHeader(birthData),
    "",
    "Question-relevant placements:",
    ...(selected.length ? selected.map(formatPlacementLine) : ["- No matching stored placement is available."]),
  ]
  if (houseSignatures.length) {
    lines.push("", "Question-relevant house signatures:", ...houseSignatures.map((house) => `- H${house.id}: ${getSignName(house.signId)}`))
  }
  if (aspects.length) {
    lines.push("", "Aspects touching the selected placements:", ...aspects.map(formatAspectLine))
  }
  const chartRuler = namedBodies.some((body) => body === "ascendant") ? formatChartRulerLine(birthData) : null
  const nodalAxis = namedBodies.some((body) => body === "north_node" || body === "south_node") ? formatNodalAxisLine(birthData) : null
  if (chartRuler || nodalAxis) {
    lines.push("", "Deterministic helpers:")
    if (chartRuler) lines.push(`- Chart ruler: ${chartRuler}`)
    if (nodalAxis) lines.push(`- Nodal axis: ${nodalAxis}`)
  }
  lines.push("", "Evidence rule: cite only the focused raw facts above or the durable report. If another raw fact is needed, say it is not in the focused slice rather than inventing it.")
  return { context: lines.join("\n"), mode: "focused" }
}
