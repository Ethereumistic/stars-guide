"use client";

import { useEffect, useState } from "react";
import * as Astronomy from "astronomy-engine";
import { getPlanetTelemetry, type PlanetTelemetry } from "@/lib/planets/telemetry";
import { planetUIConfig } from "@/config/planet-ui";
import { compositionalSigns } from "@/astrology/signs";
import { compositionalPlanets } from "@/astrology/planets";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { elementUIConfig } from "@/config/elements-ui";
import { ElementType } from "@/astrology/elements";
import { SignSeason } from "./cosmic-today/sign-season";
import { LunarPhase } from "./cosmic-today/lunar-phase";
import { Retrograde } from "./cosmic-today/retrograde";
import { CosmicConnections } from "./cosmic-today/cosmic-connections";

const PLANET_IDS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;

const RETROGRADE_PLANETS = [
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
] as const;

export interface RetrogradeWindow {
    planetId: string;
    planetName: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    daysLeft: number | null;
}

/**
 * Find the next retrograde window for a planet — either currently active or upcoming.
 * Mirrors the logic from astronomical-engine-slide.tsx.
 */
function findNextRetrogradeWindow(planetId: string, fromDate: Date): RetrogradeWindow | null {
    const planet = compositionalPlanets.find(p => p.id === planetId);
    if (!planet) return null;

    const maxScanDays = 730;
    const todayTelemetry = getPlanetTelemetry(planetId, fromDate);
    const currentlyRetro = todayTelemetry?.retrograde ?? false;

    if (currentlyRetro) {
        // Currently retrograde — find the end date
        const d = new Date(fromDate);
        for (let i = 0; i < maxScanDays; i++) {
            d.setDate(d.getDate() + 1);
            const t = getPlanetTelemetry(planetId, d);
            if (t && !t.retrograde) {
                return {
                    planetId,
                    planetName: planet.name,
                    startDate: new Date(fromDate),
                    endDate: new Date(d),
                    isActive: true,
                    daysLeft: Math.round((d.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)),
                };
            }
        }
        return null;
    }

    // Not currently retrograde — find the next one
    const scanStart = new Date(fromDate);
    for (let i = 0; i < maxScanDays; i++) {
        scanStart.setDate(scanStart.getDate() + 1);
        const t = getPlanetTelemetry(planetId, scanStart);
        if (t?.retrograde) {
            const startDate = new Date(scanStart);
            const scanEnd = new Date(startDate);
            for (let j = 0; j < maxScanDays; j++) {
                scanEnd.setDate(scanEnd.getDate() + 1);
                const endT = getPlanetTelemetry(planetId, scanEnd);
                if (endT && !endT.retrograde) {
                    return {
                        planetId,
                        planetName: planet.name,
                        startDate,
                        endDate: new Date(scanEnd),
                        isActive: false,
                        daysLeft: Math.round((startDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)),
                    };
                }
            }
            break;
        }
    }
    return null;
}

/**
 * Find the most relevant retrograde to display:
 * - If any planet is currently retrograde, pick the one ending soonest.
 * - Otherwise, pick the next upcoming retrograde across all planets.
 */
export function findFeaturedRetrograde(fromDate: Date): RetrogradeWindow | null {
    const windows: RetrogradeWindow[] = [];

    for (const planetId of RETROGRADE_PLANETS) {
        const w = findNextRetrogradeWindow(planetId, fromDate);
        if (w) windows.push(w);
    }

    if (windows.length === 0) return null;

    // Prioritize active retrogrades, sorted by daysLeft ascending (ending soonest first)
    const active = windows.filter(w => w.isActive).sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
    if (active.length > 0) return active[0];

    // No active retrogrades — return the next upcoming one
    return windows.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
}

export interface TransitEntry {
    id: string;
    name: string;
    telemetry: PlanetTelemetry;
    signData: typeof compositionalSigns[number];
}

export function getMoonPhaseInfo(phaseAngle: number): { name: string; illumination: number } {
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
export function buildTransitEntry(id: string): TransitEntry | null {
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

export function CosmicToday() {
    const [transits, setTransits] = useState<TransitEntry[]>([]);
    const [moonPhase, setMoonPhase] = useState<{ name: string; illumination: number } | null>(null);
    const [moonPhaseAngle, setMoonPhaseAngle] = useState<number>(0);
    const [sunEntry, setSunEntry] = useState<TransitEntry | null>(null);
    const [moonEntry, setMoonEntry] = useState<TransitEntry | null>(null);
    const [retrogradeWindow, setRetrogradeWindow] = useState<RetrogradeWindow | null>(null);

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

        const featured = findFeaturedRetrograde(now);
        setRetrogradeWindow(featured);
    }, []);

    if (!sunEntry) return null;

    // Build a TransitEntry for the retrograde planet (for sign data etc.)
    const retrogradeEntry = retrogradeWindow
        ? buildTransitEntry(retrogradeWindow.planetId)
        : null;

    return (
        <section className="relative w-full overflow-hidden">
            {/* ═════════════ MAIN FEATURE ═════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1600px] mx-auto mb-8">

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

                {retrogradeWindow && retrogradeEntry && (
                    <Retrograde
                        window={retrogradeWindow}
                        planetId={retrogradeEntry.id}
                        planetName={retrogradeEntry.name}
                        telemetry={retrogradeEntry.telemetry}
                        signData={retrogradeEntry.signData}
                    />
                )}
            </div>

            {/* ═════════════ COSMIC CONNECTIONS ═════════════ */}
            {/* <CosmicConnections /> */}
        </section>
    );
}
