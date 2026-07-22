import { describe, expect, it } from "vitest";
import type { OracleEvidenceBundle, OracleRequestPlan } from "../capabilities";
import { OraclePublicationError, OracleStreamPublisher } from "./streamPublisher";
import type { OracleSectionPlan } from "./types";

const genericPlan: OracleRequestPlan = {
  version: "oracle-planner-v1",
  goals: ["inform"],
  temporalScope: "none",
  entities: [],
  explicitCapabilities: ["general_conversation"],
  inferredCapabilities: [],
  requiredCapabilities: ["general_conversation"],
  optionalCapabilities: [],
  unavailableCapabilities: [],
  forbiddenCapabilities: ["natal_chart", "journal_recall"],
  unresolvedRequirements: [],
  deterministicRuleMatches: [],
  responseContract: {
    mustCompareAllOptions: false,
    mustRecommend: false,
    practicalSafety: false,
    requiresFullNatalCoverage: false,
    requiredNatalEntities: [],
  },
};

const natalPlan: OracleRequestPlan = {
  ...genericPlan,
  explicitCapabilities: ["natal_chart"],
  requiredCapabilities: ["natal_chart"],
  forbiddenCapabilities: [],
  responseContract: {
    ...genericPlan.responseContract,
    requiredNatalEntities: ["sun"],
  },
};

const sectionPlan: OracleSectionPlan = {
  version: "oracle-section-plan-v2",
  sections: [{
    key: "sun",
    ordinal: 0,
    title: "Your Sun",
    requiredEntities: ["sun"],
    allowedEvidenceKeys: ["placement:sun"],
  }],
};

const evidence: OracleEvidenceBundle = {
  requestedAt: "2026-01-01T00:00:00.000Z",
  timezone: "UTC",
  items: [{
    capability: "natal_chart",
    label: "Canonical chart",
    content: "private fixture",
    provenance: { source: "test", version: "1", calculatedAt: "2026-01-01" },
  }],
  warnings: [],
  natalChart: {
    availableEntities: ["sun"],
    storedAspects: [],
    placements: [{ body: "sun", sign: "Aries", house: 1, degree: 10 }],
  },
};

describe("OracleStreamPublisher", () => {
  it("publishes safe ordinary prose in guarded snapshots and strips hidden directives", async () => {
    const writes: Array<{ sequence: number; content: string; final: boolean }> = [];
    const publisher = new OracleStreamPublisher({
      mode: "guarded_batches",
      requestPlan: genericPlan,
      dependencies: {
        persistSnapshot: async (snapshot) => { writes.push(snapshot); },
      },
    });
    publisher.handleEvent({
      type: "text_delta",
      text: `${"A grounded explanation can leave room for choice and reflection. ".repeat(3)}\n\nTITLE: Hidden control\nJOURNAL_PROMPT: What choice feels grounded?`,
      receivedAt: 1,
    });
    const result = await publisher.finalize();
    expect(result.complete).toBe(true);
    expect(result.content).not.toContain("TITLE:");
    expect(result.content).not.toContain("JOURNAL_PROMPT:");
    expect(result.title).toBe("Hidden control");
    expect(result.journalPrompt).toBe("What choice feels grounded?");
    expect(writes.length).toBeGreaterThanOrEqual(1);
    expect(writes[writes.length - 1]?.final).toBe(true);
  });

  it("never persists a batch that fails the hardcoded output scanner", async () => {
    const writes: string[] = [];
    const publisher = new OracleStreamPublisher({
      mode: "guarded_batches",
      requestPlan: genericPlan,
      dependencies: {
        persistSnapshot: async (snapshot) => { writes.push(snapshot.content); },
      },
    });
    publisher.handleEvent({
      type: "text_delta",
      text: "You should take 500 mg daily.\n\n",
      receivedAt: 1,
    });
    await expect(publisher.finalize()).rejects.toBeInstanceOf(OraclePublicationError);
    expect(writes).toEqual([]);
  });

  it("catches a prohibited phrase split across approved batch boundaries", async () => {
    const writes: string[] = [];
    const publisher = new OracleStreamPublisher({
      mode: "guarded_batches",
      requestPlan: genericPlan,
      dependencies: {
        persistSnapshot: async (snapshot) => { writes.push(snapshot.content); },
      },
    });
    publisher.handleEvent({
      type: "text_delta",
      text: "A medical note says you should take\n\n",
      receivedAt: 1,
    });
    publisher.handleEvent({
      type: "text_delta",
      text: "magnesium for this condition.\n\n",
      receivedAt: 2,
    });
    await expect(publisher.finalize()).rejects.toBeInstanceOf(OraclePublicationError);
    expect(writes.every((content) => !content.includes("magnesium"))).toBe(true);
  });

  it("keeps benign ordinary prose visible when only structural contract checks miss", async () => {
    const writes: string[] = [];
    const publisher = new OracleStreamPublisher({
      mode: "guarded_batches",
      requestPlan: {
        ...genericPlan,
        goals: ["compare", "recommend"],
        entities: ["motorbike", "diving"],
        responseContract: {
          ...genericPlan.responseContract,
          mustCompareAllOptions: true,
          mustRecommend: true,
          practicalSafety: true,
        },
      },
      dependencies: {
        persistSnapshot: async (snapshot) => { writes.push(snapshot.content); },
      },
    });
    publisher.handleEvent({
      type: "text_delta",
      text: "Symbols help learners compress difficult ideas into memorable patterns and revisit them from several angles.\n\n",
      receivedAt: 1,
    });
    const result = await publisher.finalize();
    expect(result.complete).toBe(true);
    expect(result.violations.map((violation) => violation.code)).toEqual(expect.arrayContaining([
      "option_missing",
      "recommendation_missing",
      "practical_safety_missing",
    ]));
    expect(writes.at(-1)).toContain("Symbols help learners");
  });

  it("does not compare educational examples with an unrelated personal chart", async () => {
    const writes: string[] = [];
    const publisher = new OracleStreamPublisher({
      mode: "guarded_batches",
      requestPlan: genericPlan,
      evidence,
      dependencies: {
        persistSnapshot: async (snapshot) => { writes.push(snapshot.content); },
      },
    });
    publisher.handleEvent({
      type: "text_delta",
      text: "For example, Sun is in Taurus can symbolize steadiness in an educational exercise.\n\n",
      receivedAt: 1,
    });

    const result = await publisher.finalize();
    expect(result.complete).toBe(true);
    expect(result.violations).toEqual([]);
    expect(writes.at(-1)).toContain("educational exercise");
  });

  it("still blocks an ordinary batch that contradicts canonical natal facts", async () => {
    const writes: string[] = [];
    const publisher = new OracleStreamPublisher({
      mode: "guarded_batches",
      requestPlan: natalPlan,
      evidence,
      dependencies: {
        persistSnapshot: async (snapshot) => { writes.push(snapshot.content); },
      },
    });
    publisher.handleEvent({
      type: "text_delta",
      text: "Your Sun is in Taurus, which gives the chart a fixed center.\n\n",
      receivedAt: 1,
    });
    await expect(publisher.finalize()).rejects.toMatchObject({ code: "response_contract_failed" });
    expect(writes).toEqual([]);
  });

  it("publishes a valid natal frame and withholds a contradictory one", async () => {
    const published: Array<{ status: string; content: string }> = [];
    const writes: string[] = [];
    const valid = new OracleStreamPublisher({
      mode: "validated_sections",
      requestPlan: natalPlan,
      evidence,
      sectionPlan,
      dependencies: {
        persistSnapshot: async (snapshot) => { writes.push(snapshot.content); },
        persistSection: async ({ status, section }) => {
          published.push({ status, content: section.content });
        },
      },
    });
    valid.handleEvent({
      type: "text_delta",
      text: '<<<ORACLE_SECTION_V2 {"key":"sun","evidenceKeys":["placement:sun"]}>>>\n## Your Sun\nYour Sun in Aries in the 1st house suggests direct creative initiative.\n<<<END_ORACLE_SECTION_V2>>>\n',
      receivedAt: 1,
    });
    const validResult = await valid.finalize();
    expect(validResult.complete).toBe(true);
    expect(validResult.publishedSectionKeys).toEqual(["sun"]);
    expect(writes[writes.length - 1]).toContain("Sun in Aries");

    const rejectedRows: Array<{ status: string; content: string }> = [];
    const rejectedWrites: string[] = [];
    const rejected = new OracleStreamPublisher({
      mode: "validated_sections",
      requestPlan: natalPlan,
      evidence,
      sectionPlan,
      dependencies: {
        persistSnapshot: async (snapshot) => { rejectedWrites.push(snapshot.content); },
        persistSection: async ({ status, section }) => {
          rejectedRows.push({ status, content: section.content });
        },
      },
    });
    rejected.handleEvent({
      type: "text_delta",
      text: '<<<ORACLE_SECTION_V2 {"key":"sun","evidenceKeys":["placement:sun"]}>>>\n## Your Sun\nYour Sun in Taurus defines a fixed identity.\n<<<END_ORACLE_SECTION_V2>>>\n',
      receivedAt: 1,
    });
    const rejectedResult = await rejected.finalize();
    expect(rejectedResult.complete).toBe(false);
    expect(rejectedWrites[rejectedWrites.length - 1]).toBe("");
    expect(rejectedRows.find((row) => row.status === "failed")?.content).toBe("");
  });

  it("permits one deterministic missing-section resume", async () => {
    const resumedKeys: string[][] = [];
    const publisher = new OracleStreamPublisher({
      mode: "validated_sections",
      requestPlan: natalPlan,
      evidence,
      sectionPlan,
      dependencies: {
        persistSnapshot: async () => undefined,
        resumeMissingSections: async ({ missingKeys }) => {
          resumedKeys.push(missingKeys);
          return [{
            key: "sun",
            evidenceKeys: ["placement:sun"],
            content: "## Your Sun\nYour Sun in Aries supports direct creative initiative.",
          }];
        },
      },
    });
    const result = await publisher.finalize(true);
    expect(resumedKeys).toEqual([["sun"]]);
    expect(result.publishedSectionKeys).toEqual(["sun"]);
  });

  it("repairs one invalid natal section through the identical validator", async () => {
    let repairCalls = 0;
    const publisher = new OracleStreamPublisher({
      mode: "validated_sections",
      requestPlan: natalPlan,
      evidence,
      sectionPlan,
      dependencies: {
        persistSnapshot: async () => undefined,
        repairSection: async () => {
          repairCalls += 1;
          return {
            key: "sun",
            evidenceKeys: ["placement:sun"],
            content: "## Your Sun\nYour Sun in Aries supports direct creative initiative.",
          };
        },
      },
    });
    publisher.handleEvent({
      type: "text_delta",
      text: '<<<ORACLE_SECTION_V2 {"key":"sun","evidenceKeys":["placement:sun"]}>>>\n## Your Sun\nYour Sun in Taurus defines a fixed identity.\n<<<END_ORACLE_SECTION_V2>>>\n',
      receivedAt: 1,
    });
    const result = await publisher.finalize();
    expect(repairCalls).toBe(1);
    expect(result.complete).toBe(true);
    expect(result.content).toContain("Sun in Aries");
    expect(result.content).not.toContain("Sun in Taurus");
  });
});
