"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { getActiveAspects, type ActiveAspect } from "@/lib/aspects";
import { aspectUIConfig } from "@/config/aspects-ui";
import { planetUIConfig } from "@/config/planet-ui";
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
};

const momentumLabel = (applying: boolean) =>
    applying ? "Building" : "Fading";

// ─── Filter to major Ptolemaic aspects only ─────────────────────────────────

const MAJOR_IDS = new Set(["conjunction", "sextile", "square", "trine", "opposition"]);

// ─── Component ───────────────────────────────────────────────────────────────

export function CosmicConnections() {
    const [aspects, setAspects] = useState<ActiveAspect[]>([]);

    useEffect(() => {
        const now = new Date();
        const all = getActiveAspects(now);

        // Keep only major aspects, take top 4 tightest
        const filtered = all
            .filter(a => MAJOR_IDS.has(a.aspect.id))
            .slice(0, 4);

        setAspects(filtered);
    }, []);

    if (aspects.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-[1600px] mx-auto"
        >
            {/* ── Section Header ── */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400/80" />
                        </span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/25">
                            Cosmic Connections
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-white/20">
                        Active aspects right now
                    </span>
                </div>
            </div>

            {/* ── Connection Cards Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <AnimatePresence mode="popLayout">
                    {aspects.map((aspect, i) => (
                        <ConnectionCard
                            key={`${aspect.planet1.id}-${aspect.aspect.id}-${aspect.planet2.id}`}
                            aspect={aspect}
                            index={i}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

// ─── Connection Card ─────────────────────────────────────────────────────────

interface ConnectionCardProps {
    aspect: ActiveAspect;
    index: number;
}

function ConnectionCard({ aspect, index }: ConnectionCardProps) {
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
            <Link
                href={`/learn/aspects/${aspect.aspect.id}`}
                className="group block"
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
                        className="absolute -top-12 left-1/2 -translate-x-1/2 w-[200%] h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-[0.07] transition-opacity duration-700 pointer-events-none"
                        style={{ backgroundColor: hex }}
                    />

                    {/* ── Background shimmer for tight orbs ── */}
                    {intensity > 0.7 && (
                        <div
                            className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500"
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
                                            className="w-10 h-10 md:w-12 md:h-12 object-contain transition-transform duration-500 group-hover:scale-110"
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
                                        className="text-2xl md:text-3xl font-serif leading-none mx-1 transition-all duration-500 group-hover:drop-shadow-[0_0_8px_var(--aspect-glow)]"
                                        style={{
                                            color: hex,
                                            textShadow: `0 0 12px ${hex}60`,
                                            ["--aspect-glow" as string]: `${hex}90`,
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
                                            className="w-10 h-10 md:w-12 md:h-12 object-contain transition-transform duration-500 group-hover:scale-110"
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
                                className="text-[11px] md:text-xs font-serif italic text-white/50 leading-relaxed group-hover:text-white/70 transition-colors duration-300"
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

                        {/* ── Hover reveal: always in DOM, height reserved, just visually hidden ── */}
                        <div className="pt-3 mt-3 border-t border-white/[0.04] group-hover:border-white/[0.06] transition-colors duration-300">
                            <div className="flex items-center justify-between font-mono text-[9px] text-white/0 group-hover:text-white/25 transition-colors duration-300">
                                <span>
                                    {aspect.currentAngle.toFixed(2)}° current
                                </span>
                                <span style={{ color: "inherit" }}>
                                    exact @ {aspect.exactAngle}°
                                </span>
                                <span className="flex items-center gap-1 group-hover:text-white/50 transition-colors">
                                    Learn more
                                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
