import { describe, expect, it } from "vitest";
import type { OracleEvidenceBundle, OracleRequestPlan } from "../capabilities";
import { buildOracleSectionPlan, selectOracleResumeSectionPlan } from "./sectionPlan";

function requestPlan(full: boolean): OracleRequestPlan {
  return {
    version: "oracle-planner-v1",
    goals: ["interpret"],
    temporalScope: "none",
    entities: [],
    explicitCapabilities: ["natal_chart"],
    inferredCapabilities: [],
    requiredCapabilities: ["natal_chart"],
    optionalCapabilities: [],
    unavailableCapabilities: [],
    forbiddenCapabilities: [],
    unresolvedRequirements: [],
    deterministicRuleMatches: [],
    responseContract: {
      mustCompareAllOptions: false,
      mustRecommend: false,
      practicalSafety: false,
      requiresFullNatalCoverage: full,
      requiredNatalEntities: full ? ["Ascendant", "Sun", "North Node", "South Node"] : ["Sun"],
    },
  };
}

const evidence: OracleEvidenceBundle = {
  requestedAt: new Date(0).toISOString(),
  timezone: "UTC",
  warnings: [],
  items: [],
  natalChart: {
    availableEntities: ["ascendant", "sun", "north_node", "south_node"],
    storedAspects: [{ body1: "Sun", body2: "North Node", type: "trine" }],
    houseSignatures: [{ house: 1, sign: "Aries" }],
    chartRuler: { body: "Mars" },
    concentrations: [{ kind: "sign", value: "Aries", bodies: ["Sun", "Mars", "Venus"] }],
  },
};

describe("buildOracleSectionPlan", () => {
  it("builds a deterministic full-chart order from available evidence", () => {
    const result = buildOracleSectionPlan(requestPlan(true), evidence);
    expect(result.sections.map((section) => section.key)).toEqual([
      "overview",
      "ascendant",
      "sun",
      "nodes",
      "house_signatures",
      "aspects",
      "synthesis",
    ]);
    expect(result.sections.map((section) => section.ordinal)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(result.sections.find((section) => section.key === "nodes")?.requiredEntities).toEqual([
      "north_node",
      "south_node",
    ]);
  });

  it("omits unavailable entities and limits a narrow request to its target", () => {
    const result = buildOracleSectionPlan(requestPlan(false), evidence);
    expect(result.sections.map((section) => section.key)).toEqual(["sun"]);
    expect(result.sections[0].allowedEvidenceKeys).toContain("placement:sun");
    expect(result.sections[0].allowedEvidenceKeys).toContain("aspect:north_node:sun:trine");
  });

  it("selects only missing Resume keys in canonical section order", () => {
    const full = buildOracleSectionPlan(requestPlan(true), evidence);
    const resumed = selectOracleResumeSectionPlan(full, ["synthesis", "sun"]);
    expect(resumed.sections.map((section) => section.key)).toEqual(["sun", "synthesis"]);
  });
});
