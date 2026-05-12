/**
 * Synastry Context Builder
 *
 * Produces instruction blocks and formatted data for the synastry pipeline.
 * The synastry pipeline uses these to give the LLM everything it needs
 * to produce a Synastry reading.
 */

import type { SynastryPayload } from "./pipelineTypes";
import { buildUniversalBirthContext } from "./featureContext";

// ── Synastry Instruction Block ──────────────────────────────────────────────

/**
 * Get the system prompt instruction block for synastry readings.
 * This tells the LLM HOW to interpret two charts together.
 */
export function getSynastryInstructions(): string {
  return [
    "[SYNASTRY READING INSTRUCTIONS]",
    "ROLE: You are an expert astrologer performing a synastry (relationship chart overlay) reading.",
    "You have been given TWO natal charts: Chart A (the primary person) and Chart B (the other person).",
    "",
    "APPROACH:",
    "1. Compare planetary positions between charts — identify inter-chart aspects (e.g., Person A's Sun conjunct Person B's Moon).",
    "2. Look at element and modality balance between the two charts.",
    "3. Identify areas of natural flow (trines, sextiles between charts) and friction (squares, oppositions).",
    "4. Consider house overlays: where does each person's planets fall in the other's houses?",
    "5. The RELATIONSHIP TYPE provided is critical context — synastry reads differently for romantic partners vs. parent-child vs. business partners.",
    "",
    "STRUCTURE YOUR RESPONSE AS:",
    "## Cosmic Connection Report ✨",
    "*[2-3 sentence overview of the connection's dominant energy]*",
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
    "*[How the relationship type colors these placements — e.g., Sun-Moon conjunction means something different for siblings vs. lovers]*",
    "",
    "---",
    "### Connection at a Glance",
    "| Theme | Chart A | Chart B | Dynamic |",
    "| :--- | :--- | :--- | :--- |",
    "*[Key planetary pairs]*",
    "",
    "> *[One empowering closing thought about what this connection is here to teach both people.]*",
    "",
    "RULES:",
    "- Treat all chart data as canonical truth. Do not invent placements.",
    "- When data is missing for a placement, say so plainly.",
    "- Be honest about friction — don't sugarcoat, but don't catastrophize.",
    "- Personalize based on the relationship type provided.",
    "- Keep the tone engaging, insightful, and empathetic.",
    "[END SYNASTRY READING INSTRUCTIONS]",
  ].join("\n");
}

// ── Chart B Context Builder ──────────────────────────────────────────────────

/**
 * Build the user message block for Chart B data.
 * This formats the second person's birth data and relationship context
 * for inclusion in the LLM prompt.
 */
export function buildSynastryChartBContext(synastryData: SynastryPayload): string {
  const lines: string[] = [];

  lines.push(`[CHART B DATA — ${synastryData.chartBName || "Second Person"}]`);

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
  lines.push(`Relationship type: ${synastryData.relationship}`);
  lines.push(`Chart B source: ${synastryData.source === "friend" ? "Friend's public chart" : "Manual input"}`);
  lines.push(`[END CHART B DATA]`);

  return lines.join("\n");
}