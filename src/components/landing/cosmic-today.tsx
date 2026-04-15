"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import * as Astronomy from "astronomy-engine";
import { getPlanetTelemetry, type PlanetTelemetry } from "@/lib/planets/telemetry";
import { planetUIConfig } from "@/config/planet-ui";
import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { elementUIConfig } from "@/config/elements-ui";
import { ElementType } from "@/astrology/elements";
import { TbArrowRight } from "react-icons/tb";
import { SignSeason } from "./cosmic-today/sign-season";
import { LunarPhase } from "./cosmic-today/lunar-phase";

const PLANET_IDS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;

interface TransitEntry {
    id: string;
    name: string;
    telemetry: PlanetTelemetry;
    signName: string;
    signData: typeof compositionalSigns[number];
    signIcon: typeof zodiacUIConfig[string]["icon"];
    elementStyles: typeof elementUIConfig[ElementType]["styles"];
}

function getMoonPhaseInfo(phaseAngle: number): { name: string; illumination: number } {
    const illum = Math.round((1 - Math.cos(phaseAngle * Math.PI / 180)) / 2 * 100);
    if (phaseAngle < 22.5) return { name: "New Moon", illumination: illum };
    if (phaseAngle < 67.5) return { name: "Waxing Crescent", illumination: illum };
    if (phaseAngle < 112.5) return { name: "First Quarter", illumination: illum };
    if (phaseAngle < 157.5) return { name: "Waxing Gibbous", illumination: illum };
    if (phaseAngle < 202.5) return { name: "Full Moon", illumination: illum };
    if (phaseAngle < 247.5) return { name: "Waning Gibbous", illumination: illum };
    if (phaseAngle < 292.5) return { name: "Last Quarter", illumination: illum };
    return { name: "Waning Crescent", illumination: illum };
}

export function CosmicToday() {
    const [transits, setTransits] = useState<TransitEntry[]>([]);
    const [moonPhase, setMoonPhase] = useState<{ name: string; illumination: number } | null>(null);
    const [moonPhaseAngle, setMoonPhaseAngle] = useState<number>(0);
    const [sunEntry, setSunEntry] = useState<TransitEntry | null>(null);
    const [moonEntry, setMoonEntry] = useState<TransitEntry | null>(null);

    useEffect(() => {
        const now = new Date();
        const results: TransitEntry[] = [];

        for (const id of PLANET_IDS) {
            const t = getPlanetTelemetry(id, now);
            const ui = planetUIConfig[id];
            if (!t || !ui) continue;
            const sign = compositionalSigns.find(s => s.id === t.signId);
            const signUi = zodiacUIConfig[t.signId];
            const elUi = elementUIConfig[sign?.element ?? "Fire"];
            if (!sign || !signUi) continue;

            const entry: TransitEntry = {
                id,
                name: id.charAt(0).toUpperCase() + id.slice(1),
                telemetry: t,
                signName: sign.name,
                signData: sign,
                signIcon: signUi.icon,
                elementStyles: elUi.styles,
            };
            results.push(entry);
        }

        setTransits(results);
        setSunEntry(results.find(e => e.id === "sun") ?? null);
        setMoonEntry(results.find(e => e.id === "moon") ?? null);

        const illum = Astronomy.Illumination(Astronomy.Body.Moon, now);
        const phaseInfo = getMoonPhaseInfo(illum.phase_angle);
        setMoonPhase(phaseInfo);
        setMoonPhaseAngle(illum.phase_angle);
    }, []);

    const majorTransits = useMemo(() =>
        transits.filter(t => ["mercury", "venus", "mars", "jupiter", "saturn"].includes(t.id)),
        [transits]
    );

    const outerTransits = useMemo(() =>
        transits.filter(t => ["uranus", "neptune", "pluto"].includes(t.id)),
        [transits]
    );

    if (!sunEntry) return null;

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
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-green-400/80">
                        Live Cosmic Weather
                    </span>
                </div>
                <h2 className="text-3xl md:text-5xl font-serif text-foreground tracking-tight">
                    Today in the <span className="text-primary">Sky</span>
                </h2>

            </motion.div>

            {/* ═════════════ MAIN FEATURE ═════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto mb-8">

                <SignSeason
                    signData={sunEntry.signData}
                    signId={sunEntry.telemetry.signId}
                    telemetry={sunEntry.telemetry}
                />

                {moonEntry && moonPhase && (
                    <LunarPhase
                        signData={moonEntry.signData}
                        signId={moonEntry.telemetry.signId}
                        telemetry={moonEntry.telemetry}
                        moonPhase={moonPhase}
                        phaseAngle={moonPhaseAngle}
                        debugPhaseAngle={90}
                    />
                )}
            </div>

            {/* ═════════════ TRANSITS STRIP ═════════════ */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="max-w-5xl mx-auto"
            >
                <div className="border border-white/[0.06] rounded-md overflow-hidden bg-black/20">
                    <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">Planetary Transits</span>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                            </span>
                            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-green-500/60">live</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                        {majorTransits.map((entry) => {
                            const ui = planetUIConfig[entry.id];
                            const SignIcon = entry.signIcon;
                            return (
                                <Link
                                    key={entry.id}
                                    href={`/learn/planets/${entry.id}`}
                                    className="group px-5 py-4 border-b border-r border-white/[0.03] last:border-r-0 hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {ui?.imageUrl ? (
                                            <img
                                                src={ui.imageUrl}
                                                alt={entry.name}
                                                className="w-7 h-7 object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                                                style={{ filter: `drop-shadow(0 0 6px ${ui.themeColor}30)` }}
                                            />
                                        ) : (
                                            <span className="text-lg font-serif" style={{ color: ui?.themeColor }}>{ui?.rulerSymbol}</span>
                                        )}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-serif text-white/70 group-hover:text-white transition-colors">{entry.name}</span>
                                                {entry.telemetry.retrograde && (
                                                    <span className="text-[8px] font-mono text-orange-400 bg-orange-400/10 px-1 rounded-sm">R℞</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <SignIcon className="w-2.5 h-2.5 text-white/20" />
                                                <span className="text-[10px] font-mono text-white/40">{entry.signName}</span>
                                                <span className="text-[9px] font-mono text-white/20">{entry.telemetry.longitude.toFixed(1)}°</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-3 border-t border-white/[0.04]">
                        {outerTransits.map((entry) => {
                            const ui = planetUIConfig[entry.id];
                            return (
                                <Link
                                    key={entry.id}
                                    href={`/learn/planets/${entry.id}`}
                                    className="group px-5 py-3 border-r border-white/[0.03] last:border-r-0 hover:bg-white/[0.02] transition-colors flex items-center gap-3"
                                >
                                    {ui?.imageUrl ? (
                                        <img
                                            src={ui.imageUrl}
                                            alt={entry.name}
                                            className="w-5 h-5 object-contain opacity-50 group-hover:opacity-80 transition-opacity"
                                        />
                                    ) : (
                                        <span className="text-sm font-serif" style={{ color: ui?.themeColor }}>{ui?.rulerSymbol}</span>
                                    )}
                                    <span className="text-[10px] font-mono text-white/30 group-hover:text-white/50 transition-colors">{entry.name} in {entry.signName}</span>
                                    {entry.telemetry.retrograde && (
                                        <span className="text-[8px] font-mono text-orange-400/60">R℞</span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </motion.div>
        </section>
    );
}
