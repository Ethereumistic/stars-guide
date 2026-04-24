'use client'

import React, { useMemo, useState } from "react"
import { motion } from "motion/react"
import {
  ElementType,
  ELEMENT_CONTENT,
  ELEMENT_COLORS,
  SPIDER_AXES,
  AxisName,
} from "@/astrology/elements"
import { computeSpiderScores } from "@/astrology/spiderScoring"
import { elementUIConfig } from "@/config/elements-ui"
import type { StoredBirthData } from "@/lib/birth-chart/types"
import {
  GiFlame,
  GiStonePile,
  GiTornado,
  GiWaveCrest,
  GiThirdEye,
  GiConversation,
  GiFireDash,
  GiWaterDrop,
  GiBrain,
  GiShieldImpact,
  GiButterfly,
  GiMountains,
  GiMagnet,
  GiHeartInside,
  GiCrossedSwords,
  GiWindmill,
} from "react-icons/gi"
import type { IconType } from "react-icons"
import { ChartSectionHeader } from "@/components/dashboard/chart-section-header"

// ── Config ───────────────────────────────────────────────────────────────────

interface ElementalSpiderChartProps {
  birthData: StoredBirthData
  delay?: number
}

const ELEMENT_ORDER: ElementType[] = ["Fire", "Earth", "Air", "Water"]

const ELEMENT_ICONS: Record<ElementType, IconType> = {
  Fire: GiFlame,
  Earth: GiStonePile,
  Air: GiTornado,
  Water: GiWaveCrest,
}

const AXIS_ICON_MAP: Record<string, IconType> = {
  GiThirdEye: GiThirdEye,
  GiConversation: GiConversation,
  GiFireDash: GiFireDash,
  GiWaterDrop: GiWaterDrop,
  GiBrain: GiBrain,
  GiShieldImpact: GiShieldImpact,
  GiButterfly: GiButterfly,
  GiMountains: GiMountains,
  GiMagnet: GiMagnet,
  GiHeartInside: GiHeartInside,
  GiCrossedSwords: GiCrossedSwords,
  GiWindmill: GiWindmill,
}

/**
 * Tooltip CSS transform per axis index.
 * Positions the tooltip on the OUTWARD side so it never overlaps the chart interior.
 */
const TOOLTIP_TRANSFORM: Record<number, string> = {
  0: "translate(-50%, -100%)",
  1: "translate(0, -100%)",
  2: "translate(0, -66%)",
  3: "translate(0, -50%)",
  4: "translate(0, -33%)",
  5: "translate(0, 0)",
  6: "translate(-50%, 0)",
  7: "translate(-100%, 0)",
  8: "translate(-100%, -33%)",
  9: "translate(-100%, -50%)",
  10: "translate(-100%, -66%)",
  11: "translate(-100%, -100%)",
}

// ── SVG Geometry ─────────────────────────────────────────────────────────────

function spiderPoint(
  cx: number,
  cy: number,
  radius: number,
  index: number,
  total: number = 12,
): { x: number; y: number } {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  }
}

function buildPolygonPoints(
  cx: number,
  cy: number,
  maxRadius: number,
  scores: number[],
): string {
  return scores
    .map((score, i) => {
      const r = Math.max(0, score / 100) * maxRadius
      const { x, y } = spiderPoint(cx, cy, r, i)
      return `${x},${y}`
    })
    .join(" ")
}

function buildRegularPolygon(
  cx: number,
  cy: number,
  radius: number,
  sides: number = 12,
): string {
  return Array.from({ length: sides }, (_, i) => {
    const { x, y } = spiderPoint(cx, cy, radius, i, sides)
    return `${x},${y}`
  }).join(" ")
}

// ── Tooltip data ─────────────────────────────────────────────────────────────

interface TooltipData {
  axisName: AxisName
  element: ElementType
  score: number
  description: string
  iconName: string
  index: number
}

// ── Table view ───────────────────────────────────────────────────────────────

function ArchetypeTable({
  scores,
  dominant,
}: {
  scores: number[]
  dominant: ElementType
}) {
  const tableRows = useMemo(() => {
    return SPIDER_AXES.map((axis, i) => ({
      axisName: axis.name,
      axisIcon: AXIS_ICON_MAP[axis.iconName],
      element: axis.element,
      score: scores[i],
      description: axis.description,
    }))
  }, [scores])

  const groupedByElement = useMemo(() => {
    const groups: { element: ElementType; rows: typeof tableRows }[] = []
    for (const el of ELEMENT_ORDER) {
      const rows = tableRows.filter(r => r.element === el)
      if (rows.length > 0) groups.push({ element: el, rows })
    }
    return groups
  }, [tableRows])

  return (
    <div className="w-full bg-black/50 rounded-md border border-white/10 text-white">
      <table className="w-full border-collapse font-serif" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "4rem" }} />
          <col style={{ width: "auto" }} />
          <col style={{ width: "5.5rem" }} />
        </colgroup>
        <tbody>
          {groupedByElement.map((group, groupIndex) => {
            const color = ELEMENT_COLORS[group.element]
            const ElIcon = ELEMENT_ICONS[group.element]
            const isDominant = group.element === dominant

            return (
              <React.Fragment key={group.element}>
                {group.rows.map((row, rowIndex) => {
                  const isFirst = rowIndex === 0
                  const isLastRow =
                    groupIndex === groupedByElement.length - 1 &&
                    rowIndex === group.rows.length - 1

                  return (
                    <tr
                      key={row.axisName}
                      className={`${isLastRow ? "" : "border-b border-white/[0.08]"} group hover:bg-white/[0.03] transition-colors`}
                    >
                      {isFirst && (
                        <td
                          rowSpan={group.rows.length}
                          className={`py-3 px-2 align-middle text-center border-r border-white/[0.12] ${groupIndex < groupedByElement.length - 1 ? "border-b border-white/[0.12]" : ""}`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <ElIcon size={20} style={{ color: color.stroke, opacity: isDominant ? 1 : 0.55 }} />
                            <span
                              className="text-[10px] font-mono uppercase tracking-[0.15em] leading-none"
                              style={{ color: color.stroke, opacity: isDominant ? 0.85 : 0.45 }}
                            >
                              {group.element}
                            </span>
                          </div>
                        </td>
                      )}

                      <td className={`py-2.5 pl-3 pr-2 ${isLastRow ? "" : "border-b border-white/[0.06]"}`}>
                        <div className="flex items-center gap-2">
                          <row.axisIcon
                            size={15}
                            className="shrink-0"
                            style={{ color: color.stroke, opacity: 0.7 }}
                          />
                          <span className="text-sm tracking-[0.08em] text-white group-hover:text-white transition-colors">
                            {row.axisName}
                          </span>
                        </div>
                      </td>

                      <td className={`py-2.5 pl-2 pr-3 ${isLastRow ? "" : "border-b border-white/[0.06]"}`}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${row.score}%`, backgroundColor: color.stroke, opacity: 0.75 }}
                            />
                          </div>
                          <span className="text-base font-serif text-white w-8 text-right tabular-nums">
                            {row.score}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ElementalSpiderChart({ birthData, delay = 0.3 }: ElementalSpiderChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [visualization, setVisualization] = useState<string>("both")

  const { scores, elementScores, dominant, dominantColor } = useMemo(
    () => computeSpiderScores(birthData.placements, birthData.chart),
    [birthData],
  )

  // ── Dimensions (40% bigger than original 560) ────────────────────────────
  const svgSize = 784
  const cx = svgSize / 2
  const cy = svgSize / 2
  const maxRadius = 273
  const rings = 5
  const total = birthData.placements.length
  const iconSize = 56
  const iconOffset = 39
  const iconCenterRadius = maxRadius + iconOffset

  const dominantFrameUrl = elementUIConfig[dominant].frameUrl
  const DominantElIcon = ELEMENT_ICONS[dominant]

  // Dominant color (or white if elements are close)
  const elValues = Object.values(elementScores)
  const elementsClose = Math.max(...elValues) - Math.min(...elValues) <= 10
  const polyStroke = elementsClose ? "rgba(255,255,255,0.9)" : dominantColor.stroke
  const polyFill = elementsClose ? "rgba(255,255,255,0.08)" : dominantColor.dim

  const hoveredIndex = tooltip?.index ?? null

  // ── Hover handler ─────────────────────────────────────────────────────────
  const handleHover = (index: number) => {
    const axis = SPIDER_AXES[index]
    const anchorRadius = iconCenterRadius + iconSize / 2 + 6
    const anchor = spiderPoint(cx, cy, anchorRadius, index)
    setTooltipPos({ x: anchor.x, y: anchor.y })
    setTooltip({
      axisName: axis.name,
      element: axis.element,
      score: scores[index],
      description: axis.description,
      iconName: axis.iconName,
      index,
    })
  }

  const clearHover = () => setTooltip(null)

  // ── SVG chart ─────────────────────────────────────────────────────────────
  const chartSvg = (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      className="overflow-visible"
      onMouseLeave={clearHover}
    >
      <defs>
        <filter id="glow-poly" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-dot" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Concentric rings */}
      {Array.from({ length: rings }, (_, i) => {
        const r = maxRadius * ((i + 1) / rings)
        return (
          <polygon
            key={`ring-${i}`}
            points={buildRegularPolygon(cx, cy, r)}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        )
      })}

      {/* Axis spokes — dim base */}
      {SPIDER_AXES.map((_, i) => {
        const edge = spiderPoint(cx, cy, maxRadius, i)
        return (
          <line
            key={`spoke-${i}`}
            x1={cx} y1={cy}
            x2={edge.x} y2={edge.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        )
      })}

      {/* Highlighted line — score dot → icon (only for hovered axis) */}
      {hoveredIndex !== null && (() => {
        const score = scores[hoveredIndex]
        const r = Math.max(0, (score / 100)) * maxRadius
        const dotPt = spiderPoint(cx, cy, r, hoveredIndex)
        const iconPt = spiderPoint(cx, cy, iconCenterRadius, hoveredIndex)
        const hoverColor = ELEMENT_COLORS[SPIDER_AXES[hoveredIndex].element].stroke
        return (
          <line
            x1={dotPt.x} y1={dotPt.y}
            x2={iconPt.x} y2={iconPt.y}
            stroke={hoverColor}
            strokeWidth={1.5}
            opacity={0.6}
          />
        )
      })()}

      {/* Score polygon — animated */}
      <motion.polygon
        points={buildPolygonPoints(cx, cy, maxRadius, scores)}
        fill={polyFill}
        stroke={polyStroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        filter="url(#glow-poly)"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, delay: delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* Data point dots — all in dominant element color */}
      {scores.map((score, i) => {
        const r = (score / 100) * maxRadius
        const pt = spiderPoint(cx, cy, Math.max(0, r), i)
        const isHighlighted = hoveredIndex === i
        const axisColor = ELEMENT_COLORS[SPIDER_AXES[i].element].stroke
        return (
          <motion.circle
            key={`dot-${i}`}
            cx={pt.x}
            cy={pt.y}
            r={isHighlighted ? 6 : 3.5}
            fill={axisColor}
            opacity={isHighlighted ? 1 : 0.8}
            filter={isHighlighted ? "url(#glow-dot)" : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: isHighlighted ? 1 : 0.8 }}
            transition={{ duration: 0.3 }}
            className="cursor-pointer"
            onMouseEnter={() => handleHover(i)}
            onMouseLeave={clearHover}
          />
        )
      })}

      {/* Axis icons on the outer ring */}
      {SPIDER_AXES.map((axis, i) => {
        const iconPt = spiderPoint(cx, cy, iconCenterRadius, i)
        const IconComp = AXIS_ICON_MAP[axis.iconName]
        const color = ELEMENT_COLORS[axis.element].stroke
        const isHighlighted = hoveredIndex === i
        return (
          <foreignObject
            key={`axis-icon-${i}`}
            x={iconPt.x - iconSize / 2}
            y={iconPt.y - iconSize / 2}
            width={iconSize}
            height={iconSize}
            className="cursor-pointer overflow-visible"
          >
            <motion.div
              className="flex items-center justify-center w-full h-full text-primary"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: isHighlighted ? 1 : 0.85,
                scale: isHighlighted ? 1.15 : 1,
              }}
              transition={{ duration: 0.25 }}
              onMouseEnter={() => handleHover(i)}
              onMouseLeave={clearHover}
              style={isHighlighted ? { color } : undefined}
            >
              <IconComp size={iconSize} />
            </motion.div>
          </foreignObject>
        )
      })}

      {/* Center — element frame image + icon overlay */}
      <motion.g
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: delay + 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <image
          href={dominantFrameUrl}
          x={cx - 55}
          y={cy - 55}
          width={110}
          height={110}
          opacity={0.3}
          style={{ pointerEvents: "none" }}
        />
        <foreignObject x={cx - 22} y={cy - 22} width={44} height={44}>
          <div className="flex items-center justify-center w-full h-full">
            <DominantElIcon size={32} style={{ color: dominantColor.stroke, opacity: 0.9 }} />
          </div>
        </foreignObject>
      </motion.g>
    </svg>
  )

  // ── Tooltip overlay ───────────────────────────────────────────────────────
  const tooltipOverlay = tooltip && (() => {
    const TipIcon = AXIS_ICON_MAP[tooltip.iconName]
    const color = ELEMENT_COLORS[tooltip.element]

    return (
      <div
        className="absolute z-50 pointer-events-none"
        style={{
          left: tooltipPos.x,
          top: tooltipPos.y,
          transform: TOOLTIP_TRANSFORM[tooltip.index],
        }}
      >
        <div
          className="bg-black/95 border rounded-xl px-5 py-3.5 shadow-2xl backdrop-blur-md"
          style={{ borderColor: `${color.stroke}40` }}
        >
          <div className="flex items-center gap-3 mb-2">
            <TipIcon size={20} style={{ color: color.stroke }} />
            <span className="text-[15px] font-serif text-white tracking-wide">
              {tooltip.axisName}
            </span>
          </div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="flex-1 h-[4px] bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${tooltip.score}%`, backgroundColor: color.stroke, opacity: 0.75 }}
              />
            </div>
            <span className="text-xs font-mono text-white/50 tabular-nums">
              {tooltip.score}/100
            </span>
          </div>
          <p className="text-[12px] text-white/60 leading-relaxed max-w-[240px]">
            {tooltip.description}
          </p>
        </div>
      </div>
    )
  })()

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      <ChartSectionHeader
        title="Your"
        titleAccent="Elemental Chart"
        activeVisualization={visualization}
        onVisualizationChange={setVisualization}
      />

      {visualization === "both" ? (
        <div className="grid grid-cols-7 gap-6">
          <div className="col-span-3">
            <ArchetypeTable scores={scores} dominant={dominant} />
          </div>
          <div className="col-span-4">
            <div className="relative inline-block">
              {chartSvg}
              {tooltipOverlay}
            </div>
          </div>
        </div>
      ) : visualization === "table" ? (
        <ArchetypeTable scores={scores} dominant={dominant} />
      ) : (
        <div className="w-full flex justify-center">
          <div className="relative inline-block">
            {chartSvg}
            {tooltipOverlay}
          </div>
        </div>
      )}

      {/* Dominant Principle — full-width card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: delay + 0.8 }}
        className="mt-6 relative border border-white/5 bg-black/40 rounded-2xl overflow-hidden p-8 md:p-10"
      >
        <div
          className="absolute inset-0 pointer-events-none mix-blend-screen"
          style={{ background: `radial-gradient(ellipse at 20% 50%, ${dominantColor.dim} 0%, transparent 60%)` }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">
              Dominant Principle
            </span>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          <p className="text-lg md:text-xl font-serif text-white/80 leading-relaxed max-w-3xl">
            <span style={{ color: dominantColor.stroke }}>{dominant}</span> anchors your natal architecture. {ELEMENT_CONTENT[dominant].desc}
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}