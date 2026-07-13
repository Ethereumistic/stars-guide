import type { BirthChartContextArtifact, ChartEvidenceItem } from "../../src/lib/birth-chart/report-context";
import type { DetectedChartPattern } from "../../src/lib/birth-chart/patterns";

export interface ReportPractice {
  title: string;
  instruction: string;
  cadence: "once" | "daily" | "weekly" | "as_needed";
}

export interface ReportTheme {
  id: string;
  title: string;
  summary: string;
  gift: string;
  watchFor: string;
  practice: ReportPractice;
  evidence: ChartEvidenceItem[];
}

export interface ReportCompassPoint {
  headline: string;
  summary: string;
  evidence: ChartEvidenceItem[];
}

export interface BirthChartReportV3 {
  meta: {
    version: 3;
    reportTitle: string;
    preferredName: string;
    generatedAt: number;
    sourceChartFingerprint: string;
  };
  visualIdentity: {
    sunSignId?: string;
    moonSignId?: string;
    risingSignId?: string;
    dominantElement: "fire" | "earth" | "air" | "water" | null;
    accentPlanetId: string;
  };
  identity: {
    anchorPhrase: string;
    oneSentence: string;
    orientation: string;
  };
  chartSignature: {
    pattern: DetectedChartPattern;
    meaning: string;
    gift: string;
    watchFor: string;
    practice: ReportPractice;
  };
  themes: [ReportTheme, ReportTheme, ReportTheme];
  compass: {
    innerWorld: ReportCompassPoint;
    relationships: ReportCompassPoint;
    vocation: ReportCompassPoint;
    growth: ReportCompassPoint;
  };
  toolkit: {
    decisionRule: ReportPractice;
    resetPractice: ReportPractice;
    connectionPractice: ReportPractice;
  };
  oraclePrompts: Array<{ label: string; prompt: string; evidence: ChartEvidenceItem[] }>;
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown, path: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} must be an object`);
  return value as UnknownRecord;
}

function clampCopyBudget(value: string, max: number) {
  if (value.length <= max) return value;

  const candidate = value.slice(0, max).trimEnd();
  const wordBoundary = candidate.lastIndexOf(" ");
  const cutAt = wordBoundary >= Math.floor(max * 0.7) ? wordBoundary : candidate.length;
  const truncated = candidate
    .slice(0, cutAt)
    .trimEnd()
    .replace(/[,:;\-\u2013\u2014]+$/u, "");
  return `${truncated.slice(0, max - 1).trimEnd()}\u2026`;
}

/**
 * Prose ranges are editorial targets, not persistence schema boundaries. Keep a
 * small structural floor so blank or token-like output still fails closed, and
 * normalize over-budget copy without spending another model call.
 */
function text(value: unknown, path: string, min: number, max: number) {
  if (typeof value !== "string") throw new Error(`${path} must be a string`);
  const normalized = value.trim();
  const structuralMinimum = Math.min(min, 8);
  if (normalized.length < structuralMinimum) {
    throw new Error(`${path} must contain at least ${structuralMinimum} meaningful characters`);
  }
  return clampCopyBudget(normalized, max);
}

function exactArray(value: unknown, path: string, count: number) {
  if (!Array.isArray(value) || value.length !== count) throw new Error(`${path} must contain exactly ${count} items`);
  return value;
}

function evidenceIds(value: unknown, path: string, inventory: Map<string, ChartEvidenceItem>, min = 1, max = 3) {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error(`${path} must contain ${min}-${max} evidence IDs`);
  return value.map((id, index) => {
    if (typeof id !== "string" || !inventory.has(id)) throw new Error(`${path}[${index}] is not an approved evidence ID`);
    return inventory.get(id)!;
  });
}

function practice(value: unknown, path: string): ReportPractice {
  const item = record(value, path);
  const cadence = item.cadence;
  if (!new Set(["once", "daily", "weekly", "as_needed"]).has(cadence as string)) throw new Error(`${path}.cadence is invalid`);
  return {
    title: text(item.title, `${path}.title`, 3, 60),
    instruction: text(item.instruction, `${path}.instruction`, 20, 220),
    cadence: cadence as ReportPractice["cadence"],
  };
}

function visualIdentity(context: BirthChartContextArtifact) {
  const placement = (id: string) => context.placements.find((item) => item.id === id);
  return {
    sunSignId: placement("sun")?.signId,
    moonSignId: placement("moon")?.signId,
    risingSignId: context.ascendant?.signId,
    dominantElement: context.derived.dominantElement,
    accentPlanetId: context.derived.chartRuler?.rulerBodyId ?? "sun",
  };
}

export function validateAndHydrateBirthChartReportV3(
  value: unknown,
  context: BirthChartContextArtifact,
  preferredName: string,
): BirthChartReportV3 {
  const source = record(value, "report");
  const meta = record(source.meta, "meta");
  if (meta.version !== 3) throw new Error("meta.version must be 3");
  const identity = record(source.identity, "identity");
  const spotlight = record(source.chartSignature, "chartSignature");
  const patternId = text(spotlight.patternId, "chartSignature.patternId", 3, 180);
  const pattern = context.derived.patterns.find((item) => item.id === patternId);
  if (!pattern) throw new Error("chartSignature.patternId must match a server-detected chart pattern");
  const inventory = new Map(context.evidence.map((item) => [item.id, item]));

  const themes = exactArray(source.themes, "themes", 3).map((value, index) => {
    const item = record(value, `themes[${index}]`);
    return {
      id: text(item.id, `themes[${index}].id`, 2, 60).toLowerCase().replace(/[^a-z0-9_-]+/g, "_"),
      title: text(item.title, `themes[${index}].title`, 4, 70),
      summary: text(item.summary, `themes[${index}].summary`, 40, 360),
      gift: text(item.gift, `themes[${index}].gift`, 20, 180),
      watchFor: text(item.watchFor, `themes[${index}].watchFor`, 20, 180),
      practice: practice(item.practice, `themes[${index}].practice`),
      evidence: evidenceIds(item.evidenceIds, `themes[${index}].evidenceIds`, inventory),
    };
  }) as [ReportTheme, ReportTheme, ReportTheme];

  const compassSource = record(source.compass, "compass");
  const compassPoint = (key: keyof BirthChartReportV3["compass"]): ReportCompassPoint => {
    const item = record(compassSource[key], `compass.${key}`);
    return {
      headline: text(item.headline, `compass.${key}.headline`, 4, 70),
      summary: text(item.summary, `compass.${key}.summary`, 35, 260),
      evidence: evidenceIds(item.evidenceIds, `compass.${key}.evidenceIds`, inventory),
    };
  };
  const toolkitSource = record(source.toolkit, "toolkit");
  const oraclePrompts = exactArray(source.oraclePrompts, "oraclePrompts", 4).map((value, index) => {
    const item = record(value, `oraclePrompts[${index}]`);
    return {
      label: text(item.label, `oraclePrompts[${index}].label`, 4, 60),
      prompt: text(item.prompt, `oraclePrompts[${index}].prompt`, 20, 220),
      evidence: evidenceIds(item.evidenceIds, `oraclePrompts[${index}].evidenceIds`, inventory, 1, 2),
    };
  });

  const report: BirthChartReportV3 = {
    meta: {
      version: 3,
      reportTitle: text(meta.reportTitle, "meta.reportTitle", 5, 80),
      preferredName: preferredName.trim().slice(0, 80) || "Seeker",
      generatedAt: Date.now(),
      sourceChartFingerprint: context.sourceFingerprint,
    },
    visualIdentity: visualIdentity(context),
    identity: {
      anchorPhrase: text(identity.anchorPhrase, "identity.anchorPhrase", 5, 90),
      oneSentence: text(identity.oneSentence, "identity.oneSentence", 40, 280),
      orientation: text(identity.orientation, "identity.orientation", 40, 320),
    },
    chartSignature: {
      pattern,
      meaning: text(spotlight.meaning, "chartSignature.meaning", 40, 360),
      gift: text(spotlight.gift, "chartSignature.gift", 20, 180),
      watchFor: text(spotlight.watchFor, "chartSignature.watchFor", 20, 180),
      practice: practice(spotlight.practice, "chartSignature.practice"),
    },
    themes,
    compass: {
      innerWorld: compassPoint("innerWorld"),
      relationships: compassPoint("relationships"),
      vocation: compassPoint("vocation"),
      growth: compassPoint("growth"),
    },
    toolkit: {
      decisionRule: practice(toolkitSource.decisionRule, "toolkit.decisionRule"),
      resetPractice: practice(toolkitSource.resetPractice, "toolkit.resetPractice"),
      connectionPractice: practice(toolkitSource.connectionPractice, "toolkit.connectionPractice"),
    },
    oraclePrompts,
  };
  const titles = new Set(report.themes.map((theme) => theme.title.toLowerCase()));
  if (titles.size !== 3) throw new Error("Theme titles must be distinct");
  return report;
}

const GENERIC = /\b(embrace your journey|trust the universe|step into your power|everything happens for a reason|limitless potential|just be yourself|you are meant to)\b/i;
// This is an editorial signal, not a semantic proof. Keep it broad enough to
// avoid penalizing useful imperative wording from different model families.
const ACTION = /\b(write|note|track|ask|say|schedule|choose|wait|pause|name|list|review|record|try|set|check|compare|notice|count|walk|breathe|leave|return|create|identify|select|observe|reflect|map|share|speak|tell|give|make|keep|use|place|put|release|stretch|sit|stand|reach|turn|slow|stop|start|focus|mark|circle|draft|send|move|step|hold|touch|drink|close|open|repeat|read|answer|decide)\b/i;

export function getBirthChartReportV3QualityIssues(report: BirthChartReportV3): string[] {
  const issues: string[] = [];
  const prose = JSON.stringify(report);
  const generic = prose.match(GENERIC);
  if (generic) issues.push(`Generic language is prohibited: ${generic[0]}`);
  const practices = [report.chartSignature.practice, ...report.themes.map((theme) => theme.practice), ...Object.values(report.toolkit)];
  practices.forEach((item, index) => {
    if (!ACTION.test(item.instruction)) issues.push(`Practice ${index + 1} needs an observable action`);
  });
  const wordCount = prose.split(/\s+/).length;
  if (wordCount > 1800) issues.push(`Report exceeds the concise product budget (${wordCount} words)`);
  return issues;
}

function evidenceText(evidence: ChartEvidenceItem[]) {
  return evidence.map((item) => item.label).join("; ");
}

export function renderBirthChartReportV3Markdown(report: BirthChartReportV3) {
  const lines = [
    `# ${report.meta.reportTitle}`,
    "",
    `> ${report.identity.anchorPhrase}`,
    "",
    report.identity.oneSentence,
    "",
    "## Your chart signature",
    `### ${report.chartSignature.pattern.name}`,
    `${report.chartSignature.pattern.definition} ${report.chartSignature.meaning}`,
    `- **Gift:** ${report.chartSignature.gift}`,
    `- **Watch for:** ${report.chartSignature.watchFor}`,
    `- **Try:** ${report.chartSignature.practice.instruction}`,
    "",
    "## Three themes to carry with you",
    ...report.themes.flatMap((theme) => [
      `### ${theme.title}`,
      theme.summary,
      `- **Gift:** ${theme.gift}`,
      `- **Watch for:** ${theme.watchFor}`,
      `- **Practice:** ${theme.practice.instruction}`,
      `- **Chart evidence:** ${evidenceText(theme.evidence)}`,
      "",
    ]),
    "## Your compass",
    ...Object.values(report.compass).flatMap((point) => [`### ${point.headline}`, point.summary, ""]),
    "## A practical toolkit",
    ...Object.values(report.toolkit).map((item) => `- **${item.title}:** ${item.instruction}`),
    "",
    "## Ask Oracle next",
    ...report.oraclePrompts.map((item) => `- **${item.label}:** ${item.prompt}`),
  ];
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function isBirthChartReportV3(value: unknown): value is BirthChartReportV3 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const meta = (value as { meta?: unknown }).meta;
  return Boolean(meta && typeof meta === "object" && !Array.isArray(meta) && (meta as { version?: unknown }).version === 3);
}
