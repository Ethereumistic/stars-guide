/**
 * astronomyEngine.ts — Pure computation layer for cosmic weather.
 *
 * Takes a UTC date string and returns a structured snapshot of planet
 * positions, moon phase, active aspects, and retrograde status.
 * Has NO Convex dependencies — can be unit tested in isolation.
 *
 * All planet longitudes are GEOCENTRIC (as seen from Earth), computed
 * via GeoVector() + Ecliptic(). This is the correct frame of reference
 * for astrology. The previous implementation used EclipticLongitude()
 * which returns heliocentric longitude — wrong by up to 50° for inner
 * planets. Pluto is now included (10 tracked bodies total).
 *
 * Retrograde detection uses the same geocentric method as
 * src/lib/planets/telemetry.ts (1-minute lookforward) for accuracy,
 * plus a day-by-day scanner for finding retrograde window boundaries
 * (start/end dates).
 */
import * as Astronomy from "astronomy-engine";

// ─── TRACKED BODIES ───────────────────────────────────────────────────────
// The 10 classical + modern planets tracked by Stars.Guide (includes Pluto)
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
    Astronomy.Body.Pluto,
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
    [Astronomy.Body.Pluto]: "Pluto",
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
 * getGeocentricLongitude — Returns the GEOCENTRIC ecliptic longitude of a
 * body as seen from Earth.
 *
 * Uses GeoVector() + Ecliptic() for all planets (including Pluto).
 * Sun and Moon use their dedicated geocentric APIs.
 *
 * This replaces the old method which used EclipticLongitude() — a
 * heliocentric function that was off by up to 50° for inner planets.
 */
function getGeocentricLongitude(body: Astronomy.Body, date: Date): number {
    if (body === Astronomy.Body.Sun) {
        return Astronomy.SunPosition(date).elon;
    }
    if (body === Astronomy.Body.Moon) {
        return Astronomy.EclipticGeoMoon(date).lon;
    }
    // All other planets: GeoVector + Ecliptic = true geocentric longitude
    const gv = Astronomy.GeoVector(body, date, true);
    const ecl = Astronomy.Ecliptic(gv);
    return (ecl.elon + 360) % 360;
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
    Astronomy.Body.Pluto,
];

/**
 * Detect retrograde by comparing geocentric longitude over a 1-minute
 * window. If the longitude decreased (moved backward), the planet is
 * retrograde.
 *
 * Uses the same method as src/lib/planets/telemetry.ts for consistency.
 * The 1-minute window avoids false negatives from the old 24-hour window
 * near retrograde/direct stations.
 */
function isRetrograde(body: Astronomy.Body, date: Date): boolean {
    if (!RETROGRADE_CANDIDATES.includes(body)) return false;

    const lon = getGeocentricLongitude(body, date);

    // Check 1 minute into the future for better station resolution
    const futureDate = new Date(date.getTime() + 60000);
    const futureLon = getGeocentricLongitude(body, futureDate);

    let diff = futureLon - lon;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;

    return diff < 0;
}

// ─── RETROGRADE WINDOWS ──────────────────────────────────────────────────

/**
 * Per-planet retrograde detail — everything the AI prompt needs to know
 * about a planet's retrograde status, including where in the cycle we are.
 */
export type RetrogradePlanetDetail = {
    planet: string;
    status: "active" | "upcoming" | "recently_direct" | "clear";
    /** ISO date string for window start */
    startDate: string;
    /** ISO date string for window end */
    endDate: string;
    /** Total days in this retrograde window */
    totalDays: number;
    /** Days elapsed since retrograde started (0 for upcoming) */
    daysElapsed: number;
    /** Days until retrograde ends or begins */
    daysRemaining: number;
    /** 0–100: how far through the retrograde window (0 = just started, 100 = about to end) */
    progressPercent: number;
    /** Human-readable position within the cycle */
    phase: "entering" | "deepening" | "peak" | "exiting" | "approaching" | "aftermath" | "clear";
};

export type RetrogradeContext = {
    current: string[];       // Planet names currently retrograde
    upcoming: string[];      // Planet names about to turn retrograde (next 120d)
    recentDirect: string[];  // Planet names that turned direct in last 14d
    planets: RetrogradePlanetDetail[];  // Rich per-planet data for all candidates
};

/**
 * findRetrogradeEnd — Scan forward day-by-day from `fromDate` to find when
 * a currently-retrograde planet turns direct.
 */
function findRetrogradeEnd(body: Astronomy.Body, fromDate: Date, maxDays = 250): Date | null {
    const d = new Date(fromDate);
    for (let i = 0; i < maxDays; i++) {
        d.setUTCDate(d.getUTCDate() + 1);
        if (!isRetrograde(body, d)) return new Date(d);
    }
    return null;
}

/**
 * findRetrogradeStart — Scan backward from `fromDate` to find when a
 * currently-retrograde planet first went retrograde.
 */
function findRetrogradeStart(body: Astronomy.Body, fromDate: Date, maxDays = 200): Date | null {
    const d = new Date(fromDate);
    for (let i = 0; i < maxDays; i++) {
        d.setUTCDate(d.getUTCDate() - 1);
        if (!isRetrograde(body, d)) {
            d.setUTCDate(d.getUTCDate() + 1);
            return new Date(d);
        }
    }
    return null;
}

/**
 * findNextRetrogradeStart — Scan forward from `fromDate` to find when a
 * currently-direct planet will next go retrograde.
 */
function findNextRetrogradeStart(body: Astronomy.Body, fromDate: Date, maxDays = 730): Date | null {
    const d = new Date(fromDate);
    for (let i = 0; i < maxDays; i++) {
        d.setUTCDate(d.getUTCDate() + 1);
        if (isRetrograde(body, d)) return new Date(d);
    }
    return null;
}

/**
 * Classify the phase of a retrograde cycle based on progress percent.
 * This maps to felt experience the AI can translate:
 *   entering   0–15%  — the shift is just beginning, things feel "off"
 *   deepening  15–40% — the retrograde energy intensifies, themes surface
 *   peak       40–60% — full intensity, the core of the retrograde
 *   exiting    60–90% — the energy is waning but still present
 *   approaching        — not yet started, will begin soon
 *   aftermath         — just turned direct, shadow period linger
 *   clear             — no retrograde activity nearby
 */
function classifyPhase(progressPercent: number, status: RetrogradePlanetDetail["status"]): RetrogradePlanetDetail["phase"] {
    if (status === "active") {
        if (progressPercent <= 15) return "entering";
        if (progressPercent <= 40) return "deepening";
        if (progressPercent <= 60) return "peak";
        return "exiting";
    }
    if (status === "upcoming") return "approaching";
    if (status === "recently_direct") return "aftermath";
    return "clear";
}

/**
 * buildRetrogradeContext — Returns the retrograde context for a given UTC
 * date, using day-by-day geocentric scanning.
 *
 * Produces rich per-planet detail including:
 *   - Window boundaries (exact start/end dates)
 *   - Progress position (0–100% and named phase)
 *   - Days elapsed / remaining
 *   - Upcoming retrogrades within 120 days
 *   - Recently-direct planets within 14 days
 */
export function buildRetrogradeContext(today: Date): RetrogradeContext {
    const current: string[] = [];
    const upcoming: string[] = [];
    const recentDirect: string[] = [];
    const planets: RetrogradePlanetDetail[] = [];

    const upcomingThresholdMs = 120 * 86400000; // 120 days for upcoming
    const recentThresholdMs = 14 * 86400000;     // 14 days for recently direct

    for (const body of RETROGRADE_CANDIDATES) {
        const name = PLANET_NAMES[body] || body.toString();
        const currentlyRetro = isRetrograde(body, today);

        if (currentlyRetro) {
            current.push(name);

            const startDate = findRetrogradeStart(body, today);
            const endDate = findRetrogradeEnd(body, today);

            const startMs = startDate ? startDate.getTime() : today.getTime();
            const endMs = endDate ? endDate.getTime() : today.getTime() + 30 * 86400000;
            const totalDays = Math.max(1, Math.round((endMs - startMs) / 86400000));
            const daysElapsed = Math.round((today.getTime() - startMs) / 86400000);
            const daysRemaining = Math.max(0, Math.round((endMs - today.getTime()) / 86400000));
            const progressPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));
            const status: RetrogradePlanetDetail["status"] = "active";
            const phase = classifyPhase(progressPercent, status);

            planets.push({
                planet: name,
                status,
                startDate: new Date(startMs).toISOString(),
                endDate: new Date(endMs).toISOString(),
                totalDays,
                daysElapsed,
                daysRemaining,
                progressPercent,
                phase,
            });
        } else {
            // Not currently retrograde — find the next upcoming window
            const nextStart = findNextRetrogradeStart(body, today);

            // Check if this planet recently turned direct
            const checkPast = new Date(today.getTime() - recentThresholdMs);
            const wasRecentlyRetro = isRetrograde(body, checkPast);

            // Determine the relevant window (either upcoming or most recent)
            if (nextStart) {
                const daysUntil = Math.round((nextStart.getTime() - today.getTime()) / 86400000);
                const futureEnd = findRetrogradeEnd(body, nextStart);
                const endMs = futureEnd ? futureEnd.getTime() : nextStart.getTime() + 30 * 86400000;
                const totalDays = Math.max(1, Math.round((endMs - nextStart.getTime()) / 86400000));

                if (nextStart.getTime() - today.getTime() <= upcomingThresholdMs) {
                    upcoming.push(name);

                    planets.push({
                        planet: name,
                        status: "upcoming",
                        startDate: nextStart.toISOString(),
                        endDate: new Date(endMs).toISOString(),
                        totalDays,
                        daysElapsed: 0,
                        daysRemaining: daysUntil,
                        progressPercent: 0,
                        phase: "approaching",
                    });
                } else if (wasRecentlyRetro) {
                    // Recently direct but next retrograde is far away
                    recentDirect.push(name);

                    // Find the recent window's start/end
                    const recentStart = findRetrogradeStart(body, checkPast);
                    const recentEnd = findRetrogradeEnd(body, new Date(today.getTime() - recentThresholdMs));
                    const rStartMs = recentStart ? recentStart.getTime() : today.getTime() - 30 * 86400000;
                    const rEndMs = recentEnd ? recentEnd.getTime() : today.getTime();
                    const rTotalDays = Math.max(1, Math.round((rEndMs - rStartMs) / 86400000));
                    const daysSinceDirect = Math.round((today.getTime() - rEndMs) / 86400000);

                    planets.push({
                        planet: name,
                        status: "recently_direct",
                        startDate: new Date(rStartMs).toISOString(),
                        endDate: new Date(rEndMs).toISOString(),
                        totalDays: rTotalDays,
                        daysElapsed: rTotalDays,
                        daysRemaining: daysSinceDirect,
                        progressPercent: 100,
                        phase: "aftermath",
                    });
                } else {
                    // Clear — but still include next window info for context
                    planets.push({
                        planet: name,
                        status: "clear",
                        startDate: nextStart.toISOString(),
                        endDate: new Date(endMs).toISOString(),
                        totalDays,
                        daysElapsed: 0,
                        daysRemaining: daysUntil,
                        progressPercent: 0,
                        phase: "clear",
                    });
                }
            } else if (wasRecentlyRetro) {
                recentDirect.push(name);

                const recentEnd = findRetrogradeEnd(body, new Date(today.getTime() - recentThresholdMs));
                const recentStart = findRetrogradeStart(body, recentEnd ?? today);
                const rStartMs = recentStart ? recentStart.getTime() : today.getTime() - 30 * 86400000;
                const rEndMs = recentEnd ? recentEnd.getTime() : today.getTime();
                const rTotalDays = Math.max(1, Math.round((rEndMs - rStartMs) / 86400000));

                planets.push({
                    planet: name,
                    status: "recently_direct",
                    startDate: new Date(rStartMs).toISOString(),
                    endDate: new Date(rEndMs).toISOString(),
                    totalDays: rTotalDays,
                    daysElapsed: rTotalDays,
                    daysRemaining: Math.round((today.getTime() - rEndMs) / 86400000),
                    progressPercent: 100,
                    phase: "aftermath",
                });
            }
            // If no next retrograde found and not recently direct, skip entirely
        }
    }

    return { current, upcoming, recentDirect, planets };
}

// ─── MOON PHASE ──────────────────────────────────────────────────────────

/**
 * Determine moon phase name and illumination from Moon-Sun elongation.
 * Uses Astronomy.MoonPhase() which returns 0–360° elongation:
 *   0° = New Moon, 90° = First Quarter, 180° = Full Moon, 270° = Third Quarter.
 */
function getMoonPhaseName(date: Date): { name: string; illuminationPercent: number } {
    const elongation = Astronomy.MoonPhase(date); // 0–360°
    const illumPct = parseFloat(((1 - Math.cos(elongation * Math.PI / 180)) / 2 * 100).toFixed(1));

    let name: string;
    if (elongation < 22.5) name = "New Moon";
    else if (elongation < 67.5) name = "Waxing Crescent";
    else if (elongation < 112.5) name = "First Quarter";
    else if (elongation < 157.5) name = "Waxing Gibbous";
    else if (elongation < 202.5) name = "Full Moon";
    else if (elongation < 247.5) name = "Waning Gibbous";
    else if (elongation < 292.5) name = "Last Quarter";
    else if (elongation < 337.5) name = "Waning Crescent";
    else name = "New Moon";

    return { name, illuminationPercent: illumPct };
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
 * All longitudes are now truly geocentric (GeoVector + Ecliptic).
 * Pluto is included in the output (10 tracked bodies).
 *
 * @param utcDate - "YYYY-MM-DD" format
 * @returns CosmicWeatherSnapshot
 */
export function computeSnapshot(utcDate: string): CosmicWeatherSnapshot {
    // Use noon UTC on the target date for stability
    const date = new Date(`${utcDate}T12:00:00Z`);

    // ── Planet positions + retrograde status ──
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

// ─── MOON PHASE NARRATIVE FRAMES ─────────────────────────────────────────
// Maps moon phase name to an emotional container that sets the tone for
// generated copy. This is the v3 primary narrative driver, replacing the
// old Impact→Processing→Pivot→Integration arc entirely.

const MOON_PHASE_FRAMES: Record<string, string> = {
    "New Moon": `MOON PHASE FRAME: New Moon — Quiet Beginnings
Frame: Things are seeding underground. Energy is inward, not outward.
Language: "Something is starting, even if you can't see it yet." "This is a reset, not a failure."
Avoid: Big dramatic declarations. This phase is subtle.`,

    "Waxing Crescent": `MOON PHASE FRAME: Waxing Crescent — Building Momentum
Frame: Effort is accumulating. Results aren't visible yet but the work matters.
Language: "Keep going. The momentum is real even when it's invisible." "You're further along than you think."
Avoid: Impatience. Don't reinforce the urge to quit before the payoff.`,

    "First Quarter": `MOON PHASE FRAME: First Quarter — Building Momentum
Frame: Building. Effort is accumulating. Results aren't visible yet but the work matters.
Language: "Keep going. The momentum is real even when it's invisible." "You're further along than you think."
Avoid: Impatience. Don't reinforce the urge to quit before the payoff.`,

    "Waxing Gibbous": `MOON PHASE FRAME: Waxing Gibbous — Almost There
Frame: Refinement energy. The gap between where you are and the goal feels frustrating.
Language: "You're in the final stretch. Don't change the plan now." "Finish the thing."
Avoid: Introducing new directions. This phase is completion energy.`,

    "Full Moon": `MOON PHASE FRAME: Full Moon — Peak Intensity
Frame: What's been underground surfaces. Emotions are amplified. Revelations happen.
Language: "Something is coming to a head." "You're about to see something clearly that's been blurry."
Avoid: Minimising the emotional intensity. Let it be big.`,

    "Waning Gibbous": `MOON PHASE FRAME: Waning Gibbous — Release
Frame: What worked, keep. What didn't, let go. Integration energy.
Language: "What are you still carrying that you don't actually need?" "You get to put some of this down."
Avoid: Starting new things. This phase is the exhale.`,

    "Last Quarter": `MOON PHASE FRAME: Last Quarter — Release
Frame: What worked, keep. What didn't, let go. Integration energy.
Language: "What are you still carrying that you don't actually need?" "You get to put some of this down."
Avoid: Starting new things. This phase is the exhale.`,

    "Waning Crescent": `MOON PHASE FRAME: Waning Crescent — Rest
Frame: The cycle is ending. Quiet restoration before the next beginning.
Language: "This is the pause before the next chapter." "Rest is not nothing. It's preparation."
Avoid: Urgency, action, big moves. This phase is stillness.`,
};

/**
 * getMoonPhaseFrame — Returns the narrative frame text for a given moon phase name.
 * Used by the generation pipeline to set the emotional container for all horoscopes.
 */
export function getMoonPhaseFrame(phaseName: string): string {
    return MOON_PHASE_FRAMES[phaseName] ||
        `MOON PHASE FRAME: ${phaseName}\nFrame: Navigate the day with awareness of the current lunar energy.`;
}

/**
 * getMoonPhaseCategory — Normalises a detailed moon phase name into a broad
 * category used for auto-assigning hook archetypes.
 *
 * Returns: "new_moon" | "waxing" | "full_moon" | "waning"
 */
export function getMoonPhaseCategory(phaseName: string): string {
    const lower = phaseName.toLowerCase();
    if (lower.includes("new")) return "new_moon";
    if (lower.includes("full")) return "full_moon";
    if (lower.includes("waxing") || lower.includes("first quarter")) return "waxing";
    if (lower.includes("waning") || lower.includes("last quarter")) return "waning";
    return "waxing"; // safe default
}