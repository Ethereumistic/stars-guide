import * as Astronomy from 'astronomy-engine';
import { type SignData } from '@/astrology/signs';
import { eclipticLongitudeToSign, localBirthTimeToUTC } from './core';

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
