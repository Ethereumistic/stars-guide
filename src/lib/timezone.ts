/**
 * Timezone Utilities
 *
 * Detects the user's IANA timezone via the browser's Intl API and provides
 * hour-aware greetings for the Oracle landing page.
 *
 * The detected timezone is also intended to be forwarded into the Oracle
 * prompt context — many astrological interpretations depend on local time,
 * and future analysis features (transit windows, planetary hours, electional
 * astrology…) need the user's real local date and hour, not UTC.
 */

// ── Timezone Detection ────────────────────────────────────────────────────

/** Returns the user's IANA timezone string, e.g. "America/New_York". */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * Returns the current LOCAL hour (0–23) in the given IANA timezone.
 * Falls back to UTC if the timezone string is invalid.
 */
export function getLocalHour(timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date());

    const hourPart = parts.find((p) => p.type === "hour");
    if (!hourPart) return new Date().getUTCHours();

    // Intl returns "24" for midnight in some locales — normalise to 0
    const h = parseInt(hourPart.value, 10);
    return h === 24 ? 0 : h;
  } catch {
    return new Date().getUTCHours();
  }
}

/**
 * Returns a structured local-datetime snapshot for the user.
 * This is what we'll feed into the Oracle prompt context later.
 */
export function getLocalDateTime(timezone: string) {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const parts = formatter.formatToParts(now);

    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";

    const hourRaw = parseInt(
      parts.find((p) => p.type === "hour")?.value ?? "0",
      10,
    );
    const hour = hourRaw === 24 ? 0 : hourRaw;

    return {
      timezone,
      date: `${get("weekday")}, ${get("month")} ${get("day")}, ${get("year")}`,
      time: `${get("hour")}:${get("minute")} ${get("dayPeriod")}`,
      hour,
      dayOfWeek: get("weekday"),
      isoDate: now.toISOString(),
    };
  } catch {
    return {
      timezone: "UTC",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      hour: new Date().getUTCHours(),
      dayOfWeek: "",
      isoDate: new Date().toISOString(),
    };
  }
}

// ── 24-Hour Greeting Phrases ─────────────────────────────────────────────

/**
 * 24 unique greeting phrases — one per local hour.
 * The `{name}` token is replaced at render time with the user's first name.
 *
 * Voice: warm, direct, slightly cosmic — matches the Oracle soul.
 * No woo-woo. No "the cosmos invites you to sit with this."
 */
const GREETINGS: Record<number, string> = {
  0:  "Midnight, {name}",
  1:  "Late hours, {name}",
  2:  "Deep night, {name}",
  3:  "Witching hour, {name}",
  4:  "Before dawn, {name}",
  5:  "Early riser, {name}",
  6:  "Dawn, {name}",
  7:  "Morning, {name}",
  8:  "First light, {name}",
  9:  "Mid-morning, {name}",
  10: "Late morning, {name}",
  11: "Almost noon, {name}",
  12: "High noon, {name}",
  13: "Early afternoon, {name}",
  14: "Afternoon, {name}",
  15: "Mid-afternoon, {name}",
  16: "Late afternoon, {name}",
  17: "Dusk, {name}",
  18: "Evening, {name}",
  19: "Night falls, {name}",
  20: "Dark hours, {name}",
  21: "Night, {name}",
  22: "Late night, {name}",
  23: "Last hour, {name}",
};

/** Returns the greeting for the given local hour, with `{name}` replaced. */
export function getGreetingForHour(hour: number, name: string): string {
  const normalised = ((hour % 24) + 24) % 24;
  return (GREETINGS[normalised] ?? GREETINGS[12]!).replace("{name}", name);
}