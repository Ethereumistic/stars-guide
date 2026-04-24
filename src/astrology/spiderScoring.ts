import { compositionalSigns } from "./signs"
import {
  ElementType,
  AxisName,
  SPIDER_AXES,
  ELEMENT_COLORS,
  PLANET_WEIGHTS,
  SIGN_ARCHETYPE_BONUSES,
} from "./elements"
import type { LegacyPlacement, StoredChartAspect, StoredBirthChart } from "@/lib/birth-chart/types"

// ── Step 1: Weighted element totals ──────────────────────────────────────────

function bodyToKey(body: string): string {
  return body.toLowerCase().replace(/\s+/g, "_")
}

function getWeightedElementScores(
  placements: LegacyPlacement[],
  ascendantSignId: string | undefined,
): Record<ElementType, number> {
  const scores: Record<ElementType, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 }

  for (const p of placements) {
    const key = bodyToKey(p.body)
    const weight = PLANET_WEIGHTS[key] ?? 1
    const sign = compositionalSigns.find(s => s.name === p.sign)
    if (sign) {
      scores[sign.element] += weight
    }
  }

  // Include Ascendant if not already in placements but we have signId
  if (ascendantSignId) {
    const hasAsc = placements.some(p => bodyToKey(p.body) === "ascendant")
    if (!hasAsc) {
      const sign = compositionalSigns.find(s => s.id === ascendantSignId)
      if (sign) {
        scores[sign.element] += PLANET_WEIGHTS.ascendant
      }
    }
  }

  return scores
}

// ── Step 2: Sign-specific archetype modifiers ────────────────────────────────

function getSignId(name: string): string | undefined {
  return compositionalSigns.find(s => s.name === name)?.id
}

function computeSignBonuses(
  placements: LegacyPlacement[],
  ascendantSignId: string | undefined,
): Record<AxisName, number> {
  const bonuses: Record<AxisName, number> = {} as Record<AxisName, number>

  const applySign = (signId: string, weight: number) => {
    const bonusMap = SIGN_ARCHETYPE_BONUSES[signId]
    if (!bonusMap) return
    for (const [axis, bonus] of Object.entries(bonusMap)) {
      const key = axis as AxisName
      bonuses[key] = (bonuses[key] ?? 0) + (bonus * weight) / 10
    }
  }

  for (const p of placements) {
    const key = bodyToKey(p.body)
    const weight = PLANET_WEIGHTS[key] ?? 1
    const signId = getSignId(p.sign)
    if (signId) applySign(signId, weight)
  }

  // Ascendant sign bonus if not in placements
  if (ascendantSignId) {
    const hasAsc = placements.some(p => bodyToKey(p.body) === "ascendant")
    if (!hasAsc) {
      applySign(ascendantSignId, PLANET_WEIGHTS.ascendant)
    }
  }

  return bonuses
}

// ── Step 3: Aspect bonuses ───────────────────────────────────────────────────

function computeAspectBonuses(aspects: StoredChartAspect[]): Record<AxisName, number> {
  const bonuses: Record<AxisName, number> = {} as Record<AxisName, number>

  // Helper: map planet id to its primary axes (by sign)
  // We need sign data for each planet — but aspects only have planet ids.
  // We'll boost based on aspect type's archetype associations instead.

  const add = (axis: AxisName, amount: number) => {
    bonuses[axis] = (bonuses[axis] ?? 0) + amount
  }

  for (const aspect of aspects) {
    const type = aspect.type
    if (type === "conjunction") {
      // Boost all axes — conjunction is a general amplifier
      SPIDER_AXES.forEach(axis => add(axis.name, 8 / 12))
    } else if (type === "trine") {
      SPIDER_AXES.forEach(axis => add(axis.name, 5 / 12))
    } else if (type === "sextile") {
      SPIDER_AXES.forEach(axis => add(axis.name, 3 / 12))
    } else if (type === "square") {
      add("Willpower", 4)
      add("Transformation", 4)
    } else if (type === "opposition") {
      add("Emotional Depth", 3)
      add("Adaptability", 3)
    }
  }

  return bonuses
}

// ── Step 4: Base axis scores from element totals ─────────────────────────────

function computeBaseAxisScores(elementScores: Record<ElementType, number>): Record<AxisName, number> {
  const maxEl = Math.max(...Object.values(elementScores), 1)
  const normalized: Record<ElementType, number> = {} as Record<ElementType, number>
  for (const el of Object.keys(elementScores) as ElementType[]) {
    normalized[el] = (elementScores[el] / maxEl) * 50 // base contribution scaled to ~50 max
  }

  const axisScores: Record<AxisName, number> = {} as Record<AxisName, number>
  for (const axis of SPIDER_AXES) {
    // Each axis gets its primary element's normalized score + small contributions from others
    let score = normalized[axis.element] * 1.0
    for (const el of Object.keys(normalized) as ElementType[]) {
      if (el !== axis.element) {
        score += normalized[el] * 0.15
      }
    }
    axisScores[axis.name] = score
  }

  return axisScores
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface SpiderScores {
  /** Scores 0-100 for each of the 12 axes, in SPIDER_AXES order */
  scores: number[]
  /** Normalized element totals 0-100 */
  elementScores: Record<ElementType, number>
  /** Dominant element */
  dominant: ElementType
  /** Dominant element color config */
  dominantColor: { stroke: string; glow: string; dim: string }
}

export function computeSpiderScores(
  placements: LegacyPlacement[],
  chart?: StoredBirthChart,
): SpiderScores {
  const ascendantSignId = chart?.ascendant?.signId
  const aspects = chart?.aspects ?? []

  // Step 1: Element weights
  const rawElementScores = getWeightedElementScores(placements, ascendantSignId)
  const maxEl = Math.max(...Object.values(rawElementScores), 1)
  const elementScores: Record<ElementType, number> = {} as Record<ElementType, number>
  for (const el of Object.keys(rawElementScores) as ElementType[]) {
    elementScores[el] = Math.round((rawElementScores[el] / maxEl) * 100)
  }

  // Dominant
  const dominant = (Object.entries(rawElementScores) as [ElementType, number][])
    .sort((a, b) => b[1] - a[1])[0][0]

  // Step 2: Base axis scores from elements
  const baseScores = computeBaseAxisScores(rawElementScores)

  // Step 3: Sign-specific bonuses
  const signBonuses = computeSignBonuses(placements, ascendantSignId)

  // Step 4: Aspect bonuses
  const aspectBonuses = computeAspectBonuses(aspects)

  // Combine
  const rawAxis: number[] = SPIDER_AXES.map(axis => {
    const base = baseScores[axis.name] ?? 0
    const sign = signBonuses[axis.name] ?? 0
    const aspect = aspectBonuses[axis.name] ?? 0
    return base + sign + aspect
  })

  // Normalize to 0-100
  const maxAxis = Math.max(...rawAxis, 1)
  const scores = rawAxis.map(v => Math.round((v / maxAxis) * 100))

  return {
    scores,
    elementScores,
    dominant,
    dominantColor: ELEMENT_COLORS[dominant],
  }
}
