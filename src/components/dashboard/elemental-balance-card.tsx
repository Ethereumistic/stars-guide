'use client'

import { useMemo } from "react"
import { motion } from "motion/react"
import { compositionalSigns } from "@/astrology/signs"
import { planetUIConfig } from "@/config/planet-ui"
import { ElementType, ELEMENT_CONTENT } from "@/astrology/elements"
import { GiFlame, GiStonePile, GiTornado, GiWaveCrest } from "react-icons/gi"
import { TbHexagon } from "react-icons/tb"

interface LegacyPlacement {
    body: string
    sign: string
    house: number
}

interface ElementalBalanceCardProps {
    birthData: {
        placements: LegacyPlacement[]
    }
    delay?: number
}

const ELEMENT_ORDER: ElementType[] = ["Fire", "Earth", "Air", "Water"]

const ELEMENT_COLORS: Record<ElementType, { stroke: string; glow: string; dim: string }> = {
    Fire: { stroke: "#FF6B35", glow: "rgba(255, 107, 53, 0.35)", dim: "rgba(255, 107, 53, 0.08)" },
    Earth: { stroke: "#8BA840", glow: "rgba(139, 168, 64, 0.35)", dim: "rgba(139, 168, 64, 0.08)" },
    Air: { stroke: "#87CEEB", glow: "rgba(135, 206, 235, 0.35)", dim: "rgba(135, 206, 235, 0.08)" },
    Water: { stroke: "#4AA3FF", glow: "rgba(74, 163, 255, 0.35)", dim: "rgba(74, 163, 255, 0.08)" },
}

const ELEMENT_ICONS: Record<ElementType, typeof GiFlame> = {
    Fire: GiFlame,
    Earth: GiStonePile,
    Air: GiTornado,
    Water: GiWaveCrest,
}

function getPlanetSymbol(body: string): string {
    const key = body.toLowerCase().replace(/\s+/g, "_")
    if (planetUIConfig[key]) return planetUIConfig[key].rulerSymbol
    if (key === "ascendant") return "AC"
    if (key === "mc" || key === "midheaven") return "MC"
    return body.charAt(0).toUpperCase()
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const angleRad = (angleDeg - 90) * (Math.PI / 180)
    return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) }
}

export function ElementalBalanceCard({ birthData, delay = 0.3 }: ElementalBalanceCardProps) {
    const { counts, total, placementsByElement, dominant } = useMemo(() => {
        const counts: Record<ElementType, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 }
        const placementsByElement: Record<ElementType, LegacyPlacement[]> = { Fire: [], Earth: [], Air: [], Water: [] }

        for (const p of birthData.placements) {
            const sign = compositionalSigns.find(s => s.name === p.sign)
            if (!sign) continue
            counts[sign.element]++
            placementsByElement[sign.element].push(p)
        }

        const total = birthData.placements.length
        const dominant = (Object.entries(counts) as [ElementType, number][])
            .sort((a, b) => b[1] - a[1])[0][0]

        return { counts, total, placementsByElement, dominant }
    }, [birthData])

    const size = 340
    const cx = size / 2
    const cy = size / 2
    const radius = 110
    const strokeWidth = 22
    const circumference = 2 * Math.PI * radius
    const labelRadius = radius + strokeWidth / 2 + 24
    const planetRadius = radius + 4

    // Build arc data
    let angleOffset = 0
    const arcs = ELEMENT_ORDER.map(el => {
        const count = counts[el]
        const pct = total > 0 ? count / total : 0
        const arcAngle = pct * 360
        const arcLength = pct * circumference
        const startAngle = angleOffset
        angleOffset += arcAngle
        return { el, count, pct, arcLength, startAngle, arcAngle }
    })

    // Planet dot positions
    const planetDots = arcs.flatMap(({ el, startAngle, arcAngle, count }) => {
        if (count === 0) return []
        const planets = placementsByElement[el]
        return planets.map((p, i) => {
            const step = arcAngle / count
            const angle = startAngle + step * i + step / 2
            const pos = polarToCartesian(cx, cy, planetRadius, angle)
            return { ...pos, el, body: p.body, angle }
        })
    })

    const dominantColor = ELEMENT_COLORS[dominant]
    const DominantIcon = ELEMENT_ICONS[dominant]
    const dominantPct = total > 0 ? Math.round((counts[dominant] / total) * 100) : 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className="relative border border-white/5 bg-black/40 rounded-2xl overflow-hidden">
                {/* Ambient glow */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10 mix-blend-screen pointer-events-none"
                    style={{ background: `radial-gradient(circle at center, ${dominantColor.stroke} 0%, transparent 60%)` }}
                />

                <div className="relative z-10 p-8 md:p-12">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-10 border-b border-white/10 pb-6">
                        <TbHexagon className="w-6 h-6 text-white/40" />
                        <h2 className="text-xl md:text-2xl font-serif text-white tracking-wide">Elemental Distribution</h2>
                        <div className="ml-auto font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
                            {total} Celestial Bodies
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        {/* ── CIRCULAR DIAGRAM ── */}
                        <div className="flex items-center justify-center relative">
                            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
                                {/* Defs for glow filter */}
                                <defs>
                                    {ELEMENT_ORDER.map(el => (
                                        <filter key={el} id={`glow-${el}`} x="-50%" y="-50%" width="200%" height="200%">
                                            <feGaussianBlur stdDeviation="4" result="blur" />
                                            <feMerge>
                                                <feMergeNode in="blur" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    ))}
                                </defs>

                                {/* Background track */}
                                <circle
                                    cx={cx} cy={cy} r={radius}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.04)"
                                    strokeWidth={strokeWidth}
                                />

                                {/* Element arcs */}
                                {(() => {
                                    let offset = 0
                                    return arcs.map(({ el, count, arcLength }) => {
                                        const gap = 4 // visual gap between segments in px
                                        const visualArc = Math.max(0, arcLength - gap)
                                        const visualGap = circumference - visualArc
                                        const color = ELEMENT_COLORS[el]
                                        const circle = (
                                            <motion.circle
                                                key={el}
                                                cx={cx} cy={cy} r={radius}
                                                fill="none"
                                                stroke={color.stroke}
                                                strokeWidth={strokeWidth}
                                                strokeLinecap="round"
                                                strokeDasharray={`0 ${circumference}`}
                                                strokeDashoffset={-offset}
                                                filter={count > 0 ? `url(#glow-${el})` : undefined}
                                                opacity={count > 0 ? 1 : 0.2}
                                                initial={{ strokeDasharray: `0 ${circumference}` }}
                                                animate={{ strokeDasharray: `${visualArc} ${visualGap}` }}
                                                transition={{ duration: 1.2, delay: delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
                                            />
                                        )
                                        offset += arcLength
                                        return circle
                                    })
                                })()}

                                {/* Planet dots */}
                                {planetDots.map((dot, i) => (
                                    <g key={i}>
                                        <circle
                                            cx={dot.x} cy={dot.y} r="4"
                                            fill="white"
                                            opacity="0.85"
                                        />
                                        <circle
                                            cx={dot.x} cy={dot.y} r="8"
                                            fill="none"
                                            stroke={ELEMENT_COLORS[dot.el].stroke}
                                            strokeWidth="1"
                                            opacity="0.3"
                                        />
                                    </g>
                                ))}

                                {/* Inner decorative circle */}
                                <circle cx={cx} cy={cy} r={radius - strokeWidth / 2 - 8} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={1} />

                                {/* Center content */}
                                <foreignObject x={cx - 70} y={cy - 70} width={140} height={140}>
                                    <div className="w-full h-full flex flex-col items-center justify-center text-center">
                                        <motion.div
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.8, delay: delay + 0.6 }}
                                        >
                                            <DominantIcon className="w-8 h-8 mx-auto mb-2" style={{ color: dominantColor.stroke }} />
                                        </motion.div>
                                        <motion.span
                                            className="block text-3xl font-serif text-white leading-none"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.6, delay: delay + 0.8 }}
                                        >
                                            {dominantPct}%
                                        </motion.span>
                                        <motion.span
                                            className="block text-[9px] font-mono uppercase tracking-[0.2em] text-white/40 mt-1"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.6, delay: delay + 1 }}
                                        >
                                            {dominant}
                                        </motion.span>
                                    </div>
                                </foreignObject>

                                {/* Outer labels */}
                                {arcs.map(({ el, startAngle, arcAngle, count }) => {
                                    if (count === 0) return null
                                    const midAngle = startAngle + arcAngle / 2
                                    const pos = polarToCartesian(cx, cy, labelRadius, midAngle)
                                    const color = ELEMENT_COLORS[el]
                                    return (
                                        <g key={`label-${el}`}>
                                            <text
                                                x={pos.x}
                                                y={pos.y - 6}
                                                textAnchor="middle"
                                                fill={color.stroke}
                                                fontSize="10"
                                                fontFamily="ui-serif, serif"
                                                fontWeight="600"
                                            >
                                                {el}
                                            </text>
                                            <text
                                                x={pos.x}
                                                y={pos.y + 8}
                                                textAnchor="middle"
                                                fill="rgba(255,255,255,0.4)"
                                                fontSize="9"
                                                fontFamily="ui-monospace, monospace"
                                            >
                                                {count} / {Math.round((count / total) * 100)}%
                                            </text>
                                        </g>
                                    )
                                })}
                            </svg>
                        </div>

                        {/* ── ELEMENT STATS ── */}
                        <div className="space-y-4">
                            {ELEMENT_ORDER.map((el, i) => {
                                const count = counts[el]
                                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                                const color = ELEMENT_COLORS[el]
                                const Icon = ELEMENT_ICONS[el]
                                const planets = placementsByElement[el]
                                const content = ELEMENT_CONTENT[el]
                                const isDominant = el === dominant

                                return (
                                    <motion.div
                                        key={el}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.5, delay: delay + 0.1 * i }}
                                        className={`
                                            relative p-5 border rounded-xl overflow-hidden group
                                            transition-colors duration-500
                                            ${isDominant ? 'bg-white/[0.03] border-white/10' : 'bg-transparent border-white/5 hover:border-white/10'}
                                        `}
                                    >
                                        {/* Accent bar */}
                                        <div
                                            className="absolute left-0 top-0 bottom-0 w-[2px] transition-opacity duration-500"
                                            style={{ backgroundColor: color.stroke, opacity: isDominant ? 1 : 0.3 }}
                                        />

                                        <div className="flex items-start gap-4">
                                            {/* Icon */}
                                            <div
                                                className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-500"
                                                style={{
                                                    backgroundColor: color.dim,
                                                    boxShadow: isDominant ? `0 0 20px ${color.glow}` : 'none',
                                                }}
                                            >
                                                <Icon className="w-5 h-5" style={{ color: color.stroke }} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline justify-between mb-1">
                                                    <span className="text-sm font-serif text-white tracking-wide">{el}</span>
                                                    <span className="text-xs font-mono text-white/40">
                                                        {count} {count === 1 ? 'body' : 'bodies'}
                                                    </span>
                                                </div>

                                                {/* Mini bar */}
                                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mb-3">
                                                    <motion.div
                                                        className="h-full rounded-full"
                                                        style={{ backgroundColor: color.stroke }}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ duration: 1, delay: delay + 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                                                    />
                                                </div>

                                                {/* Keywords */}
                                                <div className="flex flex-wrap gap-1.5 mb-2">
                                                    {content.keywords.map(k => (
                                                        <span
                                                            key={k}
                                                            className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border"
                                                            style={{
                                                                color: color.stroke,
                                                                borderColor: `${color.stroke}30`,
                                                                backgroundColor: color.dim,
                                                            }}
                                                        >
                                                            {k}
                                                        </span>
                                                    ))}
                                                </div>

                                                {/* Planet symbols */}
                                                {planets.length > 0 && (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-[9px] font-mono uppercase tracking-widest text-white/20">
                                                            Placements
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            {planets.map((p, pi) => (
                                                                <span
                                                                    key={pi}
                                                                    className="text-xs font-serif text-white/60"
                                                                    title={p.body}
                                                                >
                                                                    {getPlanetSymbol(p.body)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
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
