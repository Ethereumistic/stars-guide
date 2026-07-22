import { describe, expect, it } from "vitest";
import { planOracleRequest } from "./requestPlanner";
import { validateOracleResponse } from "./responseValidator";

describe("Oracle request planner", () => {
  it("plans the reported misspelled binaural request as an audio capability", () => {
    const plan = planOracleRequest(
      "generate me a binarual beat for today's weather and call it smth cool",
      { hasBirthData: true, hasJournalConsent: false },
    );

    expect(plan.goals).toContain("generate_audio");
    expect(plan.explicitCapabilities).toContain("binaural_beats");
    expect(plan.requiredCapabilities).toEqual(expect.arrayContaining([
      "binaural_beats",
      "cosmic_weather",
      "general_conversation",
    ]));
    expect(plan.deterministicRuleMatches).toContain("binaural_explicit");
  });

  it("keeps a direct collective cosmic-weather request free of natal data", () => {
    const plan = planOracleRequest("tell me the cosmic weather atm", {
      hasBirthData: true,
      hasJournalConsent: false,
      explicitFeatureKey: "birth_chart",
    });

    expect(plan.requiredCapabilities).toEqual(["cosmic_weather", "general_conversation"]);
    expect(plan.requiredCapabilities).not.toContain("personal_transits");
    expect(plan.requiredCapabilities).not.toContain("natal_chart");
    expect(plan.deterministicRuleMatches).not.toContain("temporal_personalization");
  });

  it("still adds a natal overlay when the user explicitly asks for personal transits", () => {
    const plan = planOracleRequest("How are the current transits affecting me?", {
      hasBirthData: true,
      hasJournalConsent: false,
    });

    expect(plan.requiredCapabilities).toEqual(expect.arrayContaining([
      "cosmic_weather",
      "personal_transits",
      "natal_chart",
    ]));
  });

  it("composes today's sky with natal transits for decision support", () => {
    const plan = planOracleRequest("is it a good day for a motorbike ride or diving? which one should i pick and why", { hasBirthData: true, hasJournalConsent: false });
    expect(plan.goals).toEqual(expect.arrayContaining(["compare", "recommend"]));
    expect(plan.temporalScope).toBe("today");
    expect(plan.requiredCapabilities).toEqual(expect.arrayContaining(["cosmic_weather", "natal_chart", "personal_transits"]));
  });
  it("continues with collective sky when natal data is absent", () => {
    const plan = planOracleRequest("motorbike ride or diving today, which should I choose?", { hasBirthData: false, hasJournalConsent: false });
    expect(plan.requiredCapabilities).toContain("cosmic_weather");
    expect(plan.unavailableCapabilities).toEqual(expect.arrayContaining([{ capability: "personal_transits", reason: "canonical_birth_data_missing" }, { capability: "natal_chart", reason: "canonical_birth_data_missing" }]));
  });
  it("does not turn a generic use of 'everything' into a full natal contract", () => {
    const plan = planOracleRequest("Tell me everything you know about this topic", { hasBirthData: true, hasJournalConsent: false });
    expect(plan.responseContract.requiresFullNatalCoverage).toBe(false);
    expect(plan.responseContract.requiredNatalEntities).toEqual([]);
  });
  it("treats explicit birth-chart and journal opt-outs as forbidden data capabilities", () => {
    const plan = planOracleRequest(
      "Explain symbols as an educational language. Do not use my birth chart or journal.",
      { hasBirthData: true, hasJournalConsent: true, explicitFeatureKey: "birth_chart" },
    );
    expect(plan.requiredCapabilities).toEqual(["general_conversation"]);
    expect(plan.forbiddenCapabilities).toEqual(expect.arrayContaining(["natal_chart", "journal_recall"]));
    expect(plan.goals).toEqual(["inform"]);
    expect(plan.entities).toEqual([]);
    expect(plan.responseContract.mustCompareAllOptions).toBe(false);
    expect(plan.responseContract.requiresFullNatalCoverage).toBe(false);
  });
  it("detects the reported unacceptable response", () => {
    const plan = planOracleRequest("is it a good day for a motorbike ride or diving? which one should i pick and why", { hasBirthData: true, hasJournalConsent: false });
    const evidence = { requestedAt: new Date(0).toISOString(), timezone: "UTC", warnings: [], items: [{ capability: "personal_transits" as const, label: "transits", content: "evidence", provenance: { source: "test", version: "1", calculatedAt: new Date(0).toISOString() } }] };
    const result = validateOracleResponse("I cannot tell you. Upload your chart.", plan, evidence);
    expect(result.map((item) => item.code)).toEqual(expect.arrayContaining(["false_evidence_denial", "recommendation_missing", "practical_safety_missing"]));
  });

  it("requires every available canonical body for an explicit full-chart request", () => {
    const availableNatalEntities = [
      "ascendant", "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus",
      "neptune", "pluto", "north_node", "south_node", "part_of_fortune", "chiron",
    ];
    const plan = planOracleRequest("Analyze every single planet, node, Chiron, and everything from 0 to 100", {
      hasBirthData: true,
      hasJournalConsent: false,
      explicitFeatureKey: "birth_chart",
      availableNatalEntities,
    });
    expect(plan.temporalScope).toBe("none");
    expect(plan.responseContract.requiresFullNatalCoverage).toBe(true);
    expect(plan.responseContract.requiredNatalEntities).toContain("Part of Fortune");

    const result = validateOracleResponse(
      "Ascendant Sun Moon Mercury Venus Mars Jupiter Saturn Uranus Neptune Pluto North Node South Node Chiron",
      plan,
      { requestedAt: new Date(0).toISOString(), timezone: "UTC", warnings: [], items: [] },
    );
    expect(result).toContainEqual(expect.objectContaining({ code: "natal_entity_missing", message: expect.stringContaining("Part of Fortune") }));
  });

  it("rejects natal aspects that are absent from canonical stored aspects", () => {
    const plan = planOracleRequest("Analyze my natal Chiron", {
      hasBirthData: true,
      hasJournalConsent: false,
      explicitFeatureKey: "birth_chart",
      availableNatalEntities: ["chiron", "pluto"],
    });
    const evidence = {
      requestedAt: new Date(0).toISOString(),
      timezone: "UTC",
      warnings: [],
      items: [],
      natalChart: {
        availableEntities: ["chiron", "pluto"],
        storedAspects: [{ body1: "sun", body2: "pluto", type: "opposition" }],
      },
    };
    const result = validateOracleResponse("The Chiron–Pluto conjunction gives you a guaranteed psychic gift.", plan, evidence);
    expect(result.map((item) => item.code)).toEqual(expect.arrayContaining(["unsupported_natal_aspect", "uncalibrated_natal_claim"]));
  });
});
