"use client";

import { useEffect, useState } from "react";
import * as Astronomy from "astronomy-engine";
import { getPlanetTelemetry, type PlanetTelemetry } from "@/lib/planets/telemetry";
import { planetUIConfig } from "@/config/planet-ui";
import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { elementUIConfig } from "@/config/elements-ui";
import { ElementType } from "@/astrology/elements";
import { SignSeason } from "./cosmic-today/sign-season";
import { LunarPhase } from "./cosmic-today/lunar-phase";
import { Retrograde } from "./cosmic-today/retrograde";
import { CosmicConnections } from "./cosmic-today/cosmic-connections";

const PLANET_IDS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;

interface TransitEntry {
    id: string;
    name: string;
    telemetry: PlanetTelemetry;
    signData: typeof compositionalSigns[number];
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

/**
 * Build a TransitEntry for a given planet ID. Returns null if data is missing.
 */
function buildTransitEntry(id: string): TransitEntry | null {
    const t = getPlanetTelemetry(id, new Date());
    const ui = planetUIConfig[id];
    if (!t || !ui) return null;
    const sign = compositionalSigns.find(s => s.id === t.signId);
    const signUi = zodiacUIConfig[t.signId];
    if (!sign || !signUi) return null;
    return {
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        telemetry: t,
        signData: sign,
    };
}

export interface CosmicTodayProps {
    /**
     * Force a retrograde card for a planet, even if it's not currently retrograde.
     * Set to a planet ID like "mercury" to debug. Remove or set to undefined to go live.
     */
    debugRetrogradePlanet?: string;
}

export function CosmicToday({ debugRetrogradePlanet }: CosmicTodayProps = {}) {
    const [transits, setTransits] = useState<TransitEntry[]>([]);
    const [moonPhase, setMoonPhase] = useState<{ name: string; illumination: number } | null>(null);
    const [moonPhaseAngle, setMoonPhaseAngle] = useState<number>(0);
    const [sunEntry, setSunEntry] = useState<TransitEntry | null>(null);
    const [moonEntry, setMoonEntry] = useState<TransitEntry | null>(null);

    useEffect(() => {
        const now = new Date();
        const results: TransitEntry[] = [];

        for (const id of PLANET_IDS) {
            const entry = buildTransitEntry(id);
            if (entry) results.push(entry);
        }

        setTransits(results);
        setSunEntry(results.find(e => e.id === "sun") ?? null);
        setMoonEntry(results.find(e => e.id === "moon") ?? null);

        const moonElongation = Astronomy.MoonPhase(now);
        const phaseInfo = getMoonPhaseInfo(moonElongation);
        setMoonPhase(phaseInfo);
        setMoonPhaseAngle(moonElongation);
    }, []);

    if (!sunEntry) return null;

    // Real retrogrades (planets actually retrograde right now)
    const retrogradeEntries = transits.filter(e => e.telemetry.retrograde);

    // If debug planet is set, ensure it's in the list (avoid duplicate if already retrograde)
    const debugAlreadyRetro = retrogradeEntries.some(e => e.id === debugRetrogradePlanet);
    let debugEntry: TransitEntry | null = null;
    if (debugRetrogradePlanet && !debugAlreadyRetro) {
        debugEntry = buildTransitEntry(debugRetrogradePlanet);
    }

    const allRetroEntries = [...retrogradeEntries, ...(debugEntry ? [debugEntry] : [])];
    const showGrid = allRetroEntries.length > 0;

    return (
        <section className="relative w-full overflow-hidden">
            {/* ═════════════ MAIN FEATURE ═════════════ */}
            <div className={`grid grid-cols-1 gap-6 max-w-[1600px] mx-auto mb-8 ${showGrid ? "lg:grid-cols-3" : "lg:grid-cols-2"
                }`}>

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
                    />
                )}

                {allRetroEntries.map((entry) => (
                    <Retrograde
                        key={entry.id}
                        planetId={entry.id}
                        planetName={entry.name}
                        telemetry={entry.telemetry}
                        signData={entry.signData}
                    />
                ))}
            </div>

            {/* ═════════════ COSMIC CONNECTIONS ═════════════ */}
            <CosmicConnections />
        </section>
    );
}
