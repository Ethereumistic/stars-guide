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
import { TbHexagon } from "react-icons/tb"
import type { IconType } from "react-icons"

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

// ── SVG Geometry Helpers ─────────────────────────────────────────────────────

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

// ── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipData {
  axisName: AxisName
  element: ElementType
  score: number
  description: string
  iconName: string
  /** Axis index — used to compute outward tooltip position */
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
    <div className="w-full bg-black/50 rounded-md border border-white/10 text-white/90 overflow-hidden">
      <table className="w-full border-collapse font-serif" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "3.5rem" }} />
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
                      className={`${isLastRow ? "" : "border-b border-white/[0.04]"} group hover:bg-white/[0.02] transition-colors`}
                    >
                      {isFirst && (
                        <td
                          rowSpan={group.rows.length}
                          className={`py-3 px-2 align-middle text-center border-r border-white/[0.08] ${groupIndex < groupedByElement.length - 1 ? "border-b border-white/[0.08]" : ""}`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <ElIcon size={18} style={{ color: color.stroke, opacity: isDominant ? 1 : 0.5 }} />
                            <span
                              className="text-[9px] font-mono uppercase tracking-[0.15em] leading-none"
                              style={{ color: color.stroke, opacity: isDominant ? 0.8 : 0.4 }}
                            >
                              {group.element}
                            </span>
                          </div>
                        </td>
                      )}

                      <td className={`py-2.5 pl-3 pr-2 ${isLastRow ? "" : "border-b border-white/[0.03]"}`}>
                        <div className="flex items-center gap-2">
                          <row.axisIcon
                            size={13}
                            className="shrink-0"
                            style={{ color: color.stroke, opacity: 0.65 }}
                          />
                          <span className="text-[13px] tracking-[0.06em] text-white/80 group-hover:text-white transition-colors">
                            {row.axisName}
                          </span>
                        </div>
                      </td>

                      <td className={`py-2.5 pl-2 pr-3 ${isLastRow ? "" : "border-b border-white/[0.03]"}`}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${row.score}%`, backgroundColor: color.stroke, opacity: 0.7 }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-white/35 w-7 text-right tabular-nums">
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

  const { scores, elementScores, dominant, dominantColor } = useMemo(
    () => computeSpiderScores(birthData.placements, birthData.chart),
    [birthData],
  )

  // SVG dimensions
  const svgSize = 460
  const cx = svgSize / 2
  const cy = svgSize / 2
  const maxRadius = 160
  const labelRadius = maxRadius + 52
  const rings = 5
  const total = birthData.placements.length

  const dominantFrameUrl = elementUIConfig[dominant].frameUrl
  const DominantElIcon = ELEMENT_ICONS[dominant]

  // Check if elements are close (within 10 pts) → use white glow
  const elValues = Object.values(elementScores)
  const elMax = Math.max(...elValues)
  const elMin = Math.min(...elValues)
  const elementsClose = elMax - elMin <= 10
  const polyStroke = elementsClose ? "rgba(255,255,255,0.9)" : dominantColor.stroke
  const polyFill = elementsClose ? "rgba(255,255,255,0.08)" : dominantColor.dim

  const handleIconHover = (
    e: React.MouseEvent,
    index: number,
  ) => {
    const axis = SPIDER_AXES[index]
    const svgEl = (e.currentTarget as SVGElement).closest("svg")
    if (!svgEl) return

    // Compute tooltip position: push outward from center along the axis direction
    const outerPt = spiderPoint(cx, cy, maxRadius + 55, index)
    setTooltipPos({ x: outerPt.x, y: outerPt.y })
    setTooltip({
      axisName: axis.name,
      element: axis.element,
      score: scores[index],
      description: axis.description,
      iconName: axis.iconName,
      index,
    })
  }

  // ── Shared SVG content (circle chart) ────────────────────────────────────
  const chartSvg = (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      className="overflow-visible"
      onMouseLeave={() => setTooltip(null)}
    >
      <defs>
        <filter id="glow-poly" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-web" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
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

      {/* Axis spokes */}
      {SPIDER_AXES.map((_, i) => {
        const edge = spiderPoint(cx, cy, maxRadius, i)
        return (
          <line
            key={`spoke-${i}`}
            x1={cx} y1={cy}
            x2={edge.x} y2={edge.y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        )
      })}

      {/* Axis icons on the outer ring */}
      {SPIDER_AXES.map((axis, i) => {
        const iconPt = spiderPoint(cx, cy, maxRadius + 18, i)
        const IconComp = AXIS_ICON_MAP[axis.iconName]
        const color = ELEMENT_COLORS[axis.element].stroke
        const iconSize = 32
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
              className="flex items-center justify-center w-full h-full"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.9, scale: 1 }}
              transition={{ duration: 0.4, delay: delay + 0.08 * i }}
              onMouseEnter={(e) => handleIconHover(e as unknown as React.MouseEvent, i)}
              onMouseLeave={() => setTooltip(null)}
              style={{ color }}
            >
              <IconComp size={iconSize} />
            </motion.div>
          </foreignObject>
        )
      })
      }
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

      {/* Data point dots on polygon vertices */}
      {scores.map((score, i) => {
        const r = (score / 100) * maxRadius
        const pt = spiderPoint(cx, cy, Math.max(0, r), i)
        const color = ELEMENT_COLORS[SPIDER_AXES[i].element].stroke
        return (
          <motion.circle
            key={`dot-${i}`}
            cx={pt.x}
            cy={pt.y}
            r={3}
            fill={color}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: delay + 1.0 }}
            className="cursor-pointer"
            onMouseEnter={(e) => handleIconHover(e, i)}
            onMouseLeave={() => setTooltip(null)}
          />
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
          x={cx - 48}
          y={cy - 48}
          width={96}
          height={96}
          opacity={0.35}
          style={{ pointerEvents: "none" }}
        />
        <foreignObject x={cx - 20} y={cy - 20} width={40} height={40}>
          <div className="flex items-center justify-center w-full h-full">
            <DominantElIcon size={28} style={{ color: dominantColor.stroke, opacity: 0.9 }} />
          </div>
        </foreignObject>
      </motion.g>
    </svg>
  )

  // ── Shared tooltip ───────────────────────────────────────────────────────
  const tooltipOverlay = tooltip && (() => {
    const TipIcon = AXIS_ICON_MAP[tooltip.iconName]
    const color = ELEMENT_COLORS[tooltip.element]

    // Determine alignment: which quadrant is the axis in?
    const angle = (tooltip.index / 12) * 360
    const isRight = angle > 315 || angle <= 45
    const isBottom = angle > 45 && angle <= 135
    const isLeft = angle > 135 && angle <= 225
    // const isTop = angle > 225 && angle <= 315

    // Position outward: anchor the tooltip on the side opposite the center
    let xAlign: React.CSSProperties = {}
    if (isRight) xAlign = { transform: "translateX(12px)" }
    else if (isLeft) xAlign = { transform: "translateX(calc(-100% - 12px))" }
    else xAlign = { transform: "translateX(-50%)" } // top/bottom → center horizontally

    return (
      <div
        className="absolute z-50 pointer-events-none"
        style={{
          left: tooltipPos.x,
          top: tooltipPos.y,
          ...xAlign,
        }}
      >
        <div className="bg-black/95 border rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md"
          style={{ borderColor: `${color.stroke}30` }}
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <TipIcon size={18} style={{ color: color.stroke }} />
            <span className="text-sm font-serif text-white tracking-wide">{tooltip.axisName}</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${tooltip.score}%`, backgroundColor: color.stroke, opacity: 0.7 }} />
            </div>
            <span className="text-xs font-mono text-white/50 tabular-nums">{tooltip.score}/100</span>
          </div>
          <p className="text-[11px] text-white/55 leading-relaxed max-w-[220px]">{tooltip.description}</p>
        </div>
      </div>
    )
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <TbHexagon className="w-6 h-6 text-white/40" />
        <h2 className="text-xl md:text-2xl font-serif text-white tracking-wide">
          Elemental Archetype Profile
        </h2>
        <div className="ml-auto font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
          {total} Celestial Bodies
        </div>
      </div>

      {/* ── xl+: side-by-side layout — table 3 cols, circle 4 cols ── */}
      <div className="hidden xl:grid grid-cols-7 gap-6 items-start">
        <div className="col-span-3">
          <h3 className="font-serif text-white text-center mb-3">
            Table{" "}
            <span className="text-primary">Elemental Chart</span>
          </h3>
          <ArchetypeTable scores={scores} dominant={dominant} />
        </div>
        <div className="col-span-4 flex flex-col">
          <h3 className="font-serif text-white text-center mb-3">
            Circle{" "}
            <span className="text-primary">Elemental Chart</span>
          </h3>
          <div className="w-full flex justify-center relative">
            {chartSvg}
            {tooltipOverlay}
          </div>
        </div>
      </div>

      {/* ── Below xl: stacked layout ── */}
      <div className="xl:hidden space-y-6">
        <div>
          <h3 className="font-serif text-white text-center mb-3">
            Circle{" "}
            <span className="text-primary">Elemental Chart</span>
          </h3>
          <div className="w-full flex justify-center relative">
            {chartSvg}
            {tooltipOverlay}
          </div>
        </div>
        <div>
          <h3 className="font-serif text-white text-center mb-3">
            Table{" "}
            <span className="text-primary">Elemental Chart</span>
          </h3>
          <ArchetypeTable scores={scores} dominant={dominant} />
        </div>
      </div>

      {/* ── Dominant Principle — separate card, full width ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: delay + 0.8 }}
        className="mt-6 relative border border-white/5 bg-black/40 rounded-2xl overflow-hidden p-8 md:p-10"
      >
        {/* Ambient glow */}
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
