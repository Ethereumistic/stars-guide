import type { OracleEvidenceBundle, OracleRequestPlan, OracleResponseViolation } from "./capabilities";

const FALSE_DENIAL = /\b(?:i (?:do not|don't|cannot|can't) (?:have|see|access)(?: your| the)?|(?:chart|transit|current sky) data (?:is|are) (?:not |un)available|upload your chart|provide (?:your |me )?(?:birth|chart|transit) data)\b/i;
const CALIBRATED = /\b(?:may|might|could|can|suggests?|tends?|likely|perhaps|astrologically)\b/i;
const SAFETY = /\b(?:weather|conditions|equipment|training|fatigue|visibility|local advisories?|safety|forecast|certified|buddy)\b/i;
const NATAL_CERTAINTY = /\b(?:psychic|destined|guaranteed|inevitable|always right|never wrong)\b/i;
const ENTITY_ALIASES: Record<string, RegExp> = {
  Ascendant: /\b(?:ascendant|rising)\b/i,
  "North Node": /\bnorth\s+node\b/i,
  "South Node": /\bsouth\s+node\b/i,
  "Part of Fortune": /\b(?:part\s+of\s+fortune|fortune\s+point)\b/i,
};
const BODY_PATTERN = "Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|North\\s+Node|South\\s+Node|Chiron|Part\\s+of\\s+Fortune";
const DIRECT_ASPECT = new RegExp(`\\b(${BODY_PATTERN})\\s+(?:is\\s+|forms?\\s+(?:an?\\s+)?)?(conjunct(?:ion)?|oppos(?:e|es|ed|ite|ition)|square|trine|sextile)\\s+(?:to\\s+|with\\s+|the\\s+|your\\s+)?(${BODY_PATTERN})\\b`, "gi");
const PAIRED_ASPECT = new RegExp(`\\b(${BODY_PATTERN})\\s*(?:and|&|[-–—])\\s*(?:your\\s+)?(${BODY_PATTERN})\\s+(?:forms?\\s+)?(?:an?\\s+)?(conjunct(?:ion)?|oppos(?:e|es|ed|ite|ition)|square|trine|sextile)\\b`, "gi");
const COLOCATED_ASPECT = new RegExp(`\\b(${BODY_PATTERN}).{0,36}\\b(?:sitting\\s+right\\s+on|right\\s+on)\\s+(?:the\\s+|your\\s+)?(${BODY_PATTERN})\\b`, "gi");

function normalizeBody(value: string) {
  return value.toLowerCase().replace(/\s+/g, "_");
}

function normalizeAspect(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.startsWith("conjunct")) return "conjunction";
  if (normalized.startsWith("oppos")) return "opposition";
  return normalized;
}

function aspectKey(body1: string, body2: string, type: string) {
  return [...[normalizeBody(body1), normalizeBody(body2)].sort(), normalizeAspect(type)].join(":");
}

function unsupportedNatalAspectClaims(content: string, evidence?: OracleEvidenceBundle): string[] {
  if (!evidence?.natalChart) return [];
  const stored = new Set(evidence.natalChart.storedAspects.map((aspect) => aspectKey(aspect.body1, aspect.body2, aspect.type)));
  const unsupported = new Set<string>();
  for (const match of content.matchAll(DIRECT_ASPECT)) {
    const prefix = content.slice(Math.max(0, (match.index ?? 0) - 35), match.index ?? 0);
    if (/\b(?:transit|transiting|current|synastry|no|not|isn't|is not)\b/i.test(prefix)) continue;
    const key = aspectKey(match[1], match[3], match[2]);
    if (!stored.has(key)) unsupported.add(`${match[1]} ${normalizeAspect(match[2])} ${match[3]}`);
  }
  for (const match of content.matchAll(PAIRED_ASPECT)) {
    const prefix = content.slice(Math.max(0, (match.index ?? 0) - 35), match.index ?? 0);
    if (/\b(?:transit|transiting|current|synastry|no|not|isn't|is not)\b/i.test(prefix)) continue;
    const key = aspectKey(match[1], match[2], match[3]);
    if (!stored.has(key)) unsupported.add(`${match[1]} ${normalizeAspect(match[3])} ${match[2]}`);
  }
  for (const match of content.matchAll(COLOCATED_ASPECT)) {
    const prefix = content.slice(Math.max(0, (match.index ?? 0) - 35), match.index ?? 0);
    if (/\b(?:transit|transiting|current|synastry|no|not|isn't|is not)\b/i.test(prefix)) continue;
    const key = aspectKey(match[1], match[2], "conjunction");
    if (!stored.has(key)) unsupported.add(`${match[1]} conjunction ${match[2]}`);
  }
  return [...unsupported];
}

export function validateOracleResponse(content: string, plan: OracleRequestPlan, evidence?: OracleEvidenceBundle): OracleResponseViolation[] {
  const violations: OracleResponseViolation[] = [];
  for (const entity of plan.responseContract.mustCompareAllOptions ? plan.entities : []) {
    if (!content.toLowerCase().includes(entity.toLowerCase())) violations.push({ code: "option_missing", message: `The answer does not address ${entity}.`, severity: "error" });
  }
  if (plan.responseContract.mustRecommend && (!/\b(?:pick|choose|recommend|better choice|lean toward|go with|my vote)\b/i.test(content) || /\b(?:cannot|can't|won't|unable to|do not)\s+(?:tell you |recommend|choose|pick)/i.test(content))) violations.push({ code: "recommendation_missing", message: "The user requested a recommendation but none was given.", severity: "error" });
  const hasSuppliedPersonalEvidence = evidence?.items.some((item) => item.capability === "natal_chart" || item.capability === "personal_transits");
  if (hasSuppliedPersonalEvidence && FALSE_DENIAL.test(content)) violations.push({ code: "false_evidence_denial", message: "The answer denied natal/transit evidence supplied by the server.", severity: "error" });
  if ((plan.requiredCapabilities.includes("cosmic_weather") || plan.requiredCapabilities.includes("personal_transits")) && !CALIBRATED.test(content)) violations.push({ code: "uncalibrated_interpretation", message: "Astrological timing claims need calibrated language.", severity: "warning" });
  if (plan.responseContract.practicalSafety && !SAFETY.test(content)) violations.push({ code: "practical_safety_missing", message: "Hazardous activity advice must include practical safety conditions.", severity: "error" });
  for (const entity of plan.responseContract.requiredNatalEntities) {
    const pattern = ENTITY_ALIASES[entity] ?? new RegExp(`\\b${entity}\\b`, "i");
    if (!pattern.test(content)) violations.push({ code: "natal_entity_missing", message: `The requested full-chart answer does not address ${entity}.`, severity: "error" });
  }
  if (plan.requiredCapabilities.includes("natal_chart") && NATAL_CERTAINTY.test(content)) {
    violations.push({ code: "uncalibrated_natal_claim", message: "Natal interpretation contains inflated or deterministic language.", severity: "error" });
  }
  if (plan.requiredCapabilities.includes("natal_chart") && !plan.requiredCapabilities.includes("synastry") && plan.temporalScope === "none") {
    for (const claim of unsupportedNatalAspectClaims(content, evidence)) {
      violations.push({ code: "unsupported_natal_aspect", message: `The answer claims an aspect that is not in canonical stored aspects: ${claim}.`, severity: "error" });
    }
  }
  return violations;
}

export function buildRepairInstruction(violations: OracleResponseViolation[]) {
  return `[RESPONSE CONTRACT REPAIR]\nRevise the draft and fix every issue below without mentioning this validation step:\n${violations.map((v) => `- ${v.code}: ${v.message}`).join("\n")}\n[END RESPONSE CONTRACT REPAIR]`;
}
