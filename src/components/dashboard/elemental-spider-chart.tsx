'use client'

import React, { useMemo, useState, useEffect, useRef } from "react"
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
 * OUTWARD: positions the tooltip on the OUTER side so it never overlaps the chart interior (desktop).
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

/**
 * INWARD: positions the tooltip toward the chart CENTER so it stays inside on mobile.
 */
const TOOLTIP_TRANSFORM_INWARD: Record<number, string> = {
  0: "translate(-50%, 10px)",
  1: "translate(-100%, 6px)",
  2: "translate(-100%, -25%)",
  3: "translate(-100%, -50%)",
  4: "translate(-100%, -75%)",
  5: "translate(-110%, -100%)",
  6: "translate(-50%, -110%)",
  7: "translate(10px, -110%)",
  8: "translate(10px, -75%)",
  9: "translate(10px, -50%)",
  10: "translate(10px, -25%)",
  11: "translate(10px, 6px)",
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
  isMobile,
}: {
  scores: number[]
  dominant: ElementType
  isMobile: boolean
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
    <div className="w-full max-w-xl mx-auto bg-black/50 rounded-md border border-white/10 text-white/90">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-serif" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: isMobile ? "28%" : "8rem" }} />
            <col />
            <col style={{ width: isMobile ? "5rem" : "5rem" }} />
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
                      <tr key={row.axisName} className={isLastRow ? "" : "border-b border-white/[0.04]"}>
                        {/* ── ELEMENT COLUMN ── (rowspan) icon + name, horizontal */}
                        {isFirst && (
                          <td
                            rowSpan={group.rows.length}
                            className={`${isMobile ? "py-2 pl-3 pr-1" : "py-2 pl-6 pr-2"} align-middle border-r border-white/[0.08] ${groupIndex < groupedByElement.length - 1 ? "border-b border-white/[0.08]" : ""}`}
                          >
                            <div className="flex items-center gap-1">
                              <ElIcon
                                className={`${isMobile ? "size-4" : "size-5"} shrink-0`}
                                style={{ color: color.stroke, opacity: isDominant ? 1 : 0.55 }}
                              />
                              <span
                                className={`${isMobile ? "text-xs" : "text-sm"} tracking-[0.12em] font-serif text-white`}
                                style={{ color: color.stroke, opacity: isDominant ? 1 : 0.55 }}
                              >
                                {group.element}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* ── AXIS: Icon + Name ── */}
                        <td className={`${isMobile ? "py-1.5 pl-2 pr-1" : "py-1.5 pl-2 pr-1"} ${isLastRow ? "" : "border-b border-white/[0.03]"}`}>
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <row.axisIcon
                              size={isMobile ? 16 : 20}
                              className="shrink-0"
                              style={{ color: color.stroke, opacity: 0.7 }}
                            />
                            <span className={`${isMobile ? "text-xs" : "text-sm"} tracking-[0.08em] uppercase font-serif text-white`}>
                              {row.axisName}
                            </span>
                          </div>
                        </td>

                        {/* ── SCORE BAR ── */}
                        <td
                          className={`${isMobile ? "py-1.5 pl-1 pr-2" : "py-2 pl-2 pr-2"} align-middle border-l border-white/[0.08] ${!isLastRow ? "border-b border-white/[0.08]" : ""}`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`${isMobile ? "text-xs" : "text-base"} font-serif text-white tabular-nums`}>
                              {row.score}
                            </span>
                            <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${row.score}%`, backgroundColor: color.stroke, opacity: 0.75 }}
                              />
                            </div>
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
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ElementalSpiderChart({ birthData, delay = 0.3 }: ElementalSpiderChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [visualization, setVisualization] = useState<string>("table")

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Track the SVG's actual rendered size so tooltip positions scale correctly
  const svgRef = useRef<SVGSVGElement>(null)
  const [svgScale, setSvgScale] = useState(1)
  useEffect(() => {
    const updateScale = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect()
        setSvgScale(rect.width / SVG_SIZE)
      }
    }
    updateScale()
    const observer = new ResizeObserver(updateScale)
    if (svgRef.current) observer.observe(svgRef.current)
    window.addEventListener("resize", updateScale)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateScale)
    }
  }, [])

  const { scores, elementScores, dominant, dominantColor } = useMemo(
    () => computeSpiderScores(birthData.placements, birthData.chart),
    [birthData],
  )

  // ── Dimensions (all in viewBox coordinate space) ────────────────────────────
  const SVG_SIZE = 666
  const CX = SVG_SIZE / 2
  const CY = SVG_SIZE / 2
  const MAX_RADIUS = 232
  const ICON_SIZE = 48
  const ICON_OFFSET = 33
  const ICON_CENTER_RADIUS = MAX_RADIUS + ICON_OFFSET

  const dominantFrameUrl = elementUIConfig[dominant].frameUrl
  const DominantElIcon = ELEMENT_ICONS[dominant]

  // Inward anchor radius for mobile tooltips (inside the chart polygon)
  const MOBILE_ANCHOR_RADIUS = MAX_RADIUS * 0.82

  // Dominant color (or white if elements are close)
  const elValues = Object.values(elementScores)
  const elementsClose = Math.max(...elValues) - Math.min(...elValues) <= 10
  const polyStroke = elementsClose ? "rgba(255,255,255,0.9)" : dominantColor.stroke
  const polyFill = elementsClose ? "rgba(255,255,255,0.08)" : dominantColor.dim

  const hoveredIndex = tooltip?.index ?? null

  // ── Hover handler ─────────────────────────────────────────────────────────
  const handleHover = (index: number) => {
    const axis = SPIDER_AXES[index]
    // Desktop: anchor outside icons; Mobile: anchor inside chart for inward tooltips
    const anchorRadius = isMobile
      ? MOBILE_ANCHOR_RADIUS
      : ICON_CENTER_RADIUS + ICON_SIZE / 2 + 6
    const anchor = spiderPoint(CX, CY, anchorRadius, index)
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
      ref={svgRef}
      viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
      className="w-full h-auto overflow-visible"
      style={{ maxWidth: SVG_SIZE }}
      onMouseLeave={clearHover}
    >
      <defs>
        <filter id="glow-poly" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={8} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-dot" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation={4} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Concentric rings */}
      {Array.from({ length: 5 }, (_, i) => {
        const r = MAX_RADIUS * ((i + 1) / 5)
        return (
          <polygon
            key={`ring-${i}`}
            points={buildRegularPolygon(CX, CY, r)}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        )
      })}

      {/* Axis spokes — dim base */}
      {SPIDER_AXES.map((_, i) => {
        const edge = spiderPoint(CX, CY, MAX_RADIUS, i)
        return (
          <line
            key={`spoke-${i}`}
            x1={CX} y1={CY}
            x2={edge.x} y2={edge.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        )
      })}

      {/* Highlighted line — score dot → icon (only for hovered axis) */}
      {hoveredIndex !== null && (() => {
        const score = scores[hoveredIndex]
        const r = Math.max(0, (score / 100)) * MAX_RADIUS
        const dotPt = spiderPoint(CX, CY, r, hoveredIndex)
        const iconPt = spiderPoint(CX, CY, ICON_CENTER_RADIUS, hoveredIndex)
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
        points={buildPolygonPoints(CX, CY, MAX_RADIUS, scores)}
        fill={polyFill}
        stroke={polyStroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        filter="url(#glow-poly)"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, delay: delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: `${CX}px ${CY}px` }}
      />

      {/* Data point dots — all in dominant element color */}
      {scores.map((score, i) => {
        const r = (score / 100) * MAX_RADIUS
        const pt = spiderPoint(CX, CY, Math.max(0, r), i)
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

      {/* Axis icons on the outer ring — native SVG for correct mobile scaling */}
      {SPIDER_AXES.map((axis, i) => {
        const iconPt = spiderPoint(CX, CY, ICON_CENTER_RADIUS, i)
        const IconComp = AXIS_ICON_MAP[axis.iconName]
        const color = ELEMENT_COLORS[axis.element].stroke
        const isHighlighted = hoveredIndex === i
        return (
          <motion.g
            key={`axis-icon-${i}`}
            style={{ transformOrigin: `${iconPt.x}px ${iconPt.y}px` }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: isHighlighted ? 1 : 0.85,
              scale: isHighlighted ? 1.2 : 1,
            }}
            transition={{ duration: 0.25 }}
            className="cursor-pointer"
            onMouseEnter={() => handleHover(i)}
            onMouseLeave={clearHover}
          >
            {/* Hit area for touch/mouse interaction */}
            <circle
              cx={iconPt.x}
              cy={iconPt.y}
              r={ICON_SIZE / 2 + 6}
              fill="transparent"
            />
            {/* Icon as native SVG — scales correctly on all devices */}
            <g
              transform={`translate(${iconPt.x - ICON_SIZE / 2}, ${iconPt.y - ICON_SIZE / 2})`}
              style={{ color: isHighlighted ? color : 'var(--primary)' }}
            >
              <IconComp size={ICON_SIZE} />
            </g>
          </motion.g>
        )
      })}

      {/* Center — element frame image + icon overlay */}
      <motion.g
        style={{ transformOrigin: `${CX}px ${CY}px` }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: delay + 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <image
          href={dominantFrameUrl}
          x={CX - 47}
          y={CY - 47}
          width={94}
          height={94}
          opacity={0.3}
          style={{ pointerEvents: "none" }}
        />
        {/* Center icon as native SVG — scales correctly on all devices */}
        <g transform={`translate(${CX - 13.5}, ${CY - 13.5})`}>
          <DominantElIcon size={27} style={{ color: dominantColor.stroke, opacity: 0.9 }} />
        </g>
      </motion.g>
    </svg>
  )

  // ── Tooltip overlay ───────────────────────────────────────────────────────
  const tooltipOverlay = tooltip && (() => {
    const TipIcon = AXIS_ICON_MAP[tooltip.iconName]
    const color = ELEMENT_COLORS[tooltip.element]
    // Scale tooltip position from viewBox coords to rendered pixels
    const displayX = tooltipPos.x * svgScale
    const displayY = tooltipPos.y * svgScale
    const currentTransform = isMobile
      ? TOOLTIP_TRANSFORM_INWARD[tooltip.index]
      : TOOLTIP_TRANSFORM[tooltip.index]

    if (isMobile) {
      // Compact tooltip for mobile — points inward toward chart center
      return (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: displayX,
            top: displayY,
            transform: currentTransform,
          }}
        >
          <div
            className="bg-black/95 border rounded-lg px-3 py-2 shadow-2xl backdrop-blur-md"
            style={{ borderColor: `${color.stroke}40` }}
          >
            <div className="flex items-center gap-2">
              <TipIcon size={14} style={{ color: color.stroke }} />
              <span className="text-xs font-serif text-white tracking-wide">
                {tooltip.axisName}
              </span>
              <span className="text-[10px] font-mono text-white/50 tabular-nums">
                {tooltip.score}
              </span>
            </div>
            <div className="mt-1 h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${tooltip.score}%`, backgroundColor: color.stroke, opacity: 0.75 }}
              />
            </div>
          </div>
        </div>
      )
    }

    // Full tooltip for desktop (outward positioning)
    return (
      <div
        className="absolute z-50 pointer-events-none"
        style={{
          left: displayX,
          top: displayY,
          transform: currentTransform,
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
        title="Elemental"
        titleAccent="Chart"
        activeVisualization={visualization}
        onVisualizationChange={setVisualization}
      />

      {visualization === "table" ? (
        <ArchetypeTable scores={scores} dominant={dominant} isMobile={isMobile} />
      ) : (
        <div className="w-full flex justify-center">
          <div className="relative w-full" style={{ maxWidth: SVG_SIZE }}>
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