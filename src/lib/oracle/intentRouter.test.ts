import { describe, expect, it } from "vitest";
import { pipelineIsExcluded, scoreIntents } from "./intentRouter";
import { detectExplicitCapabilityExclusions } from "./requestPlanner";

describe("Oracle intent capability exclusions", () => {
  it("does not activate or inherit natal and journal pipelines after an explicit context opt-out", () => {
    const result = scoreIntents({
      question: "Explain symbols as an educational language. Do not use my birth chart or journal.",
      hasBirthData: true,
      hasJournalConsent: true,
      currentFeatureKey: "birth_chart",
    });

    expect(result.intents).toEqual([
      expect.objectContaining({ pipelineKey: "generic_chat", reason: "fallback_no_match" }),
    ]);
  });

  it("gates LLM-classified pipelines with the same explicit exclusions", () => {
    const excluded = new Set(detectExplicitCapabilityExclusions(
      "Explain symbols as an educational language. Do not use my birth chart or journal.",
    ));

    expect(pipelineIsExcluded("birth_chart", excluded)).toBe(true);
    expect(pipelineIsExcluded("journal_recall", excluded)).toBe(true);
    expect(pipelineIsExcluded("generic_chat", excluded)).toBe(false);
  });
});
