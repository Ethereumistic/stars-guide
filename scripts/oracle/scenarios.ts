import type { OracleCapabilityKey } from "../../src/lib/oracle/capabilities";
import type { OracleSectionPlan } from "../../src/lib/oracle/streaming/types";

export type OracleStreamingScenario =
  | {
      mode: "validated_sections";
      plan: OracleSectionPlan;
      chunks: string[];
      expectedSectionKeys: string[];
      expectedProtocolViolationCodes?: string[];
      expectedFallback?: boolean;
    }
  | {
      mode: "guarded_batches";
      chunks: string[];
      expectedMinBatches: number;
    };

export interface OracleScenarioTurn {
  message: string;
  requiredCapabilities: OracleCapabilityKey[];
  forbiddenCapabilities?: OracleCapabilityKey[];
  requiredGoals?: string[];
  response?: { mocked: string; expectedViolationCodes?: string[] };
  natalEvidence?: {
    availableEntities: string[];
    storedAspects: Array<{ body1: string; body2: string; type: string }>;
  };
  streaming?: OracleStreamingScenario;
}
export interface OracleSimulationScenario {
  id: string; description: string; fixture: "natal-user" | "no-natal-user" | "journal-denied" | "synastry-user";
  timezone: string; fixedNow: string; turns: OracleScenarioTurn[];
}

export const scenarios: OracleSimulationScenario[] = [
  {
    id: "motorbike-vs-diving", description: "Today decision support composes current sky and natal transits.", fixture: "natal-user", timezone: "Asia/Beirut", fixedNow: "2026-07-11T09:00:00.000Z",
    turns: [{ message: "hey tell me is it a good day for a motorbike ride or diving? which one should i pick and why", requiredCapabilities: ["cosmic_weather", "natal_chart", "personal_transits"], requiredGoals: ["compare", "recommend"], response: { mocked: "I cannot tell you which one to pick because I don't have your birth chart or current transit data. Upload your chart.", expectedViolationCodes: ["option_missing", "recommendation_missing", "false_evidence_denial", "uncalibrated_interpretation", "practical_safety_missing"] } }],
  },
  {
    id: "motorbike-vs-diving-no-natal", description: "Collective weather still supports an answer without natal data.", fixture: "no-natal-user", timezone: "Asia/Beirut", fixedNow: "2026-07-11T09:00:00.000Z",
    turns: [{ message: "is it a good day for a motorbike ride or diving? which should I choose today?", requiredCapabilities: ["cosmic_weather"], requiredGoals: ["compare", "recommend"] }],
  },
  {
    id: "journal-consent", description: "Journal recall stays consent gated.", fixture: "journal-denied", timezone: "UTC", fixedNow: "2026-07-11T09:00:00.000Z",
    turns: [{ message: "Look through my journal for patterns", requiredCapabilities: ["journal_recall"], requiredGoals: ["recall"] }],
  },
  {
    id: "full-natal-coverage", description: "A complete chart request activates the full natal response contract.", fixture: "natal-user", timezone: "UTC", fixedNow: "2026-07-11T09:00:00.000Z",
    turns: [{
      message: "Give me a complete reading of my whole birth chart, including every planet and point.",
      requiredCapabilities: ["natal_chart"],
      response: {
        mocked: "Your Sun is expressive, and that is the whole reading.",
        expectedViolationCodes: ["natal_entity_missing"],
      },
    }],
  },
  {
    id: "full-natal-framed-valid",
    description: "A framed natal stream emits every planned section exactly once.",
    fixture: "natal-user",
    timezone: "UTC",
    fixedNow: "2026-07-11T09:00:00.000Z",
    turns: [{
      message: "Give me a complete reading of my whole birth chart.",
      requiredCapabilities: ["natal_chart"],
      streaming: {
        mode: "validated_sections",
        plan: {
          version: "oracle-section-plan-v2",
          sections: [
            { key: "sun", ordinal: 0, title: "Your Sun", requiredEntities: ["sun"], allowedEvidenceKeys: ["placement:sun"] },
            { key: "moon", ordinal: 1, title: "Your Moon", requiredEntities: ["moon"], allowedEvidenceKeys: ["placement:moon"] },
          ],
        },
        chunks: [
          '<<<ORACLE_SECTION_V2 {"key":"sun","evidenceKeys":["placement:sun"]}>>>\n## Your Sun\nYour Sun supports focused expression.\n<<<END_ORACLE_SECTION_V2>>>\n<<<ORACLE_SECTION_V2 {"key":"moon","evidenceKeys":["placement:moon"]}>>>',
          "\n## Your Moon\nYour Moon supports reflective pacing.\n<<<END_ORACLE_SECTION_V2>>>",
        ],
        expectedSectionKeys: ["sun", "moon"],
        expectedFallback: false,
      },
    }],
  },
  {
    id: "invented-natal-aspect-repair",
    description: "An invented aspect is rejected so the owning section enters repair.",
    fixture: "natal-user",
    timezone: "UTC",
    fixedNow: "2026-07-11T09:00:00.000Z",
    turns: [{
      message: "In my birth chart, explain my Chiron and Pluto pattern.",
      requiredCapabilities: ["natal_chart"],
      natalEvidence: {
        availableEntities: ["chiron", "pluto"],
        storedAspects: [{ body1: "sun", body2: "pluto", type: "opposition" }],
      },
      response: {
        mocked: "Your Chiron–Pluto conjunction may shape this pattern.",
        expectedViolationCodes: ["unsupported_natal_aspect"],
      },
    }],
  },
  {
    id: "malformed-section-protocol-fallback",
    description: "Marker-like malformed prose stays hidden and falls back to plain Markdown.",
    fixture: "natal-user",
    timezone: "UTC",
    fixedNow: "2026-07-11T09:00:00.000Z",
    turns: [{
      message: "Give me a complete reading of my whole birth chart.",
      requiredCapabilities: ["natal_chart"],
      streaming: {
        mode: "validated_sections",
        plan: {
          version: "oracle-section-plan-v2",
          sections: [{ key: "sun", ordinal: 0, title: "Your Sun", requiredEntities: ["sun"], allowedEvidenceKeys: ["placement:sun"] }],
        },
        chunks: [[
          "Plain Markdown fallback with a Sun interpretation.",
          "```text",
          '<<<ORACLE_SECTION_V2 {"key":"sun","evidenceKeys":["placement:sun"]}>>>',
          "marker-like example that must not become a transport frame",
          "<<<END_ORACLE_SECTION_V2>>>",
          "```",
        ].join("\n")],
        expectedSectionKeys: [],
        expectedFallback: true,
      },
    }],
  },
  {
    id: "partial-stream-after-sections",
    description: "A partial natal stream preserves complete sections and rejects the unfinished one.",
    fixture: "natal-user",
    timezone: "UTC",
    fixedNow: "2026-07-11T09:00:00.000Z",
    turns: [{
      message: "Give me a complete reading of my whole birth chart.",
      requiredCapabilities: ["natal_chart"],
      streaming: {
        mode: "validated_sections",
        plan: {
          version: "oracle-section-plan-v2",
          sections: [
            { key: "sun", ordinal: 0, title: "Your Sun", requiredEntities: ["sun"], allowedEvidenceKeys: ["placement:sun"] },
            { key: "moon", ordinal: 1, title: "Your Moon", requiredEntities: ["moon"], allowedEvidenceKeys: ["placement:moon"] },
          ],
        },
        chunks: [
          '<<<ORACLE_SECTION_V2 {"key":"sun","evidenceKeys":["placement:sun"]}>>>\nYour Sun supports focused expression.\n<<<END_ORACLE_SECTION_V2>>>\n',
          '<<<ORACLE_SECTION_V2 {"key":"moon","evidenceKeys":["placement:moon"]}>>>\nunfinished Moon section',
        ],
        expectedSectionKeys: ["sun"],
        expectedProtocolViolationCodes: ["missing_end_marker"],
      },
    }],
  },
  {
    id: "ordinary-long-form-guarded-batches",
    description: "Long ordinary prose is deterministically segmented into guarded semantic batches.",
    fixture: "no-natal-user",
    timezone: "UTC",
    fixedNow: "2026-07-11T09:00:00.000Z",
    turns: [{
      message: "Explain how astrologers use symbols as a learning language in a detailed answer.",
      requiredCapabilities: ["general_conversation"],
      forbiddenCapabilities: ["natal_chart", "journal_recall"],
      streaming: {
        mode: "guarded_batches",
        chunks: [
          "Astrological symbols work as a compact vocabulary for recurring ideas. A learner can connect a planet, sign, and house without treating any symbol as a literal command. ",
          "The useful practice is comparison: notice how the same symbol changes with context, keep observations provisional, and revise interpretations when lived experience adds nuance. This keeps the language reflective rather than deterministic.",
        ],
        expectedMinBatches: 2,
      },
    }],
  },
  {
    id: "journal-consent-positive",
    description: "Journal recall is available when explicit server-side consent is present.",
    fixture: "natal-user",
    timezone: "UTC",
    fixedNow: "2026-07-11T09:00:00.000Z",
    turns: [{
      message: "Look through my journal for recurring themes.",
      requiredCapabilities: ["journal_recall"],
      requiredGoals: ["recall"],
    }],
  },
  {
    id: "generic-no-natal-context", description: "An explicit birth-chart and journal opt-out stays generic even when both contexts are otherwise available.", fixture: "natal-user", timezone: "UTC", fixedNow: "2026-07-11T09:00:00.000Z",
    turns: [{
      message: "Explain in five short paragraphs how astrologers use symbols as an educational language. Do not use my birth chart or journal.",
      requiredCapabilities: ["general_conversation"],
      forbiddenCapabilities: ["natal_chart", "journal_recall"],
      requiredGoals: ["inform"],
    }],
  },
];

export function getScenario(id: string) { return scenarios.find((scenario) => scenario.id === id); }
