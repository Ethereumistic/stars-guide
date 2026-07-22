import type { Doc } from "../_generated/dataModel";
import { buildBirthChartContextArtifact } from "../../src/lib/birth-chart/report-context";
import { BIRTH_CHART_REPORT_VERSION } from "../../src/lib/birth-chart/report-version";

/** Persistence/pipeline version. The human-facing JSON contract is meta.version 3. */
export { BIRTH_CHART_REPORT_VERSION };

export type BirthChartReportProfiling = NonNullable<
  NonNullable<Doc<"users">["birthChartReport"]>["profilingAnswers"]
>;

export function buildReportSystemPrompt(profiling?: BirthChartReportProfiling): string {
  return [
    "[STARS.GUIDE HUMAN BIRTH CHART REPORT — CONTRACT V3]",
    "Create a concise, premium reading experience for a human. This artifact is not Oracle memory and must not read like an encyclopedia.",
    "The server has already calculated every chart fact, evidence ID, and named pattern. Interpret them; never calculate, rename, or invent them.",
    "Write warm, precise second-person language. Beauty comes from recognition and specificity, not mysticism or flattery.",
    profiling?.pronouns ? `Use ${profiling.pronouns} only if third-person language is unavoidable.` : "Avoid third-person language.",
    "Return valid JSON only: no Markdown, comments, code fences, HTML, or explanation.",
    "",
    "Required top-level shape:",
    "{ meta, identity, chartSignature, themes, compass, toolkit, oraclePrompts }",
    "meta: { version: 3 }. The server creates the personal report title; do not supply product names or titles.",
    "identity: { anchorPhrase, oneSentence, orientation }",
    "chartSignature: { patternId, meaning, gift, watchFor, practice } using exactly one supplied patternId.",
    "themes: exactly 3 distinct objects { id, title, summary, gift, watchFor, practice, evidenceIds }.",
    "compass: exact keys innerWorld, relationships, vocation, growth. Each is { headline, summary, evidenceIds }.",
    "toolkit: exact keys decisionRule, resetPractice, connectionPractice. Each value is a practice.",
    "oraclePrompts: exactly 4 objects { label, prompt, evidenceIds }.",
    "A practice is { title, instruction, cadence }, where cadence is once, daily, weekly, or as_needed.",
    "Use only evidence IDs listed in APPROVED EVIDENCE. Use 1-3 evidence IDs per interpretive section and 1-2 per Oracle prompt.",
    "Copy budgets are hard writing targets: titles <= 70 characters; oneSentence <= 280; orientation <= 320; pattern meaning and theme summaries <= 360; compass summaries <= 260; gift/watchFor <= 180; practice instructions and Oracle prompts <= 220. Finish every thought within its budget; the server preserves complete fields and never truncates them.",
    "",
    "Product writing constraints:",
    "- Each field does one job. Do not repeat the same interpretation in multiple sections.",
    "- The chart signature explains the supplied pattern's lived mechanics, gift, friction, and one observable practice.",
    "- Each theme is compact: summary 2-4 sentences; gift and watchFor one sentence each.",
    "- Compass summaries are 1-3 sentences and answer what helps in that life arena.",
    "- Start every practice instruction with a concrete imperative verb such as Write, Name, Schedule, Ask, Compare, Notice, Create, or Choose; include a trigger or cadence.",
    "- Oracle prompts must be specific enough to produce a focused follow-up reading.",
    "- Use profile answers only to choose emphasis. Never quote private context or treat it as chart evidence.",
    "- Essential dignity and aspect connectivity are different concepts. 'Peregrine' is a dignity status; 'unaspected' means no stored major aspect. Never define one as the other.",
    "- Never claim that a planet or cluster lacks major-aspect support when the approved evidence inventory contains aspects involving it.",
    "- Avoid: chosen, destined, guaranteed, psychic, old soul, limitless, 'trust the universe', diagnostic claims, and deterministic predictions.",
    "- No medical, legal, financial, or crisis guidance.",
    "[END STARS.GUIDE HUMAN BIRTH CHART REPORT — CONTRACT V3]",
  ].join("\n");
}

export function buildReportUserPrompt(params: {
  user: Doc<"users">;
  profiling?: BirthChartReportProfiling;
}): string {
  if (!params.user.birthData) throw new Error("Missing birth data");
  const context = buildBirthChartContextArtifact(params.user.birthData);
  const profiling = params.profiling as Record<string, string | string[] | undefined> | undefined;
  const list = (key: string) => Array.isArray(profiling?.[key]) ? (profiling?.[key] as string[]).join(", ") : "not provided";
  const value = (key: string) => typeof profiling?.[key] === "string" ? profiling[key] as string : "not provided";
  return [
    "[UNTRUSTED PERSONALIZATION LENS — emphasis only]",
    `Preferred name: ${value("preferredName") !== "not provided" ? value("preferredName") : params.user.username ?? "Seeker"}`,
    `Current season: ${list("currentSeason")}`,
    `Desired focus: ${list("reportFocus")}`,
    `Pattern they want help with: ${list("growthPattern")}`,
    `Tone preference: ${value("tonePreference")}`,
    `Optional context: ${value("customContext")}`,
    "[END UNTRUSTED PERSONALIZATION LENS]",
    "",
    "[SERVER-DETECTED PATTERNS]",
    JSON.stringify(context.derived.patterns),
    "[END SERVER-DETECTED PATTERNS]",
    "",
    "[APPROVED EVIDENCE]",
    JSON.stringify(context.evidence.map(({ id, label }) => ({ id, label }))),
    "[END APPROVED EVIDENCE]",
    "",
    "[DETERMINISTIC CHART CONTEXT]",
    JSON.stringify({ birth: context.birth, ascendant: context.ascendant, placements: context.placements, houses: context.houses, aspects: context.aspects, derived: { chartRuler: context.derived.chartRuler, dominantElement: context.derived.dominantElement } }),
    "[END DETERMINISTIC CHART CONTEXT]",
  ].join("\n");
}

export function sanitizeReportMarkdown(markdown: string): string {
  return markdown.replace(/^```(?:markdown)?\s*/i, "").replace(/```\s*$/i, "").trim();
}
