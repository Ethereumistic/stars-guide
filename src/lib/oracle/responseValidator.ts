import type { OracleEvidenceBundle, OracleRequestPlan, OracleResponseViolation } from "./capabilities";

const FALSE_DENIAL = /\b(?:i (?:do not|don't|cannot|can't) (?:have|see|access)(?: your| the)?|(?:chart|transit|current sky) data (?:is|are) (?:not |un)available|upload your chart|provide (?:your |me )?(?:birth|chart|transit) data)\b/i;
const CALIBRATED = /\b(?:may|might|could|can|suggests?|tends?|likely|perhaps|astrologically)\b/i;
const SAFETY = /\b(?:weather|conditions|equipment|training|fatigue|visibility|local advisories?|safety|forecast|certified|buddy)\b/i;

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
  return violations;
}

export function buildRepairInstruction(violations: OracleResponseViolation[]) {
  return `[RESPONSE CONTRACT REPAIR]\nRevise the draft and fix every issue below without mentioning this validation step:\n${violations.map((v) => `- ${v.code}: ${v.message}`).join("\n")}\n[END RESPONSE CONTRACT REPAIR]`;
}
