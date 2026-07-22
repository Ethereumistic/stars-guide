import type { BirthChartReportV3, ReportCompassPoint, ReportTheme } from "../../../convex/birthChartReport/v3";
import { isBirthChartReportV3 } from "../../../convex/birthChartReport/v3";
import { BIRTH_CHART_REPORT_VERSION } from "./report-version";
import { fingerprintBirthChart } from "./report-context";
import type { StoredBirthData } from "./types";

export type OracleBirthReportMode = "full" | "focused";

export type OracleBirthReportEligibilityReason =
  | "eligible"
  | "report_missing"
  | "report_incomplete"
  | "pipeline_version_stale"
  | "structured_contract_invalid"
  | "source_fingerprint_missing"
  | "source_fingerprint_mismatch"
  | "structured_fingerprint_mismatch"
  | "legacy_pattern_semantics";

export interface StoredBirthChartReportForOracle {
  status?: string;
  version?: number;
  sourceChartFingerprint?: string;
  structured?: unknown;
  profilingAnswers?: {
    reportFocus?: string[];
    tonePreference?: string;
  };
}

export interface OracleBirthReportContextResult {
  context: string | null;
  eligible: boolean;
  reason: OracleBirthReportEligibilityReason;
  mode: OracleBirthReportMode | null;
  contractVersion: number | null;
  pipelineVersion: number | null;
  sourceFingerprintMatched: boolean;
  includedSections: string[];
}

const BROAD_REPORT_REQUEST = /\b(?:full|fully|whole|overall|entire|complete|everything|all placements|every single|0\s*(?:to|-)\s*100|birth chart report|chart overview|dominant themes|life purpose)\b/i;
const BODY_ALIASES: Record<string, string[]> = {
  sun: ["sun"], moon: ["moon"], mercury: ["mercury"], venus: ["venus"], mars: ["mars"],
  jupiter: ["jupiter"], saturn: ["saturn"], uranus: ["uranus"], neptune: ["neptune"], pluto: ["pluto"],
  north_node: ["north node"], south_node: ["south node"], chiron: ["chiron"],
  part_of_fortune: ["part of fortune", "fortune"], ascendant: ["ascendant", "rising"],
};

const COMPASS_TERMS: Record<keyof BirthChartReportV3["compass"], RegExp> = {
  innerWorld: /\b(?:inner|emotion|emotional|feeling|moon|mercury|mind|private|solitude|family|home|care)\b/i,
  relationships: /\b(?:relationship|love|dating|partner|attachment|venus|mars|romance|intimacy|friendship)\b/i,
  vocation: /\b(?:career|work|calling|vocation|public|business|profession|job|purpose|money)\b/i,
  growth: /\b(?:growth|north node|south node|node|chiron|healing|lesson|pattern|purpose|develop)\b/i,
};

function bounded(value: string, max: number): string {
  const normalized = value.trim();
  if (normalized.length <= max) return normalized;
  const slice = normalized.slice(0, Math.max(1, max - 1));
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > max * 0.7 ? lastSpace : slice.length).trimEnd()}…`;
}

function evidenceIds(items: Array<{ id: string }>): string[] {
  return items.map((item) => item.id);
}

function practice(item: { title: string; instruction: string; cadence: string }) {
  return { title: bounded(item.title, 100), instruction: bounded(item.instruction, 420), cadence: item.cadence };
}

function themePayload(theme: ReportTheme) {
  return {
    id: theme.id,
    title: bounded(theme.title, 100),
    summary: bounded(theme.summary, 700),
    gift: bounded(theme.gift, 320),
    watchFor: bounded(theme.watchFor, 320),
    practice: practice(theme.practice),
    evidenceIds: evidenceIds(theme.evidence),
  };
}

function compassPayload(point: ReportCompassPoint) {
  return { headline: bounded(point.headline, 120), summary: bounded(point.summary, 520), evidenceIds: evidenceIds(point.evidence) };
}

function explicitQuestionSignals(question: string) {
  const normalized = question.toLowerCase();
  const bodies = Object.entries(BODY_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => new RegExp(`\\b${alias.replace(/ /g, "\\s+")}\\b`, "i").test(normalized)))
    .map(([id]) => id);
  const houses = [...normalized.matchAll(/\b(?:house\s+(\d{1,2})|(\d{1,2})(?:st|nd|rd|th)\s+house)\b/g)]
    .map((match) => Number(match[1] ?? match[2]))
    .filter((value) => value >= 1 && value <= 12);
  return { bodies, houses };
}

function evidenceMatchesQuestion(theme: ReportTheme, question: string): boolean {
  const { bodies, houses } = explicitQuestionSignals(question);
  if (!bodies.length && !houses.length) return false;
  return theme.evidence.some((item) =>
    item.bodyIds.some((id) => bodies.includes(id)) || item.houseIds.some((id) => houses.includes(id)),
  );
}

function baseResult(reason: OracleBirthReportEligibilityReason, report?: StoredBirthChartReportForOracle): OracleBirthReportContextResult {
  return {
    context: null,
    eligible: false,
    reason,
    mode: null,
    contractVersion: null,
    pipelineVersion: typeof report?.version === "number" ? report.version : null,
    sourceFingerprintMatched: false,
    includedSections: [],
  };
}

/**
 * Build a bounded, query-aware interpretation layer for Oracle.
 *
 * Canonical placements/aspects never come from this artifact. The caller must
 * inject deterministic natal context separately and give it higher authority.
 */
export function buildOracleBirthReportContext(params: {
  birthData: StoredBirthData;
  report?: StoredBirthChartReportForOracle | null;
  question: string;
}): OracleBirthReportContextResult {
  const report = params.report ?? undefined;
  if (!report) return baseResult("report_missing");
  if (report.status !== "completed") return baseResult("report_incomplete", report);
  if ((report.version ?? 0) < BIRTH_CHART_REPORT_VERSION) return baseResult("pipeline_version_stale", report);
  if (!isBirthChartReportV3(report.structured)) return baseResult("structured_contract_invalid", report);
  if (!report.sourceChartFingerprint) return baseResult("source_fingerprint_missing", report);

  const currentFingerprint = fingerprintBirthChart(params.birthData);
  if (report.sourceChartFingerprint !== currentFingerprint) return baseResult("source_fingerprint_mismatch", report);
  if (report.structured.meta.sourceChartFingerprint !== report.sourceChartFingerprint) {
    return baseResult("structured_fingerprint_mismatch", report);
  }
  if (report.structured.chartSignature.pattern.id.startsWith("peregrine:")) {
    return baseResult("legacy_pattern_semantics", report);
  }

  const structured = report.structured;
  const mode: OracleBirthReportMode = BROAD_REPORT_REQUEST.test(params.question) ? "full" : "focused";
  const includedSections = ["identity"];
  const payload: Record<string, unknown> = {
    contractVersion: structured.meta.version,
    pipelineVersion: report.version,
    sourceFingerprintMatched: true,
    mode,
    personalizationLens: {
      reportFocus: report.profilingAnswers?.reportFocus?.slice(0, 3).map((item) => bounded(item, 80)) ?? [],
      tonePreference: report.profilingAnswers?.tonePreference ? bounded(report.profilingAnswers.tonePreference, 80) : null,
    },
    identity: {
      anchorPhrase: bounded(structured.identity.anchorPhrase, 180),
      oneSentence: bounded(structured.identity.oneSentence, 600),
      orientation: bounded(structured.identity.orientation, 520),
    },
  };

  const signatureMatches = mode === "full" || structured.chartSignature.pattern.planetIds.some((id) =>
    explicitQuestionSignals(params.question).bodies.includes(id),
  ) || structured.chartSignature.pattern.houseIds.some((id) => explicitQuestionSignals(params.question).houses.includes(id));
  if (signatureMatches) {
    payload.chartSignature = {
      pattern: {
        id: structured.chartSignature.pattern.id,
        name: bounded(structured.chartSignature.pattern.name, 120),
        definition: bounded(structured.chartSignature.pattern.definition, 520),
        mechanics: bounded(structured.chartSignature.pattern.mechanics, 520),
        evidenceIds: structured.chartSignature.pattern.evidenceIds,
      },
      meaning: bounded(structured.chartSignature.meaning, 700),
      gift: bounded(structured.chartSignature.gift, 320),
      watchFor: bounded(structured.chartSignature.watchFor, 320),
      practice: practice(structured.chartSignature.practice),
    };
    includedSections.push("chartSignature");
  }

  const selectedThemes = mode === "full"
    ? structured.themes
    : structured.themes.filter((theme) => evidenceMatchesQuestion(theme, params.question));
  if (selectedThemes.length) {
    payload.themes = selectedThemes.map(themePayload);
    includedSections.push("themes");
  }

  const compassEntries = (Object.entries(structured.compass) as Array<[keyof BirthChartReportV3["compass"], ReportCompassPoint]>)
    .filter(([key]) => mode === "full" || COMPASS_TERMS[key].test(params.question));
  if (compassEntries.length) {
    payload.compass = Object.fromEntries(compassEntries.map(([key, value]) => [key, compassPayload(value)]));
    includedSections.push("compass");
  }

  if (mode === "full" || /\b(?:practice|tool|action|what should i do|how can i|help me)\b/i.test(params.question)) {
    payload.toolkit = Object.fromEntries(Object.entries(structured.toolkit).map(([key, value]) => [key, practice(value)]));
    includedSections.push("toolkit");
  }

  const context = [
    "[VALIDATED BIRTH CHART REPORT INSIGHTS]",
    "Role: bounded prior interpretation generated from approved evidence IDs. It is not canonical chart fact.",
    JSON.stringify(payload),
    "[END VALIDATED BIRTH CHART REPORT INSIGHTS]",
  ].join("\n");

  return {
    context,
    eligible: true,
    reason: "eligible",
    mode,
    contractVersion: structured.meta.version,
    pipelineVersion: report.version ?? null,
    sourceFingerprintMatched: true,
    includedSections,
  };
}
