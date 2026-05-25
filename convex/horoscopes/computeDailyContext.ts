/**
 * computeDailyContext.ts — Convex action that enriches today's astronomical
 * snapshot with retrograde context, void-of-course moon windows, sign ingress,
 * dominant element, stellium detection, and energy signature.
 *
 * Reads   : existing cosmicWeather data via internal.cosmicWeather.getForDate
 * Enriches: retrograde context (upcoming 30d / recent direct 14d)
 *           void-of-course moon windows for today
 *           next moon sign ingress timestamp
 *           dominant element (fire/earth/air/water)
 *           stellium detection (3+ planets in same sign)
 *           energy signature (algorithmic, no LLM)
 * Writes  : daily_astrology_context table (idempotent upsert by date)
 */
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { computeSnapshot, buildRetrogradeContext } from "../lib/astronomyEngine";
import { buildContext } from "../lib/astrology/contextBuilder";
import * as Astronomy from "astronomy-engine";

// ─── Internal Query — fetch raw cosmic weather ──────────────────────────────

export const getCosmicWeatherRaw = internalQuery({
    args: { date: v.string() },
    handler: async (ctx, { date }) => {
        return await ctx.db
            .query("cosmicWeather")
            .withIndex("by_date", (q) => q.eq("date", date))
            .unique();
    },
});

// ─── Internal Query — fetch daily_astrology_context ─────────────────────────

export const getDailyAstrologyContext = internalQuery({
    args: { date: v.string() },
    handler: async (ctx, { date }) => {
        return await ctx.db
            .query("daily_astrology_context")
            .withIndex("by_date", (q) => q.eq("date", date))
            .unique();
    },
});

// ─── Moon Ingress ───────────────────────────────────────────────────────────

/**
 * Find when the Moon will next change signs (sign ingress).
 * Steps forward in 6-hour increments until a sign change is detected.
 */
async function nextMoonIngress(after: Date): Promise<{ date: Date; fromSign: string; toSign: string } | null> {
    const A = await import("astronomy-engine");
    const ZODIAC = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
    ];
    const STEP_MS = 6 * 3600000; // 6 hours
    let cursor = new Date(after.getTime());
    let prevLon = A.EclipticGeoMoon(cursor).lon;
    let prevSignIndex = Math.floor(prevLon / 30);

    for (let i = 0; i < 240; i++) {
        // cap at 60 days forward
        cursor = new Date(cursor.getTime() + STEP_MS);
        const lon = A.EclipticGeoMoon(cursor).lon;
        const signIndex = Math.floor(lon / 30);

        if (signIndex !== prevSignIndex) {
            return {
                date: cursor,
                fromSign: ZODIAC[prevSignIndex],
                toSign: ZODIAC[signIndex % 12],
            };
        }
    }
    return null;
}

// ─── Void-of-Course Moon ────────────────────────────────────────────────────

const MAJOR_ASPECTS_DEGREES = [60, 90, 120, 180];

/**
 * isVoidOfCourse — Returns the window during which the Moon makes no major
 * aspect before changing signs.
 *
 * Algorithm:
 * 1. Start from `after` (today at noon UTC).
 * 2. Step forward in 6-hour increments until the Moon changes signs.
 * 3. At each step check whether the Moon's current longitude is within
 *    ORB_THRESHOLD degrees of a major aspect angle from any planet.
 * 4. If no aspect is found during the entire sign, it's void-of-course.
 *
 * Returns null if the Moon is not currently void-of-course.
 */
async function isVoidOfCourse(after: Date): Promise<{
    start: Date;
    end: Date;
    inSign: string;
    untilSign: string;
} | null> {
    const A = await import("astronomy-engine");
    const ZODIAC = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
    ];
    // NOTE: Excludes Sun — the Sun's aspects with the Moon are irrelevant for
    // void-of-course detection (conjunction = New Moon, opposition = Full Moon,
    // which are not "major aspects" in the VoC sense). Only planet-to-Moon aspects matter.
    // NOTE: Includes Pluto for geocentric consistency with astronomyEngine.ts.
    const TRACKED_PLANETS: Astronomy.Body[] = [
        Astronomy.Body.Mercury, Astronomy.Body.Venus, Astronomy.Body.Mars,
        Astronomy.Body.Jupiter, Astronomy.Body.Saturn, Astronomy.Body.Uranus, Astronomy.Body.Neptune,
        Astronomy.Body.Pluto,
    ];
    const ORB_THRESHOLD = 3;
    const STEP_MS = 6 * 3600000;

    let cursor = new Date(after.getTime());
    const startLon = A.EclipticGeoMoon(cursor).lon;
    const startSignIndex = Math.floor(startLon / 30);
    const inSign = ZODIAC[startSignIndex];

    let lastAspectFoundAt: Date | null = null;

    for (let i = 0; i < 240; i++) {
        // cap at 60 days
        cursor = new Date(cursor.getTime() + STEP_MS);
        const moonLon = A.EclipticGeoMoon(cursor).lon;
        const signIndex = Math.floor(moonLon / 30);

        // Moon left the sign — check if we ever found a major aspect
        if (signIndex !== startSignIndex) {
            if (lastAspectFoundAt === null) {
                // No aspect found — void-of-course all the way through
                return { start: after, end: cursor, inSign, untilSign: ZODIAC[signIndex % 12] };
            }
            return null; // was not void
        }

        // Check major aspects
        let foundAspect = false;
        for (const planet of TRACKED_PLANETS) {
            // Use geocentric longitude via GeoVector + Ecliptic (same as astronomyEngine.ts)
            const gv = A.GeoVector(planet, cursor, true);
            const planetLon = (A.Ecliptic(gv).elon + 360) % 360;
            let diff = Math.abs(moonLon - planetLon);
            if (diff > 180) diff = 360 - diff;

            for (const aspectLon of MAJOR_ASPECTS_DEGREES) {
                if (Math.abs(diff - aspectLon) <= ORB_THRESHOLD) {
                    foundAspect = true;
                    break;
                }
            }
            if (foundAspect) break;
        }

        if (foundAspect) {
            lastAspectFoundAt = cursor;
        }
    }
    return null;
}

// ─── Types ─────────────────────────────────────────────────────────────────

type SnapshotData = {
    planetPositions: { planet: string; sign: string; degreeInSign: number; isRetrograde: boolean }[];
    moonPhase: { name: string; illuminationPercent: number };
    activeAspects: { planet1: string; planet2: string; aspect: string; orbDegrees: number }[];
};

// ─── Internal Mutation — upsert daily_astrology_context ────────────────────

export const upsertDailyContext = internalMutation({
    args: {
        date: v.string(),
        moonPhase: v.object({
            name: v.string(),
            illumination: v.number(),
            emoji: v.string(),
        }),
        planetPositions: v.array(
            v.object({
                planet: v.string(),
                sign: v.string(),
                degree: v.number(),
                retrograde: v.boolean(),
            }),
        ),
        activeAspects: v.array(
            v.object({
                planetA: v.string(),
                planetB: v.string(),
                aspectType: v.string(),
                orb: v.number(),
                influence: v.string(),
            }),
        ),
        retrogradeContext: v.object({
            current: v.array(v.string()),
            upcoming: v.array(v.string()),
            recentDirect: v.array(v.string()),
        }),
        retrogradePlanets: v.optional(v.array(v.object({
            planet: v.string(),
            status: v.union(v.literal("active"), v.literal("upcoming"), v.literal("recently_direct"), v.literal("clear")),
            startDate: v.string(),
            endDate: v.string(),
            totalDays: v.number(),
            daysElapsed: v.number(),
            daysRemaining: v.number(),
            progressPercent: v.number(),
            phase: v.union(v.literal("entering"), v.literal("deepening"), v.literal("peak"), v.literal("exiting"), v.literal("approaching"), v.literal("aftermath"), v.literal("clear")),
        }))),
        dominantThemes: v.array(v.string()),
        energySignature: v.string(),
        generatedAt: v.number(),
        // Optional enrichment fields
        voidOfCourseMoon: v.optional(
            v.object({
                isVoid: v.boolean(),
                windowStart: v.optional(v.string()),
                windowEnd: v.optional(v.string()),
                inSign: v.optional(v.string()),
                untilSign: v.optional(v.string()),
            }),
        ),
        moonNextIngress: v.optional(
            v.object({
                timestamp: v.string(),
                fromSign: v.string(),
                toSign: v.string(),
            }),
        ),
        dominantElement: v.optional(v.string()),
        stelliumSign: v.optional(v.string()),
        aspectSummary: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("daily_astrology_context")
            .withIndex("by_date", (q) => q.eq("date", args.date))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, args);
        } else {
            await ctx.db.insert("daily_astrology_context", args);
        }
    },
});

// ─── Main Action ─────────────────────────────────────────────────────────────

export const computeDailyContext = internalAction({
    args: { date: v.string() },
    handler: async (ctx, { date }) => {
        // ── 1. Read existing cosmic weather ──────────────────────────────────
        const cosmic = await ctx.runQuery(
            internal.cosmicWeather.getForDate,
            { date },
        );
        if (!cosmic) {
            console.warn(`[computeDailyContext] No cosmicWeather for ${date}, skipping.`);
            return;
        }

        // ── 2. Compute snapshot (planet positions, aspects, moon phase) ─────
        // computeSnapshot is pure and needs the UTC date string
        const snapshot = computeSnapshot(date);
        const today = new Date(`${date}T12:00:00Z`);

        // ── 3. Retrograde context ────────────────────────────────────────────
        const { current, upcoming, recentDirect, planets: retrogradePlanets } = buildRetrogradeContext(today);

        // ── 4. VoC moon window ───────────────────────────────────────────────
        const vocResult = await isVoidOfCourse(today);
        const voidOfCourseMoon = {
            isVoid: vocResult !== null,
            windowStart: vocResult ? vocResult.start.toISOString() : undefined,
            windowEnd: vocResult ? vocResult.end.toISOString() : undefined,
            inSign: vocResult ? vocResult.inSign : undefined,
            untilSign: vocResult ? vocResult.untilSign : undefined,
        };

        // ── 5. Moon ingress ──────────────────────────────────────────────────
        const ingress = await nextMoonIngress(today);
        const moonNextIngress = ingress
            ? {
                  timestamp: ingress.date.toISOString(),
                  fromSign: ingress.fromSign,
                  toSign: ingress.toSign,
              }
            : undefined;

        // ── 6. Context enrichment (dominant element, themes, energy sig) ─────
        const enrichment = buildContext(
            {
                planetPositions: snapshot.planetPositions.map((p) => ({
                    planet: p.planet,
                    sign: p.sign,
                    degreeInSign: p.degreeInSign,
                    isRetrograde: p.isRetrograde,
                })),
                moonPhase: snapshot.moonPhase,
                activeAspects: snapshot.activeAspects.map((a) => ({
                    planet1: a.planet1,
                    planet2: a.planet2,
                    aspect: a.aspect,
                    orbDegrees: a.orbDegrees,
                })),
            },
            snapshot.moonPhase.name,
        );

        // ── 7. Map snapshot to daily_astrology_context schema ─────────────────
        // activeAspects shape must match schema: planetA, planetB, aspectType, orb, influence
        const influence = (aspect: string): string => {
            if (aspect === "square" || aspect === "opposition") return "challenging";
            if (aspect === "trine" || aspect === "sextile") return "harmonious";
            return "dynamic";
        };

        const activeAspects = snapshot.activeAspects.map((a) => ({
            planetA: a.planet1,
            planetB: a.planet2,
            aspectType: a.aspect,
            orb: a.orbDegrees,
            influence: influence(a.aspect),
        }));

        // dominantElement is always derived from snapshot
        const dominantElement = enrichment.dominantElement;

        // ── 8. Moon phase emoji ──────────────────────────────────────────────
        const MOON_EMOJI: Record<string, string> = {
            "New Moon": "🌑",
            "Waxing Crescent": "🌒",
            "First Quarter": "🌓",
            "Waxing Gibbous": "🌔",
            "Full Moon": "🌕",
            "Waning Gibbous": "🌖",
            "Last Quarter": "🌗",
            "Waning Crescent": "🌘",
        };
        const moonEmoji = MOON_EMOJI[snapshot.moonPhase.name] ?? "🌙";

        // ── 9. Upsert ─────────────────────────────────────────────────────────
        await ctx.runMutation(internal.horoscopes.computeDailyContext.upsertDailyContext, {
            date,
            moonPhase: {
                name: snapshot.moonPhase.name,
                illumination: snapshot.moonPhase.illuminationPercent,
                emoji: moonEmoji,
            },
            planetPositions: snapshot.planetPositions.map((p) => ({
                planet: p.planet,
                sign: p.sign,
                degree: p.degreeInSign,
                retrograde: p.isRetrograde,
            })),
            activeAspects,
            retrogradeContext: { current, upcoming, recentDirect },
            retrogradePlanets,
            dominantThemes: enrichment.dominantThemes,
            energySignature: enrichment.energySignature,
            generatedAt: Date.now(),
            voidOfCourseMoon,
            moonNextIngress,
            dominantElement,
            stelliumSign: enrichment.stelliumSign ?? undefined,
            aspectSummary: enrichment.aspectSummary,
        });

        console.log(`[computeDailyContext] Context computed for ${date}`);
    },
});