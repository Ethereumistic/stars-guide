"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { ElementType, ELEMENT_COLORS } from "@/astrology/elements";
import { GiFlame, GiStonePile, GiTornado, GiWaveCrest } from "react-icons/gi";

interface LegacyPlacement {
    body: string;
    sign: string;
    house: number;
}

const ELEMENT_ORDER: ElementType[] = ["Fire", "Earth", "Air", "Water"];

const ELEMENT_ICONS: Record<ElementType, typeof GiFlame> = {
    Fire: GiFlame,
    Earth: GiStonePile,
    Air: GiTornado,
    Water: GiWaveCrest,
};

export interface ElementalCircleData {
    counts: Record<ElementType, number>;
    total: number;
    placementsByElement: Record<ElementType, LegacyPlacement[]>;
    dominant: ElementType;
}

interface ElementalCircleViewProps {
    data: ElementalCircleData;
    delay?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const angleRad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

export function ElementalCircleView({ data, delay = 0.3 }: ElementalCircleViewProps) {
    const { counts, total, placementsByElement, dominant } = data;

    const dominantColor = ELEMENT_COLORS[dominant];
    const DominantIcon = ELEMENT_ICONS[dominant];
    const dominantPct = total > 0 ? Math.round((counts[dominant] / total) * 100) : 0;

    const size = 340;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 110;
    const strokeWidth = 22;
    const circumference = 2 * Math.PI * radius;
    const labelRadius = radius + strokeWidth / 2 + 24;
    const planetRadius = radius + 4;

    // Build arc data
    const arcs = useMemo(() => {
        let angleOffset = 0;
        return ELEMENT_ORDER.map(el => {
            const count = counts[el];
            const pct = total > 0 ? count / total : 0;
            const arcAngle = pct * 360;
            const arcLength = pct * circumference;
            const startAngle = angleOffset;
            angleOffset += arcAngle;
            return { el, count, pct, arcLength, startAngle, arcAngle };
        });
    }, [counts, total, circumference]);

    // Planet dot positions
    const planetDots = useMemo(() => {
        return arcs.flatMap(({ el, startAngle, arcAngle, count }) => {
            if (count === 0) return [];
            const planets = placementsByElement[el];
            return planets.map((p, i) => {
                const step = arcAngle / count;
                const angle = startAngle + step * i + step / 2;
                const pos = polarToCartesian(cx, cy, planetRadius, angle);
                return { ...pos, el, body: p.body, angle };
            });
        });
    }, [arcs, placementsByElement, cx, cy, planetRadius]);

    return (
        <div className="w-full flex justify-center">
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
                    let offset = 0;
                    return arcs.map(({ el, count, arcLength }) => {
                        const gap = 4;
                        const visualArc = Math.max(0, arcLength - gap);
                        const visualGap = circumference - visualArc;
                        const color = ELEMENT_COLORS[el];
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
                        );
                        offset += arcLength;
                        return circle;
                    });
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
                    if (count === 0) return null;
                    const midAngle = startAngle + arcAngle / 2;
                    const pos = polarToCartesian(cx, cy, labelRadius, midAngle);
                    const color = ELEMENT_COLORS[el];
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
                    );
                })}
            </svg>
        </div>
    );
}