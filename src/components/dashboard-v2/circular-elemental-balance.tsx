"use client"

import { useMemo } from "react"
import { motion } from "motion/react"
import { compositionalSigns } from "@/astrology/signs"
import { elementUIConfig } from "@/config/elements-ui"
import { ElementType, ELEMENT_CONTENT } from "@/astrology/elements"
import { EnrichedPlacement, ElementCount } from "./types"
import { GiFlame, GiStonePile, GiTornado, GiWaveCrest } from "react-icons/gi"

const ELEMENT_ORDER: ElementType[] = ["Fire", "Earth", "Air", "Water"]

const ELEMENT_ICONS: Record<ElementType, React.ComponentType<{ className?: string }>> = {
    Fire: GiFlame,
    Earth: GiStonePile,
    Air: GiTornado,
    Water: GiWaveCrest,
}

interface CircularElementalBalanceProps {
    placements: EnrichedPlacement[]
    delay?: number
}

export function CircularElementalBalance({ placements, delay = 0 }: CircularElementalBalanceProps) {
    // Count all planets per element
    const elementCounts = useMemo(() => {
        const counts: ElementCount[] = ELEMENT_ORDER.map(el => ({
            element: el,
            count: 0,
            planets: [] as string[],
        }))

        for (const p of placements) {
            const idx = ELEMENT_ORDER.indexOf(p.signData.element)
            if (idx >= 0) {
                counts[idx].count++
                counts[idx].planets.push(p.bodyLabel)
            }
        }

        return counts
    }, [placements])

    const totalPlacements = elementCounts.reduce((sum, ec) => sum + ec.count, 0)

    // SVG parameters
    const SIZE = 280
    const CENTER = SIZE / 2
    const OUTER_R = 120
    const INNER_R = 75
    const TEXT_R = (OUTER_R + INNER_R) / 2

    // Calculate arc segments
    const segments = useMemo(() => {
        // Ensure total is at least 1 to prevent division by zero
        const total = Math.max(totalPlacements, 1)
        let currentAngle = -90 // Start from top

        return elementCounts.map(ec => {
            const percentage = ec.count / total
            const arcLength = percentage * 360
            const startAngle = currentAngle
            const endAngle = currentAngle + arcLength

            // Calculate arc path
            const startRad = (startAngle * Math.PI) / 180
            const endRad = (endAngle * Math.PI) / 180

            const x1Outer = CENTER + OUTER_R * Math.cos(startRad)
            const y1Outer = CENTER + OUTER_R * Math.sin(startRad)
            const x2Outer = CENTER + OUTER_R * Math.cos(endRad)
            const y2Outer = CENTER + OUTER_R * Math.sin(endRad)

            const x1Inner = CENTER + INNER_R * Math.cos(endRad)
            const y1Inner = CENTER + INNER_R * Math.sin(endRad)
            const x2Inner = CENTER + INNER_R * Math.cos(startRad)
            const y2Inner = CENTER + INNER_R * Math.sin(startRad)

            // Label position (midpoint of arc, at text radius)
            const midAngle = (startAngle + endAngle) / 2
            const midRad = (midAngle * Math.PI) / 180
            const labelX = CENTER + TEXT_R * Math.cos(midRad)
            const labelY = CENTER + TEXT_R * Math.sin(midRad)

            const largeArc = arcLength > 180 ? 1 : 0

            currentAngle = endAngle

            return {
                element: ec.element,
                count: ec.count,
                planets: ec.planets,
                percentage,
                pathData: ec.count > 0
                    ? `M ${x1Outer} ${y1Outer}
                       A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}
                       L ${x1Inner} ${y1Inner}
                       A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}
                       Z`
                    : "",
                labelX,
                labelY,
                midAngle,
            }
        })
    }, [totalPlacements, elementCounts])

    // Determine dominant element
    const dominant = useMemo(() => {
        const maxCount = Math.max(...elementCounts.map(ec => ec.count))
        if (maxCount === 0) return null
        return elementCounts.find(ec => ec.count === maxCount) ?? null
    }, [elementCounts])

    const dominantContent = dominant ? ELEMENT_CONTENT[dominant.element] : null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
        >
            {/* Section header */}
            <h3 className="text-[10px] font-serif uppercase tracking-[0.3em] text-primary/40 text-center mb-6">
                Elemental Balance
            </h3>

            <div className="flex flex-col items-center gap-6">
                {/* SVG Circular Chart */}
                <div className="relative">
                    <svg
                        viewBox={`0 0 ${SIZE} ${SIZE}`}
                        className="w-full max-w-[280px]"
                        shapeRendering="geometricPrecision"
                    >
                        {/* Background ring */}
                        <circle
                            cx={CENTER}
                            cy={CENTER}
                            r={(OUTER_R + INNER_R) / 2}
                            fill="none"
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth={OUTER_R - INNER_R}
                        />

                        {/* Element segments */}
                        {segments.map((seg, i) => {
                            if (seg.count === 0) return null
                            const elUI = elementUIConfig[seg.element]
                            const Icon = ELEMENT_ICONS[seg.element]

                            return (
                                <g key={seg.element}>
                                    {/* Arc segment */}
                                    <motion.path
                                        d={seg.pathData}
                                        fill={elUI.styles.primary}
                                        fillOpacity={dominant?.element === seg.element ? 0.35 : 0.18}
                                        stroke={elUI.styles.primary}
                                        strokeWidth={1}
                                        strokeOpacity={0.4}
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 0.8, delay: delay + i * 0.1 }}
                                    />

                                    {/* Element icon at arc midpoint */}
                                    <g transform={`translate(${seg.labelX}, ${seg.labelY})`}>
                                        <foreignObject
                                            x={-10}
                                            y={-10}
                                            width={20}
                                            height={20}
                                            style={{ overflow: 'visible' }}
                                        >
                                            <div className="flex items-center justify-center">
                                                <div style={{ color: elUI.styles.primary }}>
                                                    <Icon className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                        </foreignObject>
                                    </g>
                                </g>
                            )
                        })}

                        {/* Center content */}
                        <circle
                            cx={CENTER}
                            cy={CENTER}
                            r={INNER_R - 4}
                            fill="rgba(0,0,0,0.3)"
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth={1}
                        />

                        {/* Dominant element in center */}
                        {dominant && (
                            <g>
                                <text
                                    x={CENTER}
                                    y={CENTER - 8}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill={elementUIConfig[dominant.element].styles.primary}
                                    fontSize="13"
                                    fontWeight="700"
                                    fontFamily="serif"
                                >
                                    {dominant.element}
                                </text>
                                <text
                                    x={CENTER}
                                    y={CENTER + 10}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill="rgba(255,255,255,0.5)"
                                    fontSize="9"
                                    fontWeight="500"
                                    fontFamily="sans-serif"
                                    letterSpacing="0.1em"
                                >
                                    {dominant.count} placement{dominant.count !== 1 ? 's' : ''}
                                </text>
                            </g>
                        )}
                    </svg>
                </div>

                {/* Element legend */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-md">
                    {elementCounts.map((ec) => {
                        const elUI = elementUIConfig[ec.element]
                        const Icon = ELEMENT_ICONS[ec.element]
                        const isDominant = dominant?.element === ec.element

                        return (
                            <motion.div
                                key={ec.element}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: delay + 0.3 }}
                                className={`
                                    relative p-3 rounded-lg border transition-all duration-300
                                    ${ec.count > 0
                                        ? `border-[${elUI.styles.primary}]/30 bg-white/[0.03]`
                                        : 'border-white/5 bg-white/[0.01] opacity-40'
                                    }
                                `}
                                style={ec.count > 0 ? {
                                    borderColor: `${elUI.styles.primary}40`,
                                } : undefined}
                            >
                                {isDominant && (
                                    <div
                                        className="absolute top-1 right-1 w-2 h-2 rounded-full"
                                        style={{ backgroundColor: elUI.styles.primary }}
                                    />
                                )}
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`p-1.5 rounded-md`}
                                        style={ec.count > 0 ? {
                                            backgroundColor: `${elUI.styles.primary}20`,
                                        } : { backgroundColor: 'rgba(255,255,255,0.05)' }}
                                    >
                                        <div style={{ color: ec.count > 0 ? elUI.styles.primary : 'rgba(255,255,255,0.3)' }}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div>
                                        <p
                                            className="text-xs font-medium"
                                            style={{ color: ec.count > 0 ? elUI.styles.primary : 'rgba(255,255,255,0.3)' }}
                                        >
                                            {ec.element}
                                        </p>
                                        <p className="text-[10px] text-white/40">
                                            {ec.count} {ec.count === 1 ? 'placement' : 'placements'}
                                        </p>
                                    </div>
                                </div>
                                {ec.count > 0 && ec.planets.length > 0 && (
                                    <p className="text-[9px] text-white/30 mt-1.5 leading-tight truncate">
                                        {ec.planets.join(', ')}
                                    </p>
                                )}
                            </motion.div>
                        )
                    })}
                </div>

                {/* Brief synthesis of elemental makeup */}
                {dominantContent && dominant && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: delay + 0.5 }}
                        className="text-sm text-white/50 italic text-center max-w-sm leading-relaxed"
                    >
                        {dominantContent.desc}
                    </motion.p>
                )}
            </div>
        </motion.div>
    )
}