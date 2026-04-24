'use client'

import { useMemo, useState, type ComponentType, type SVGAttributes } from "react"
import { motion } from "motion/react"
import {
  ElementType,
  ELEMENT_CONTENT,
  ELEMENT_COLORS,
  SPIDER_AXES,
  AxisName,
} from "@/astrology/elements"
import { computeSpiderScores } from "@/astrology/spiderScoring"
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

/** Map from axis iconName string to the actual component */
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
}

// ── Component ────────────────────────────────────────────────────────────────

export function ElementalSpiderChart({ birthData, delay = 0.3 }: ElementalSpiderChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const { scores, elementScores, dominant, dominantColor } = useMemo(
    () => computeSpiderScores(birthData.placements, birthData.chart),
    [birthData],
  )

  // SVG dimensions
  const svgSize = 380
  const cx = svgSize / 2
  const cy = svgSize / 2
  const maxRadius = 130
  const labelRadius = maxRadius + 44
  const rings = 5
  const total = birthData.placements.length

  const dominantPct = elementScores[dominant]

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
    const pt = svgEl.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgP = pt.matrixTransform(svgEl.getScreenCTM()?.inverse())
    setTooltipPos({ x: svgP.x, y: svgP.y })
    setTooltip({
      axisName: axis.name,
      element: axis.element,
      score: scores[index],
      description: axis.description,
      iconName: axis.iconName,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative border border-white/5 bg-black/40 rounded-2xl overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 mix-blend-screen pointer-events-none"
          style={{ background: `radial-gradient(circle at center, ${polyStroke} 0%, transparent 60%)` }}
        />

        <div className="relative z-10 p-8 md:p-12">
          {/* Header */}
          <div className="flex items-center gap-3 mb-10 border-b border-white/10 pb-6">
            <TbHexagon className="w-6 h-6 text-white/40" />
            <h2 className="text-xl md:text-2xl font-serif text-white tracking-wide">
              Elemental Archetype Profile
            </h2>
            <div className="ml-auto font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
              {total} Celestial Bodies
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* ── SPIDER CHART SVG ── */}
            <div className="flex items-center justify-center relative">
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

                {/* Axis icons on the outer ring (replacing dots) */}
                {SPIDER_AXES.map((axis, i) => {
                  const iconPt = spiderPoint(cx, cy, maxRadius + 12, i)
                  const IconComp = AXIS_ICON_MAP[axis.iconName]
                  const color = ELEMENT_COLORS[axis.element].stroke
                  const iconSize = 14
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
                        animate={{ opacity: 0.8, scale: 1 }}
                        transition={{ duration: 0.4, delay: delay + 0.08 * i }}
                        onMouseEnter={(e) => handleIconHover(e as unknown as React.MouseEvent, i)}
                        onMouseLeave={() => setTooltip(null)}
                        style={{ color }}
                      >
                        <IconComp size={iconSize} />
                      </motion.div>
                    </foreignObject>
                  )
                })}

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

                {/* Axis labels — element icon + name */}
                {SPIDER_AXES.map((axis, i) => {
                  const pt = spiderPoint(cx, cy, labelRadius, i)
                  const ElIcon = ELEMENT_ICONS[axis.element]
                  const color = ELEMENT_COLORS[axis.element].stroke
                  const labelOpacity = axis.element === "Fire" || axis.element === "Water" ? 0.7 : 0.5

                  const angle = (i / 12) * 360
                  let textAnchor: "middle" | "start" | "end" = "middle"
                  if (angle > 300 || angle < 60) textAnchor = "middle"
                  else if (angle >= 60 && angle <= 120) textAnchor = "start"
                  else if (angle > 120 && angle < 240) textAnchor = "middle"
                  else textAnchor = "end"

                  let yOffset = -6
                  if (angle > 120 && angle < 240) yOffset = 14

                  // Offset label for start/end anchors so element icon doesn't overlap
                  let iconXShift = 0
                  if (textAnchor === "start") iconXShift = 6
                  if (textAnchor === "end") iconXShift = -6

                  // Element icon size for labels
                  const elIconSize = 10

                  return (
                    <g key={`label-${i}`}>
                      {/* Element icon */}
                      <foreignObject
                        x={pt.x - elIconSize / 2 + iconXShift}
                        y={pt.y + yOffset - elIconSize / 2}
                        width={elIconSize}
                        height={elIconSize}
                      >
                        <div className="flex items-center justify-center w-full h-full" style={{ color, opacity: labelOpacity }}>
                          <ElIcon size={elIconSize} />
                        </div>
                      </foreignObject>

                      {/* Axis name text */}
                      <text
                        x={pt.x + iconXShift}
                        y={pt.y + yOffset + 12}
                        textAnchor={textAnchor}
                        fill={color}
                        fontSize="9"
                        fontFamily="ui-serif, serif"
                        fontWeight="600"
                        opacity={labelOpacity}
                      >
                        {axis.name}
                      </text>

                      {/* Score */}
                      <text
                        x={pt.x + iconXShift}
                        y={pt.y + yOffset + 22}
                        textAnchor={textAnchor}
                        fill="rgba(255,255,255,0.3)"
                        fontSize="8"
                        fontFamily="ui-monospace, monospace"
                      >
                        {scores[i]}/100
                      </text>
                    </g>
                  )
                })}

                {/* Center label */}
                <text
                  x={cx}
                  y={cy - 4}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.15)"
                  fontSize="11"
                  fontFamily="ui-serif, serif"
                  fontWeight="600"
                  letterSpacing="0.15em"
                  style={{ textTransform: "uppercase" }}
                >
                  {dominant.toUpperCase()}
                </text>
                <text
                  x={cx}
                  y={cy + 12}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.08)"
                  fontSize="9"
                  fontFamily="ui-monospace, monospace"
                >
                  {dominantPct}%
                </text>
              </svg>

              {/* Tooltip */}
              {tooltip && (() => {
                const TipIcon = AXIS_ICON_MAP[tooltip.iconName]
                return (
                  <div
                    className="absolute z-50 pointer-events-none bg-black/90 border border-white/10 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm"
                    style={{
                      left: tooltipPos.x,
                      top: tooltipPos.y - 70,
                      transform: "translateX(-50%)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <TipIcon size={14} style={{ color: ELEMENT_COLORS[tooltip.element].stroke }} />
                      <span className="text-xs font-serif text-white">{tooltip.axisName}</span>
                      <span className="text-[10px] font-mono text-white/40">{tooltip.score}/100</span>
                    </div>
                    <p className="text-[10px] text-white/50 max-w-[180px]">{tooltip.description}</p>
                  </div>
                )
              })()}
            </div>

            {/* ── AXIS BREAKDOWN ── */}
            <div className="space-y-3">
              {ELEMENT_ORDER.map((el) => {
                const color = ELEMENT_COLORS[el]
                const ElIcon = ELEMENT_ICONS[el]
                const elAxes = SPIDER_AXES.filter(a => a.element === el)
                const isDominant = el === dominant

                return (
                  <div key={el} className="space-y-2">
                    {/* Element section header */}
                    <div className="flex items-center gap-2 mb-1">
                      <ElIcon className="w-3.5 h-3.5" style={{ color: color.stroke }} />
                      <span
                        className="text-[10px] font-mono uppercase tracking-[0.2em]"
                        style={{ color: color.stroke, opacity: isDominant ? 1 : 0.5 }}
                      >
                        {el}
                      </span>
                      <span className="text-[10px] font-mono text-white/20">
                        {elementScores[el]}%
                      </span>
                      {isDominant && (
                        <span className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border"
                          style={{
                            color: color.stroke,
                            borderColor: `${color.stroke}30`,
                            backgroundColor: color.dim,
                          }}
                        >
                          Dominant
                        </span>
                      )}
                    </div>

                    {/* Axes for this element */}
                    {elAxes.map((axis) => {
                      const axisIndex = SPIDER_AXES.findIndex(a => a.name === axis.name)
                      const score = scores[axisIndex]
                      const AxisIcon = AXIS_ICON_MAP[axis.iconName]

                      return (
                        <motion.div
                          key={axis.name}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: delay + 0.05 * axisIndex }}
                          className="flex items-center gap-3 pl-5 group"
                        >
                          <AxisIcon
                            size={12}
                            className="shrink-0"
                            style={{ color: color.stroke, opacity: 0.7 }}
                          />
                          <span className="text-xs font-serif text-white/60 w-32 shrink-0 group-hover:text-white/80 transition-colors">
                            {axis.name}
                          </span>
                          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: color.stroke }}
                              initial={{ width: 0 }}
                              animate={{ width: `${score}%` }}
                              transition={{ duration: 0.8, delay: delay + 0.1 * axisIndex, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-white/30 w-8 text-right">
                            {score}
                          </span>
                        </motion.div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── DOMINANT ELEMENT INSIGHT ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: delay + 0.8 }}
            className="mt-12 border-t border-white/5 pt-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">
                Dominant Principle
              </span>
              <div className="h-px flex-1 bg-white/5" />
            </div>
            <p className="text-lg md:text-xl font-serif text-white/80 leading-relaxed max-w-3xl">
              <span style={{ color: dominantColor.stroke }}>{dominant}</span> anchors your natal architecture. {ELEMENT_CONTENT[dominant].desc}
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
