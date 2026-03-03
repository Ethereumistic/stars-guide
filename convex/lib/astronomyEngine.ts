/**
 * astronomyEngine.ts — Pure computation layer for cosmic weather.
 *
 * Takes a UTC date string and returns a structured snapshot of planet
 * positions, moon phase, active aspects, and retrograde status.
 * Has NO Convex dependencies — can be unit tested in isolation.
 */
import * as Astronomy from "astronomy-engine";

// ─── TRACKED BODIES ───────────────────────────────────────────────────────
// The 9 classical + modern planets tracked by Stars.Guide
const TRACKED_PLANETS: Astronomy.Body[] = [
    Astronomy.Body.Sun,
    Astronomy.Body.Moon,
    Astronomy.Body.Mercury,
    Astronomy.Body.Venus,
    Astronomy.Body.Mars,
    Astronomy.Body.Jupiter,
    Astronomy.Body.Saturn,
    Astronomy.Body.Uranus,
    Astronomy.Body.Neptune,
];

// Human-readable names for each tracked body
const PLANET_NAMES: Partial<Record<Astronomy.Body, string>> = {
    [Astronomy.Body.Sun]: "Sun",
    [Astronomy.Body.Moon]: "Moon",
    [Astronomy.Body.Mercury]: "Mercury",
    [Astronomy.Body.Venus]: "Venus",
    [Astronomy.Body.Mars]: "Mars",
    [Astronomy.Body.Jupiter]: "Jupiter",
    [Astronomy.Body.Saturn]: "Saturn",
    [Astronomy.Body.Uranus]: "Uranus",
    [Astronomy.Body.Neptune]: "Neptune",
};

// ─── ZODIAC MAPPING ──────────────────────────────────────────────────────
const ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

/**
 * Convert ecliptic longitude (0–360°) to zodiac sign + degree within sign.
 */
function longitudeToSign(lon: number): { sign: string; degreeInSign: number } {
    const normalized = ((lon % 360) + 360) % 360;
    const signIndex = Math.floor(normalized / 30);
    return {
        sign: ZODIAC_SIGNS[signIndex],
        degreeInSign: parseFloat((normalized % 30).toFixed(2)),
    };
}

// ─── GEOCENTRIC LONGITUDE ────────────────────────────────────────────────

/**
 * getGeocentricLongitude — Returns the ecliptic longitude of a body
 * as seen from Earth (geocentric).
 *
 * IMPORTANT: `Astronomy.EclipticLongitude()` computes HELIOCENTRIC
 * longitude and throws for the Sun (since the Sun IS the center).
 * The Moon also needs special handling since it orbits Earth.
 *
 * - Sun  → use `SunPosition().elon` (geocentric ecliptic longitude)
 * - Moon → use `EclipticGeoMoon().lon` (geocentric ecliptic longitude)
 * - Others → use `EclipticLongitude()` (heliocentric ≈ geocentric for sign)
 */
function getGeocentricLongitude(body: Astronomy.Body, date: Date): number {
    if (body === Astronomy.Body.Sun) {
        // SunPosition returns geocentric ecliptic coordinates
        const sunPos = Astronomy.SunPosition(date);
        return sunPos.elon;
    }
    if (body === Astronomy.Body.Moon) {
        // EclipticGeoMoon returns geocentric ecliptic coordinates for the Moon
        const moonPos = Astronomy.EclipticGeoMoon(date);
        return moonPos.lon;
    }
    // For all other planets, heliocentric longitude from EclipticLongitude
    // is a close enough approximation for zodiac sign placement
    return Astronomy.EclipticLongitude(body, date);
}

// ─── MOON PHASE ──────────────────────────────────────────────────────────

/**
 * Determine moon phase name and illumination from the phase angle.
 * Phase angle: 0° = New Moon, 180° = Full Moon.
 */
function getMoonPhaseName(date: Date): { name: string; illuminationPercent: number } {
    const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
    const phaseDeg = illum.phase_angle; // 0 = new, 180 = full
    const illumPct = parseFloat((illum.phase_fraction * 100).toFixed(1));

    let name: string;
    if (phaseDeg < 22.5) name = "New Moon";
    else if (phaseDeg < 67.5) name = "Waxing Crescent";
    else if (phaseDeg < 112.5) name = "First Quarter";
    else if (phaseDeg < 157.5) name = "Waxing Gibbous";
    else if (phaseDeg < 202.5) name = "Full Moon";
    else if (phaseDeg < 247.5) name = "Waning Gibbous";
    else if (phaseDeg < 292.5) name = "Last Quarter";
    else if (phaseDeg < 337.5) name = "Waning Crescent";
    else name = "New Moon";

    return { name, illuminationPercent: illumPct };
}

// ─── RETROGRADE DETECTION ────────────────────────────────────────────────
// Planets that can be retrograde (Sun and Moon never go retrograde)
const RETROGRADE_CANDIDATES: Astronomy.Body[] = [
    Astronomy.Body.Mercury,
    Astronomy.Body.Venus,
    Astronomy.Body.Mars,
    Astronomy.Body.Jupiter,
    Astronomy.Body.Saturn,
    Astronomy.Body.Uranus,
    Astronomy.Body.Neptune,
];

/**
 * Detect retrograde by comparing geocentric longitude over a 1-day window.
 * If the longitude decreased (moved backward), the planet is retrograde.
 */
function isRetrograde(body: Astronomy.Body, date: Date): boolean {
    if (!RETROGRADE_CANDIDATES.includes(body)) return false;

    // Compare longitude at date vs 1 day later
    const nextDay = new Date(date.getTime() + 86400000); // +24h
    const lonToday = getGeocentricLongitude(body, date);
    const lonTomorrow = getGeocentricLongitude(body, nextDay);

    // Handle wrap-around at 360° → 0°
    let diff = lonTomorrow - lonToday;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    // Negative diff = planet moved backward = retrograde
    return diff < 0;
}

// ─── ASPECTS ─────────────────────────────────────────────────────────────
const ASPECT_ANGLES = [
    { name: "conjunction", angle: 0 },
    { name: "opposition", angle: 180 },
    { name: "trine", angle: 120 },
    { name: "square", angle: 90 },
    { name: "sextile", angle: 60 },
];
const ORB_THRESHOLD = 3; // Orb ≤ 3° for an aspect to be "active"

// ─── TYPES ───────────────────────────────────────────────────────────────
export type CosmicWeatherSnapshot = {
    planetPositions: {
        planet: string;
        sign: string;
        degreeInSign: number;
        isRetrograde: boolean;
    }[];
    moonPhase: { name: string; illuminationPercent: number };
    activeAspects: {
        planet1: string;
        planet2: string;
        aspect: string;
        orbDegrees: number;
    }[];
};

// ─── MAIN COMPUTATION ────────────────────────────────────────────────────

/**
 * computeSnapshot — Computes the full astronomical snapshot for a given
 * UTC date. Uses noon UTC for positional stability (avoids sign-boundary
 * edge cases at midnight).
 *
 * @param utcDate - "YYYY-MM-DD" format
 * @returns CosmicWeatherSnapshot
 */
export function computeSnapshot(utcDate: string): CosmicWeatherSnapshot {
    // Use noon UTC on the target date for stability
    const date = new Date(`${utcDate}T12:00:00Z`);

    // ── Planet positions + retrograde status ──
    // Uses getGeocentricLongitude() which correctly handles Sun/Moon
    const planetPositions = TRACKED_PLANETS.map((body) => {
        const lon = getGeocentricLongitude(body, date);
        const { sign, degreeInSign } = longitudeToSign(lon);
        return {
            planet: PLANET_NAMES[body] || body.toString(),
            sign,
            degreeInSign,
            isRetrograde: isRetrograde(body, date),
        };
    });

    // ── Moon phase ──
    const moonPhase = getMoonPhaseName(date);

    // ── Active aspects ──
    const activeAspects: CosmicWeatherSnapshot["activeAspects"] = [];
    const longitudes = TRACKED_PLANETS.map((body) => ({
        name: PLANET_NAMES[body] || body.toString(),
        lon: getGeocentricLongitude(body, date),
    }));

    for (let i = 0; i < longitudes.length; i++) {
        for (let j = i + 1; j < longitudes.length; j++) {
            const diff = Math.abs(longitudes[i].lon - longitudes[j].lon);
            const angle = diff > 180 ? 360 - diff : diff;
            for (const { name, angle: aspectAngle } of ASPECT_ANGLES) {
                const orb = Math.abs(angle - aspectAngle);
                if (orb <= ORB_THRESHOLD) {
                    activeAspects.push({
                        planet1: longitudes[i].name,
                        planet2: longitudes[j].name,
                        aspect: name,
                        orbDegrees: parseFloat(orb.toFixed(2)),
                    });
                }
            }
        }
    }

    return { planetPositions, moonPhase, activeAspects };
}
