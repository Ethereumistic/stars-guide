"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { getPlanetTelemetry, type PlanetTelemetry } from "@/lib/planets/telemetry";
import { planetUIConfig } from "@/config/planet-ui";
import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { TbTelescope, TbArrowRight } from "react-icons/tb";
import { GiOrbital } from "react-icons/gi";

const PLANET_IDS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;

// radius = orbit distance from center (% of container width)
// size = planet image display size (px)
// Radii scaled to keep all planets within the container (max ~46%)
const ORBIT_CONFIG: Record<string, { radius: number; size: number }> = {
    mercury:  { radius: 10, size: 30 },
    venus:    { radius: 15, size: 35 },
    moon:     { radius: 20, size: 32 },
    mars:     { radius: 25, size: 32 },
    jupiter:  { radius: 31, size: 42 },
    saturn:   { radius: 36, size: 40 },
    uranus:   { radius: 40, size: 35 },
    neptune:  { radius: 44, size: 35 },
    pluto:    { radius: 47, size: 28 },
};

interface PlanetRadarEntry {
    id: string;
    name: string;
    telemetry: PlanetTelemetry;
    ui: typeof planetUIConfig[string];
    signName: string;
    signIcon: typeof zodiacUIConfig[string]["icon"];
}

/** 0° Aries at 12 o'clock, increasing counterclockwise (astronomically correct) */
function longitudeToOffset(longitudeDeg: number, radiusPct: number): { left: string; top: string } {
    const rad = (longitudeDeg * Math.PI) / 180;
    const x = -Math.sin(rad) * radiusPct;
    const y = -Math.cos(rad) * radiusPct;
    return {
        left: `${50 + x}%`,
        top: `${50 + y}%`,
    };
}

export function LiveSkyRadar() {
    const [entries, setEntries] = useState<PlanetRadarEntry[]>([]);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    useEffect(() => {
        const date = new Date();
        const results: PlanetRadarEntry[] = [];
        for (const id of PLANET_IDS) {
            const t = getPlanetTelemetry(id, date);
            const ui = planetUIConfig[id];
            if (!t || !ui) continue;
            const sign = compositionalSigns.find(s => s.id === t.signId);
            const signUi = zodiacUIConfig[t.signId];
            results.push({
                id,
                name: id.charAt(0).toUpperCase() + id.slice(1),
                telemetry: t,
                ui,
                signName: sign?.name ?? t.signId,
                signIcon: signUi?.icon ?? (() => null),
            });
        }
        setEntries(results);
        const retrograde = results.find(e => e.telemetry.retrograde);
        if (retrograde) setHighlightedId(retrograde.id);
    }, []);

    const retrogradePlanets = useMemo(() => entries.filter(e => e.telemetry.retrograde), [entries]);
    const orbitingPlanets = useMemo(() => entries.filter(e => e.id !== "sun"), [entries]);

    return (
        <section className="relative w-full overflow-hidden">
            {/* Section Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12 md:mb-16"
            >
                <div className="inline-flex items-center gap-2 mb-4">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-green-400/80">Live Transmission</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-serif text-foreground tracking-tight">
                    Planetary <span className="text-primary">Positions</span>
                </h2>
                <p className="text-muted-foreground/70 font-sans mt-3 max-w-md mx-auto text-sm md:text-base">
                    Real ecliptic positions calculated live from astronomical ephemeris data.
                </p>
            </motion.div>

            {/* ═══════════════════════════════════════════════════════════════
                DESKTOP: Bird's eye orbital view
                Sun center, planets on orbits at live longitude angles
            ═══════════════════════════════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="hidden md:block max-w-2xl mx-auto mb-12 md:mb-16"
            >
                <div className="relative w-full aspect-square overflow-hidden">
                    {/* Orbit rings — concentric circles scaled from center */}
                    {Object.entries(ORBIT_CONFIG).map(([id, cfg]) => (
                        <div
                            key={id + "-orbit"}
                            className="absolute inset-0 rounded-full border border-white/[0.04] pointer-events-none"
                            style={{ transform: `scale(${cfg.radius * 2 / 100})` }}
                        />
                    ))}

                    {/* ── Sun (dead center) ── */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                        <div className="relative">
                            <div className="absolute -inset-10 rounded-full opacity-20 blur-2xl" style={{ background: "var(--sun)" }} />
                            <Link href="/learn/planets/sun" className="relative block group">
                                <img
                                    src={planetUIConfig.sun.imageUrl}
                                    alt="Sun"
                                    className="w-16 h-16 object-contain transition-transform duration-300 group-hover:scale-110"
                                    style={{ filter: "drop-shadow(0 0 20px rgba(212,175,55,0.4))" }}
                                />
                            </Link>
                        </div>
                    </div>

                    {/* ── Planets on orbits ── */}
                    {orbitingPlanets.map((entry, i) => {
                        const cfg = ORBIT_CONFIG[entry.id];
                        if (!cfg) return null;

                        const offset = longitudeToOffset(entry.telemetry.longitude, cfg.radius);
                        const isHighlighted = entry.id === highlightedId;
                        const isRetrograde = entry.telemetry.retrograde;

                        return (
                            <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, scale: 0 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.3 + i * 0.06, type: "spring", stiffness: 180 }}
                                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                                style={{ left: offset.left, top: offset.top }}
                            >
                                <Link
                                    href={`/learn/planets/${entry.id}`}
                                    className="relative group block"
                                    onMouseEnter={() => setHighlightedId(entry.id)}
                                    onMouseLeave={() => setHighlightedId(null)}
                                >
                                    {/* Retrograde pulse */}
                                    {isRetrograde && (
                                        <div className="absolute -inset-1.5 rounded-full bg-orange-500/25 animate-pulse" />
                                    )}

                                    {/* Highlight ring */}
                                    <div
                                        className="absolute -inset-2 rounded-full border transition-opacity duration-300 pointer-events-none"
                                        style={{
                                            borderColor: entry.ui.themeColor,
                                            opacity: isHighlighted ? 0.4 : 0,
                                            boxShadow: isHighlighted ? `0 0 20px ${entry.ui.themeColor}20` : "none",
                                        }}
                                    />

                                    {/* Planet image */}
                                    <img
                                        src={entry.ui.imageUrl}
                                        alt={entry.name}
                                        className="object-contain transition-all duration-300 group-hover:scale-110"
                                        style={{
                                            width: cfg.size,
                                            height: cfg.size,
                                            filter: isHighlighted
                                                ? `drop-shadow(0 0 8px ${entry.ui.themeColor}60)`
                                                : `drop-shadow(0 0 4px ${entry.ui.themeColor}20)`,
                                        }}
                                    />

                                    {/* Tooltip (hover only) */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30">
                                        <div className="bg-black/95 border border-white/10 rounded-md px-3 py-2 text-center whitespace-nowrap backdrop-blur-sm">
                                            <div className="text-xs font-serif text-white">{entry.name}</div>
                                            <div className="text-[10px] font-mono text-white/50">
                                                {entry.signName} · {entry.telemetry.longitude.toFixed(1)}°
                                            </div>
                                            {isRetrograde && (
                                                <div className="text-[10px] text-orange-400 font-mono">RETROGRADE</div>
                                            )}
                                        </div>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                                            <div className="w-2 h-2 bg-black/95 border-r border-b border-white/10 rotate-45" />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            {/* ═══════════════════════════════════════════════════════════════
                MOBILE: Horizontal ecliptic strip
                Planets positioned by longitude along a linear track
            ═══════════════════════════════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="md:hidden max-w-full mx-auto mb-10"
            >
                <div className="border border-white/[0.06] bg-black/30 rounded-md overflow-hidden">
                    <div className="relative px-4 py-10">
                        {/* Ecliptic line */}
                        <div className="absolute left-8 right-8 top-1/2 h-px bg-white/[0.06]" />

                        {entries.map((entry, i) => {
                            const pct = (entry.telemetry.longitude / 360) * 100;
                            const isRetrograde = entry.telemetry.retrograde;

                            return (
                                <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.3, delay: 0.15 + i * 0.04 }}
                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                                    style={{ left: `${4 + pct * 0.92}%` }}
                                >
                                    <Link href={`/learn/planets/${entry.id}`} className="relative group block">
                                        {isRetrograde && (
                                            <div className="absolute -inset-1 rounded-full bg-orange-500/20 animate-pulse" />
                                        )}
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center border border-white/[0.08] bg-black/70 overflow-hidden">
                                            {entry.ui.imageUrl ? (
                                                <img src={entry.ui.imageUrl} alt={entry.name} className="w-6 h-6 object-contain" />
                                            ) : (
                                                <span className="text-sm font-serif" style={{ color: entry.ui.themeColor }}>{entry.ui.rulerSymbol}</span>
                                            )}
                                        </div>
                                        {/* Mobile tooltip on hover/tap */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30">
                                            <div className="bg-black/95 border border-white/10 rounded-md px-2.5 py-1.5 text-center whitespace-nowrap backdrop-blur-sm">
                                                <div className="text-[10px] font-serif text-white">{entry.name}</div>
                                                <div className="text-[9px] font-mono text-white/40">{entry.signName} · {entry.telemetry.longitude.toFixed(0)}°</div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>

            {/* Retrograde Alert */}
            {retrogradePlanets.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="max-w-3xl mx-auto mb-10"
                >
                    <div className="border border-orange-500/20 bg-orange-500/5 rounded-md p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
                        <div className="flex items-center gap-3 shrink-0">
                            <GiOrbital className="w-5 h-5 text-orange-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-400">Retrograde Alert</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {retrogradePlanets.map(p => (
                                <Link
                                    key={p.id}
                                    href={`/learn/planets/${p.id}`}
                                    className="group flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-sm hover:bg-orange-500/20 transition-colors"
                                >
                                    {p.ui.imageUrl ? (
                                        <img src={p.ui.imageUrl} alt={p.name} className="w-4 h-4 object-contain" />
                                    ) : (
                                        <span style={{ color: p.ui.themeColor }} className="font-serif text-sm">{p.ui.rulerSymbol}</span>
                                    )}
                                    <span className="text-xs font-sans text-orange-200/80 group-hover:text-white transition-colors">{p.name}</span>
                                    <span className="text-[10px] text-white/40">in {p.signName}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Explore link */}
            <div className="text-center">
                <Link
                    href="/learn/planets"
                    className="inline-flex items-center gap-2 text-sm font-serif text-primary/70 hover:text-primary transition-colors group"
                >
                    <TbTelescope className="w-4 h-4" />
                    <span>Explore all planetary bodies</span>
                    <TbArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </section>
    );
}
