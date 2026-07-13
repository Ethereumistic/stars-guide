/**
 * Synastry Context Builder
 *
 * Produces instruction blocks and formatted data for the synastry pipeline.
 * The synastry pipeline uses these to give the LLM everything it needs
 * to produce a Synastry reading.
 *
 * IMPORTANT: We use role-based labels (not "Chart A" / "Chart B") so the
 * Oracle addresses both people naturally: "you" for the user and the
 * relationship role + name for the other person.
 */

import type { SynastryPayload } from "./pipelineTypes";
import { buildUniversalBirthContext } from "./featureContext";
import type { StoredBirthData, StoredChartPlanet } from "../birth-chart/types";

const CROSS_ASPECTS = [
  { type: "conjunction", angle: 0, orb: 8 },
  { type: "sextile", angle: 60, orb: 5 },
  { type: "square", angle: 90, orb: 7 },
  { type: "trine", angle: 120, orb: 7 },
  { type: "opposition", angle: 180, orb: 8 },
] as const;

const PERSONAL_BODIES = new Set(["sun", "moon", "mercury", "venus", "mars", "ascendant"]);
const ANGLES_AND_NODES = new Set(["ascendant", "north_node", "south_node"]);
const TRADITIONAL_RULERS: Record<string, string> = {
  aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun", virgo: "mercury",
  libra: "venus", scorpio: "mars", sagittarius: "jupiter", capricorn: "saturn", aquarius: "saturn", pisces: "jupiter",
};

function configuredOrb(defaultOrb: number, first: string, second: string): number {
  if (ANGLES_AND_NODES.has(first) || ANGLES_AND_NODES.has(second)) return Math.min(defaultOrb, 5);
  if (PERSONAL_BODIES.has(first) && PERSONAL_BODIES.has(second)) return defaultOrb;
  if (PERSONAL_BODIES.has(first) || PERSONAL_BODIES.has(second)) return Math.min(defaultOrb, 6);
  return Math.min(defaultOrb, 4);
}

function angularDistance(a: number, b: number): number {
  const distance = Math.abs(a - b) % 360;
  return Math.min(distance, 360 - distance);
}

function chartPoints(chart: StoredBirthData): Array<{ id: string; longitude: number }> {
  const points = (chart.chart?.planets ?? [])
    .filter((planet): planet is StoredChartPlanet => Number.isFinite(planet.longitude))
    .map((planet) => ({ id: planet.id, longitude: planet.longitude }));
  if (chart.chart?.ascendant && Number.isFinite(chart.chart.ascendant.longitude)) {
    points.push({ id: "ascendant", longitude: chart.chart.ascendant.longitude });
  }
  return points;
}

function pointLabel(id: string): string {
  return id.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function chartRulerId(chart: StoredBirthData): string | null {
  const risingSign = chart.chart?.ascendant?.signId;
  return risingSign ? TRADITIONAL_RULERS[risingSign] ?? null : null;
}

function compositeMidpoint(a: number, b: number): number {
  const delta = ((b - a + 540) % 360) - 180;
  return (a + delta / 2 + 360) % 360;
}

function compositeLines(userChart: StoredBirthData, otherChart: StoredBirthData): string[] {
  const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  return ["sun", "moon", "venus", "mars"].flatMap((id) => {
    const first = userChart.chart?.planets.find((planet) => planet.id === id);
    const second = otherChart.chart?.planets.find((planet) => planet.id === id);
    if (!first || !second || !Number.isFinite(first.longitude) || !Number.isFinite(second.longitude)) return [];
    const longitude = compositeMidpoint(first.longitude, second.longitude);
    return [`- Composite ${pointLabel(id)}: ${signs[Math.floor(longitude / 30)]} ${(longitude % 30).toFixed(2)}В° (shortest-arc midpoint)`];
  });
}

function wholeSignOverlayLines(
  userChart: StoredBirthData,
  otherChart: StoredBirthData,
  otherName: string,
): string[] {
  if (userChart.houseSystem !== "whole_sign" || otherChart.houseSystem !== "whole_sign") return [];
  if (!userChart.chart?.houses.length || !otherChart.chart?.houses.length) return [];

  const userHouseBySign = new Map(userChart.chart.houses.map((house) => [house.signId, house.id]));
  const otherHouseBySign = new Map(otherChart.chart.houses.map((house) => [house.signId, house.id]));
  const overlayBodies = new Set(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]);
  const lines: string[] = [];

  for (const planet of otherChart.chart.planets.filter((item) => overlayBodies.has(item.id))) {
    const house = userHouseBySign.get(planet.signId);
    if (house) lines.push(`- ${otherName}'s ${pointLabel(planet.id)} falls in your House ${house}`);
  }
  for (const planet of userChart.chart.planets.filter((item) => overlayBodies.has(item.id))) {
    const house = otherHouseBySign.get(planet.signId);
    if (house) lines.push(`- Your ${pointLabel(planet.id)} falls in ${otherName}'s House ${house}`);
  }
  return lines;
}

/** Deterministic cross-chart evidence so the LLM never has to do aspect arithmetic. */
export function buildSynastryComparisonContext(
  userChart: StoredBirthData,
  payload: SynastryPayload,
): string | null {
  const otherChart = payload.chartB as StoredBirthData | undefined;
  if (!otherChart) return null;

  const userPoints = chartPoints(userChart);
  const otherPoints = chartPoints(otherChart);
  if (!userPoints.length || !otherPoints.length) return null;

  const connections: Array<{
    user: string;
    other: string;
    aspect: string;
    orb: number;
    priority: number;
    rulerContact: boolean;
  }> = [];
  const userRuler = chartRulerId(userChart);
  const otherRuler = chartRulerId(otherChart);

  for (const user of userPoints) {
    for (const other of otherPoints) {
      const separation = angularDistance(user.longitude, other.longitude);
      for (const definition of CROSS_ASPECTS) {
        const orb = Math.abs(separation - definition.angle);
        if (orb <= configuredOrb(definition.orb, user.id, other.id)) {
          const personalWeight = Number(PERSONAL_BODIES.has(user.id)) + Number(PERSONAL_BODIES.has(other.id));
          const angleNodeWeight = Number(ANGLES_AND_NODES.has(user.id)) + Number(ANGLES_AND_NODES.has(other.id));
          const rulerContact = user.id === userRuler || other.id === otherRuler;
          connections.push({
            user: user.id,
            other: other.id,
            aspect: definition.type,
            orb,
            priority: personalWeight * 10 + angleNodeWeight * 8 + Number(rulerContact) * 6 - orb,
            rulerContact,
          });
          break;
        }
      }
    }
  }

  connections.sort((a, b) => b.priority - a.priority || a.orb - b.orb);
  const name = payload.chartBName?.trim() || "the other person";
  const lines = [
    "[DETERMINISTIC SYNASTRY EVIDENCE]",
    "These cross-chart aspects were calculated in code from canonical longitudes. Treat them as authoritative; do not calculate or invent additional cross-aspects.",
  ];
  if (!connections.length) {
    lines.push("- No major cross-chart aspects were found within the configured orbs.");
  } else {
    lines.push(...connections.slice(0, 24).map((connection) =>
      `- Your ${pointLabel(connection.user)} ${connection.aspect} ${name}'s ${pointLabel(connection.other)} (orb ${connection.orb.toFixed(2)}°)`,
    ));
  }
  const overlays = wholeSignOverlayLines(userChart, otherChart, name);
  if (overlays.length) {
    lines.push("");
    lines.push("Deterministic whole-sign house overlays:");
    lines.push(...overlays);
  }
  if (userRuler || otherRuler) {
    lines.push("");
    lines.push(`Chart-ruler weighting: your ruler is ${userRuler ? pointLabel(userRuler) : "unavailable"}; ${name}'s ruler is ${otherRuler ? pointLabel(otherRuler) : "unavailable"}. Contacts involving either ruler are ranked higher.`);
  }
  const composite = compositeLines(userChart, otherChart);
  if (composite.length) {
    lines.push("", "Deterministic composite midpoint signatures (the relationship field, not either person's natal placement):", ...composite);
  }
  lines.push("Declination evidence: unavailable in the stored chart model. Do not claim parallels or contra-parallels.");
  lines.push("Orb policy: luminary/personal contacts use the configured major-aspect defaults; Node/angle contacts are capped at 5 degrees, mixed contacts at 6 degrees, and outer-to-outer contacts at 4 degrees.");
  lines.push("Evidence priority: lead with the tightest personal-planet or angle contacts, then repeated themes. Do not reduce the relationship to a compatibility score.");
  lines.push("[END DETERMINISTIC SYNASTRY EVIDENCE]");
  return lines.join("\n");
}

// ── Relationship label helpers ──────────────────────────────────────────────

/** Map of relationship values to human-readable labels for Oracle context. */
const RELATIONSHIP_LABELS: Record<string, string> = {
  // Family
  mother: "mother",
  father: "father",
  brother: "brother",
  sister: "sister",
  grandmother: "grandmother",
  grandfather: "grandfather",
  cousin: "cousin",
  uncle: "uncle",
  aunt: "aunt",
  // Romantic
  boyfriend: "boyfriend",
  girlfriend: "girlfriend",
  husband: "husband",
  wife: "wife",
  fiance: "fiancé(e)",
  ex_boyfriend: "ex-boyfriend",
  ex_girlfriend: "ex-girlfriend",
  ex_husband: "ex-husband",
  ex_wife: "ex-wife",
  crush: "crush",
  // Friend
  best_friend: "best friend",
  close_friend: "close friend",
  friend: "friend",
  // University
  teacher: "teacher",
  professor: "professor",
  classmate: "classmate",
  roommate: "roommate",
  study_partner: "study partner",
  // Work
  coworker: "coworker",
  boss: "boss",
  business_partner: "business partner",
  mentor: "mentor",
  colleague: "colleague",
  // Celebrity
  celebrity: "celebrity",
  public_figure: "public figure",
};

/** Map of category keys to descriptive labels for Oracle context. */
const CATEGORY_LABELS: Record<string, string> = {
  family: "Family",
  romantic: "Romantic",
  friend: "Friend",
  university: "University / Education",
  work: "Work / Professional",
  celebrity: "Celebrity / Public Figure",
};

/**
 * Build a human-readable label for Chart B's relationship to the user.
 * Falls back gracefully for custom relationships.
 */
export function getRelationshipLabel(relationship: string, category?: string): string {
  // Check the known labels first
  if (RELATIONSHIP_LABELS[relationship]) {
    return RELATIONSHIP_LABELS[relationship];
  }
  // Custom relationship — capitalise first letter
  if (relationship && relationship.trim()) {
    return relationship.trim();
  }
  // Total fallback
  return category ? `${CATEGORY_LABELS[category] ?? category} connection` : "connection";
}

/**
 * Build a possessive phrase like "your boyfriend" or "your teacher, Alex".
 */
export function getRelationshipPhrase(
  relationship: string,
  chartBName: string,
  category?: string,
): string {
  const label = getRelationshipLabel(relationship, category);
  // "your boyfriend (Alex)"  or  "your teacher (Marcus)"
  if (chartBName && chartBName.trim()) {
    return `your ${label}, ${chartBName}`;
  }
  return `your ${label}`;
}

// ── Synastry Instruction Block ──────────────────────────────────────────────

/**
 * Get the system prompt instruction block for synastry readings.
 * Uses role-based labels so the LLM refers to people naturally.
 */
export function getSynastryInstructions(
  chartBName: string,
  relationship: string,
  category?: string,
): string {
  const relLabel = getRelationshipLabel(relationship, category);
  const personBRef = chartBName?.trim()
    ? `${relLabel} (${chartBName})`
    : relLabel;

  return [
    "[SYNASTRY READING INSTRUCTIONS]",
    "ROLE: You are an expert astrologer performing a synastry (relationship chart overlay) reading.",
    `You have been given TWO natal charts: the User's chart ("you") and the chart of ${personBRef}.`,
    "",
    "ADDRESSING THE USER:",
    `- Always address the primary person as "you" (the User).`,
    `- Always refer to the second person as "${personBRef}" or by their name "${chartBName || "the other person"}".`,
    `- NEVER use labels like "Chart A" or "Chart B" in your response. Use the person's name and relationship role.`,
    `- For example, say "Your Sun conjuncts Alex's Moon" NOT "Chart A's Sun conjuncts Chart B's Moon".`,
    "",
    "APPROACH:",
    "1. Use the supplied [DETERMINISTIC SYNASTRY EVIDENCE] for inter-chart aspects. Never perform approximate aspect arithmetic or invent an aspect from sign compatibility alone.",
    "2. Look at element and modality balance between the two charts.",
    "3. Identify areas of natural flow (trines, sextiles between charts) and friction (squares, oppositions).",
    "4. Discuss house overlays only when deterministic whole-sign overlays are explicitly supplied. Use them to describe which life area the connection activates; do not invent overlays from incomplete house data.",
    `5. The RELATIONSHIP TYPE is "${relationship}" (category: ${category ?? "general"}) — synastry reads differently for romantic partners vs. parent-child vs. business partners. Tailor your interpretation accordingly.`,
    "",
    "STRUCTURE YOUR RESPONSE AS:",
    "## Cosmic Connection Report ✨",
    `*[2-3 sentence overview of the connection between you and ${personBRef}]*`,
    "",
    "### 1. The Magnetic Core",
    "*[The strongest inter-chart aspect or alignment — what draws these two together]*",
    "",
    "### 2. Harmony & Flow",
    "*[2-3 areas of natural compatibility, with specific planet-sign-house references]*",
    "",
    "### 3. Growth Edges & Friction",
    "*[1-2 areas of tension — frame as growth opportunities, not doom]*",
    "",
    "### 4. The Relationship Dynamic",
    `*[How being "${relLabel}" colors these placements — e.g., a Sun-Moon conjunction means something different for siblings vs. lovers]*`,
    "",
    "### 5. How to Work With This",
    "*[Give 2-3 concrete practices: a communication move, a boundary or repair move, and a way to use the strongest supportive contact.]*",
    "",
    "---",
    "### Connection at a Glance",
    `| Theme | You | ${personBRef} | Dynamic |`,
    "| :--- | :--- | :--- | :--- |",
    "*[Key planetary pairs]*",
    "",
    `> *[One empowering closing thought about what the connection between you and ${personBRef} is here to teach both of you.]*`,
    "",
    "RULES:",
    "- Treat all chart data as canonical truth. Do not invent placements.",
    "- When data is missing for a placement, say so plainly.",
    "- Be honest about friction — don't sugarcoat, but don't catastrophize.",
    "- Separate chemistry, ease, durability, and growth potential; they are not the same thing.",
    "- Never claim to know the other person's private thoughts, intentions, or future behavior from their chart.",
    "- Personalize based on the relationship type provided.",
    "- Keep the tone engaging, insightful, and empathetic.",
    `- Use "${chartBName || "the other person"}" and "you" — never "Chart A" or "Chart B".`,
    "[END SYNASTRY READING INSTRUCTIONS]",
  ].join("\n");
}

// ── Chart B Context Builder ──────────────────────────────────────────────────

/**
 * Build the user message block for Chart B data.
 * This formats the second person's birth data and relationship context
 * for inclusion in the LLM prompt, using role-based labels.
 */
export function buildSynastryChartBContext(synastryData: SynastryPayload): string {
  const lines: string[] = [];
  const personBRef = synastryData.chartBName?.trim()
    ? `${getRelationshipLabel(synastryData.relationship, synastryData.relationshipCategory)}, ${synastryData.chartBName}`
    : getRelationshipLabel(synastryData.relationship, synastryData.relationshipCategory);

  lines.push(`[${personBRef.toUpperCase()} — CHART DATA]`);

  // Format Chart B birth data using the same universal builder
  if (synastryData.chartB) {
    try {
      const birthContext = buildUniversalBirthContext(synastryData.chartB as any);
      lines.push(birthContext);
    } catch {
      // Fallback: if chart is missing or malformed, provide what we can
      const chartB = synastryData.chartB as any;
      if (chartB?.placements?.length) {
        lines.push("Chart data (partial — calculated placements):");
        for (const p of chartB.placements) {
          lines.push(`  ${p.body}: ${p.sign}${p.house ? ` (House ${p.house})` : ""}`);
        }
      } else {
        // Absolute fallback: raw date/time/location
        lines.push("Chart data (raw birth info):");
        lines.push(`  Date: ${chartB.date ?? "unknown"}`);
        lines.push(`  Time: ${chartB.time ?? "unknown"}`);
        if (chartB.location) {
          lines.push(`  Location: ${chartB.location.city ?? "unknown"}, ${chartB.location.country ?? "unknown"}`);
        }
        lines.push("⚠ Full chart calculation unavailable. Work with the birth date, time, and location to infer placements where possible.");
      }
    }
  } else {
    lines.push("No chart data available for this person.");
  }

  // Relationship context
  lines.push("");
  lines.push(`[RELATIONSHIP CONTEXT]`);
  lines.push(`Relationship: ${getRelationshipLabel(synastryData.relationship, synastryData.relationshipCategory)}`);
  lines.push(`Category: ${synastryData.relationshipCategory ? (CATEGORY_LABELS[synastryData.relationshipCategory] ?? synastryData.relationshipCategory) : "general"}`);
  lines.push(`Their name: ${synastryData.chartBName || "Unknown"}`);
  lines.push(`Source: ${synastryData.source === "friend" ? "Friend's public chart" : "Manual input"}`);
  lines.push(`[END ${personBRef.toUpperCase()} — CHART DATA]`);

  return lines.join("\n");
}
