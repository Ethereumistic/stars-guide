import type { OracleEvidenceBundle, OracleRequestPlan, OracleResponseViolation } from "./capabilities";

const FALSE_DENIAL = /\b(?:i (?:do not|don't|cannot|can't) (?:have|see|access)(?: your| the)?|(?:chart|transit|current sky) data (?:is|are) (?:not |un)available|upload your chart|provide (?:your |me )?(?:birth|chart|transit) data)\b/i;
const CALIBRATED = /\b(?:may|might|could|can|suggests?|tends?|likely|perhaps|astrologically)\b/i;
const SAFETY = /\b(?:weather|conditions|equipment|training|fatigue|visibility|local advisories?|safety|forecast|certified|buddy)\b/i;
const NATAL_CERTAINTY = /\b(?:psychic|destined|guaranteed|inevitable|always right|never wrong)\b/i;
const SIGN_PATTERN = "Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces";
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
const PLACEMENT_BODY_PATTERN = `${BODY_PATTERN}|Ascendant|Rising`;
const SIGN_CLAIM = new RegExp(`\\b(${PLACEMENT_BODY_PATTERN})\\s+(?:is\\s+)?(?:placed\\s+)?in\\s+(${SIGN_PATTERN})\\b`, "gi");
const HOUSE_CLAIM = new RegExp(`\\b(${PLACEMENT_BODY_PATTERN})\\s+(?:is\\s+|sits?\\s+|placed\\s+)?(?:in\\s+(?:${SIGN_PATTERN})\\s+)?(?:in\\s+)?(?:the\\s+)?(?:House\\s+(\\d{1,2})|(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\\s+house)\\b`, "gi");
const MOTION_CLAIM = new RegExp(`\\b(${PLACEMENT_BODY_PATTERN})\\s+(?:is\\s+|was\\s+)?(retrograde|direct)\\b|\\b(retrograde|direct)\\s+(${PLACEMENT_BODY_PATTERN})\\b`, "gi");
const DIGNITY_CLAIM = new RegExp(`\\b(${PLACEMENT_BODY_PATTERN})\\s+(?:is\\s+|was\\s+)?(?:in\\s+(?:its\\s+)?)?(domicile|exaltation|exalted|detriment|fall|fallen|peregrine)\\b`, "gi");
const DEGREE_CLAIM = new RegExp(`\\b(${PLACEMENT_BODY_PATTERN})\\s+(?:is\\s+)?(?:at\\s+)(\\d{1,2}(?:\\.\\d+)?)\\s*(?:\\u00b0|degrees?)`, "gi");
const HOUSE_SIGN_CLAIM = new RegExp(`\\b(?:House\\s+(\\d{1,2})|(?:the\\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\\s+house)\\s+(?:is\\s+|has\\s+|begins\\s+in\\s+|is\\s+in\\s+)?(${SIGN_PATTERN})\\b`, "gi");
const REVERSE_HOUSE_SIGN_CLAIM = new RegExp(`\\b(${SIGN_PATTERN})\\s+(?:is\\s+)?(?:on|rules)\\s+(?:the\\s+)?(?:House\\s+(\\d{1,2})|(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\\s+house)\\b`, "gi");
const CHART_RULER_CLAIM = new RegExp(`\\b(${PLACEMENT_BODY_PATTERN})\\s+(?:is\\s+|as\\s+)?(?:your\\s+|the\\s+)?chart\\s+ruler\\b|\\b(${PLACEMENT_BODY_PATTERN})\\s+rules\\s+(?:your\\s+|the\\s+)?chart\\b`, "gi");
const SIGN_CONCENTRATION_CLAIM = new RegExp(`\\b(${SIGN_PATTERN})\\s+(?:stellium|cluster|concentration)\\b`, "gi");
const HOUSE_CONCENTRATION_CLAIM = /\b(?:House\s+(\d{1,2})|(?:the\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+house)\s+(?:stellium|cluster|concentration)\b/gi;
const DEGREE_ROUNDING_TOLERANCE = 0.51;
const ORDINAL_HOUSES: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
};

function normalizeBody(value: string) {
  const normalized = value.toLowerCase().replace(/\s+/g, "_");
  return normalized === "rising" ? "ascendant" : normalized;
}

function normalizeSign(value: string) {
  return value.trim().toLowerCase();
}

function normalizeDignity(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "exalted") return "exaltation";
  if (normalized === "fallen") return "fall";
  return normalized;
}

function parseHouse(numeric?: string, ordinal?: string): number | undefined {
  if (numeric) {
    const value = Number(numeric);
    return value >= 1 && value <= 12 ? value : undefined;
  }
  return ordinal ? ORDINAL_HOUSES[ordinal.toLowerCase()] : undefined;
}

function claimIsNegated(content: string, index: number): boolean {
  return /\b(?:not|isn't|is not|wasn't|was not|never)\s*$/i.test(
    content.slice(Math.max(0, index - 16), index),
  );
}

function addUniqueViolation(
  violations: OracleResponseViolation[],
  violation: OracleResponseViolation,
) {
  if (!violations.some((item) => item.code === violation.code && item.message === violation.message)) {
    violations.push(violation);
  }
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

/**
 * Validates explicit factual natal claims against structured canonical facts.
 * Degree claims allow 0.51 degrees so a canonical decimal may be rounded to the nearest
 * whole degree without creating a false contradiction.
 */
export function validateCanonicalNatalClaims(
  content: string,
  evidence?: OracleEvidenceBundle,
): OracleResponseViolation[] {
  const chart = evidence?.natalChart;
  if (!chart) return [];
  const violations: OracleResponseViolation[] = [];
  const placements = new Map(
    (chart.placements ?? []).map((placement) => [normalizeBody(placement.body), placement]),
  );

  for (const match of content.matchAll(SIGN_CLAIM)) {
    if (claimIsNegated(content, match.index ?? 0)) continue;
    const placement = placements.get(normalizeBody(match[1]));
    if (placement && normalizeSign(match[2]) !== normalizeSign(placement.sign)) {
      addUniqueViolation(violations, {
        code: "contradictory_natal_sign",
        message: `${match[1]} was described in ${match[2]}, but the canonical placement is ${placement.sign}.`,
        severity: "error",
      });
    }
  }

  for (const match of content.matchAll(HOUSE_CLAIM)) {
    if (claimIsNegated(content, match.index ?? 0)) continue;
    const placement = placements.get(normalizeBody(match[1]));
    const claimedHouse = parseHouse(match[2], match[3]);
    if (
      placement
      && placement.house !== undefined
      && placement.house !== null
      && claimedHouse !== undefined
      && claimedHouse !== placement.house
    ) {
      addUniqueViolation(violations, {
        code: "contradictory_natal_house",
        message: `${match[1]} was described in House ${claimedHouse}, but the canonical placement is House ${placement.house}.`,
        severity: "error",
      });
    }
  }

  for (const match of content.matchAll(MOTION_CLAIM)) {
    if (claimIsNegated(content, match.index ?? 0)) continue;
    const body = match[1] ?? match[4];
    const motion = (match[2] ?? match[3]).toLowerCase();
    const placement = placements.get(normalizeBody(body));
    if (placement && placement.retrograde !== undefined) {
      const claimedRetrograde = motion === "retrograde";
      if (claimedRetrograde !== placement.retrograde) {
        addUniqueViolation(violations, {
          code: "contradictory_natal_motion",
          message: `${body} was described as ${motion}, but the canonical chart marks it ${placement.retrograde ? "retrograde" : "direct"}.`,
          severity: "error",
        });
      }
    }
  }

  for (const match of content.matchAll(DIGNITY_CLAIM)) {
    if (claimIsNegated(content, match.index ?? 0)) continue;
    const placement = placements.get(normalizeBody(match[1]));
    if (placement && normalizeDignity(match[2]) !== normalizeDignity(placement.dignity ?? "none")) {
      addUniqueViolation(violations, {
        code: "contradictory_natal_dignity",
        message: `${match[1]} was described with ${normalizeDignity(match[2])} dignity, but the canonical dignity is ${placement.dignity ?? "none"}.`,
        severity: "error",
      });
    }
  }

  for (const match of content.matchAll(DEGREE_CLAIM)) {
    if (claimIsNegated(content, match.index ?? 0)) continue;
    const placement = placements.get(normalizeBody(match[1]));
    const claimedDegree = Number(match[2]);
    if (
      placement
      && placement.degree !== undefined
      && Math.abs(claimedDegree - placement.degree) > DEGREE_ROUNDING_TOLERANCE
    ) {
      addUniqueViolation(violations, {
        code: "contradictory_natal_degree",
        message: `${match[1]} was described at ${claimedDegree} degrees, but the canonical degree is ${placement.degree.toFixed(2)} degrees within its sign.`,
        severity: "error",
      });
    }
  }

  const houses = new Map(
    (chart.houseSignatures ?? []).map((house) => [house.house, normalizeSign(house.sign)]),
  );
  for (const match of content.matchAll(HOUSE_SIGN_CLAIM)) {
    const house = parseHouse(match[1], match[2]);
    const canonicalSign = house === undefined ? undefined : houses.get(house);
    if (house !== undefined && canonicalSign && normalizeSign(match[3]) !== canonicalSign) {
      addUniqueViolation(violations, {
        code: "contradictory_house_signature",
        message: `House ${house} was described with ${match[3]}, but its canonical sign is ${canonicalSign}.`,
        severity: "error",
      });
    }
  }
  for (const match of content.matchAll(REVERSE_HOUSE_SIGN_CLAIM)) {
    const house = parseHouse(match[2], match[3]);
    const canonicalSign = house === undefined ? undefined : houses.get(house);
    if (house !== undefined && canonicalSign && normalizeSign(match[1]) !== canonicalSign) {
      addUniqueViolation(violations, {
        code: "contradictory_house_signature",
        message: `House ${house} was described with ${match[1]}, but its canonical sign is ${canonicalSign}.`,
        severity: "error",
      });
    }
  }

  for (const match of content.matchAll(CHART_RULER_CLAIM)) {
    const body = match[1] ?? match[2];
    if (chart.chartRuler && normalizeBody(body) !== normalizeBody(chart.chartRuler.body)) {
      addUniqueViolation(violations, {
        code: "unsupported_chart_ruler",
        message: `${body} was called the chart ruler, but the canonical chart ruler is ${chart.chartRuler.body}.`,
        severity: "error",
      });
    }
  }

  const signConcentrations = new Set(
    (chart.concentrations ?? [])
      .filter((item) => item.kind === "sign")
      .map((item) => normalizeSign(String(item.value))),
  );
  const houseConcentrations = new Set(
    (chart.concentrations ?? [])
      .filter((item) => item.kind === "house")
      .map((item) => Number(item.value)),
  );
  for (const match of content.matchAll(SIGN_CONCENTRATION_CLAIM)) {
    if ((chart.concentrations?.length ?? 0) > 0 && !signConcentrations.has(normalizeSign(match[1]))) {
      addUniqueViolation(violations, {
        code: "unsupported_natal_concentration",
        message: `The claimed ${match[1]} concentration is not present in canonical chart concentrations.`,
        severity: "error",
      });
    }
  }
  for (const match of content.matchAll(HOUSE_CONCENTRATION_CLAIM)) {
    const house = parseHouse(match[1], match[2]);
    if (
      house !== undefined
      && (chart.concentrations?.length ?? 0) > 0
      && !houseConcentrations.has(house)
    ) {
      addUniqueViolation(violations, {
        code: "unsupported_natal_concentration",
        message: `The claimed House ${house} concentration is not present in canonical chart concentrations.`,
        severity: "error",
      });
    }
  }

  for (const claim of unsupportedNatalAspectClaims(content, evidence)) {
    addUniqueViolation(violations, {
      code: "unsupported_natal_aspect",
      message: `The answer claims an aspect that is not in canonical stored aspects: ${claim}.`,
      severity: "error",
    });
  }
  return violations;
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
