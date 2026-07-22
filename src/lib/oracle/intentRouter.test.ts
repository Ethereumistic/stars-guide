import { describe, expect, it } from "vitest";
import { hasExplicitDeterministicIntent, pipelineIsExcluded, scoreIntents } from "./intentRouter";
import { detectExplicitCapabilityExclusions } from "./requestPlanner";

describe("Oracle intent capability exclusions", () => {
  it("routes the reported binaural transposition without relying on the model classifier", () => {
    const result = scoreIntents({
      question: "generate me a binarual beat for today's weather and call it smth cool",
      hasBirthData: true,
      hasJournalConsent: false,
      currentFeatureKey: null,
    });

    expect(result.primary).toEqual(expect.objectContaining({
      pipelineKey: "binaural_beats",
      reason: "binaural_intent",
    }));
    expect(hasExplicitDeterministicIntent(result)).toBe(true);
  });

  it("keeps an ordinary music discussion out of the binaural capability", () => {
    const result = scoreIntents({
      question: "Why do people call that album cool?",
      hasBirthData: true,
      hasJournalConsent: false,
      currentFeatureKey: null,
    });

    expect(result.primary).toEqual(expect.objectContaining({ pipelineKey: "generic_chat" }));
    expect(hasExplicitDeterministicIntent(result)).toBe(false);
  });

  it("does not inherit a birth-chart session for a collective cosmic-weather request", () => {
    const result = scoreIntents({
      question: "tell me the cosmic weather atm",
      hasBirthData: true,
      hasJournalConsent: false,
      currentFeatureKey: "birth_chart",
    });

    expect(result.intents).toEqual([
      expect.objectContaining({ pipelineKey: "generic_chat", reason: "cosmic_weather_intent" }),
    ]);
  });

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
