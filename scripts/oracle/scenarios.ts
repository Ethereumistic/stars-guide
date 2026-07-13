import type { OracleCapabilityKey } from "../../src/lib/oracle/capabilities";

export interface OracleScenarioTurn {
  message: string;
  requiredCapabilities: OracleCapabilityKey[];
  forbiddenCapabilities?: OracleCapabilityKey[];
  requiredGoals?: string[];
  response?: { mocked: string; expectedViolationCodes?: string[] };
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
];

export function getScenario(id: string) { return scenarios.find((scenario) => scenario.id === id); }
