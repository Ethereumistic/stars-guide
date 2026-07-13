import type { BirthChartReportV2, EvidenceRef, PracticeItem } from "./v2";
import type { StoredBirthData } from "../../src/lib/birth-chart/types";

export interface ReportQualityIssue {
  code: "missing_evidence" | "invented_evidence" | "generic_language" | "untestable_practice" | "generic_follow_up" | "duplicate_signature";
  path: string;
  message: string;
}

export interface ReportQualityResult {
  passed: boolean;
  score: number;
  issues: ReportQualityIssue[];
  metrics: {
    evidenceCoverage: number;
    observablePracticeCoverage: number;
    specificFollowUpCoverage: number;
  };
}

const GENERIC_LANGUAGE = /\b(embrace your journey|trust the universe|step into your power|everything happens for a reason|you are meant to|limitless potential|just be yourself)\b/i;
const GENERIC_FOLLOW_UP = /^(tell me more|go deeper|what else|continue|explain more)[?.!]*$/i;
const OBSERVABLE_ACTION = /\b(write|note|track|ask|say|schedule|choose|wait|pause|name|list|review|record|try|practice|set|check|compare|notice|count|spend|call|send|walk|breathe)\b/i;
const TIME_OR_TRIGGER = /\b(today|tomorrow|once|daily|weekly|for \d+|before|after|when|next time|this week|minutes?|days?|each)\b/i;

function evidenceCount(items: Array<{ evidence?: EvidenceRef[] }>): { covered: number; total: number } {
  return items.reduce((result, item) => ({
    covered: result.covered + (item.evidence?.length ? 1 : 0),
    total: result.total + 1,
  }), { covered: 0, total: 0 });
}

function isObservablePractice(practice: PracticeItem | string | undefined | null): boolean {
  if (!practice) return false;
  const instruction = typeof practice === "string" ? practice : practice.instruction;
  const cadence = typeof practice === "string" ? undefined : practice.cadence;
  if (typeof instruction !== "string" || !instruction) return false;
  return OBSERVABLE_ACTION.test(instruction) && (Boolean(cadence) || TIME_OR_TRIGGER.test(instruction));
}

function canonicalEvidenceError(evidence: EvidenceRef, birthData: StoredBirthData): string | null {
  const planets = birthData.chart?.planets ?? [];
  const planet = (id: string) => planets.find((item) => item.id === id);
  if (evidence.type === "placement") {
    const item = evidence.bodyId === "ascendant" ? birthData.chart?.ascendant : planet(evidence.bodyId);
    if (!item || item.signId !== evidence.signId) return `Placement ${evidence.label} is not in the canonical chart.`;
    if ("houseId" in item && evidence.houseId !== undefined && item.houseId !== evidence.houseId) return `House in ${evidence.label} does not match the canonical chart.`;
  } else if (evidence.type === "aspect") {
    const aspect = (birthData.chart?.aspects ?? []).find((item) =>
      ((item.planet1 === evidence.planet1 && item.planet2 === evidence.planet2) || (item.planet1 === evidence.planet2 && item.planet2 === evidence.planet1))
      && item.type === evidence.aspectType && Math.abs(item.orb - evidence.orb) <= 0.1);
    if (!aspect) return `Aspect ${evidence.label} is not in the canonical chart.`;
  } else if (evidence.type === "dignity") {
    if (planet(evidence.bodyId)?.dignity !== evidence.dignity) return `Dignity ${evidence.label} is not in the canonical chart.`;
  } else if (evidence.type === "house_cusp") {
    const house = birthData.chart?.houses.find((item) => item.id === evidence.houseId);
    if (!house || house.signId !== evidence.signId) return `House cusp ${evidence.label} is not in the canonical chart.`;
  } else if (evidence.type === "cluster") {
    const members = evidence.bodyIds.map(planet);
    if (members.some((item) => !item)) return `Cluster ${evidence.label} contains an unavailable body.`;
    if (evidence.signId && members.some((item) => item?.signId !== evidence.signId)) return `Cluster sign in ${evidence.label} is not canonical.`;
    if (evidence.houseId && members.some((item) => item?.houseId !== evidence.houseId)) return `Cluster house in ${evidence.label} is not canonical.`;
  } else if (evidence.type === "nodal_axis") {
    const north = planet("north_node");
    const south = planet("south_node");
    if (!north || !south || north.signId !== evidence.northSignId || south.signId !== evidence.southSignId) return `Nodal axis ${evidence.label} is not canonical.`;
  } else if (evidence.type === "chart_ruler") {
    const rulers: Record<string, string> = { aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun", virgo: "mercury", libra: "venus", scorpio: "mars", sagittarius: "jupiter", capricorn: "saturn", aquarius: "saturn", pisces: "jupiter" };
    const rising = birthData.chart?.ascendant?.signId;
    if (!rising || rising !== evidence.risingSignId || rulers[rising] !== evidence.rulerBodyId) return `Chart ruler ${evidence.label} is not canonical.`;
    const ruler = planet(evidence.rulerBodyId);
    if (evidence.rulerSignId && ruler?.signId !== evidence.rulerSignId) return `Chart-ruler sign in ${evidence.label} is not canonical.`;
    if (evidence.rulerHouseId && ruler?.houseId !== evidence.rulerHouseId) return `Chart-ruler house in ${evidence.label} is not canonical.`;
  } else {
    return `Evidence type in ${(evidence as { label?: string }).label ?? "unlabeled evidence"} is unsupported.`;
  }
  return null;
}

function collectEvidence(value: unknown, path = "report"): Array<{ path: string; evidence: EvidenceRef }> {
  if (Array.isArray(value)) return value.flatMap((item, index) => collectEvidence(item, `${path}[${index}]`));
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const current = typeof record.type === "string" && typeof record.label === "string"
    ? [{ path, evidence: record as unknown as EvidenceRef }]
    : [];
  return [...current, ...Object.entries(record).flatMap(([key, child]) => collectEvidence(child, `${path}.${key}`))];
}

const LIFE_AREA_KEYS = ["innerWorld", "outerSelf", "mindVoice", "loveAttachment", "workCalling", "growthPath"] as const;

export function evaluateBirthChartReport(report: BirthChartReportV2, birthData?: StoredBirthData): ReportQualityResult {
  const issues: ReportQualityIssue[] = [];
  const evidenceItems: Array<{ path: string; evidence?: EvidenceRef[] }> = [
    ...(report.overview?.topThemes ?? []).map((item, index) => ({ path: `overview.topThemes[${index}]`, evidence: item.evidence })),
    ...(report.signatures ?? []).map((item, index) => ({ path: `signatures[${index}]`, evidence: item.evidence })),
    ...(report.integration?.gifts ?? []).map((item, index) => ({ path: `integration.gifts[${index}]`, evidence: item.evidence })),
    ...(report.integration?.growthEdges ?? []).map((item, index) => ({ path: `integration.growthEdges[${index}]`, evidence: item.evidence })),
    ...(report.integration?.practices ?? []).map((item, index) => ({ path: `integration.practices[${index}]`, evidence: item.evidence })),
    ...LIFE_AREA_KEYS.flatMap((key) => {
      const area = report.lifeAreas?.[key];
      if (!area) return [];
      return [
        { path: `lifeAreas.${key}`, evidence: area.evidence },
        ...(area.keyInsights ?? []).map((item, index) => ({ path: `lifeAreas.${key}.keyInsights[${index}]`, evidence: item.evidence })),
      ];
    }),
  ];
  for (const item of evidenceItems) {
    if (!item.evidence?.length) issues.push({ code: "missing_evidence", path: item.path, message: "Major claims require at least one chart EvidenceRef." });
  }
  if (birthData?.chart) {
    for (const item of collectEvidence(report)) {
      const message = canonicalEvidenceError(item.evidence, birthData);
      if (message) issues.push({ code: "invented_evidence", path: item.path, message });
    }
  }

  const prose = JSON.stringify(report);
  const genericMatch = prose.match(GENERIC_LANGUAGE);
  if (genericMatch) issues.push({ code: "generic_language", path: "report", message: `Replace prohibited generic language: “${genericMatch[0]}”.` });

  const practices = [
    ...(report.integration?.practices ?? []),
    ...(report.integration?.sevenDayPlan ?? []),
    ...LIFE_AREA_KEYS.flatMap((key) => report.lifeAreas?.[key]?.practices ?? []),
    ...(report.signatures ?? []).map((signature) => signature.experiment ?? signature.practice),
  ];
  practices.forEach((practice, index) => {
    if (!isObservablePractice(practice)) issues.push({ code: "untestable_practice", path: `practices[${index}]`, message: "Practice needs an observable action plus a cadence or trigger." });
  });

  const oracleFollowUps = report.oracleFollowUps ?? [];
  oracleFollowUps.forEach((followUp, index) => {
    const prompt = typeof followUp?.prompt === "string" ? followUp.prompt.trim() : "";
    if (prompt === "" || GENERIC_FOLLOW_UP.test(prompt) || prompt.split(/\s+/).length < 7) {
      issues.push({ code: "generic_follow_up", path: `oracleFollowUps[${index}]`, message: "Follow-up must open a specific chart-grounded thread." });
    }
  });

  const normalizedTitles = (report.signatures ?? []).map((signature) => (signature?.title ?? "").trim().toLowerCase());
  if (new Set(normalizedTitles).size !== normalizedTitles.length) {
    issues.push({ code: "duplicate_signature", path: "signatures", message: "Signature titles must be distinct and memorable." });
  }

  const evidence = evidenceCount(evidenceItems);
  const observablePractices = practices.filter(isObservablePractice).length;
  const specificFollowUps = oracleFollowUps.filter((item) => {
    const prompt = typeof item?.prompt === "string" ? item.prompt.trim() : "";
    return prompt !== "" && !GENERIC_FOLLOW_UP.test(prompt) && prompt.split(/\s+/).length >= 7;
  }).length;
  const evidenceCoverage = evidence.total ? evidence.covered / evidence.total : 0;
  const observablePracticeCoverage = practices.length ? observablePractices / practices.length : 0;
  const specificFollowUpCoverage = oracleFollowUps.length ? specificFollowUps / oracleFollowUps.length : 0;
  const score = Math.round(100 * (evidenceCoverage * 0.5 + observablePracticeCoverage * 0.3 + specificFollowUpCoverage * 0.2));

  return {
    passed: issues.length === 0 && score >= 90,
    score,
    issues,
    metrics: { evidenceCoverage, observablePracticeCoverage, specificFollowUpCoverage },
  };
}

export function formatReportQualityIssues(result: ReportQualityResult): string {
  return [`Quality score: ${result.score}/100`, ...result.issues.map((issue) => `- ${issue.path}: ${issue.message}`)].join("\n");
}
