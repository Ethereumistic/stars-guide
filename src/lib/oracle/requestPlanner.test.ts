import { describe, expect, it } from "vitest";
import { planOracleRequest } from "./requestPlanner";
import { validateOracleResponse } from "./responseValidator";

describe("Oracle request planner", () => {
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
  it("detects the reported unacceptable response", () => {
    const plan = planOracleRequest("is it a good day for a motorbike ride or diving? which one should i pick and why", { hasBirthData: true, hasJournalConsent: false });
    const evidence = { requestedAt: new Date(0).toISOString(), timezone: "UTC", warnings: [], items: [{ capability: "personal_transits" as const, label: "transits", content: "evidence", provenance: { source: "test", version: "1", calculatedAt: new Date(0).toISOString() } }] };
    const result = validateOracleResponse("I cannot tell you. Upload your chart.", plan, evidence);
    expect(result.map((item) => item.code)).toEqual(expect.arrayContaining(["false_evidence_denial", "recommendation_missing", "practical_safety_missing"]));
  });
});
