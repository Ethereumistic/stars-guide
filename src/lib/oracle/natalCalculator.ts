/**
 * natalCalculator.ts — Oracle Natal Context Generator
 * 
 * Uses the existing astrology.ts module to calculate a full natal chart
 * from the user's birthData, then formats it into a token-efficient
 * context block for the Oracle prompt.
 * 
 * This is Oracle's critical advantage — every user's chart is pre-loaded.
 */

import { calculateFullChart, type ChartData } from "@/lib/astrology";

export interface NatalContext {
    raw: ChartData;
    formatted: string;
}

/**
 * Calculates the full natal chart from user's birth data
 * and formats it as a structured context block for the LLM prompt.
 */
export function calculateNatalContext(birthData: {
    date: string;        // "2000-04-14"
    time: string;        // "15:17"
    location: {
        lat: number;
        long: number;
        city: string;
        country: string;
    };
    sunSign: string;
    moonSign: string;
    risingSign: string;
}): NatalContext {
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
    const formatted = formatNatalContext(birthData, chart);

    return { raw: chart, formatted };
}

/**
 * Formats the calculated chart into a structured prompt context block.
 * Designed to be token-efficient (~200 tokens) while maximally informative.
 */
function formatNatalContext(
    birthData: {
        date: string;
        time: string;
        location: { city: string; country: string };
        sunSign: string;
        moonSign: string;
        risingSign: string;
    },
    chart: ChartData,
): string {
    const lines: string[] = [];

    lines.push("---NATAL CONTEXT---");
    lines.push(`Born: ${birthData.date} at ${birthData.time}, ${birthData.location.city}, ${birthData.location.country}`);
    lines.push(`Sun: ${birthData.sunSign} | Moon: ${birthData.moonSign} | Rising: ${birthData.risingSign}`);
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

    lines.push("---END NATAL CONTEXT---");

    return lines.join("\n");
}

/**
 * Generates a degraded natal context when birth time is missing.
 * No ascendant, no house cusps, uses noon chart approximation.
 */
export function calculateDegradedNatalContext(birthData: {
    date: string;
    location: {
        lat: number;
        long: number;
        city: string;
        country: string;
    };
    sunSign: string;
    moonSign: string;
}): NatalContext {
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
    lines.push("---NATAL CONTEXT---");
    lines.push(`Born: ${birthData.date} (exact time unknown — noon chart approximation), ${birthData.location.city}, ${birthData.location.country}`);
    lines.push(`Sun: ${birthData.sunSign} | Moon: ${birthData.moonSign} (approximate) | Rising: Unknown (requires exact birth time)`);
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

    lines.push("---END NATAL CONTEXT---");

    return { raw: chart, formatted: lines.join("\n") };
}
