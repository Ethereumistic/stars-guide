/**
 * contextBuilder.ts — Derives dominant themes and energy signature from planet
 * positions and aspects without LLM involvement.
 *
 * Rule-based:
 * 1. Dominant element  — count planets per element (fire/earth/air/water)
 * 2. Stellium         — 3+ planets in the same sign flags a "concentrated" theme
 * 3. Aspect influence — hard aspects (square, opposition) push toward "intense"
 *                        soft aspects (trine, sextile) push toward "harmonious"
 * 4. Moon phase       — new/waning → inward; full/waxing → outward
 * 5. Retrograde count — 2+ retrograde planets → internal/reflective signature
 */

import type { CosmicWeatherSnapshot } from "../astronomyEngine";

// ─── Element Mapping ────────────────────────────────────────────────────────

const SIGN_TO_ELEMENT: Record<string, "fire" | "earth" | "air" | "water"> = {
    Aries: "fire",
    Taurus: "earth",
    Gemini: "air",
    Cancer: "water",
    Leo: "fire",
    Virgo: "earth",
    Libra: "air",
    Scorpio: "water",
    Sagittarius: "fire",
    Capricorn: "earth",
    Aquarius: "air",
    Pisces: "water",
};

const ELEMENT_LABELS: Record<string, string> = {
    fire: "fire",
    earth: "earth",
    air: "air",
    water: "water",
};

// ─── Theme Catalogue ────────────────────────────────────────────────────────

const PLANET_THEMES: Record<string, string[]> = {
    Sun: ["identity", "vitality", "purpose"],
    Moon: ["emotion", "instinct", "inner_life"],
    Mercury: ["communication", "thought", "short_travel"],
    Venus: ["relationship", "value", "beauty"],
    Mars: ["action", "desire", "assertion"],
    Jupiter: ["expansion", "belief", "growth"],
    Saturn: ["structure", "discipline", "boundary"],
    Uranus: ["breakthrough", "originality", "disruption"],
    Neptune: ["transcendence", "intuition", "dissolution"],
    Pluto: ["transformation", "power", "rebirth"],
};

const ASPECT_THEME_MODIFIERS: Record<string, { push: string[]; weight: number }> = {
    conjunction: { push: ["fusion", "intensity"], weight: 2 },
    opposition: { push: ["tension", "polarity"], weight: 1 },
    trine: { push: ["harmony", "ease"], weight: 0.5 },
    square: { push: ["friction", "challenge"], weight: 1 },
    sextile: { push: ["opportunity", "flow"], weight: 0.5 },
};

// ─── Types ─────────────────────────────────────────────────────────────────

export type ContextEnrichment = {
    dominantElement: string;
    dominantThemes: string[];
    energySignature: string;
    stelliumSign: string | null; // sign with 3+ planets, or null
    aspectSummary: string[];    // short descriptors of active aspect pattern
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function countBySign(
    positions: CosmicWeatherSnapshot["planetPositions"],
): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const p of positions) {
        counts[p.sign] = (counts[p.sign] ?? 0) + 1;
    }
    return counts;
}

function countByElement(
    positions: CosmicWeatherSnapshot["planetPositions"],
): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const p of positions) {
        const el = SIGN_TO_ELEMENT[p.sign] ?? "earth";
        counts[el] = (counts[el] ?? 0) + 1;
    }
    return counts;
}

function dominantElement(
    positions: CosmicWeatherSnapshot["planetPositions"],
): string {
    const byEl = countByElement(positions);
    let dominant = "earth";
    let max = 0;
    for (const [el, count] of Object.entries(byEl)) {
        if (count > max) {
            max = count;
            dominant = el;
        }
    }
    return ELEMENT_LABELS[dominant] ?? "earth";
}

function detectStellium(
    positions: CosmicWeatherSnapshot["planetPositions"],
): string | null {
    const bySign = countBySign(positions);
    for (const [sign, count] of Object.entries(bySign)) {
        if (count >= 3) return sign;
    }
    return null;
}

function derivePlanetThemes(
    positions: CosmicWeatherSnapshot["planetPositions"],
): string[] {
    const themes = new Set<string>();
    for (const p of positions) {
        const pts = PLANET_THEMES[p.planet] ?? [];
        for (const t of pts) themes.add(t);
    }
    return Array.from(themes);
}

function summariseAspects(
    aspects: CosmicWeatherSnapshot["activeAspects"],
): string[] {
    const summary: string[] = [];
    const counts = { square: 0, opposition: 0, trine: 0, sextile: 0, conjunction: 0 };
    for (const a of aspects) {
        if (a.aspect in counts) counts[a.aspect as keyof typeof counts]++;
    }

    if (counts.conjunction >= 2) summary.push("focal_point");
    if (counts.square + counts.opposition >= 3) summary.push("dynamic_tension");
    if (counts.trine >= 2) summary.push("harmonic_flow");
    if (counts.sextile >= 2) summary.push("opportunistic");
    if (counts.opposition >= 2) summary.push("polarity_axis");

    return summary;
}

function computeRetrogradeIntensity(
    positions: CosmicWeatherSnapshot["planetPositions"],
): number {
    return positions.filter((p) => p.isRetrograde).length;
}

function deriveEnergySignature(
    positions: CosmicWeatherSnapshot["planetPositions"],
    moonPhaseName: string,
    aspects: CosmicWeatherSnapshot["activeAspects"],
): string {
    const tokens: string[] = [];

    // ── Elemental base ──
    tokens.push(dominantElement(positions));

    // ── Moon phase direction ──
    const lp = moonPhaseName.toLowerCase();
    if (lp.includes("new") || lp.includes("waning")) {
        tokens.push("inward");
    } else if (lp.includes("full") || lp.includes("waxing")) {
        tokens.push("outward");
    }

    // ── Retrograde depth ──
    const retroCount = computeRetrogradeIntensity(positions);
    if (retroCount >= 2) tokens.push("internal");
    else if (retroCount === 1) tokens.push("reflective");

    // ── Aspect tone ──
    const hardCount =
        aspects.filter((a) => a.aspect === "square" || a.aspect === "opposition")
            .length;
    const softCount = aspects.filter(
        (a) => a.aspect === "trine" || a.aspect === "sextile",
    ).length;

    if (hardCount > softCount) tokens.push("intense");
    else if (softCount > hardCount) tokens.push("harmonious");
    else tokens.push("balanced");

    // ── Stellium modifier ──
    const stellium = detectStellium(positions);
    if (stellium) tokens.push("concentrated");

    // ── Retrograde planet emphasis ──
    if (retroCount >= 2) {
        const retroPlanets = positions
            .filter((p) => p.isRetrograde)
            .map((p) => p.planet.toLowerCase());
        if (retroPlanets.includes("mercury")) tokens.push("revisiting");
        if (retroPlanets.includes("mars")) tokens.push("delayed_action");
        if (retroPlanets.includes("pluto")) tokens.push("deep_transformation");
    }

    return tokens.join(", ");
}

// ─── Main API ───────────────────────────────────────────────────────────────

/**
 * buildContext — Derives all enrichment fields from a computed snapshot.
 *
 * @param snapshot  — output of computeSnapshot() from astronomyEngine.ts
 * @param moonPhaseName — e.g. "Waxing Gibbous" (passed explicitly to avoid
 *                       re-computing from within this pure function)
 */
export function buildContext(
    snapshot: CosmicWeatherSnapshot,
    moonPhaseName: string,
): ContextEnrichment {
    const positions = snapshot.planetPositions;
    const aspects = snapshot.activeAspects;

    const dominantThemes = derivePlanetThemes(positions);
    const stelliumSign = detectStellium(positions);
    const energySignature = deriveEnergySignature(
        positions,
        moonPhaseName,
        aspects,
    );
    const aspectSummary = summariseAspects(aspects);

    return {
        dominantElement: dominantElement(positions),
        dominantThemes,
        energySignature,
        stelliumSign,
        aspectSummary,
    };
}