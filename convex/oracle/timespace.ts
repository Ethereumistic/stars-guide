/**
 * timespace.ts — Server-side space-time context builder for Oracle.
 *
 * Determines whether the user's question references temporal concepts
 * ("now", "today", "last week", etc.) and, if so, computes a cosmic
 * weather snapshot for the relevant date(s) using astronomy-engine.
 *
 * The resulting context block is injected into the Oracle system prompt
 * so the AI always knows what "now" means for the user and can reason
 * about transits, retrogrades, and moon phases relative to the current
 * moment.
 */
import { computeSnapshot, type CosmicWeatherSnapshot } from "../lib/astronomyEngine";

// ── Intent Classification ────────────────────────────────────────────────

/**
 * Regex patterns that signal the user is asking about the current
 * moment, a recent period, or time-based astrological conditions.
 *
 * When matched, the timespace context is injected into the Oracle prompt
 * with planetary positions, moon phase, and retrograde info.
 */
const TIMESPACE_INTENT_PATTERNS: RegExp[] = [
  // Explicit temporal references
  /\b(right\s*now|currently|at\s*present|as\s*i\s*(write|type|speak|ask))\b/i,
  /\b(today|tonight|this\s+(morning|afternoon|evening|night|week|month|weekend))\b/i,
  /\b(yesterday|last\s+(night|week|month|few\s+days))\b/i,
  // Relative past / future
  /\b(\d+)\s+(days?|weeks?|months?)\s+(ago|from\s+now|ahead|earlier|later)\b/i,
  /\b(a\s+few|couple\s+of)\s+(days?|weeks?|months?)\s+(ago|from\s+now|back|earlier)\b/i,
  // Transit / planetary weather questions
  /\b(transit|transits|transiting|planetary\s+weather|cosmic\s+weather)\b/i,
  /\b(what('s|\s+is)\s+(happening|going\s+on|in\s+the\s+sky))\b/i,
  /\b(what\s+are\s+the\s+(planets|stars)\s+(doing|up\s+to))\b/i,
  /\b(mercury\s+retrograde|retrograde\s+mercury)\b/i,
  /\b(is\s+\w+\s+(in\s+)?retrograde)\b/i,
  // "Why did X happen Y ago" pattern — event tied to a time
  /\bwhy\s+.*(happen|occur|break|lose|start|end|feel|change)\b.*\b(ago|recently|lately|this\s+week|last)\b/i,
  // "What's happening" cosmic inquiry
  /\bwhat('s|\s+is)\s+(the\s+)?(astro|astrological|cosmic|planetary|star)\b/i,
  // Moon reference questions
  /\b(moon\s+phase|what\s+moon|what\s+sign\s+is\s+the\s+moon|current\s+moon)\b/i,
  // Current sign of specific planets
  /\bwhat\s+sign\s+is\s+\w+\s+in\s+(right\s+now|currently|now|today|at\s+the\s+moment)\b/i,
  // General "now" questions about life events
  /\b(what\s+should\s+i\s+(do|focus|expect|watch|look)\s+(now|right\s+now|this\s+week|this\s+month))\b/i,
  // Energy / vibe questions about current period
  /\b(energy|vibe|vibration|frequency)\s+(right\s+now|currently|this\s+week|this\s+month|today)\b/i,
];

/**
 * Detect whether the user's question warrants timespace context injection.
 * Returns true if any pattern matches.
 */
export function hasTimespaceIntent(question: string): boolean {
  return TIMESPACE_INTENT_PATTERNS.some((p) => p.test(question));
}

// ── Timezone-Aware Date Formatting ───────────────────────────────────────

/**
 * Format the current moment for a given IANA timezone.
 * Returns a human-readable date string.
 */
function formatLocalDateTime(timezone: string, date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    }).format(date);
  } catch {
    return date.toUTCString();
  }
}

/**
 * Resolve a relative date expression like "2 days ago" to a Date.
 * Returns null if no relative expression is found.
 */
function resolveRelativeDate(question: string, now: Date): Date | null {
  // "X days/weeks/months ago"
  const match = question.match(
    /(\d+)\s+(days?|weeks?|months?)\s+(ago|earlier|back)/i,
  );
  if (match) {
    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const result = new Date(now);
    if (unit.startsWith("day")) result.setDate(result.getDate() - amount);
    else if (unit.startsWith("week")) result.setDate(result.getDate() - amount * 7);
    else if (unit.startsWith("month")) result.setMonth(result.getMonth() - amount);
    return result;
  }

  // "yesterday"
  if (/\byesterday\b/i.test(question)) {
    const result = new Date(now);
    result.setDate(result.getDate() - 1);
    return result;
  }

  // "last night"
  if (/\blast\s+night\b/i.test(question)) {
    const result = new Date(now);
    result.setDate(result.getDate() - 1);
    return result;
  }

  return null;
}

// ── Context Block Formatting ─────────────────────────────────────────────

function formatCosmicWeather(snapshot: CosmicWeatherSnapshot): string {
  const lines: string[] = [];

  // Planet positions
  lines.push("Current planetary positions:");
  for (const p of snapshot.planetPositions) {
    const retro = p.isRetrograde ? " (retrograde)" : "";
    lines.push(`- ${p.planet}: ${p.sign} ${p.degreeInSign.toFixed(2)}°${retro}`);
  }

  // Moon phase
  lines.push(
    `Moon: ${snapshot.moonPhase.name} (${snapshot.moonPhase.illuminationPercent}% illuminated)`,
  );

  // Active aspects (only if any)
  if (snapshot.activeAspects.length > 0) {
    lines.push("Active transits:");
    for (const a of snapshot.activeAspects) {
      lines.push(`- ${a.planet1} ${a.aspect} ${a.planet2} (orb ${a.orbDegrees.toFixed(2)}°)`);
    }
  }

  return lines.join("\n");
}

// ── Main Entry Point ─────────────────────────────────────────────────────

export interface TimespaceContext {
  /** The formatted context string to inject into the Oracle prompt. */
  context: string;
  /** Whether timespace intent was detected. */
  hasIntent: boolean;
}

/**
 * Build timespace context for Oracle.
 *
 * Always includes a minimal current-datetime header so Oracle knows "now".
 * If `hasTimespaceIntent(question)` is true, also includes the full cosmic weather
 * snapshot (planetary positions, moon phase, retrogrades, active transits).
 *
 * If the question references a specific past date ("2 days ago", "yesterday"),
 * also includes a snapshot for that date.
 */
export function buildTimespaceContext(
  timezone: string,
  question: string,
): TimespaceContext {
  const now = new Date();
  const hasIntent = hasTimespaceIntent(question);
  const localDateTime = formatLocalDateTime(timezone, now);

  const blocks: string[] = [];

  // ── Always: current local datetime ────────────────────────────────────
  blocks.push(`[CURRENT SPACE-TIME]`);
  blocks.push(`User's local time: ${localDateTime}`);
  blocks.push(`Timezone: ${timezone}`);

  // ── Intent-gated: cosmic weather for "now" ────────────────────────────
  if (hasIntent) {
    const nowUtc = now.toISOString().split("T")[0]; // "YYYY-MM-DD"
    const snapshot = computeSnapshot(nowUtc);
    blocks.push("");
    blocks.push(formatCosmicWeather(snapshot));
  }

  // ── Resolve referenced past dates ("2 days ago", "yesterday", etc.) ──
  const referencedDate = resolveRelativeDate(question, now);
  if (referencedDate) {
    const refUtc = referencedDate.toISOString().split("T")[0];
    const refSnapshot = computeSnapshot(refUtc);
    blocks.push("");
    blocks.push(`--- Referenced date: ${refUtc} ---`);
    blocks.push(formatCosmicWeather(refSnapshot));
  }

  blocks.push(`[END CURRENT SPACE-TIME]`);

  return {
    context: blocks.join("\n"),
    hasIntent,
  };
}