import type { OracleEvidenceBundle, OracleRequestPlan } from "../capabilities";
import type { OracleSectionPlan, OracleSectionSpec } from "./types";

const ENTITY_ORDER = [
  "ascendant",
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "north_node",
  "south_node",
  "chiron",
  "part_of_fortune",
] as const;

const TITLES: Record<string, string> = {
  overview: "Chart Overview",
  ascendant: "Your Ascendant",
  sun: "Your Sun",
  moon: "Your Moon",
  mercury: "Your Mercury",
  venus: "Your Venus",
  mars: "Your Mars",
  jupiter: "Your Jupiter",
  saturn: "Your Saturn",
  uranus: "Your Uranus",
  neptune: "Your Neptune",
  pluto: "Your Pluto",
  nodes: "Your Nodal Axis",
  chiron: "Your Chiron",
  part_of_fortune: "Your Part of Fortune",
  house_signatures: "House Signatures",
  aspects: "Aspects and Patterns",
  synthesis: "Integrated Synthesis",
};

export function normalizeNatalEntity(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b(?:your|the)\b/g, "")
    .replace(/part\s+of\s+fortune|fortune\s+point/g, "part_of_fortune")
    .replace(/north\s+node/g, "north_node")
    .replace(/south\s+node/g, "south_node")
    .replace(/rising(?:\s+sign)?/g, "ascendant")
    .replace(/[\s-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function aspectEvidenceKey(body1: string, body2: string, type: string): string {
  const bodies = [normalizeNatalEntity(body1), normalizeNatalEntity(body2)].sort();
  return `aspect:${bodies[0]}:${bodies[1]}:${type.toLowerCase()}`;
}

function makeSection(
  sections: OracleSectionSpec[],
  key: string,
  requiredEntities: string[],
  allowedEvidenceKeys: string[],
): void {
  sections.push({
    key,
    ordinal: sections.length,
    title: TITLES[key],
    requiredEntities,
    allowedEvidenceKeys: [...new Set(allowedEvidenceKeys)],
  });
}

export function buildOracleSectionPlan(
  requestPlan: OracleRequestPlan,
  evidence?: OracleEvidenceBundle,
): OracleSectionPlan {
  const chart = evidence?.natalChart;
  const available = new Set((chart?.availableEntities ?? []).map(normalizeNatalEntity));
  const requested = new Set(
    requestPlan.responseContract.requiredNatalEntities.map(normalizeNatalEntity),
  );
  const full = requestPlan.responseContract.requiresFullNatalCoverage;
  const selected = ENTITY_ORDER.filter((entity) =>
    available.has(entity) && (full || requested.has(entity)),
  );
  const allPlacementKeys = [...available].map((entity) => `placement:${entity}`);
  const aspectKeys = (chart?.storedAspects ?? []).map((aspect) =>
    aspectEvidenceKey(aspect.body1, aspect.body2, aspect.type),
  );
  const houseKeys = (chart?.houseSignatures ?? []).map(
    (house) => `house:${house.house}`,
  );
  const concentrationKeys = (chart?.concentrations ?? []).map(
    (concentration) => `concentration:${concentration.kind}:${concentration.value}`,
  );
  const chartRulerKeys = chart?.chartRuler
    ? [
        `chart_ruler:${normalizeNatalEntity(chart.chartRuler.body)}`,
        `placement:${normalizeNatalEntity(chart.chartRuler.body)}`,
      ]
    : [];
  const sections: OracleSectionSpec[] = [];

  if (full) {
    makeSection(sections, "overview", [], [
      ...allPlacementKeys,
      ...chartRulerKeys,
      ...concentrationKeys,
    ]);
  }

  for (const entity of selected) {
    if (entity === "north_node" || entity === "south_node") {
      if (
        sections.some((section) => section.key === "nodes")
        || (!available.has("north_node") && !available.has("south_node"))
      ) {
        continue;
      }
      const nodeEntities = ["north_node", "south_node"].filter((node) =>
        available.has(node),
      );
      makeSection(
        sections,
        "nodes",
        nodeEntities,
        nodeEntities.map((node) => `placement:${node}`),
      );
      continue;
    }
    makeSection(
      sections,
      entity,
      [entity],
      [
        `placement:${entity}`,
        ...aspectKeys.filter((key) => key.includes(`:${entity}:`)),
      ],
    );
  }

  if (full && houseKeys.length > 0) {
    makeSection(sections, "house_signatures", [], houseKeys);
  }
  if (full && aspectKeys.length > 0) {
    makeSection(sections, "aspects", [], [
      ...aspectKeys,
      ...concentrationKeys,
    ]);
  }
  if (full) {
    makeSection(sections, "synthesis", [], [
      ...allPlacementKeys,
      ...houseKeys,
      ...aspectKeys,
      ...chartRulerKeys,
      ...concentrationKeys,
    ]);
  }

  return { version: "oracle-section-plan-v2", sections };
}

export function buildOracleSectionProtocolInstruction(plan: OracleSectionPlan): string {
  const specifications = plan.sections.map((section) => ({
    key: section.key,
    ordinal: section.ordinal,
    title: section.title,
    requiredEntities: section.requiredEntities,
    allowedEvidenceKeys: section.allowedEvidenceKeys,
  }));
  return [
    "[ORACLE STREAMING SECTION PROTOCOL V2]",
    "Return every requested section exactly once and in the supplied order.",
    "Wrap each section with the exact markers below; never place prose outside them.",
    'Start: <<<ORACLE_SECTION_V2 {"key":"<key>","evidenceKeys":["<used allowed key>"]}>>>',
    "End: <<<END_ORACLE_SECTION_V2>>>",
    "Do not invent evidence keys. Marker text is a private transport protocol.",
    `Server section plan: ${JSON.stringify(specifications)}`,
    "[END ORACLE STREAMING SECTION PROTOCOL V2]",
  ].join("\n");
}

/** Preserve canonical plan order while narrowing an explicit Resume request. */
export function selectOracleResumeSectionPlan(
  plan: OracleSectionPlan,
  missingKeys: readonly string[],
): OracleSectionPlan {
  const requested = new Set(missingKeys);
  return {
    version: plan.version,
    sections: plan.sections.filter((section) => requested.has(section.key)),
  };
}
