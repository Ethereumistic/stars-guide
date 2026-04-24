"use client";

import React, { useMemo } from "react";
import { motion } from "motion/react";
import { type ChartData } from "@/lib/birth-chart/full-chart";
import { planetUIConfig } from "@/config/planet-ui";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { compositionalSigns } from "@/astrology/signs";
import { elementUIConfig } from "@/config/elements-ui";

/**
 * Standard astrological display order.
 */
const PLANET_DISPLAY_ORDER: string[] = [
    "sun", "moon", "mercury", "venus", "mars",
    "jupiter", "saturn", "uranus", "neptune", "pluto",
    "north_node", "south_node", "part_of_fortune", "chiron",
    "ascendant",
];

/** Roman numerals for houses — the classical way astrologers write them. */
const ROMAN: Record<number, string> = {
    1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI",
    7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII",
};

interface ChartItem {
    id: string;
    signId: string;
    houseId: number;
    retrograde: boolean;
}

interface HouseData {
    id: number;
    signId: string;
    longitude: number;
}

export function ChartVisualView({ data }: { data: ChartData }) {
    const chartItems: ChartItem[] = useMemo(() => {
        const itemMap = new Map<string, ChartItem>();

        data.planets.forEach((p) => {
            itemMap.set(p.id, {
                id: p.id,
                signId: p.signId,
                houseId: p.houseId,
                retrograde: p.retrograde,
            });
        });

        if (data.ascendant) {
            itemMap.set("ascendant", {
                id: "ascendant",
                signId: data.ascendant.signId,
                houseId: 1,
                retrograde: false,
            });
        }

        return PLANET_DISPLAY_ORDER
            .filter((id) => itemMap.has(id))
            .map((id) => itemMap.get(id)!);
    }, [data]);

    // Group by house for the house-wheel feel
    const groupedByHouse = useMemo(() => {
        const groups: Map<number, ChartItem[]> = new Map();
        for (const item of chartItems) {
            const existing = groups.get(item.houseId) || [];
            existing.push(item);
            groups.set(item.houseId, existing);
        }
        // Return sorted by house number
        return Array.from(groups.entries())
            .sort(([a], [b]) => a - b)
            .map(([houseId, items]) => ({ houseId, items }));
    }, [chartItems]);

    return (
        <div className="w-full space-y-6">
            {/* ── Hero Row: Rising Sign ── */}
            <RisingSignHero ascendant={data.ascendant} />

            {/* ── Planet Grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {chartItems.map((item, i) => (
                    <PlanetCard key={item.id} item={item} index={i} />
                ))}
            </div>

            {/* ── House Wheel ── */}
            <HouseWheel
                groups={groupedByHouse}
                houses={data.houses}
            />
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   RISING SIGN HERO
   The Ascendant anchors the entire chart. Display it prominently at the top
   with the zodiac constellation watermark, sign icon, and element branding.
   ══════════════════════════════════════════════════════════════════════════════ */
function RisingSignHero({ ascendant }: { ascendant: ChartData["ascendant"] }) {
    if (!ascendant) return null;

    const sign = compositionalSigns.find((s) => s.id === ascendant.signId);
    const ui = zodiacUIConfig[ascendant.signId];
    if (!sign || !ui) return null;

    const SignIcon = ui.icon;
    const elementStyles = elementUIConfig[sign.element]?.styles;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60"
        >
            {/* Constellation watermark */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img
                    src={ui.constellationUrl}
                    alt=""
                    className="absolute right-0 bottom-0 h-full object-contain opacity-[0.07] scale-125 translate-x-1/4 translate-y-1/4"
                />
            </div>

            {/* Ambient glow */}
            {elementStyles && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `radial-gradient(ellipse at 30% 50%, ${elementStyles.glow} 0%, transparent 60%)`,
                        opacity: 0.15,
                    }}
                />
            )}

            <div className="relative z-10 flex items-center gap-5 p-6 md:p-8">
                {/* Sign icon */}
                <div
                    className="relative shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center"
                    style={{
                        background: elementStyles
                            ? `radial-gradient(circle, ${elementStyles.glow} 0%, transparent 70%)`
                            : "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
                    }}
                >
                    {/* Rotating ring decoration */}
                    <div
                        className="absolute inset-0 rounded-full border animate-[spin_60s_linear_infinite]"
                        style={{ borderColor: elementStyles?.border || "rgba(255,255,255,0.1)" }}
                    />
                    <SignIcon
                        className="w-10 h-10 md:w-12 md:h-12 relative z-10"
                        style={{
                            color: elementStyles?.primary || "var(--foreground)",
                            filter: `drop-shadow(0 0 12px ${elementStyles?.glow || "transparent"})`,
                        }}
                    />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 mb-1">
                        Rising Sign · House I
                    </p>
                    <h2
                        className="text-2xl md:text-3xl font-serif tracking-wide mb-1"
                        style={{
                            color: elementStyles?.secondary || "white",
                            textShadow: `0 0 20px ${elementStyles?.glow || "transparent"}`,
                        }}
                    >
                        {sign.name}
                    </h2>
                    <p
                        className="text-xs font-mono uppercase tracking-[0.15em]"
                        style={{ color: elementStyles?.primary || "white/50" }}
                    >
                        {sign.element} · {sign.modality}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PLANET CARD
   Each planet as a visual card with its image, zodiac sign icon overlay,
   and house Roman numeral. Minimal text — maximum visual signal.
   ══════════════════════════════════════════════════════════════════════════════ */
function PlanetCard({ item, index }: { item: ChartItem; index: number }) {
    const planetCfg = planetUIConfig[item.id];
    const sign = compositionalSigns.find((s) => s.id === item.signId);
    const signCfg = zodiacUIConfig[item.signId];
    const SignIcon = signCfg?.icon;
    const element = sign?.element;
    const elementStyles = element ? elementUIConfig[element]?.styles : undefined;
    const imageUrl = planetCfg?.imageUrl;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                duration: 0.6,
                delay: 0.05 * index,
                ease: [0.22, 1, 0.36, 1],
            }}
            className="group relative rounded-xl border border-white/[0.06] bg-black/50 overflow-hidden hover:border-white/[0.12] transition-colors duration-500"
        >
            {/* Ambient element glow on hover */}
            {elementStyles && (
                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none"
                    style={{
                        background: `radial-gradient(ellipse at 50% 40%, ${elementStyles.glow} 0%, transparent 70%)`,
                    }}
                />
            )}

            <div className="relative z-10 flex flex-col items-center p-4 pb-3">
                {/* ── Planet Image / Symbol ── */}
                <div className="relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mb-2">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={item.id}
                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                            style={{
                                filter: `drop-shadow(0 0 8px ${planetCfg?.themeColor || "transparent"})`,
                                transform: `scale(${planetCfg?.imageScale || 1})`,
                            }}
                        />
                    ) : (
                        // Fallback for points without images (Part of Fortune)
                        <span
                            className="text-3xl font-serif"
                            style={{
                                color: planetCfg?.themeColor || "var(--foreground)",
                                textShadow: `0 0 12px ${planetCfg?.themeColor || "transparent"}`,
                            }}
                        >
                            {planetCfg?.rulerSymbol || "?"}
                        </span>
                    )}

                    {/* Retrograde badge */}
                    {item.retrograde && (
                        <span
                            className="absolute -top-0.5 -right-0.5 text-[8px] font-mono font-bold tracking-tight px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30"
                        >
                            Rx
                        </span>
                    )}
                </div>

                {/* ── Zodiac Sign Icon ── */}
                {SignIcon && (
                    <div className="relative mb-2">
                        <SignIcon
                            className="w-5 h-5 transition-all duration-500 group-hover:scale-125"
                            style={{
                                color: elementStyles?.primary || "var(--foreground)",
                                filter: `drop-shadow(0 0 6px ${elementStyles?.glow || "transparent"})`,
                            }}
                        />
                    </div>
                )}

                {/* ── House Roman Numeral ── */}
                <div
                    className="text-[10px] font-serif tracking-[0.2em] text-white/30 group-hover:text-white/50 transition-colors duration-500"
                >
                    {ROMAN[item.houseId] || item.houseId}
                </div>
            </div>
        </motion.div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   HOUSE WHEEL
   Twelve houses arranged in the traditional astrological wheel layout.
   Planets in each house are shown as their symbol glyphs, hovering inside
   their house segment. The ascendant points left (9 o'clock).
   ══════════════════════════════════════════════════════════════════════════════ */
function HouseWheel({ groups, houses }: { groups: { houseId: number; items: ChartItem[] }[]; houses: HouseData[] }) {
    const SIZE = 520;
    const CENTER = SIZE / 2;
    const R_OUTER = 240;
    const R_INNER = 160;
    const R_SIGN_ICON = 205;
    const R_PLANET = 130;

    // Traditional house positions: House 1 at 9 o'clock (Ascendant), going counter-clockwise
    // House N is at angle: 180° - (N-1) * 30°
    const getHouseAngle = (houseId: number) => {
        return 180 - (houseId - 1) * 30;
    };

    const polarToXY = (angleDeg: number, radius: number) => {
        const rad = ((angleDeg - 90) * Math.PI) / 180;
        return {
            x: CENTER + radius * Math.cos(rad),
            y: CENTER + radius * Math.sin(rad),
        };
    };

    // Build house sign-ids from the calculated house data
    const houseSignMap = useMemo(() => {
        const map = new Map<number, string>();
        for (const house of houses) {
            map.set(house.id, house.signId);
        }
        return map;
    }, [houses]);

    // Build planet positions (avoid overlaps within each house)
    const planetPositions = useMemo(() => {
        const positions: Array<{
            id: string;
            houseId: number;
            signId: string;
            symbol: string;
            retrograde: boolean;
            x: number;
            y: number;
            color: string;
        }> = [];

        for (const group of groups) {
            const angle = getHouseAngle(group.houseId);
            const count = group.items.length;

            group.items.forEach((item, i) => {
                // Spread planets within the house's 30° arc
                const spread = count > 1 ? (i - (count - 1) / 2) * 8 : 0;
                const planetAngle = angle + spread;
                const pos = polarToXY(planetAngle, R_PLANET);
                const cfg = planetUIConfig[item.id];

                positions.push({
                    id: item.id,
                    houseId: item.houseId,
                    signId: item.signId,
                    symbol: cfg?.rulerSymbol || "•",
                    retrograde: item.retrograde,
                    x: pos.x,
                    y: pos.y,
                    color: cfg?.themeColor || "var(--foreground)",
                });
            });
        }

        return positions;
    }, [groups]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full flex justify-center"
        >
            <div className="w-full max-w-[520px]">
                <svg
                    viewBox={`0 0 ${SIZE} ${SIZE}`}
                    className="w-full h-auto"
                    shapeRendering="geometricPrecision"
                >
                    <defs>
                        {/* Glow filter for planet symbols */}
                        <filter id="planet-glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        {/* Subtle glow for house lines */}
                        <filter id="line-glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="1.5" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* ── Outer zodiac ring ── */}
                    <circle
                        cx={CENTER}
                        cy={CENTER}
                        r={R_OUTER}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="1"
                    />

                    {/* ── Inner boundary ── */}
                    <circle
                        cx={CENTER}
                        cy={CENTER}
                        r={R_INNER}
                        fill="none"
                        stroke="rgba(255,255,255,0.04)"
                        strokeWidth="1"
                    />

                    {/* ── Filled center (deep space) ── */}
                    <circle
                        cx={CENTER}
                        cy={CENTER}
                        r={R_INNER - 1}
                        fill="rgba(0,0,0,0.3)"
                    />

                    {/* ── House dividers ── */}
                    {Array.from({ length: 12 }, (_, i) => {
                        const angle = 180 - i * 30;
                        const p1 = polarToXY(angle, R_INNER);
                        const p2 = polarToXY(angle, R_OUTER);
                        const isAscendantLine = i === 0;

                        return (
                            <line
                                key={`divider-${i}`}
                                x1={p1.x}
                                y1={p1.y}
                                x2={p2.x}
                                y2={p2.y}
                                stroke={isAscendantLine ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.08)"}
                                strokeWidth={isAscendantLine ? "1.5" : "0.75"}
                                filter={isAscendantLine ? "url(#line-glow)" : undefined}
                            />
                        );
                    })}

                    {/* ── Ascendant arrow indicator ── */}
                    {(() => {
                        const ascP = polarToXY(180, R_OUTER + 12);
                        return (
                            <g>
                                <polygon
                                    points={`${polarToXY(180, R_OUTER + 6).x},${polarToXY(180, R_OUTER + 6).y} ${polarToXY(180 - 4, R_OUTER + 14).x},${polarToXY(180 - 4, R_OUTER + 14).y} ${polarToXY(180 + 4, R_OUTER + 14).x},${polarToXY(180 + 4, R_OUTER + 14).y}`}
                                    fill="rgba(255,255,255,0.5)"
                                />
                                <text
                                    x={ascP.x}
                                    y={ascP.y + 4}
                                    textAnchor="middle"
                                    fill="rgba(255,255,255,0.35)"
                                    fontSize="8"
                                    fontFamily="ui-monospace, monospace"
                                    letterSpacing="0.15em"
                                >
                                    ASC
                                </text>
                            </g>
                        );
                    })()}

                    {/* ── House sign icons in the ring ── */}
                    {Array.from({ length: 12 }, (_, i) => {
                        const houseId = i + 1;
                        const signId = houseSignMap.get(houseId);
                        if (!signId) return null;

                        const sign = compositionalSigns.find((s) => s.id === signId);
                        const signCfg = zodiacUIConfig[signId];
                        if (!sign || !signCfg) return null;

                        const midAngle = 180 - i * 30 - 15; // middle of 30° arc
                        const iconPos = polarToXY(midAngle, R_SIGN_ICON);
                        const elementStyles = elementUIConfig[sign.element]?.styles;

                        // We'll render the sign icon as Unicode text since React components
                        // can't be used inside SVG directly.
                        const signSymbols: Record<string, string> = {
                            aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋",
                            leo: "♌", virgo: "♍", libra: "♎", scorpio: "♏",
                            sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓",
                        };

                        return (
                            <g key={`sign-${houseId}`}>
                                {/* Sign Unicode glyph */}
                                <text
                                    x={iconPos.x}
                                    y={iconPos.y + 1}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill={elementStyles?.primary || "rgba(255,255,255,0.4)"}
                                    fontSize="16"
                                    fontFamily="serif"
                                    opacity="0.55"
                                >
                                    {signSymbols[signId] || "●"}
                                </text>

                                {/* House numeral */}
                                <text
                                    x={iconPos.x}
                                    y={iconPos.y + 14}
                                    textAnchor="middle"
                                    fill="rgba(255,255,255,0.12)"
                                    fontSize="7"
                                    fontFamily="ui-serif, serif"
                                    letterSpacing="0.1em"
                                >
                                    {ROMAN[houseId]}
                                </text>
                            </g>
                        );
                    })}

                    {/* ── Planet symbols ── */}
                    {planetPositions.map((planet) => (
                        <g key={planet.id}>
                            {/* Subtle background disc for readability */}
                            <circle
                                cx={planet.x}
                                cy={planet.y}
                                r="14"
                                fill="rgba(0,0,0,0.6)"
                            />
                            {/* Thin ring around planet */}
                            <circle
                                cx={planet.x}
                                cy={planet.y}
                                r="14"
                                fill="none"
                                stroke={planet.color}
                                strokeWidth="0.5"
                                opacity="0.3"
                            />
                            {/* Planet glyph */}
                            <text
                                x={planet.x}
                                y={planet.y + 1}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill={planet.color}
                                fontSize="18"
                                fontFamily="serif"
                                filter="url(#planet-glow)"
                            >
                                {planet.symbol}
                            </text>
                            {/* Retrograde superscript */}
                            {planet.retrograde && (
                                <text
                                    x={planet.x + 10}
                                    y={planet.y + 7}
                                    fill="rgba(239,68,68,0.6)"
                                    fontSize="6"
                                    fontFamily="ui-monospace, monospace"
                                >
                                    Rx
                                </text>
                            )}
                        </g>
                    ))}

                    {/* ── Decorative center star ── */}
                    <circle
                        cx={CENTER}
                        cy={CENTER}
                        r="18"
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="0.5"
                    />
                    <circle
                        cx={CENTER}
                        cy={CENTER}
                        r="2"
                        fill="rgba(255,255,255,0.15)"
                    />
                    {/* Four tiny directional dots */}
                    {[
                        polarToXY(0, 18),
                        polarToXY(90, 18),
                        polarToXY(180, 18),
                        polarToXY(270, 18),
                    ].map((p, i) => (
                        <circle
                            key={`dot-${i}`}
                            cx={p.x}
                            cy={p.y}
                            r="1"
                            fill="rgba(255,255,255,0.1)"
                        />
                    ))}
                </svg>
            </div>
        </motion.div>
    );
}