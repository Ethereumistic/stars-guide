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
