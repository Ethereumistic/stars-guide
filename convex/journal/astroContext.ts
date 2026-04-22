/**
 * astroContext.ts — Builds the automatic astrological context
 * attached to every journal entry at creation time.
 *
 * Derives from the existing `cosmicWeather` table + user birth data.
 * Zero external API calls.
 */
import { internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";

// Simple aspect type from sign comparison (whole-sign aspects)
function signAspectType(signA: string, signB: string): string | null {
    const SIGN_ORDER = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
    ];
    const idxA = SIGN_ORDER.indexOf(signA);
    const idxB = SIGN_ORDER.indexOf(signB);
    if (idxA === -1 || idxB === -1) return null;

    const diff = ((idxB - idxA + 12) % 12);
    if (diff === 0) return "conjunction";   // Same sign
    if (diff === 6) return "opposition";     // Opposite sign
    if (diff === 3 || diff === 9) return "square";
    if (diff === 4 || diff === 8) return "trine";
    if (diff === 2 || diff === 10) return "sextile";
    return null; // No major aspect by sign
}

/**
 * buildAstroContext — Assembles the astrological snapshot for a journal entry.
 *
 * Called during entry creation. Returns a compact object with:
 * - moonPhase: from cosmicWeather
 * - moonSign: from planetPositions where planet === "Moon"
 * - sunSign: from planetPositions where planet === "Sun"
 * - retrogradePlanets: list of retrograde planet names
 * - activeTransits: transiting planets aspecting natal planets (sign-level)
 */
export async function buildAstroContext(
    ctx: any,
    userId: string,
    entryDate: string,
): Promise<{
    moonPhase: string;
    moonSign?: string;
    sunSign?: string;
    retrogradePlanets?: string[];
    activeTransits?: Array<{
        planet: string;
        sign: string;
        aspect?: string;
        house?: number;
    }>;
} | null> {
    // 1. Fetch cosmic weather for the entry date
    const cosmicWeather = await ctx.runQuery(internal.cosmicWeather.getForDate, {
        date: entryDate,
    });

    if (!cosmicWeather) {
        // No cosmic weather computed yet — return minimal context
        return null;
    }

    const result: any = {
        moonPhase: cosmicWeather.moonPhase.name,
    };

    // 2. Extract Moon and Sun signs from planet positions
    const moonPos = cosmicWeather.planetPositions.find((p: any) => p.planet === "Moon");
    const sunPos = cosmicWeather.planetPositions.find((p: any) => p.planet === "Sun");

    if (moonPos) result.moonSign = moonPos.sign;
    if (sunPos) result.sunSign = sunPos.sign;

    // 3. Retrograde planets
    const retrogrades = cosmicWeather.planetPositions
        .filter((p: any) => p.isRetrograde)
        .map((p: any) => p.planet);

    if (retrogrades.length > 0) {
        result.retrogradePlanets = retrogrades;
    }

    // 4. Active transits (transiting planet → natal planet sign-level aspects)
    //    Only compute if the user has birth data with a chart
    const user = await ctx.db.get(userId);
    if (user?.birthData?.chart) {
        const activeTransits: Array<{
            planet: string;
            sign: string;
            aspect?: string;
            house?: number;
        }> = [];

        // For each transiting planet, check if it aspects any natal planet by sign
        for (const transitingPlanet of cosmicWeather.planetPositions) {
            const transitingSign = transitingPlanet.sign;

            // Skip luminaries fast-movers for transit relevance
            if (transitingPlanet.planet === "Sun" || transitingPlanet.planet === "Moon") continue;

            for (const natalPlanet of user.birthData.chart.planets) {
                const natalSign = natalPlanet.signId;
                const aspect = signAspectType(transitingSign, natalSign);

                if (aspect) {
                    activeTransits.push({
                        planet: transitingPlanet.planet,
                        sign: transitingSign,
                        aspect,
                        house: natalPlanet.houseId,
                    });
                }
            }
        }

        // Keep only the most relevant (conjunctions, oppositions, squares)
        const priorityAspects = activeTransits.filter(
            (t) => t.aspect === "conjunction" || t.aspect === "opposition" || t.aspect === "square"
        );

        // Cap at 10 to keep context compact
        result.activeTransits = priorityAspects.slice(0, 10);
    }

    return result;
}