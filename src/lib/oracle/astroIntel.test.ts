import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CosmicWeatherSnapshot } from "../../../convex/lib/astronomyEngine";
import {
  buildPersonalTransitContext,
  buildUpcomingTransitWindows,
  buildTimespaceContext,
  hasTimespaceIntent,
  hasTechnologyDisruptionIntent,
  isDirectCurrentSkyQuestion,
} from "../../../convex/oracle/timespace";
import { buildSynastryComparisonContext } from "./synastryContext";
import type { StoredBirthData, StoredChartPlanet } from "../birth-chart/types";
import type { SynastryPayload } from "./pipelineTypes";
import { DEFAULT_ORACLE_SOUL } from "../../../lib/oracle/soul";
import { ORACLE_SAFETY_RULES } from "../../../lib/oracle/safetyRules";
import { buildReportSystemPrompt } from "../../../convex/birthChartReport/prompts";
import { getSynastryInstructions } from "./synastryContext";
import { evaluateBirthChartReport } from "../../../convex/birthChartReport/quality";
import type { BirthChartReportV2, EvidenceRef } from "../../../convex/birthChartReport/v2";
import { buildQuestionRelevantBirthContext } from "./featureContext";
import { birthChartPipeline } from "./pipelines/birthChart";

const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];

function planet(
  id: string,
  longitude: number,
  signId = signs[Math.floor(longitude / 30)],
  houseId = 1,
): StoredChartPlanet {
  return { id, longitude, signId, houseId, retrograde: false, dignity: null };
}

function chart(planets: StoredChartPlanet[], risingSignIndex = 0): StoredBirthData {
  return {
    date: "1990-01-01",
    time: "12:00",
    timezone: "UTC",
    houseSystem: "whole_sign",
    location: { lat: 0, long: 0, city: "Test", country: "Test" },
    placements: [],
    chart: {
      ascendant: { longitude: risingSignIndex * 30, signId: signs[risingSignIndex] },
      planets,
      aspects: [],
      houses: signs.map((signId, index) => ({
        id: ((index - risingSignIndex + 12) % 12) + 1,
        signId,
        longitude: index * 30,
      })),
    },
  };
}

function weather(positions: Array<[string, string, number]>): CosmicWeatherSnapshot {
  return {
    planetPositions: positions.map(([name, sign, degreeInSign]) => ({
      planet: name,
      sign,
      degreeInSign,
      isRetrograde: false,
    })),
    moonPhase: { name: "Waxing Crescent", illuminationPercent: 20 },
    activeAspects: [],
  };
}

describe("personal transit intelligence", () => {
  it("recognizes colloquial weekly timing questions and injects current personal transits", () => {
    const question = "Hey tell me what is the reason behind why everything is breaking that week";
    assert.equal(hasTimespaceIntent(question), true);

    const context = buildTimespaceContext("UTC", question, chart([planet("sun", 10)]));
    assert.equal(context.hasIntent, true);
    assert.match(context.context, /Current planetary positions:/);
    assert.match(context.context, /PERSONAL TRANSIT INTELLIGENCE/);
    assert.match(context.context, /Never claim current transit or cosmic-weather data is unavailable/);
  });

  it("treats a device-breakage refinement as temporal and requires a Mercury-status check", () => {
    const question = "i meant as of technology and devices";
    assert.equal(hasTechnologyDisruptionIntent(question), true);
    assert.equal(hasTimespaceIntent(question), true);

    const context = buildTimespaceContext("UTC", question, chart([planet("mercury", 100)]));
    assert.match(context.context, /TECHNOLOGY DISRUPTION DIAGNOSTIC/);
    assert.match(context.context, /Mercury status at the request instant: (RETROGRADE|DIRECT)/);
    assert.match(context.context, /Never omit this check/);
    assert.match(context.context, /Do not manufacture a Uranus, Mercury, or house contact/);
  });

  it("routes direct current-sky questions through calculated evidence for interpretation", () => {
    const question = "what is the current sky, what is retrograde?";
    assert.equal(isDirectCurrentSkyQuestion(question), true);
    const context = buildTimespaceContext("UTC", question, null);
    assert.match(context.context, /Current planetary positions:/);
    assert.match(context.context, /Temporal-answer contract:/);
    assert.match(context.context, /Never claim current transit or cosmic-weather data is unavailable/);
  });

  it("keeps collective cosmic weather free of a stored natal overlay", () => {
    const question = "tell me the cosmic weather atm";
    assert.equal(isDirectCurrentSkyQuestion(question), true);
    const context = buildTimespaceContext(
      "UTC",
      question,
      chart([planet("sun", 10)]),
      null,
      true,
      false,
    );
    assert.match(context.context, /Current planetary positions:/);
    assert.doesNotMatch(context.context, /PERSONAL TRANSIT INTELLIGENCE/);
    assert.doesNotMatch(context.context, /Personal transit overlay: unavailable/);
  });

  it("calculates a transit-to-natal aspect and identifies an applying trend", () => {
    const natal = chart([planet("sun", 10)]);
    const current = weather([["Saturn", "Aries", 12]]);
    const tomorrow = weather([["Saturn", "Aries", 11]]);

    const context = buildPersonalTransitContext(natal, current, tomorrow);

    assert.match(context ?? "", /Transiting Saturn conjunction natal Sun/);
    assert.match(context ?? "", /orb 2\.00°, applying/);
    assert.match(context ?? "", /transiting through House 1/);
    assert.match(context ?? "", /natal point in House 1/);
    assert.match(context ?? "", /traditionally rules natal Houses 10 and 11/);
  });

  it("finds the nearest sampled peak in the forecast horizon", () => {
    const natal = chart([planet("sun", 10)]);
    const snapshots = [
      { date: "2026-07-10", snapshot: weather([["Saturn", "Aries", 14]]) },
      { date: "2026-07-11", snapshot: weather([["Saturn", "Aries", 12]]) },
      { date: "2026-07-12", snapshot: weather([["Saturn", "Aries", 10.2]]) },
      { date: "2026-07-13", snapshot: weather([["Saturn", "Aries", 11]]) },
    ];

    const context = buildUpcomingTransitWindows(natal, snapshots);

    assert.match(context ?? "", /2026-07-12: transiting Saturn conjunction natal Sun/);
    assert.match(context ?? "", /sampled orb 0\.20°/);
  });
});

describe("birth context selection", () => {
  const natal = chart([
    planet("sun", 10, "aries", 1),
    planet("moon", 92, "cancer", 4),
    planet("saturn", 280, "capricorn", 10),
  ]);

  it("uses a focused canonical slice for an explicit placement question", () => {
    const result = buildQuestionRelevantBirthContext("What does my Moon placement need?", natal);
    assert.equal(result.mode, "focused");
    assert.match(result.context, /Moon: Cancer/);
    assert.doesNotMatch(result.context, /Saturn: Capricorn/);
  });

  it("keeps the full chart for broad synthesis", () => {
    const result = buildQuestionRelevantBirthContext("Give me an overall chart overview", natal);
    assert.equal(result.mode, "full");
    assert.match(result.context, /Moon: Cancer/);
    assert.match(result.context, /Saturn: Capricorn/);
  });
});

describe("synastry intelligence", () => {
  it("calculates cross-aspects and bidirectional whole-sign overlays", () => {
    const user = chart([planet("sun", 10, "aries", 1)], 0);
    const other = chart([planet("moon", 11, "aries", 4), planet("sun", 20, "aries", 4)], 3);
    const payload: SynastryPayload = {
      chartB: other,
      source: "custom",
      relationship: "partner",
      relationshipCategory: "romantic",
      chartBName: "Alex",
    };

    const context = buildSynastryComparisonContext(user, payload);

    assert.match(context ?? "", /Your Sun conjunction Alex's Moon \(orb 1\.00°\)/);
    assert.match(context ?? "", /Alex's Moon falls in your House 1/);
    assert.match(context ?? "", /Your Sun falls in Alex's House 10/);
    assert.match(context ?? "", /Chart-ruler weighting: your ruler is Mars; Alex's ruler is Moon/);
    assert.match(context ?? "", /Composite Sun: Aries 15\.00/);
    assert.match(context ?? "", /Declination evidence: unavailable/);
  });
});

describe("Oracle experience prompt contracts", () => {
  it("permits calibrated forecasting while rejecting certainty", () => {
    assert.match(ORACLE_SAFETY_RULES, /probabilistic, astrology-grounded forecasts/);
    assert.match(ORACLE_SAFETY_RULES, /Never present a future event as certain/);
    assert.doesNotMatch(ORACLE_SAFETY_RULES, /Never predict specific future events, including/);
    assert.match(DEFAULT_ORACLE_SOUL, /Convert the question into a calibrated forecast/);
    assert.match(DEFAULT_ORACLE_SOUL, /useful action or decision rule/);
  });

  it("adds validated report insights as a subordinate interpretation layer", () => {
    const prompt = buildReportSystemPrompt();
    assert.match(prompt, /concise, premium reading experience for a human/);
    assert.match(prompt, /Use only evidence IDs listed in APPROVED EVIDENCE/);
    assert.match(prompt, /observable practice/);
    assert.match(prompt, /include a trigger or cadence/);
    const blocks = birthChartPipeline.buildPromptBlocks({
      userQuestion: "What pattern matters?", timezone: "UTC", isFirstResponse: false,
      featureKey: "birth_chart", birthChartDepth: "core", birthData: "deterministic chart",
      birthChartReportContext: "[VALIDATED BIRTH CHART REPORT INSIGHTS]\nbounded insights",
      journalContext: null, timespaceContext: null,
      soulDoc: "soul", featureInjection: null, rawBirthData: null, synastryData: null,
    });
    assert.match(blocks.systemBlocks.map((block) => block.content).join("\n"), /canonical natal chart is the sole authority/i);
    const userContext = blocks.userBlocks.map((block) => block.content).join("\n");
    assert.match(userContext, /deterministic chart/);
    assert.match(userContext, /VALIDATED BIRTH CHART REPORT INSIGHTS/);
    assert.ok(userContext.indexOf("deterministic chart") < userContext.indexOf("VALIDATED BIRTH CHART REPORT INSIGHTS"));
  });

  it("requires relationship guidance without mind-reading or compatibility scores", () => {
    const prompt = getSynastryInstructions("Alex", "partner", "romantic");
    assert.match(prompt, /communication move, a boundary or repair move/);
    assert.match(prompt, /private thoughts, intentions, or future behavior/);
    assert.match(prompt, /Separate chemistry, ease, durability, and growth potential/);
  });
});

describe("birth chart report quality gate", () => {
  const canonical = chart([planet("sun", 10, "aries", 1)]);
  const evidence: EvidenceRef[] = [{ type: "placement", bodyId: "sun", signId: "aries", label: "Sun in Aries" }];
  const insight = (title: string) => ({ title, body: `${title} shows up in concrete choices.`, evidence });
  const practice = (title: string) => ({ title, instruction: "For seven days, write one choice down before acting.", evidence, cadence: "daily" as const });
  const area = (title: string) => ({ title, summary: `${title} summary`, keyInsights: [insight(title)], practices: [practice(title)], evidence, oraclePrompts: [`How does ${title} change this choice?`] });
  const report: BirthChartReportV2 = {
    meta: { version: 2, reportTitle: "Test", preferredName: "Test", generatedAt: 1, birthDataSummary: "Test" },
    visualIdentity: { dominantPlanetIds: ["sun"], dominantSignIds: ["aries"] },
    overview: { motto: "Choose clearly", chartAtGlance: "Test", oneSentence: "Test", coreMyth: "Test", topThemes: [insight("One"), insight("Two"), insight("Three")], howToUseThisReport: ["Use it"] },
    signatures: ["One", "Two", "Three"].map((title) => ({ id: title.toLowerCase(), title, shortSummary: "Specific summary", evidence, evidenceStrength: "strong" as const, livedExperience: "A recognizable pattern", gift: "Decisiveness", watchFor: "Rushing", practice: "Before a decision, write one alternative down.", relatedPlanetIds: ["sun"], relatedSignIds: ["aries"], relatedHouseIds: [1], relatedAspectIds: [], oraclePrompt: `How does ${title} affect my next decision?` })),
    lifeAreas: { innerWorld: area("Inner world"), outerSelf: area("Outer self"), mindVoice: area("Mind"), loveAttachment: area("Love"), workCalling: area("Work"), growthPath: area("Growth") },
    integration: { gifts: [insight("Gift")], growthEdges: [insight("Edge")], practices: [1, 2, 3, 4, 5].map((i) => practice(`Practice ${i}`)), reflectionPrompts: [1, 2, 3, 4, 5].map((i) => ({ prompt: `What happened after choice ${i}?`, evidence })) },
    oracleFollowUps: [1, 2, 3, 4, 5].map((i) => ({ label: `Thread ${i}`, prompt: `Which Sun in Aries pattern shapes decision ${i} most clearly?` })),
    technicalAppendix: { placements: evidence, aspects: [], concentrations: [] },
  };

  it("accepts an evidence-backed report with observable practices and specific follow-ups", () => {
    const result = evaluateBirthChartReport(report, canonical);
    assert.equal(result.passed, true);
    assert.equal(result.score, 100);
  });

  it("rejects generic and untestable guidance", () => {
    const weak = structuredClone(report);
    weak.integration.practices[0].instruction = "Embrace your journey.";
    weak.oracleFollowUps[0].prompt = "Tell me more";
    const result = evaluateBirthChartReport(weak);
    assert.equal(result.passed, false);
    assert.ok(result.issues.some((issue) => issue.code === "generic_language"));
    assert.ok(result.issues.some((issue) => issue.code === "untestable_practice"));
    assert.ok(result.issues.some((issue) => issue.code === "generic_follow_up"));
  });

  it("rejects a schema-valid evidence reference that contradicts the canonical chart", () => {
    const fabricated = structuredClone(report);
    fabricated.signatures[0].evidence = [{ type: "placement", bodyId: "sun", signId: "taurus", label: "Sun in Taurus" }];
    const result = evaluateBirthChartReport(fabricated, canonical);
    assert.equal(result.passed, false);
    assert.ok(result.issues.some((issue) => issue.code === "invented_evidence"));
  });
});
