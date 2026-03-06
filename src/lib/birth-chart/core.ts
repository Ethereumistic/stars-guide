import tzlookup from "tz-lookup";
import { compositionalSigns, type SignData } from "../../astrology/signs";

const ZONED_PARTS_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
};

/**
 * Convert ecliptic longitude (0-360 degrees) to tropical zodiac sign.
 * Each sign spans exactly 30 degrees starting from 0 degrees Aries.
 */
export function eclipticLongitudeToSign(longitude: number): SignData {
  const normalizedLongitude = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalizedLongitude / 30);
  return compositionalSigns[signIndex];
}

function getZonedDateParts(timeZone: string, date: Date): Record<string, number> {
  const formatter = new Intl.DateTimeFormat("en-US", {
    ...ZONED_PARTS_OPTIONS,
    timeZone,
  });

  const values: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }

  return values;
}

function getTimezoneOffsetMilliseconds(timeZone: string, date: Date): number {
  const parts = getZonedDateParts(timeZone, date);
  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0,
  );

  return zonedAsUtc - date.getTime();
}

export function getTimezoneName(latitude: number, longitude: number): string {
  return tzlookup(latitude, longitude);
}

/**
 * Get the timezone offset in hours for a given location and instant.
 * Positive values indicate the zone is ahead of UTC.
 */
export function getTimezoneOffset(
  latitude: number,
  longitude: number,
  date: Date,
): number {
  const timezoneName = getTimezoneName(latitude, longitude);
  return getTimezoneOffsetMilliseconds(timezoneName, date) / (1000 * 60 * 60);
}

export function resolveBirthDateTime(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  latitude: number,
  longitude: number,
): {
  timezone: string;
  utcDate: Date;
  utcTimestamp: string;
} {
  const timezone = getTimezoneName(latitude, longitude);
  const localAsUtc = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);

  let utcDate = new Date(localAsUtc);
  for (let iteration = 0; iteration < 2; iteration += 1) {
    const offsetMs = getTimezoneOffsetMilliseconds(timezone, utcDate);
    utcDate = new Date(localAsUtc - offsetMs);
  }

  return {
    timezone,
    utcDate,
    utcTimestamp: utcDate.toISOString(),
  };
}

/**
 * Convert a local birth time to UTC.
 */
export function localBirthTimeToUTC(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  latitude: number,
  longitude: number,
): Date {
  return resolveBirthDateTime(
    year,
    month,
    day,
    hours,
    minutes,
    latitude,
    longitude,
  ).utcDate;
}

