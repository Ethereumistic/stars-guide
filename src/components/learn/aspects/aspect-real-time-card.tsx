"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { TbTelescope } from "react-icons/tb";
import { AspectData } from "@/astrology/aspects";
import { AspectUIConfig } from "@/config/aspects-ui";
import { getActiveAspects, type ActiveAspect } from "@/lib/aspects";
import { planetUIConfig } from "@/config/planet-ui";
import { aspectUIConfig } from "@/config/aspects-ui";
import { compositionalAspects } from "@/astrology/aspects";

// ─── Normie-friendly label system ────────────────────────────────────────────

const natureBadge: Record<string, { label: string; color: string }> = {
    hard: { label: "Tension", color: "#D94F4F" },
    soft: { label: "Flow", color: "#4A9E6B" },
    neutral: { label: "Shift", color: "#F5C842" },
    variable: { label: "Fusion", color: "#F5C842" },
};

const aspectInsight: Record<string, string> = {
    conjunction: "Two energies merging into a single force",
    sextile: "An open door — walk through it",
    square: "Friction that forges strength",
    trine: "Where grace meets talent",
    opposition: "Two truths demanding balance",
    semisextile: "A subtle nudge toward awareness",
    quincunx: "An uneasy alliance demanding adjustment",
    semisquare: "A quiet friction building beneath the surface",
    sesquiquadrate: "Persistent tension seeking release",
};

const momentumLabel = (applying: boolean) =>
    applying ? "Building" : "Fading";

// ─── Props ───────────────────────────────────────────────────────────────────

interface AspectRealTimeCardProps {
    data: AspectData;
    ui: AspectUIConfig;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AspectRealTimeCard({ data, ui }: AspectRealTimeCardProps) {
    const hexColor = ui.hexFallback;
    const [activeAspects, setActiveAspects] = useState<ActiveAspect[]>([]);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    useEffect(() => {
        const update = () => {
            const now = new Date();
            setCurrentTime(now);
            const aspects = getActiveAspects(now, data.id);
            setActiveAspects(aspects);
        };

        update();
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, [data.id]);

    if (!currentTime) return null;

    return (
        <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="border border-white/[0.06] bg-black/40 flex flex-col rounded-md overflow-hidden"
        >
            {/* ── Header ── */}
            <div className="p-8 md:p-12 border-b border-white/[0.06] flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <TbTelescope className="size-4 text-white/40" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">
                            Live Astronomy Engine
                        </span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight">
                        Real-Time {data.name}s
                    </h2>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-sm bg-white/5 w-fit">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500/80" />
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-white/70">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            {/* ── Connection Cards Grid ── */}
            <div className="p-6 md:p-8">
                {activeAspects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                        <p className="text-white/50 font-serif text-lg">
                            No exact {data.name.toLowerCase()}s currently active within a tight orb.
                        </p>
                        <span className="font-mono text-[10px] text-white/25">
                            The sky will shift — check back soon.
                        </span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        <AnimatePresence mode="popLayout">
                            {activeAspects.map((aspect, i) => (
                                <RealTimeConnectionCard
                                    key={`${aspect.planet1.id}-${aspect.aspect.id}-${aspect.planet2.id}`}
                                    aspect={aspect}
                                    index={i}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.section>
    );
}

// ─── Real-Time Connection Card ───────────────────────────────────────────────

interface RealTimeConnectionCardProps {
    aspect: ActiveAspect;
    index: number;
}

function RealTimeConnectionCard({ aspect, index }: RealTimeConnectionCardProps) {
    const ui = aspectUIConfig[aspect.aspect.id];
    if (!ui) return null;

    const hex = ui.hexFallback;
    const badge = natureBadge[aspect.aspect.nature] ?? natureBadge.neutral;
    const insight = aspectInsight[aspect.aspect.id] ?? "Energetic exchange";
    const momentum = momentumLabel(aspect.applying);

    const p1Ui = planetUIConfig[aspect.planet1.id];
    const p2Ui = planetUIConfig[aspect.planet2.id];

    // Orb intensity: 0 = exact, 3 = loosest we show
    const orbPct = Math.min(aspect.orb / 3, 1);
    const intensity = 1 - orbPct; // higher = tighter/more intense

    const aspectDetail = compositionalAspects.find(a => a.id === aspect.aspect.id);
    const keyword = aspectDetail?.coreKeywords[0] ?? "";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: [0.25, 0.46, 0.45, 0.94],
            }}
        >
            <div
                className="relative overflow-hidden border border-white/[0.06] hover:border-[var(--aspect-color)] transition-colors duration-300 rounded-md bg-black/40"
                style={{ ["--aspect-color" as string]: `${hex}60` }}
            >
                {/* ── Top rim glow ── */}
                <div
                    className="absolute inset-x-0 top-0 h-px opacity-40 group-hover:opacity-80 transition-opacity duration-500"
                    style={{
                        background: `linear-gradient(90deg, transparent, ${hex}, transparent)`,
                    }}
                />

                {/* ── Ambient radial glow ── */}
                <div
                    className="absolute -top-12 left-1/2 -translate-x-1/2 w-[200%] h-24 rounded-full blur-3xl opacity-0 hover:opacity-[0.07] transition-opacity duration-700 pointer-events-none"
                    style={{ backgroundColor: hex }}
                />

                {/* ── Background shimmer for tight orbs ── */}
                {intensity > 0.7 && (
                    <div
                        className="absolute inset-0 opacity-[0.03] hover:opacity-[0.06] transition-opacity duration-500"
                        style={{
                            background: `radial-gradient(ellipse at 50% 30%, ${hex} 0%, transparent 70%)`,
                        }}
                    />
                )}

                {/* ── Content ── */}
                <div className="relative z-10 p-4 md:p-5">

                    {/* Row 1: Nature badge + momentum */}
                    <div className="flex items-center justify-between mb-4">
                        <span
                            className="font-mono text-[8px] uppercase tracking-[0.25em] px-2 py-0.5 rounded-full"
                            style={{
                                color: badge.color,
                                background: `${badge.color}10`,
                                border: `1px solid ${badge.color}20`,
                            }}
                        >
                            {badge.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                                {aspect.applying && (
                                    <span
                                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
                                        style={{ backgroundColor: hex }}
                                    />
                                )}
                                <span
                                    className="relative inline-flex rounded-full h-1.5 w-1.5"
                                    style={{
                                        backgroundColor: aspect.applying ? hex : "rgba(255,255,255,0.2)",
                                    }}
                                />
                            </span>
                            <span
                                className="font-mono text-[8px] uppercase tracking-[0.15em]"
                                style={{ color: aspect.applying ? `${hex}cc` : "rgba(255,255,255,0.3)" }}
                            >
                                {momentum}
                            </span>
                        </div>
                    </div>

                    {/* Row 2: Planet ↔ Aspect ↔ Planet */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                        {/* Planet 1 */}
                        <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1">
                            <div className="relative">
                                {p1Ui?.imageUrl ? (
                                    <img
                                        src={p1Ui.imageUrl}
                                        alt={aspect.planet1.name}
                                        className="w-10 h-10 md:w-12 md:h-12 object-contain transition-transform duration-500 hover:scale-110"
                                        style={{
                                            filter: `drop-shadow(0 0 8px ${p1Ui.themeColor}30)`,
                                            transform: `scale(${p1Ui.imageScale ?? 1})`,
                                        }}
                                    />
                                ) : (
                                    <span
                                        className="text-2xl font-serif"
                                        style={{ color: p1Ui?.themeColor }}
                                    >
                                        {p1Ui?.rulerSymbol}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-mono text-white/40 truncate w-full text-center">
                                {aspect.planet1.name}
                            </span>
                        </div>

                        {/* Aspect glyph connector */}
                        <div className="flex flex-col items-center gap-0.5 px-1">
                            <div className="flex items-center w-full">
                                <div
                                    className="flex-1 h-px opacity-20"
                                    style={{ backgroundColor: hex }}
                                />
                                <span
                                    className="text-2xl md:text-3xl font-serif leading-none mx-1"
                                    style={{
                                        color: hex,
                                        textShadow: `0 0 12px ${hex}60`,
                                    }}
                                >
                                    {aspect.aspect.symbol}
                                </span>
                                <div
                                    className="flex-1 h-px opacity-20"
                                    style={{ backgroundColor: hex }}
                                />
                            </div>
                            <span
                                className="text-[8px] font-mono uppercase tracking-[0.1em]"
                                style={{ color: `${hex}80` }}
                            >
                                {aspect.aspect.name}
                            </span>
                        </div>

                        {/* Planet 2 */}
                        <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1">
                            <div className="relative">
                                {p2Ui?.imageUrl ? (
                                    <img
                                        src={p2Ui.imageUrl}
                                        alt={aspect.planet2.name}
                                        className="w-10 h-10 md:w-12 md:h-12 object-contain transition-transform duration-500 hover:scale-110"
                                        style={{
                                            filter: `drop-shadow(0 0 8px ${p2Ui.themeColor}30)`,
                                            transform: `scale(${p2Ui.imageScale ?? 1})`,
                                        }}
                                    />
                                ) : (
                                    <span
                                        className="text-2xl font-serif"
                                        style={{ color: p2Ui?.themeColor }}
                                    >
                                        {p2Ui?.rulerSymbol}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-mono text-white/40 truncate w-full text-center">
                                {aspect.planet2.name}
                            </span>
                        </div>
                    </div>

                    {/* Row 3: Insight one-liner */}
                    <div className="text-center mb-3">
                        <p
                            className="text-[11px] md:text-xs font-serif italic text-white/50 leading-relaxed"
                            style={{
                                textShadow: `0 0 20px ${hex}10`,
                            }}
                        >
                            {insight}
                        </p>
                    </div>

                    {/* Row 4: Orb meter + keyword */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <div className="relative w-full h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${intensity * 100}%` }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1.2, delay: 0.3 + index * 0.1, ease: "easeOut" }}
                                    className="absolute inset-y-0 left-0 rounded-full"
                                    style={{
                                        background: `linear-gradient(to right, ${hex}30, ${hex}80)`,
                                        boxShadow: `0 0 6px ${hex}20`,
                                    }}
                                />
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <span
                                    className="text-[8px] font-mono uppercase tracking-wider"
                                    style={{ color: `${hex}70` }}
                                >
                                    {keyword}
                                </span>
                                <span className="text-[8px] font-mono text-white/20 tabular-nums">
                                    {aspect.orb.toFixed(1)}° orb
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Data footer ── */}
                    <div className="pt-3 mt-3 border-t border-white/[0.04]">
                        <div className="flex items-center justify-between font-mono text-[9px] text-white/25">
                            <span>
                                {aspect.currentAngle.toFixed(2)}° current
                            </span>
                            <span>
                                exact @ {aspect.exactAngle}°
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
