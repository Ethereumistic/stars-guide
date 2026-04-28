/**
 * birthCalculator.ts — Oracle Birth Context Generator
 * 
 * Uses the existing astrology.ts module to calculate a full birth chart
 * from the user's birthData, then formats it into a token-efficient
 * context block for the Oracle prompt.
 * 
 * This is Oracle's critical advantage — every user's chart is pre-loaded.
 */

import { calculateFullChart, type ChartData } from "@/lib/birth-chart/full-chart";

export interface BirthContext {
    raw: ChartData;
    formatted: string;
}

/**
 * Calculates the full birth chart from user's birth data
 * and formats it as a structured context block for the LLM prompt.
 */
export function calculateBirthContext(birthData: {
    date: string;        // "2000-04-14"
    time: string;        // "15:17"
    location: {
        lat: number;
        long: number;
        city: string;
        country: string;
    };
    placements: { body: string; sign: string; house: number; }[];
}): BirthContext {
    // Parse birth date and time
    const [year, month, day] = birthData.date.split("-").map(Number);
    const [hours, minutes] = birthData.time.split(":").map(Number);

    // Calculate full chart using existing astronomy-engine wrapper
    const chart = calculateFullChart(
        year,
        month,
        day,
        hours,
        minutes,
        birthData.location.lat,
        birthData.location.long,
    );

    // Format into a token-efficient context block
    const formatted = formatBirthContext(birthData, chart);

    return { raw: chart, formatted };
}

/**
 * Formats the calculated chart into a structured prompt context block.
 * Designed to be token-efficient (~200 tokens) while maximally informative.
 */
function formatBirthContext(
    birthData: {
        date: string;
        time: string;
        location: { city: string; country: string };
        placements: { body: string; sign: string; house: number; }[];
    },
    chart: ChartData,
): string {
    const lines: string[] = [];

    lines.push("---BIRTH CONTEXT---");
    lines.push(`Born: ${birthData.date} at ${birthData.time}, ${birthData.location.city}, ${birthData.location.country}`);
    const sunSign = birthData.placements.find(p => p.body === "Sun")?.sign || "Unknown";
    const moonSign = birthData.placements.find(p => p.body === "Moon")?.sign || "Unknown";
    const risingSign = birthData.placements.find(p => p.body === "Ascendant")?.sign || "Unknown";
    
    lines.push(`Sun: ${sunSign} | Moon: ${moonSign} | Rising: ${risingSign}`);
    lines.push("");

    // Planet positions
    lines.push("Planetary Positions:");
    for (const planet of chart.planets) {
        const retroLabel = planet.retrograde ? " (℞)" : "";
        lines.push(`  ${planet.id}: ${planet.signId} (House ${planet.houseId})${retroLabel}`);
    }
    lines.push("");

    // House cusps (summarized)
    if (chart.houses.length > 0) {
        lines.push("House Signs:");
        const houseSummary = chart.houses
            .map((h) => `H${h.id}:${h.signId}`)
            .join(" | ");
        lines.push(`  ${houseSummary}`);
        lines.push("");
    }

    // Aspects
    if (chart.aspects.length > 0) {
        lines.push("Key Aspects:");
        for (const aspect of chart.aspects) {
            lines.push(`  ${aspect.planet1} ${aspect.type} ${aspect.planet2} (orb: ${aspect.orb.toFixed(1)}°)`);
        }
        lines.push("");
    }

    // Ascendant
    if (chart.ascendant) {
        lines.push(`Ascendant: ${chart.ascendant.signId} at ${chart.ascendant.longitude.toFixed(1)}°`);
    }

    lines.push("---END BIRTH CONTEXT---");

    return lines.join("\n");
}

/**
 * Generates a degraded birth context when birth time is missing.
 * No ascendant, no house cusps, uses noon chart approximation.
 */
export function calculateDegradedBirthContext(birthData: {
    date: string;
    location: {
        lat: number;
        long: number;
        city: string;
        country: string;
    };
    placements: { body: string; sign: string; house: number; }[];
}): BirthContext {
    const [year, month, day] = birthData.date.split("-").map(Number);

    // Use noon approximation
    const chart = calculateFullChart(
        year,
        month,
        day,
        12, // noon
        0,
        birthData.location.lat,
        birthData.location.long,
    );

    const lines: string[] = [];
    lines.push("---BIRTH CONTEXT---");
    lines.push(`Born: ${birthData.date} (exact time unknown — noon chart approximation), ${birthData.location.city}, ${birthData.location.country}`);
    const sunSign = birthData.placements.find(p => p.body === "Sun")?.sign || "Unknown";
    const moonSign = birthData.placements.find(p => p.body === "Moon")?.sign || "Unknown";

    lines.push(`Sun: ${sunSign} | Moon: ${moonSign} (approximate) | Rising: Unknown (requires exact birth time)`);
    lines.push("⚠ NOTE: Without exact birth time, house placements and Rising sign are approximate. Interpret Ascendant-dependent insights with this caveat.");
    lines.push("");

    lines.push("Planetary Positions (noon approximation):");
    for (const planet of chart.planets) {
        const retroLabel = planet.retrograde ? " (℞)" : "";
        lines.push(`  ${planet.id}: ${planet.signId}${retroLabel}`);
    }
    lines.push("");

    if (chart.aspects.length > 0) {
        lines.push("Key Aspects:");
        for (const aspect of chart.aspects) {
            lines.push(`  ${aspect.planet1} ${aspect.type} ${aspect.planet2} (orb: ${aspect.orb.toFixed(1)}°)`);
        }
    }

    lines.push("---END BIRTH CONTEXT---");

    return { raw: chart, formatted: lines.join("\n") };
}
