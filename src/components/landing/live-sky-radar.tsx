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

const ZODIAC_SIGNS = [
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
] as const;

// Larger radii & sizes so planets and the zodiac wheel read clearly
const ORBIT_CONFIG: Record<string, { radius: number; size: number }> = {
    mercury: { radius: 11, size: 46 },
    venus: { radius: 16, size: 52 },
    moon: { radius: 21, size: 48 },
    mars: { radius: 26, size: 48 },
    jupiter: { radius: 31, size: 64 },
    saturn: { radius: 35, size: 58 },
    uranus: { radius: 39, size: 52 },
    neptune: { radius: 43, size: 52 },
    pluto: { radius: 46, size: 40 },
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
function longitudeToOffset(longitudeDeg: number, radiusPct: number): { left: string; top: string; topPct: number } {
    const rad = (longitudeDeg * Math.PI) / 180;
    const x = -Math.sin(rad) * radiusPct;
    const y = -Math.cos(rad) * radiusPct;
    return {
        left: `${50 + x}%`,
        top: `${50 + y}%`,
        topPct: 50 + y,
    };
}

/** Zodiac sign for a given ecliptic longitude (0° = Aries start) */
function longitudeToSignIndex(lon: number): number {
    return Math.floor(((lon % 360 + 360) % 360) / 30);
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
    const sunEntry = useMemo(() => entries.find(e => e.id === "sun"), [entries]);

    // ── Collision avoidance: offset overlapping planets ──
    const adjustedPlanets = useMemo(() => {
        const sorted = [...orbitingPlanets];
        const adjusted: typeof orbitingPlanets = [];
        const MIN_ANGULAR_GAP = 6; // degrees

        for (const planet of sorted) {
            const cfg = ORBIT_CONFIG[planet.id];
            if (!cfg) { adjusted.push(planet); continue; }

            let lon = planet.telemetry.longitude;
            let hasCollision = true;
            let attempts = 0;

            while (hasCollision && attempts < 8) {
                hasCollision = false;
                for (const placed of adjusted) {
                    const placedCfg = ORBIT_CONFIG[placed.id];
                    if (!placedCfg) continue;

                    // Only check collision if orbits are close (within 2 radius steps)
                    const radiusDiff = Math.abs(cfg.radius - placedCfg.radius);
                    if (radiusDiff > 8) continue;

                    let lonDiff = Math.abs(lon - placed.telemetry.longitude);
                    if (lonDiff > 180) lonDiff = 360 - lonDiff;

                    if (lonDiff < MIN_ANGULAR_GAP && radiusDiff < 5) {
                        // Nudge the planet's longitude slightly for display
                        lon += MIN_ANGULAR_GAP - lonDiff + 1;
                        lon = ((lon % 360) + 360) % 360;
                        hasCollision = true;
                        break;
                    }
                }
                attempts++;
            }

            adjusted.push({ ...planet, _displayLongitude: lon } as PlanetRadarEntry & { _displayLongitude?: number });
        }
        return adjusted;
    }, [orbitingPlanets]);

    return (
        <section className="relative w-full">
            {/* Section Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12 md:mb-16"
            >
                <div className="inline-flex items-center gap-2 mb-4">
                    <span className="relative flex h-2.5 w-2.5 mr-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                    </span>
                    {/* <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-green-400/80">Live Transmission</span> */}
                    <h2 className="text-3xl md:text-5xl font-serif text-foreground tracking-tight">
                        Live Planetary <span className="text-primary">Positions</span>
                    </h2>
                </div>



            </motion.div>

            {/* ═══════════════════════════════════════════════════════════════
                DESKTOP: Bird's eye orbital view with zodiac wheel
                Sun center, planets on orbits at live longitude angles
            ═══════════════════════════════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="hidden md:block max-w-5xl mx-auto mb-12 md:mb-16"
            >
                {/*
                    overflow-visible so tooltips escape freely.
                    The zodiac ring is clipped internally via a separate wrapper.
                */}
                <div className="relative mx-auto aspect-square overflow-visible" style={{ maxWidth: 800 }}>
                    {/* ── Zodiac Wheel (clipped to circular boundary so pie-slice tints stay inside the circle) ── */}
                    <div className="absolute inset-0 pointer-events-none" style={{ clipPath: "circle(50%)" }}>
                        {ZODIAC_SIGNS.map((signId, i) => {
                            const startDeg = i * 30;
                            const midDeg = startDeg + 15;
                            const SignIcon = zodiacUIConfig[signId]?.icon;
                            // Convert to CSS conic-gradient: 0° = 12 o'clock = top
                            // Our longitude system: 0° Aries = 12 o'clock, increasing CCW
                            // CSS conic-gradient: 0° = top, increasing CW
                            // So we need to negate: CSS angle = -longitudeDeg
                            const gradientStart = -startDeg - 30;
                            const gradientEnd = -startDeg;

                            // Position icon at midpoint of sign segment, on outer ring
                            const midRad = ((midDeg) * Math.PI) / 180;
                            const iconRadiusPct = 48;
                            const iconX = -Math.sin(midRad) * iconRadiusPct;
                            const iconY = -Math.cos(midRad) * iconRadiusPct;

                            const isEven = i % 2 === 0;

                            return (
                                <div key={signId + "-zodiac"}>
                                    {/* Sign segment tint */}
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            background: `conic-gradient(from ${gradientStart}deg at 50% 50%, ${isEven ? "rgba(255,255,255,0.015)" : "transparent"} 0deg, ${isEven ? "rgba(255,255,255,0.015)" : "transparent"} 30deg, transparent 30deg)`,
                                        }}
                                    />
                                    {/* Segment divider line */}
                                    <div
                                        className="absolute left-1/2 top-1/2 w-px origin-bottom"
                                        style={{
                                            height: "48%",
                                            transform: `rotate(${-startDeg}deg)`,
                                            background: "linear-gradient(to top, transparent 60%, rgba(255,255,255,0.06) 100%)",
                                        }}
                                    />
                                    {/* Sign icon */}
                                    {SignIcon && (
                                        <div
                                            className="absolute -translate-x-1/2 -translate-y-1/2"
                                            style={{
                                                left: `${50 + iconX}%`,
                                                top: `${50 + iconY}%`,
                                            }}
                                        >
                                            <SignIcon
                                                className="text-white/25"
                                                size={22}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Orbit rings — concentric circles scaled from center */}
                    {Object.entries(ORBIT_CONFIG).map(([id, cfg]) => (
                        <div
                            key={id + "-orbit"}
                            className="absolute inset-0 rounded-full border border-white/[0.04] pointer-events-none"
                            style={{ transform: `scale(${cfg.radius * 2 / 100})` }}
                        />
                    ))}

                    {/* ── Circular boundary rings ── */}
                    <div className="absolute inset-0 rounded-full border-2 border-white/[0.06] pointer-events-none" />
                    <div className="absolute inset-[2px] rounded-full border border-white/[0.03] pointer-events-none" />

                    {/* ── Sun (dead center) ── */}
                    <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[z-index] duration-200 ${highlightedId === "sun" ? "z-50" : "z-10"}`}>
                        <div className="relative">
                            <div className="absolute -inset-14 rounded-full opacity-25 blur-3xl" style={{ background: "var(--sun)" }} />
                            <Link href="/learn/planets/sun" className="relative block group" onMouseEnter={() => setHighlightedId("sun")} onMouseLeave={() => setHighlightedId(null)}>
                                <img
                                    src={planetUIConfig.sun.imageUrl}
                                    alt="Sun"
                                    className="w-24 h-24 object-contain transition-transform duration-300 group-hover:scale-110"
                                    style={{ filter: "drop-shadow(0 0 20px rgba(212,175,55,0.4))" }}
                                />
                                {/* Sun tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                    <div className="bg-black/95 border border-white/10 rounded-md px-3 py-2 text-center whitespace-nowrap backdrop-blur-sm">
                                        <div className="text-xs font-serif text-white">Sun</div>
                                        {sunEntry && (
                                            <>
                                                <div className="text-[10px] font-mono text-white/50">
                                                    {sunEntry.signName} · {sunEntry.telemetry.longitude.toFixed(1)}°
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                                        <div className="w-2 h-2 bg-black/95 border-r border-b border-white/10 rotate-45" />
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* ── Planets on orbits ── */}
                    {adjustedPlanets.map((entry, i) => {
                        const cfg = ORBIT_CONFIG[entry.id];
                        if (!cfg) return null;

                        const displayLon = (entry as PlanetRadarEntry & { _displayLongitude?: number })._displayLongitude ?? entry.telemetry.longitude;
                        const offset = longitudeToOffset(displayLon, cfg.radius);
                        const isHighlighted = entry.id === highlightedId;
                        const isRetrograde = entry.telemetry.retrograde;
                        const isInTopHalf = offset.topPct < 50;

                        return (
                            <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, scale: 0 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.3 + i * 0.06, type: "spring", stiffness: 180 }}
                                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-[z-index] duration-200 ${isHighlighted ? "z-50" : "z-10"}`}
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

                                    {/* Tooltip — flips below when planet is in top half */}
                                    <div
                                        className={`absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 ${isInTopHalf
                                            ? "top-full mt-3"
                                            : "bottom-full mb-3"
                                            }`}
                                    >
                                        <div className="bg-black/95 border border-white/10 rounded-md px-3 py-2 text-center whitespace-nowrap backdrop-blur-sm">
                                            <div className="text-xs font-serif text-white">{entry.name}</div>
                                            <div className="text-[10px] font-mono text-white/50">
                                                {entry.signName} · {entry.telemetry.longitude.toFixed(1)}°
                                            </div>
                                            {isRetrograde && (
                                                <div className="text-[10px] text-orange-400 font-mono">RETROGRADE</div>
                                            )}
                                        </div>
                                        {/* Arrow — flips with tooltip */}
                                        <div className={`absolute left-1/2 -translate-x-1/2 ${isInTopHalf
                                            ? "bottom-full -mb-px"
                                            : "top-full -mt-px"
                                            }`}>
                                            <div className={`w-2 h-2 bg-black/95 border-white/10 rotate-45 ${isInTopHalf
                                                ? "border-l border-t"
                                                : "border-r border-b"
                                                }`} />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            {/* ═══════════════════════════════════════════════════════════════
                MOBILE: Horizontal ecliptic strip with zodiac reference
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

                        {/* Zodiac sign tick marks along the strip */}
                        {ZODIAC_SIGNS.map((signId, i) => {
                            const SignIcon = zodiacUIConfig[signId]?.icon;
                            const pct = (i * 30) / 360;
                            return (
                                <div
                                    key={signId + "-tick"}
                                    className="absolute top-1/2 -translate-x-1/2 pointer-events-none"
                                    style={{ left: `${4 + pct * 92}%` }}
                                >
                                    <div className="h-3 w-px bg-white/[0.08] -translate-y-1/2" />
                                    <div className="mt-2 -translate-x-1/2 left-1/2 relative">
                                        {SignIcon && <SignIcon className="text-white/10" size={10} />}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Collision avoidance for mobile strip */}
                        {(() => {
                            type MobileEntry = PlanetRadarEntry & { _xPct?: number };
                            const sorted: MobileEntry[] = [...entries].sort(
                                (a, b) => a.telemetry.longitude - b.telemetry.longitude
                            );
                            const MIN_GAP = 7; // % of track width
                            for (let j = 1; j < sorted.length; j++) {
                                const prevPct = sorted[j - 1]._xPct ?? (4 + (sorted[j - 1].telemetry.longitude / 360) * 92);
                                const rawPct = 4 + (sorted[j].telemetry.longitude / 360) * 92;
                                if (rawPct - prevPct < MIN_GAP) {
                                    sorted[j]._xPct = prevPct + MIN_GAP;
                                } else {
                                    sorted[j]._xPct = rawPct;
                                }
                            }

                            return sorted.map((entry, i) => {
                                const xPct = entry._xPct ?? (4 + (entry.telemetry.longitude / 360) * 92);
                                const isRetrograde = entry.telemetry.retrograde;

                                return (
                                    <motion.div
                                        key={entry.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.3, delay: 0.15 + i * 0.04 }}
                                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                                        style={{ left: `${xPct}%` }}
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
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                                <div className="bg-black/95 border border-white/10 rounded-md px-2.5 py-1.5 text-center whitespace-nowrap backdrop-blur-sm">
                                                    <div className="text-[10px] font-serif text-white">{entry.name}</div>
                                                    <div className="text-[9px] font-mono text-white/40">{entry.signName} · {entry.telemetry.longitude.toFixed(0)}°</div>
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            });
                        })()}
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
