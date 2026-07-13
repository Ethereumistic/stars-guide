import type { Doc } from "../_generated/dataModel";

export type EvidenceRef =
  | { type: "placement"; bodyId: string; signId: string; houseId?: number; label: string }
  | { type: "aspect"; planet1: string; planet2: string; aspectType: string; orb: number; label: string }
  | { type: "dignity"; bodyId: string; dignity: string; label: string }
  | { type: "cluster"; bodyIds: string[]; signId?: string; houseId?: number; label: string }
  | { type: "chart_ruler"; risingSignId: string; rulerBodyId: string; rulerSignId?: string; rulerHouseId?: number; label: string }
  | { type: "nodal_axis"; northSignId: string; northHouseId?: number; southSignId: string; southHouseId?: number; label: string }
  | { type: "house_cusp"; houseId: number; signId: string; label: string };

export interface InsightBullet {
  title: string;
  body: string;
  evidence: EvidenceRef[];
}

export interface PracticeItem {
  title: string;
  instruction: string;
  evidence: EvidenceRef[];
  cadence?: "once" | "daily" | "weekly" | "as_needed";
}

export interface ReflectionPrompt {
  prompt: string;
  evidence: EvidenceRef[];
  journalTag?: string;
}

export interface LifeAreaSection {
  title: string;
  summary: string;
  keyInsights: InsightBullet[];
  practices: PracticeItem[];
  evidence: EvidenceRef[];
  oraclePrompts: string[];
}

export interface SignatureCard {
  id: string;
  title: string;
  emoji?: string;
  shortSummary: string;
  evidence: EvidenceRef[];
  evidenceStrength: "strong" | "moderate" | "light";
  livedExperience: string;
  gift: string;
  watchFor: string;
  practice: string;
  recognitionCue?: string;
  failureMode?: string;
  decisionRule?: string;
  experiment?: string;
  relatedPlanetIds: string[];
  relatedSignIds: string[];
  relatedHouseIds: number[];
  relatedAspectIds: string[];
  oraclePrompt: string;
}

export interface BirthChartReportV2 {
  meta: {
    version: 2;
    reportTitle: string;
    preferredName: string;
    generatedAt: number;
    houseSystem?: string;
    birthDataSummary: string;
  };
  visualIdentity: {
    sunSignId?: string;
    moonSignId?: string;
    risingSignId?: string;
    dominantElement?: "Fire" | "Earth" | "Air" | "Water";
    dominantPlanetIds: string[];
    dominantSignIds: string[];
    accentPlanetId?: string;
    accentSignId?: string;
  };
  overview: {
    motto: string;
    chartAtGlance: string;
    oneSentence: string;
    coreMyth: string;
    topThemes: InsightBullet[];
    howToUseThisReport: string[];
  };
  signatures: SignatureCard[];
  lifeAreas: Record<"innerWorld" | "outerSelf" | "mindVoice" | "loveAttachment" | "workCalling" | "growthPath", LifeAreaSection>;
  integration: {
    gifts: InsightBullet[];
    growthEdges: InsightBullet[];
    practices: PracticeItem[];
    reflectionPrompts: ReflectionPrompt[];
    sevenDayPlan?: PracticeItem[];
  };
  oracleFollowUps: Array<{
    label: string;
    prompt: string;
    relatedSignatureId?: string;
    relatedLifeArea?: keyof BirthChartReportV2["lifeAreas"];
  }>;
  technicalAppendix: {
    placements: EvidenceRef[];
    aspects: EvidenceRef[];
    chartRuler?: EvidenceRef;
    concentrations: EvidenceRef[];
    nodalAxis?: EvidenceRef;
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Structured report must be an object");
  return value as Record<string, unknown>;
}

function requireString(record: Record<string, unknown>, key: string, path = key) {
  if (typeof record[key] !== "string" || !record[key]) throw new Error(`Structured report missing ${path}`);
}

function requireArray(record: Record<string, unknown>, key: string, min = 1, path = key) {
  if (!Array.isArray(record[key]) || (record[key] as unknown[]).length < min) throw new Error(`Structured report missing ${path}`);
}

function requireObjectItems(
  value: unknown,
  path: string,
  requiredStrings: readonly string[],
  options?: { requireEvidence?: boolean },
) {
  if (!Array.isArray(value)) throw new Error(`Structured report missing ${path}`);
  for (const [index, originalItem] of value.entries()) {
    let item = originalItem;
    if (typeof item === "string" && item.trim()) {
      const text = item.trim();
      if (requiredStrings.includes("title") && requiredStrings.includes("body")) {
        item = { title: "Insight", body: text, evidence: [] };
      } else if (requiredStrings.includes("title") && requiredStrings.includes("instruction")) {
        item = { title: "Practice", instruction: text, evidence: [] };
      } else if (requiredStrings.includes("label") && requiredStrings.includes("prompt")) {
        item = { label: "Explore this theme", prompt: text };
      } else if (requiredStrings.includes("prompt")) {
        item = { prompt: text, evidence: [] };
      }
      value[index] = item;
    }
    const record = asRecord(item);
    if (requiredStrings.includes("title") && typeof record.title !== "string") {
      record.title = typeof record.label === "string" ? record.label : typeof record.name === "string" ? record.name : undefined;
    }
    if (requiredStrings.includes("body") && typeof record.body !== "string") {
      record.body = typeof record.description === "string" ? record.description : typeof record.text === "string" ? record.text : undefined;
    }
    if (requiredStrings.includes("instruction") && typeof record.instruction !== "string") {
      record.instruction = typeof record.action === "string" ? record.action : typeof record.body === "string" ? record.body : typeof record.description === "string" ? record.description : undefined;
    }
    if (requiredStrings.includes("prompt") && typeof record.prompt !== "string") {
      record.prompt = typeof record.question === "string" ? record.question : typeof record.body === "string" ? record.body : undefined;
    }
    if (requiredStrings.includes("label") && typeof record.label !== "string") {
      record.label = typeof record.title === "string" ? record.title : "Explore this theme";
    }
    for (const key of requiredStrings) {
      requireString(record, key, `${path}[${index}].${key}`);
    }
    if (options?.requireEvidence) {
      requireArray(record, "evidence", 1, `${path}[${index}].evidence`);
    }
  }
}

function evidenceFrom(value: Record<string, unknown>): unknown[] {
  for (const key of ["evidence", "evidenceRefs", "chartEvidence"] as const) {
    if (Array.isArray(value[key])) return value[key] as unknown[];
  }
  return [];
}

function normalizeEvidenceAliases(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeEvidenceAliases);
  }
  if (!value || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(record)) {
    normalized[key] = normalizeEvidenceAliases(child);
  }

  if (!Array.isArray(normalized.evidence)) {
    normalized.evidence = evidenceFrom(normalized);
  }
  if (typeof normalized.body !== "string" && typeof normalized.summary === "string") {
    normalized.body = normalized.summary;
  }

  return normalized;
}

function fillLifeAreaEvidence(report: Record<string, unknown>) {
  const lifeAreas = report.lifeAreas;
  if (!lifeAreas || typeof lifeAreas !== "object" || Array.isArray(lifeAreas)) return;
  for (const section of Object.values(lifeAreas as Record<string, unknown>)) {
    if (!section || typeof section !== "object" || Array.isArray(section)) continue;
    const record = section as Record<string, unknown>;
    if (Array.isArray(record.evidence) && record.evidence.length > 0) continue;
    const collected: unknown[] = [];
    for (const key of ["keyInsights", "practices"] as const) {
      const items = record[key];
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          collected.push(...evidenceFrom(item as Record<string, unknown>));
        }
      }
    }
    record.evidence = collected;
  }
}

export function extractStructuredReportJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("LLM did not return JSON");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

export function validateBirthChartReportV2(value: unknown, options?: { requireOperatingFields?: boolean }): BirthChartReportV2 {
  const report = asRecord(normalizeEvidenceAliases(value));
  fillLifeAreaEvidence(report);
  const meta = asRecord(report.meta);
  if (meta.version !== 2) throw new Error("Structured report meta.version must be 2");
  requireString(meta, "reportTitle", "meta.reportTitle");
  requireString(meta, "preferredName", "meta.preferredName");

  const overview = asRecord(report.overview);
  for (const key of ["motto", "chartAtGlance", "oneSentence", "coreMyth"] as const) requireString(overview, key, `overview.${key}`);
  requireArray(overview, "topThemes", 3, "overview.topThemes");
  requireObjectItems(overview.topThemes, "overview.topThemes", ["title", "body"]);

  requireArray(report, "signatures", 3, "signatures");
  if ((report.signatures as unknown[]).length > 5) {
    report.signatures = (report.signatures as unknown[]).slice(0, 5);
  }
  const signatures = report.signatures as unknown[];
  for (const [index, signature] of signatures.entries()) {
    const card = asRecord(signature);
    for (const key of ["id", "title", "shortSummary", "livedExperience", "gift", "watchFor", "practice", "oraclePrompt"] as const) requireString(card, key, `signatures[${index}].${key}`);
    if (options?.requireOperatingFields) {
      for (const key of ["recognitionCue", "failureMode", "decisionRule", "experiment"] as const) requireString(card, key, `signatures[${index}].${key}`);
    }
    requireArray(card, "evidence", 1, `signatures[${index}].evidence`);
  }

  const lifeAreas = asRecord(report.lifeAreas);
  for (const key of ["innerWorld", "outerSelf", "mindVoice", "loveAttachment", "workCalling", "growthPath"] as const) {
    const section = asRecord(lifeAreas[key]);
    requireString(section, "title", `lifeAreas.${key}.title`);
    requireString(section, "summary", `lifeAreas.${key}.summary`);
    requireArray(section, "keyInsights", 1, `lifeAreas.${key}.keyInsights`);
    requireArray(section, "evidence", 1, `lifeAreas.${key}.evidence`);
    requireObjectItems(section.keyInsights, `lifeAreas.${key}.keyInsights`, ["title", "body"]);
    if (section.practices !== undefined) {
      requireObjectItems(section.practices, `lifeAreas.${key}.practices`, ["title", "instruction"]);
    }
  }

  const integration = asRecord(report.integration);
  requireArray(integration, "gifts", 1, "integration.gifts");
  requireArray(integration, "growthEdges", 1, "integration.growthEdges");
  requireArray(integration, "practices", 5, "integration.practices");
  requireArray(integration, "reflectionPrompts", 5, "integration.reflectionPrompts");
  requireArray(report, "oracleFollowUps", 5, "oracleFollowUps");
  requireObjectItems(integration.gifts, "integration.gifts", ["title", "body"]);
  requireObjectItems(integration.growthEdges, "integration.growthEdges", ["title", "body"]);
  requireObjectItems(integration.practices, "integration.practices", ["title", "instruction"]);
  requireObjectItems(integration.reflectionPrompts, "integration.reflectionPrompts", ["prompt"]);
  requireObjectItems(report.oracleFollowUps, "oracleFollowUps", ["label", "prompt"]);

  return report as unknown as BirthChartReportV2;
}

function evidenceText(evidence: EvidenceRef[] = []) {
  return evidence.map((item) => item.label).filter(Boolean).join("; ");
}

function bulletEvidence(evidence: EvidenceRef[] = []) {
  const text = evidenceText(evidence);
  return text ? ` _(Evidence: ${text})_` : "";
}

export function renderBirthChartReportMarkdown(report: BirthChartReportV2): string {
  const area = report.lifeAreas;
  const lines: string[] = [
    `# Birth Chart Report for ${report.meta.preferredName}`,
    "",
    `> ${report.overview.motto}`,
    "",
    "## How to Use This Report",
    ...report.overview.howToUseThisReport.map((item) => `- ${item}`),
    "",
    "## Chart at a Glance",
    report.overview.chartAtGlance,
    "",
    "## Your Chart in One Sentence",
    report.overview.oneSentence,
    "",
    "## The Three Things Your Chart Keeps Repeating",
    ...report.overview.topThemes.map((theme) => `- **${theme.title}:** ${theme.body}${bulletEvidence(theme.evidence)}`),
    "",
    "## The Core Myth of Your Chart",
    report.overview.coreMyth,
    "",
    "## Your Dominant Signatures",
    ...report.signatures.flatMap((signature) => [
      `### ${signature.emoji ? `${signature.emoji} ` : ""}${signature.title}`,
      signature.shortSummary,
      `**Evidence:** ${evidenceText(signature.evidence)}`,
      `**Lived experience:** ${signature.livedExperience}`,
      `**Gift:** ${signature.gift}`,
      `**Watch for:** ${signature.watchFor}`,
      ...(signature.recognitionCue ? [`**Recognition cue:** ${signature.recognitionCue}`] : []),
      ...(signature.failureMode ? [`**Failure mode:** ${signature.failureMode}`] : []),
      ...(signature.decisionRule ? [`**Decision rule:** ${signature.decisionRule}`] : []),
      ...(signature.experiment ? [`**Small experiment:** ${signature.experiment}`] : []),
      `**Practice:** ${signature.practice}`,
      "",
    ]),
    ...renderLifeArea("Inner World & Emotional Care", area.innerWorld),
    ...renderLifeArea("Outer Self & Life Approach", area.outerSelf),
    ...renderLifeArea("Mind, Voice & Learning Style", area.mindVoice),
    ...renderLifeArea("Love, Desire & Attachment Patterns", area.loveAttachment),
    ...renderLifeArea("Work, Calling & Public Direction", area.workCalling),
    ...renderLifeArea("North Node Growth Path", area.growthPath),
    "## Gifts You Can Trust",
    ...report.integration.gifts.map((item) => `- **${item.title}:** ${item.body}${bulletEvidence(item.evidence)}`),
    "",
    "## Growth Edges / Shadow Patterns",
    ...report.integration.growthEdges.map((item) => `- **${item.title}:** ${item.body}${bulletEvidence(item.evidence)}`),
    "",
    "## Practices for Integration",
    ...report.integration.practices.map((item) => `- **${item.title}:** ${item.instruction}${bulletEvidence(item.evidence)}`),
    "",
    "## Reflection Prompts",
    ...report.integration.reflectionPrompts.map((item) => `- ${item.prompt}${bulletEvidence(item.evidence)}`),
    "",
    "## Questions You Can Ask Oracle Next",
    ...report.oracleFollowUps.map((item) => `- **${item.label}:** ${item.prompt}`),
    "",
    "## Personal Motto",
    report.overview.motto,
  ];

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function renderLifeArea(title: string, section: LifeAreaSection): string[] {
  return [
    `## ${title}`,
    section.summary,
    ...section.keyInsights.map((item) => `- **${item.title}:** ${item.body}${bulletEvidence(item.evidence)}`),
    ...section.practices.map((item) => `- **Practice — ${item.title}:** ${item.instruction}${bulletEvidence(item.evidence)}`),
    "",
  ];
}

export function compactStructuredReportForOracle(report: BirthChartReportV2): string {
  return [
    "[BIRTH CHART REPORT SUMMARY]",
    `One sentence: ${report.overview.oneSentence}`,
    `Top themes: ${report.overview.topThemes.map((theme) => `${theme.title} (${evidenceText(theme.evidence)})`).join("; ")}`,
    "Dominant signatures:",
    ...report.signatures.map((signature) => `- ${signature.title}: ${signature.shortSummary} Evidence: ${evidenceText(signature.evidence)} Gift: ${signature.gift} Watch-for: ${signature.watchFor}${signature.recognitionCue ? ` Recognition cue: ${signature.recognitionCue}` : ""}${signature.failureMode ? ` Failure mode: ${signature.failureMode}` : ""}${signature.decisionRule ? ` Decision rule: ${signature.decisionRule}` : ""}${signature.experiment ? ` Experiment: ${signature.experiment}` : ""} Practice: ${signature.practice}`),
    "Life areas:",
    ...Object.values(report.lifeAreas).map((section) => `- ${section.title}: ${section.summary}`),
    "[END BIRTH CHART REPORT SUMMARY]",
  ].join("\n");
}

export function getStructuredReport(user: Doc<"users">): BirthChartReportV2 | null {
  const birthChartReport = user.birthChartReport as (Doc<"users">["birthChartReport"] & { structured?: unknown }) | undefined;
  const structured = birthChartReport?.structured ?? null;
  if (!structured) return null;
  try {
    return validateBirthChartReportV2(structured);
  } catch {
    return null;
  }
}
