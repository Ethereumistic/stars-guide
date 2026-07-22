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
import { computeSnapshot, computeSnapshotAt, type CosmicWeatherSnapshot } from "../lib/astronomyEngine";
import type { StoredBirthData } from "../../src/lib/birth-chart/types";

const SIGN_START: Record<string, number> = {
  aries: 0,
  taurus: 30,
  gemini: 60,
  cancer: 90,
  leo: 120,
  virgo: 150,
  libra: 180,
  scorpio: 210,
  sagittarius: 240,
  capricorn: 270,
  aquarius: 300,
  pisces: 330,
};

const TRANSIT_ASPECTS = [
  { name: "conjunction", angle: 0, orb: 5 },
  { name: "sextile", angle: 60, orb: 3 },
  { name: "square", angle: 90, orb: 4 },
  { name: "trine", angle: 120, orb: 4 },
  { name: "opposition", angle: 180, orb: 5 },
] as const;

const TRANSIT_WEIGHT: Record<string, number> = {
  Pluto: 10,
  Neptune: 9,
  Uranus: 9,
  Saturn: 8,
  Jupiter: 7,
  Mars: 5,
  Venus: 4,
  Mercury: 4,
  Sun: 4,
  Moon: 2,
};

const NATAL_WEIGHT: Record<string, number> = {
  sun: 7,
  moon: 7,
  ascendant: 7,
  mercury: 5,
  venus: 6,
  mars: 6,
  jupiter: 4,
  saturn: 5,
  north_node: 5,
  south_node: 4,
  chiron: 4,
};

interface PersonalTransit {
  transitPlanet: string;
  natalPoint: string;
  aspect: string;
  orb: number;
  trend: "applying" | "separating" | "stationary/unclear";
  natalHouse: number | null;
  transitHouse: number | null;
  ruledNatalHouses: number[];
  score: number;
}

interface DatedSnapshot {
  date: string;
  snapshot: CosmicWeatherSnapshot;
}

function normalizedDistance(a: number, b: number): number {
  const distance = Math.abs(a - b) % 360;
  return Math.min(distance, 360 - distance);
}

function titleCase(value: string): string {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function snapshotLongitudes(snapshot: CosmicWeatherSnapshot): Map<string, number> {
  return new Map(snapshot.planetPositions.flatMap((position) => {
    const start = SIGN_START[position.sign.toLowerCase()];
    return start === undefined ? [] : [[position.planet, start + position.degreeInSign] as const];
  }));
}

function natalPoints(birthData: StoredBirthData): Array<{ id: string; longitude: number; house: number | null }> {
  const points = (birthData.chart?.planets ?? [])
    .filter((planet) => Number.isFinite(planet.longitude))
    .map((planet) => ({ id: planet.id, longitude: planet.longitude, house: planet.houseId ?? null }));
  if (birthData.chart?.ascendant && Number.isFinite(birthData.chart.ascendant.longitude)) {
    points.push({ id: "ascendant", longitude: birthData.chart.ascendant.longitude, house: 1 });
  }
  return points;
}

const TRADITIONAL_SIGN_RULERS: Record<string, string> = {
  aries: "Mars", taurus: "Venus", gemini: "Mercury", cancer: "Moon",
  leo: "Sun", virgo: "Mercury", libra: "Venus", scorpio: "Mars",
  sagittarius: "Jupiter", capricorn: "Saturn", aquarius: "Saturn", pisces: "Jupiter",
};

function wholeSignTransitHouse(longitude: number, birthData: StoredBirthData): number | null {
  const risingSign = birthData.chart?.ascendant?.signId;
  const risingStart = risingSign ? SIGN_START[risingSign] : undefined;
  if (risingStart === undefined) return null;
  const transitSignIndex = Math.floor((((longitude % 360) + 360) % 360) / 30);
  return ((transitSignIndex - risingStart / 30 + 12) % 12) + 1;
}

function ruledNatalHouses(transitPlanet: string, birthData: StoredBirthData): number[] {
  return (birthData.chart?.houses ?? [])
    .filter((house) => TRADITIONAL_SIGN_RULERS[house.signId] === transitPlanet)
    .map((house) => house.id)
    .sort((a, b) => a - b);
}

function findAspect(separation: number, transitPlanet: string) {
  return TRANSIT_ASPECTS
    .map((aspect) => ({ ...aspect, actualOrb: Math.abs(separation - aspect.angle) }))
    .filter((aspect) => aspect.actualOrb <= (transitPlanet === "Moon" ? Math.min(2, aspect.orb) : aspect.orb))
    .sort((a, b) => a.actualOrb - b.actualOrb)[0] ?? null;
}

/** Build code-calculated transit-to-natal evidence for Oracle. */
export function buildPersonalTransitContext(
  birthData: StoredBirthData,
  current: CosmicWeatherSnapshot,
  tomorrow: CosmicWeatherSnapshot,
): string | null {
  const natal = natalPoints(birthData);
  if (!natal.length) return null;

  const currentLongitudes = snapshotLongitudes(current);
  const tomorrowLongitudes = snapshotLongitudes(tomorrow);
  const transits: PersonalTransit[] = [];

  for (const [transitPlanet, transitLongitude] of currentLongitudes) {
    for (const natalPoint of natal) {
      const aspect = findAspect(normalizedDistance(transitLongitude, natalPoint.longitude), transitPlanet);
      if (!aspect) continue;

      const tomorrowLongitude = tomorrowLongitudes.get(transitPlanet);
      const tomorrowOrb = tomorrowLongitude === undefined
        ? aspect.actualOrb
        : Math.abs(normalizedDistance(tomorrowLongitude, natalPoint.longitude) - aspect.angle);
      const delta = tomorrowOrb - aspect.actualOrb;
      const trend = Math.abs(delta) < 0.03
        ? "stationary/unclear"
        : delta < 0 ? "applying" : "separating";
      const score = (TRANSIT_WEIGHT[transitPlanet] ?? 3)
        + (NATAL_WEIGHT[natalPoint.id] ?? 3)
        + Math.max(0, 5 - aspect.actualOrb);

      transits.push({
        transitPlanet,
        natalPoint: natalPoint.id,
        aspect: aspect.name,
        orb: aspect.actualOrb,
        trend,
        natalHouse: natalPoint.house,
        transitHouse: wholeSignTransitHouse(transitLongitude, birthData),
        ruledNatalHouses: ruledNatalHouses(transitPlanet, birthData),
        score,
      });
    }
  }

  transits.sort((a, b) => b.score - a.score || a.orb - b.orb);
  const lines = [
    "[PERSONAL TRANSIT INTELLIGENCE — CODE CALCULATED]",
    "These are current transiting-planet aspects to the user's canonical natal chart. Treat this list as authoritative. Do not invent other natal transits.",
  ];
  if (!transits.length) {
    lines.push("- No major transit-to-natal aspects are currently within the configured orbs.");
  } else {
    lines.push(...transits.slice(0, 12).map((transit, index) => {
      const natalHouse = transit.natalHouse ? `, natal point in House ${transit.natalHouse}` : "";
      const transitHouse = transit.transitHouse ? `, transiting through House ${transit.transitHouse}` : "";
      const rulership = transit.ruledNatalHouses.length
        ? `, traditionally rules natal House${transit.ruledNatalHouses.length > 1 ? "s" : ""} ${transit.ruledNatalHouses.join(" and ")}`
        : "";
      const house = `${transitHouse}${natalHouse}${rulership}`;
      return `${index + 1}. Transiting ${transit.transitPlanet} ${transit.aspect} natal ${titleCase(transit.natalPoint)} (orb ${transit.orb.toFixed(2)}°, ${transit.trend}${house})`;
    }));
  }
  lines.push("Interpretation protocol:");
  lines.push("- Lead with the 1-3 strongest signals, not every transit.");
  lines.push("- For each signal give: evidence → likely lived pattern → opportunity → watch-for → useful action.");
  lines.push("- Applying means the signal is building; separating means it is integrating or releasing. Do not call either good or bad by default.");
  lines.push("- State confidence as strong, moderate, or light based on orb, repeated themes, and relevance to the user's question.");
  lines.push("- Treat the forecast as conditions and probabilities, never a guaranteed external event.");
  lines.push("[END PERSONAL TRANSIT INTELLIGENCE]");
  return lines.join("\n");
}

/** Find the nearest sampled peaks over a short forecast horizon. */
export function buildUpcomingTransitWindows(
  birthData: StoredBirthData,
  datedSnapshots: DatedSnapshot[],
): string | null {
  const natal = natalPoints(birthData);
  if (!natal.length || datedSnapshots.length < 2) return null;

  const candidates = new Map<string, {
    date: string;
    transitPlanet: string;
    natalPoint: string;
    natalHouse: number | null;
    aspect: string;
    orb: number;
    score: number;
  }>();

  for (const { date, snapshot } of datedSnapshots) {
    for (const [transitPlanet, transitLongitude] of snapshotLongitudes(snapshot)) {
      for (const natalPoint of natal) {
        const aspect = findAspect(normalizedDistance(transitLongitude, natalPoint.longitude), transitPlanet);
        if (!aspect) continue;
        const key = `${transitPlanet}:${natalPoint.id}:${aspect.name}`;
        const score = (TRANSIT_WEIGHT[transitPlanet] ?? 3)
          + (NATAL_WEIGHT[natalPoint.id] ?? 3)
          + Math.max(0, 5 - aspect.actualOrb);
        const existing = candidates.get(key);
        if (!existing || aspect.actualOrb < existing.orb) {
          candidates.set(key, {
            date,
            transitPlanet,
            natalPoint: natalPoint.id,
            natalHouse: natalPoint.house,
            aspect: aspect.name,
            orb: aspect.actualOrb,
            score,
          });
        }
      }
    }
  }

  const windows = [...candidates.values()]
    .filter((window) => window.orb <= (window.transitPlanet === "Moon" ? 1 : 2))
    .sort((a, b) => b.score - a.score || a.orb - b.orb)
    .slice(0, 8);
  if (!windows.length) return null;

  const lines = [
    "[UPCOMING PERSONAL TRANSIT WINDOWS — NEXT 14 DAYS]",
    "Peaks below are the nearest six-hour samples, not promises that an external event will occur then. Treat each timestamp as the center of a short astrological window; do not claim minute-level precision.",
    ...windows.map((window, index) => {
      const house = window.natalHouse ? `, natal House ${window.natalHouse}` : "";
      return `${index + 1}. ${window.date}: transiting ${window.transitPlanet} ${window.aspect} natal ${titleCase(window.natalPoint)} (sampled orb ${window.orb.toFixed(2)}°${house})`;
    }),
    "Forecast protocol:",
    "- Mention only windows relevant to the question; do not dump the list.",
    "- Describe what the conditions may support or complicate, plus one observable confirmation signal.",
    "- Positive opportunity is valid when evidence supports it. Pair it with a practical move and calibrated confidence.",
    "- Never convert an astrological peak into certainty about another person's action or a specific external outcome.",
    "[END UPCOMING PERSONAL TRANSIT WINDOWS]",
  ];
  return lines.join("\n");
}

// ── Intent Classification ────────────────────────────────────────────────

/**
 * Regex patterns that signal the user is asking about the current
 * moment, a recent period, or time-based astrological conditions.
 *
 * When matched, the timespace context is injected into the Oracle prompt
 * with planetary positions, moon phase, and retrograde info.
 */
const TECHNOLOGY_DISRUPTION_PATTERNS: RegExp[] = [
  /\b(technology|tech|device|devices|computer|computers|phone|phones|laptop|hardware|software|internet|network|wifi|wi-fi|server|app|apps)\b.*\b(break|breaking|broke|broken|fail|failing|failed|glitch|glitching|crash|crashing|crashed|malfunction|acting\s+up|not\s+working)\b/i,
  /\b(break|breaking|broke|broken|fail|failing|failed|glitch|glitching|crash|crashing|crashed|malfunction|acting\s+up|not\s+working)\b.*\b(technology|tech|device|devices|computer|computers|phone|phones|laptop|hardware|software|internet|network|wifi|wi-fi|server|app|apps)\b/i,
  /\b(i\s+meant|speaking\s+of|specifically|as\s+for)\b.*\b(technology|tech|device|devices|computer|computers|phone|phones|laptop|hardware|software|internet|network|wifi|wi-fi|server|app|apps)\b/i,
];

const TIMESPACE_INTENT_PATTERNS: RegExp[] = [
  // Explicit temporal references
  /\b(right\s*now|currently|at\s*present|as\s*i\s*(write|type|speak|ask))\b/i,
  /\b(today|tonight|(this|that)\s+(morning|afternoon|evening|night|week|month|weekend))\b/i,
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
  /\bwhy\s+.*(happen|occur|break|breaking|broke|lose|start|end|feel|change)\b.*\b(ago|recently|lately|(this|that)\s+week|last)\b/i,
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
  // A follow-up can refine an already-temporal question without repeating
  // "this week". Device/glitch questions still require current sky evidence.
  ...TECHNOLOGY_DISRUPTION_PATTERNS,
];

export function hasTechnologyDisruptionIntent(question: string): boolean {
  return TECHNOLOGY_DISRUPTION_PATTERNS.some((pattern) => pattern.test(question));
}

const DIRECT_CURRENT_SKY_PATTERNS: RegExp[] = [
  /\b(what('s|\s+is)\s+(the\s+)?current\s+sky|current\s+(sky|planetary\s+positions?|transits?|cosmic\s+weather))\b/i,
  /\b(?:cosmic|planetary)\s+weather\b.*\b(?:atm|at\s+the\s+moment|now|currently|right\s+now)\b/i,
  /\b(what|which)\s+(planets?\s+)?(is|are)\s+(currently\s+|right\s+now\s+)?retrograde\b/i,
  /\b(what('s|\s+is)\s+retrograde|retrogrades?\s+(right\s+now|currently|today))\b/i,
];

/** Direct current-sky questions need a dedicated evidence-to-interpretation contract. */
export function isDirectCurrentSkyQuestion(question: string): boolean {
  return DIRECT_CURRENT_SKY_PATTERNS.some((pattern) => pattern.test(question));
}

/**
 * Detect whether the user's question warrants timespace context injection.
 * Returns true if any pattern matches.
 */
export function hasTimespaceIntent(question: string): boolean {
  return isDirectCurrentSkyQuestion(question)
    || TIMESPACE_INTENT_PATTERNS.some((p) => p.test(question));
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

function formatTechnologyMercuryDiagnostic(snapshot: CosmicWeatherSnapshot): string {
  const mercury = snapshot.planetPositions.find((position) => position.planet === "Mercury");
  const status = mercury ? mercury.isRetrograde ? "RETROGRADE" : "DIRECT" : "UNAVAILABLE";
  const position = mercury ? `${mercury.sign} ${mercury.degreeInSign.toFixed(2)}°` : "not calculated";

  return [
    "[TECHNOLOGY DISRUPTION DIAGNOSTIC — CODE CALCULATED]",
    `Mercury status at the request instant: ${status} (${position}).`,
    "Required response behavior:",
    "- Explicitly state Mercury's calculated retrograde/direct status near the start. Never omit this check for device, software, network, glitch, or technology-breakage questions.",
    "- If Mercury is retrograde, treat it as a symbolic review/recheck signal relevant to communication, coordination, data, and maintenance—not proof that astrology physically caused a device failure.",
    "- If Mercury is direct, explicitly say Mercury retrograde is not supported as the explanation; do not force it into the reading.",
    "- Cite only current sky-to-sky and transit-to-natal aspects present in the supplied code-calculated blocks. Do not manufacture a Uranus, Mercury, or house contact because it fits technology symbolism.",
    "- Put ordinary causes first in the action plan: back up data, check power/cables/storage/updates/network status, reproduce the fault, and seek repair or support when appropriate.",
    "[END TECHNOLOGY DISRUPTION DIAGNOSTIC]",
  ].join("\n");
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
  birthData?: StoredBirthData | null,
  previousVisitedAt?: number | null,
  forceCosmicWeather = false,
  includePersonalTransits = Boolean(birthData?.chart),
): TimespaceContext {
  const now = new Date();
  const hasIntent = forceCosmicWeather || hasTimespaceIntent(question);
  const localDateTime = formatLocalDateTime(timezone, now);

  const blocks: string[] = [];

  // ── Always: current local datetime ────────────────────────────────────
  blocks.push(`[CURRENT SPACE-TIME]`);
  blocks.push(`User's local time: ${localDateTime}`);
  blocks.push(`Timezone: ${timezone}`);

  // ── Intent-gated: cosmic weather for "now" ────────────────────────────
  if (hasIntent) {
    const snapshot = computeSnapshotAt(now);
    blocks.push("");
    blocks.push(formatCosmicWeather(snapshot));
    if (hasTechnologyDisruptionIntent(question)) {
      blocks.push("");
      blocks.push(formatTechnologyMercuryDiagnostic(snapshot));
    }
    if (includePersonalTransits && birthData?.chart) {
      const forecastSnapshots: DatedSnapshot[] = [];
      const sampleIntervalMs = 6 * 60 * 60 * 1000;
      for (let offsetMs = 0; offsetMs <= 14 * 24 * 60 * 60 * 1000; offsetMs += sampleIntervalMs) {
        const forecastDate = new Date(now.getTime() + offsetMs);
        const date = forecastDate.toISOString();
        forecastSnapshots.push({
          date,
          snapshot: offsetMs === 0 ? snapshot : computeSnapshotAt(forecastDate),
        });
      }
      const tomorrowSnapshot = forecastSnapshots[1].snapshot;
      const personalTransits = buildPersonalTransitContext(birthData, snapshot, tomorrowSnapshot);
      if (personalTransits) {
        blocks.push("");
        blocks.push(personalTransits);
      }
      const upcomingWindows = buildUpcomingTransitWindows(birthData, forecastSnapshots);
      if (upcomingWindows) {
        blocks.push("");
        blocks.push(upcomingWindows);
      }
      if (previousVisitedAt && /\b(since\s+(my\s+)?last|what\s+(has|changed)|last\s+visit|last\s+time)\b/i.test(question)) {
        const previousDate = new Date(previousVisitedAt);
        if (!Number.isNaN(previousDate.getTime()) && previousDate < now) {
          const previousSnapshot = computeSnapshotAt(previousDate);
          const previousSample = computeSnapshotAt(new Date(previousDate.getTime() + 6 * 60 * 60 * 1000));
          const previousTransits = buildPersonalTransitContext(birthData, previousSnapshot, previousSample);
          blocks.push("", "[CHANGE SINCE LAST ORACLE VISIT — CODE CALCULATED]");
          blocks.push(`Previous Oracle visit: ${previousDate.toISOString()}`);
          blocks.push("Compare the prior evidence below with CURRENT PERSONAL TRANSIT INTELLIGENCE. Mention only material changes: a new/ended exact contact, a changed applying/separating state, a house change, or a different top-ranked signal. If nothing material changed, say so.");
          if (previousTransits) blocks.push(previousTransits);
          blocks.push("[END CHANGE SINCE LAST ORACLE VISIT]");
        }
      }
    } else if (includePersonalTransits) {
      blocks.push("");
      blocks.push("Personal transit overlay: unavailable because no canonical natal chart is stored for this user. State this limitation only if the answer specifically requires a natal comparison; the current collective sky data above is still available.");
    }
    blocks.push("");
    blocks.push("Temporal-answer contract: answer the requested day/week/month from the code-calculated evidence above. Never claim current transit or cosmic-weather data is unavailable when it appears in this block. Lead with no more than three ranked signals, distinguish collective sky aspects from personal natal contacts, and say when nothing major is exact rather than substituting a generic natal reading.");
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
