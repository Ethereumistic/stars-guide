import { describe, expect, it } from "vitest";
import type { StoredBirthData } from "./types";
import { detectChartPatterns } from "./patterns";
import { buildBirthChartContextArtifact, serializeBirthChartForOracle } from "./report-context";
import { getBirthChartReportV3QualityIssues, validateAndHydrateBirthChartReportV3 } from "../../../convex/birthChartReport/v3";

const planet = (id: string, signId: string, houseId: number, longitude: number) => ({ id, signId, houseId, longitude, retrograde: false, dignity: null });

const birthData: StoredBirthData = {
  date: "2000-01-01",
  time: "12:00",
  timezone: "UTC",
  utcTimestamp: "2000-01-01T12:00:00.000Z",
  houseSystem: "whole_sign",
  location: { lat: 0, long: 0, city: "Accra", country: "Ghana" },
  placements: [],
  chart: {
    ascendant: { signId: "aries", longitude: 0 },
    planets: [
      planet("sun", "aries", 1, 0), planet("moon", "libra", 7, 180), planet("mars", "cancer", 4, 90),
      planet("mercury", "aries", 1, 12), planet("venus", "taurus", 2, 42), planet("jupiter", "gemini", 3, 75),
      planet("saturn", "leo", 5, 125), planet("uranus", "scorpio", 8, 215), planet("neptune", "sagittarius", 9, 250),
      planet("pluto", "aquarius", 11, 310), planet("north_node", "cancer", 4, 100), planet("south_node", "capricorn", 10, 280),
    ],
    houses: Array.from({ length: 12 }, (_, index) => ({ id: index + 1, signId: ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"][index], longitude: index * 30 })),
    aspects: [
      { planet1: "sun", planet2: "moon", type: "opposition", angle: 180, orb: 0 },
      { planet1: "sun", planet2: "mars", type: "square", angle: 90, orb: 0 },
      { planet1: "moon", planet2: "mars", type: "square", angle: 90, orb: 0 },
    ],
  },
};

function makeRawReport(evidenceId = "placement:sun") {
  const context = buildBirthChartContextArtifact(birthData);
  const practice = { title: "Pause before choosing", instruction: "Before the next decision, write down two options and choose after ten minutes.", cadence: "as_needed" };
  return {
    context,
    raw: {
      meta: { version: 3, reportTitle: "A chart in motion" },
      identity: { anchorPhrase: "Pressure can become direction", oneSentence: "You often turn competing needs into movement when you give the tension a clear and practical outlet.", orientation: "Use this as a field guide." },
      chartSignature: { patternId: context.derived.patterns[0].id, meaning: "The opposition creates a polarity while Mars becomes the place where pressure asks for movement and a concrete response.", gift: "You can mobilize quickly when a situation needs a decisive response.", watchFor: "Urgency can make every disagreement feel like a demand for immediate action.", practice },
      themes: [0, 1, 2].map((index) => ({ id: `theme_${index}`, title: `Distinct theme ${index}`, summary: "A precise chart-grounded summary that is long enough to satisfy the concise product contract and remain useful.", gift: "A specific and observable strength becomes available when this pattern is used consciously.", watchFor: "Notice when the same strength becomes automatic and crowds out a more measured response.", practice, evidenceIds: [index === 0 ? evidenceId : "placement:sun"] })),
      compass: Object.fromEntries(["innerWorld", "relationships", "vocation", "growth"].map((key) => [key, { headline: `A useful ${key} heading`, summary: "This is a sufficiently specific summary of how to use the chart in this life arena without turning it into a fixed prediction.", evidenceIds: ["placement:sun"] }])),
      toolkit: { decisionRule: practice, resetPractice: practice, connectionPractice: practice },
      oraclePrompts: [0, 1, 2, 3].map((index) => ({ label: `Explore thread ${index}`, prompt: "How can I work with this exact chart pattern in a current decision without making it deterministic?", evidenceIds: ["placement:sun"] })),
    },
  };
}

describe("deterministic birth chart context", () => {
  it("detects exact geometric patterns from stored aspects", () => {
    const patterns = detectChartPatterns(birthData);
    expect(patterns.some((pattern) => pattern.name === "T-Square" && pattern.confidence === "exact")).toBe(true);
  });

  it("builds stable approved evidence and an Oracle context with no human report", () => {
    const first = buildBirthChartContextArtifact(birthData);
    const second = buildBirthChartContextArtifact(birthData);
    expect(first.sourceFingerprint).toBe(second.sourceFingerprint);
    expect(first.evidence.some((item) => item.id === "aspect:moon:opposition:sun")).toBe(true);
    const serialized = serializeBirthChartForOracle(birthData);
    expect(serialized).toContain("direct server translation of users.birthData");
    expect(serialized).not.toContain("BIRTH CHART REPORT SUMMARY");
  });

  it("rejects LLM evidence IDs that the server did not approve", () => {
    const { context, raw } = makeRawReport("invented:evidence");
    expect(() => validateAndHydrateBirthChartReportV3(raw, context, "Ari")).toThrow(/approved evidence ID/);
  });

  it("accepts concise prose below an editorial target and clamps copy overruns", () => {
    const { context, raw } = makeRawReport();
    raw.identity.oneSentence = "This sentence deliberately runs past the server copy budget. ".repeat(8);

    const report = validateAndHydrateBirthChartReportV3(raw, context, "Ari");

    expect(report.meta.reportTitle).toBe("Ari’s Birth Chart");
    expect(report.identity.orientation).toBe("Use this as a field guide.");
    expect(report.identity.orientation.length).toBeLessThan(40);
    expect(report.identity.oneSentence.length).toBeLessThanOrEqual(280);
    expect(report.identity.oneSentence.endsWith("\u2026")).toBe(true);
  });

  it("recognizes common imperative verbs without treating the heuristic as chart validation", () => {
    const { context, raw } = makeRawReport();
    const report = validateAndHydrateBirthChartReportV3(raw, context, "Ari");
    report.chartSignature.practice.instruction = "Create a short list of the two competing needs before you choose your next response.";

    expect(getBirthChartReportV3QualityIssues(report)).not.toContain("Practice 1 needs an observable action");

    report.chartSignature.practice.instruction = "Clarity may become available when the moment feels less pressured.";
    expect(getBirthChartReportV3QualityIssues(report)).toContain("Practice 1 needs an observable action");
  });
});
