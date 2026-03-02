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
