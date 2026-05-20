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
    "1. Compare planetary positions between charts — identify inter-chart aspects (e.g., the User's Sun conjunct their partner's Moon).",
    "2. Look at element and modality balance between the two charts.",
    "3. Identify areas of natural flow (trines, sextiles between charts) and friction (squares, oppositions).",
    "4. Consider house overlays: where does each person's planets fall in the other's houses?",
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