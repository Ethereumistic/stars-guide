/**
 * Astrological calculations using astronomy-engine.
 * 
 * Uses the Tropical zodiac system where 0° Aries begins at the vernal equinox.
 * All calculations are based on precise astronomical ephemeris data.
 * 
 * IMPORTANT: Birth times are recorded in LOCAL time at the birth location.
 * This module handles timezone conversion internally.
 * 
 * @see https://github.com/cosinekitty/astronomy
 */

import * as Astronomy from 'astronomy-engine';
import tzlookup from 'tz-lookup';
import { compositionalSigns, type SignData } from '@/astrology/signs';

/**
 * Convert ecliptic longitude (0-360°) to tropical zodiac sign.
 * Each sign spans exactly 30° starting from 0° Aries.
 */
export function eclipticLongitudeToSign(longitude: number): SignData {
    // Normalize to 0-360° range
    const normalizedLongitude = ((longitude % 360) + 360) % 360;
    // Each sign is 30°, so index = floor(longitude / 30)
    const signIndex = Math.floor(normalizedLongitude / 30);
    return compositionalSigns[signIndex];
}

/**
 * Get the timezone offset in hours for a given location and date.
 * Uses the IANA timezone database via tz-lookup.
 * 
 * @param latitude - Location latitude
 * @param longitude - Location longitude  
 * @param date - The date (for DST calculation)
 * @returns Offset in hours (e.g., -5 for EST, +2 for EET)
 */
export function getTimezoneOffset(latitude: number, longitude: number, date: Date): number {
    try {
        // Get IANA timezone name from coordinates (e.g., "America/New_York")
        const timezoneName = tzlookup(latitude, longitude);

        // Create a date string in the target timezone and compare to UTC
        const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
        const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezoneName }));

        // Offset in hours (positive = ahead of UTC)
        return (localDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
    } catch {
        // Fallback: estimate offset from longitude (rough approximation)
        // Each 15° of longitude = 1 hour offset
        return Math.round(longitude / 15);
    }
}

/**
 * Convert a local birth time to UTC.
 * 
 * @param year - Birth year
 * @param month - Birth month (1-12)
 * @param day - Birth day
 * @param hours - Birth hour in local time (0-23)
 * @param minutes - Birth minutes
 * @param latitude - Birth location latitude
 * @param longitude - Birth location longitude
 * @returns Date object in UTC
 */
export function localBirthTimeToUTC(
    year: number,
    month: number,
    day: number,
    hours: number,
    minutes: number,
    latitude: number,
    longitude: number
): Date {
    // First, create an approximate date to determine timezone offset
    // (needed because DST depends on the date)
    const approximateDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

    // Get the timezone offset for this location and approximate date
    const offsetHours = getTimezoneOffset(latitude, longitude, approximateDate);

    // Subtract the offset to convert local time to UTC
    // If local time is UTC+2, we need to subtract 2 hours to get UTC
    const utcHours = hours - offsetHours;

    return new Date(Date.UTC(year, month - 1, day, utcHours, minutes));
}

/**
 * Calculate the Sun's zodiac sign for a given date/time.
 * 
 * The Sun moves approximately 1° per day through the ecliptic,
 * spending roughly 30 days in each sign.
 * 
 * @param date - Birth date/time as UTC
 * @returns The zodiac sign the Sun occupies
 */
export function calculateSunSign(date: Date): SignData {
    const sunPos = Astronomy.SunPosition(date);
    return eclipticLongitudeToSign(sunPos.elon);
}

/**
 * Calculate the Moon's zodiac sign for a given date/time.
 * 
 * The Moon moves approximately 13° per day through the ecliptic,
 * spending roughly 2.5 days in each sign. This makes the Moon sign
 * highly sensitive to birth time.
 * 
 * @param date - Birth date/time as UTC
 * @returns The zodiac sign the Moon occupies
 */
export function calculateMoonSign(date: Date): SignData {
    const moonPos = Astronomy.EclipticGeoMoon(date);
    // EclipticGeoMoon returns Spherical with 'lon' for longitude
    return eclipticLongitudeToSign(moonPos.lon);
}

/**
 * Calculate the Ascendant (Rising Sign) for a given date/time and location.
 * 
 * The Ascendant is the zodiac sign rising on the eastern horizon at the moment
 * of birth. It changes approximately every 2 hours, making it highly dependent
 * on accurate birth time.
 * 
 * @param date - Birth date/time as UTC
 * @param latitude - Observer's latitude in degrees (positive = North)
 * @param longitude - Observer's longitude in degrees (positive = East)
 * @returns The zodiac sign on the Ascendant
 */
export function calculateAscendant(date: Date, latitude: number, longitude: number): SignData {
    // Get Greenwich Apparent Sidereal Time (in hours)
    const gast = Astronomy.SiderealTime(date);

    // Convert to Local Sidereal Time in degrees
    // LST = GAST + (longitude / 15) hours, then convert to degrees
    const lstHours = gast + (longitude / 15);
    const lstDeg = ((lstHours * 15) % 360 + 360) % 360;
    const lstRad = lstDeg * (Math.PI / 180);

    // Get the obliquity of the ecliptic (Earth's axial tilt)
    const time = Astronomy.MakeTime(date);
    const tilt = Astronomy.e_tilt(time);
    const obliquityDeg = tilt.tobl; // true obliquity in degrees
    const oblRad = obliquityDeg * (Math.PI / 180);

    // Convert latitude to radians
    const latRad = latitude * (Math.PI / 180);

    // Ascendant formula:
    // ASC = atan2(cos(RAMC), -(sin(ε) * tan(φ)) - (cos(ε) * sin(RAMC)))
    // where ε = obliquity, φ = latitude, RAMC = local sidereal time
    const y = Math.cos(lstRad);
    const x = -(Math.sin(oblRad) * Math.tan(latRad)) - (Math.cos(oblRad) * Math.sin(lstRad));

    let ascRad = Math.atan2(y, x);
    let ascDeg = ascRad * (180 / Math.PI);

    // Normalize to 0-360° range
    ascDeg = ((ascDeg % 360) + 360) % 360;

    return eclipticLongitudeToSign(ascDeg);
}

/**
 * Calculate all three major chart points (Big Three) for a birth chart.
 * 
 * This function handles timezone conversion automatically - pass LOCAL birth time.
 * 
 * @param year - Birth year
 * @param month - Birth month (1-12)
 * @param day - Birth day
 * @param hours - Birth hour in LOCAL time (0-23)
 * @param minutes - Birth minutes
 * @param latitude - Birth location latitude
 * @param longitude - Birth location longitude
 * @param hasExactTime - Whether the user knows their exact birth time
 * @returns Object containing Sun, Moon, and Rising sign data
 */
export function calculateBigThree(
    year: number,
    month: number,
    day: number,
    hours: number,
    minutes: number,
    latitude: number,
    longitude: number,
    hasExactTime: boolean
): {
    sun: SignData;
    moon: SignData;
    rising: SignData | null;
} {
    // Convert local birth time to UTC
    const birthDateUTC = localBirthTimeToUTC(year, month, day, hours, minutes, latitude, longitude);

    const sun = calculateSunSign(birthDateUTC);
    const moon = calculateMoonSign(birthDateUTC);

    // Only calculate precise Ascendant if birth time is known
    const rising = hasExactTime
        ? calculateAscendant(birthDateUTC, latitude, longitude)
        : null;

    return { sun, moon, rising };
}

/**
 * Estimate Rising Sign based on Sun Sign and time of day
 */
export const estimateRisingSign = (
    sunSignId: string,
    timeOfDay: "morning" | "afternoon" | "evening" | "night" | "unknown" | null,
    answers: Record<string, string>
): SignData => {
    const sunIndex = compositionalSigns.findIndex(s => s.id === sunSignId);
    if (sunIndex === -1) return compositionalSigns[0];

    // 1. Scoring each sign based on detective answers
    const scores: Record<string, number> = {};
    compositionalSigns.forEach(s => scores[s.id] = 0);

    Object.values(answers).forEach(val => {
        if (scores[val] !== undefined) {
            scores[val] += 5; // Direct match weight
        }
    });

    // 2. Define probable offsets from sun sign based on time of day
    // Each 2 hours roughly = 1 sign (30 degrees).
    // Sunrise (6am) = Sun sign is ASC.
    let possibleOffsets: number[] = [];
    switch (timeOfDay) {
        case "morning": // 6am - 12pm
            possibleOffsets = [0, 1, 2];
            break;
        case "afternoon": // 12pm - 6pm
            possibleOffsets = [3, 4, 5];
            break;
        case "evening": // 6pm - 12am
            possibleOffsets = [6, 7, 8];
            break;
        case "night": // 12am - 6am
            possibleOffsets = [9, 10, 11];
            break;
        default:
            possibleOffsets = Array.from({ length: 12 }, (_, i) => i);
    }

    // 3. Find the best match within the time constraint
    // We give a small bonus for being in the "likely" window, 
    // then pick the one with the highest trait score.
    const candidates = possibleOffsets.map(offset => {
        const index = (sunIndex + offset) % 12;
        const sign = compositionalSigns[index];
        return {
            sign,
            score: (scores[sign.id] || 0) + 1 // Add 1 as a baseline for being in the right time window
        };
    });

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    return candidates[0].sign;
};

// --- New additions for Full Chart Calculation ---

export interface ChartPlanet {
    id: string; // "sun", "moon", "mercury", etc.
    longitude: number; // 0-360
    signId: string;
    houseId: number; // 1-12
    retrograde: boolean;
}

export interface ChartHouse {
    id: number; // 1-12
    signId: string;
    longitude: number; // the starting degree of the house (0-360)
}

export interface ChartAspect {
    planet1: string;
    planet2: string;
    type: "conjunction" | "sextile" | "square" | "trine" | "opposition";
    angle: number; // exact difference
    orb: number; // distance from exact aspect
}

export interface ChartData {
    planets: ChartPlanet[];
    houses: ChartHouse[];
    aspects: ChartAspect[];
    ascendant: { signId: string; longitude: number } | null;
}

/**
 * Calculates a complete natal chart using the Whole Sign house system.
 */
export function calculateFullChart(
    year: number,
    month: number,
    day: number,
    hours: number,
    minutes: number,
    latitude: number,
    longitude: number
): ChartData {
    // 1. Convert to UTC
    const dateUTC = localBirthTimeToUTC(year, month, day, hours, minutes, latitude, longitude);

    // We also need a slightly future date to check for retrograde motion
    const futureDate = new Date(dateUTC.getTime() + 1000 * 60);

    // 2. Ascendant
    const ascSign = calculateAscendant(dateUTC, latitude, longitude);

    // Ascendant longitude is needed. Let's trace it.
    const gast = Astronomy.SiderealTime(dateUTC);
    const lstHours = gast + (longitude / 15);
    const lstDeg = ((lstHours * 15) % 360 + 360) % 360;
    const lstRad = lstDeg * (Math.PI / 180);
    const time = Astronomy.MakeTime(dateUTC);
    const oblRad = Astronomy.e_tilt(time).tobl * (Math.PI / 180);
    const latRad = latitude * (Math.PI / 180);
    const y = Math.cos(lstRad);
    const x = -(Math.sin(oblRad) * Math.tan(latRad)) - (Math.cos(oblRad) * Math.sin(lstRad));
    let ascDeg = (Math.atan2(y, x) * (180 / Math.PI)) % 360;
    ascDeg = (ascDeg + 360) % 360;

    const ascendant = { signId: ascSign.id, longitude: ascDeg };

    // 3. Houses (Whole Sign System)
    // 1st house is the entire sign of the Ascendant.
    const ascSignIndex = compositionalSigns.findIndex(s => s.id === ascSign.id);
    const houses: ChartHouse[] = [];
    for (let i = 0; i < 12; i++) {
        const houseSignIndex = (ascSignIndex + i) % 12;
        houses.push({
            id: i + 1,
            signId: compositionalSigns[houseSignIndex].id,
            longitude: houseSignIndex * 30 // 0 degrees of that sign
        });
    }

    // Helper to get house
    const getHouseId = (lon: number): number => {
        const signIndex = Math.floor(lon / 30);
        // Find which house has this sign
        const h = houses.find(h => h.signId === compositionalSigns[signIndex].id);
        return h ? h.id : 1;
    };

    // 4. Planets
    const planets: ChartPlanet[] = [];

    const getEclipticLon = (body: Astronomy.Body, d: Date) => {
        if (body === Astronomy.Body.Sun) {
            return Astronomy.SunPosition(d).elon;
        } else if (body === Astronomy.Body.Moon) {
            return Astronomy.EclipticGeoMoon(d).lon;
        } else {
            return Astronomy.Ecliptic(Astronomy.GeoVector(body, d, true)).elon;
        }
    };

    const addPlanet = (id: string, body: Astronomy.Body) => {
        const lon = (getEclipticLon(body, dateUTC) + 360) % 360;
        const futureLon = (getEclipticLon(body, futureDate) + 360) % 360;

        let diff = futureLon - lon;
        if (diff < -180) diff += 360; // crossed 0
        if (diff > 180) diff -= 360;

        // The sun and moon are never retrograde in reality
        const retrograde = (id !== "sun" && id !== "moon") ? diff < 0 : false;

        const sign = eclipticLongitudeToSign(lon);

        planets.push({
            id,
            longitude: lon,
            signId: sign.id,
            houseId: getHouseId(lon),
            retrograde
        });
    };

    addPlanet("sun", Astronomy.Body.Sun);
    addPlanet("moon", Astronomy.Body.Moon);
    addPlanet("mercury", Astronomy.Body.Mercury);
    addPlanet("venus", Astronomy.Body.Venus);
    addPlanet("mars", Astronomy.Body.Mars);
    addPlanet("jupiter", Astronomy.Body.Jupiter);
    addPlanet("saturn", Astronomy.Body.Saturn);
    addPlanet("uranus", Astronomy.Body.Uranus);
    addPlanet("neptune", Astronomy.Body.Neptune);
    addPlanet("pluto", Astronomy.Body.Pluto); // Note: astronomy-engine uses simple model for pluto, good enough for most uses

    // 5. Aspects
    const aspects: ChartAspect[] = [];

    // Config: Orbs
    const aspectConfig = [
        { type: "conjunction", angle: 0, orb: 8 },
        { type: "sextile", angle: 60, orb: 6 },
        { type: "square", angle: 90, orb: 8 },
        { type: "trine", angle: 120, orb: 8 },
        { type: "opposition", angle: 180, orb: 8 },
    ] as const;

    for (let i = 0; i < planets.length; i++) {
        for (let j = i + 1; j < planets.length; j++) {
            const p1 = planets[i];
            const p2 = planets[j];

            let diff = Math.abs(p1.longitude - p2.longitude);
            if (diff > 180) {
                diff = 360 - diff;
            }

            for (const ac of aspectConfig) {
                const orb = Math.abs(diff - ac.angle);
                if (orb <= ac.orb) {
                    aspects.push({
                        planet1: p1.id,
                        planet2: p2.id,
                        type: ac.type,
                        angle: diff,
                        orb: orb
                    });
                    break; // Max 1 aspect between two planets
                }
            }
        }
    }

    return {
        planets,
        houses,
        aspects,
        ascendant
    };
};

export interface PlanetTelemetry {
    longitude: number;
    signId: string;
    retrograde: boolean;
    distanceAu: number | null; // Distance from Earth in Astronomical Units
}

/**
 * Gets real-time telemetry for a single planetary body.
 * Used for the Planet Hub to display "Live Telemetry"
 */
export function getPlanetTelemetry(planetId: string, targetDate: Date = new Date()): PlanetTelemetry | null {
    // Maps planet ID to the Astronomy-Engine Body
    const bodyMap: Record<string, Astronomy.Body> = {
        sun: Astronomy.Body.Sun,
        moon: Astronomy.Body.Moon,
        mercury: Astronomy.Body.Mercury,
        venus: Astronomy.Body.Venus,
        mars: Astronomy.Body.Mars,
        jupiter: Astronomy.Body.Jupiter,
        saturn: Astronomy.Body.Saturn,
        uranus: Astronomy.Body.Uranus,
        neptune: Astronomy.Body.Neptune,
        pluto: Astronomy.Body.Pluto,
    };

    const body = bodyMap[planetId.toLowerCase()];
    if (!body) return null;

    let eclipticLon = 0;

    // Calculate longitude
    if (body === Astronomy.Body.Sun) {
        eclipticLon = Astronomy.SunPosition(targetDate).elon;
    } else if (body === Astronomy.Body.Moon) {
        eclipticLon = Astronomy.EclipticGeoMoon(targetDate).lon;
    } else {
        const geoVector = Astronomy.GeoVector(body, targetDate, true);
        eclipticLon = Astronomy.Ecliptic(geoVector).elon;
    }
    const lon = (eclipticLon + 360) % 360;
    const sign = eclipticLongitudeToSign(lon);

    // Calculate retrograde (Sun and Moon are never retrograde)
    let retrograde = false;
    if (body !== Astronomy.Body.Sun && body !== Astronomy.Body.Moon) {
        // Check 1 minute into the future
        const futureDate = new Date(targetDate.getTime() + 1000 * 60);
        const geoVectorFuture = Astronomy.GeoVector(body, futureDate, true);
        const futureLon = (Astronomy.Ecliptic(geoVectorFuture).elon + 360) % 360;

        let diff = futureLon - lon;
        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;

        retrograde = diff < 0;
    }

    // Calculate Geocentric distance in AU
    let distanceAu: number | null = null;
    if (body === Astronomy.Body.Sun) {
        const obs = new Astronomy.Observer(0, 0, 0); // Center of earth approximation
        distanceAu = Astronomy.Equator(body, targetDate, obs, true, true).dist;
    } else if (body === Astronomy.Body.Moon) {
        const obs = new Astronomy.Observer(0, 0, 0);
        distanceAu = Astronomy.Equator(body, targetDate, obs, true, true).dist;
    } else {
        const geoVector = Astronomy.GeoVector(body, targetDate, true);
        // Calculate the vector length to get distance in AU
        distanceAu = Math.sqrt(geoVector.x * geoVector.x + geoVector.y * geoVector.y + geoVector.z * geoVector.z);
    }

    return {
        longitude: lon,
        signId: sign.id,
        retrograde,
        distanceAu
    };
}
