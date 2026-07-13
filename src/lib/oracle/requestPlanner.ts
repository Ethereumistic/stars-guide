import { ORACLE_CAPABILITY_REGISTRY, type OracleCapabilityKey, type OracleGoal, type OracleRequestPlan, type OracleTemporalScope } from "./capabilities";

export interface OraclePlanningContext {
  hasBirthData: boolean;
  hasJournalConsent: boolean;
  hasSynastryPayload?: boolean;
  explicitFeatureKey?: string | null;
  classifier?: OracleRequestPlan["classifier"];
}

const unique = <T,>(items: T[]) => [...new Set(items)];

function temporalScope(question: string): OracleTemporalScope {
  if (/\b(today|tonight|this (?:morning|afternoon|evening|day)|good day for)\b/i.test(question)) return "today";
  if (/\b(now|currently|right now|current sky|cosmic weather|planetary weather)\b/i.test(question)) return "current";
  if (/\b(yesterday|ago|last (?:night|week|month))\b/i.test(question)) return "historical";
  if (/\b(?:between|from)\s+\S+\s+(?:and|to)\s+\S+|\bnext (?:week|month|\d+ days)\b/i.test(question)) return "date_range";
  return "none";
}

function extractOptions(question: string): string[] {
  const activityMatch = question.match(/\b(?:good day )?for\s+(?:a |an |the )?([a-z][a-z -]{1,35}?)\s+or\s+(?:a |an |the )?([a-z][a-z -]{1,35}?)(?:\?|,|\.|\s+(?:which|what|why)\b|$)/i);
  if (activityMatch) return [activityMatch[1].trim(), activityMatch[2].trim()];
  const match = question.match(/\b(?:a |an |the )?([a-z][a-z -]{1,35}?)\s+or\s+(?:a |an |the )?([a-z][a-z -]{1,35}?)(?:\?|,|\.|\s+(?:which|what|why)\b|$)/i);
  return match ? [match[1].trim(), match[2].trim()] : [];
}

function expandDependencies(capabilities: OracleCapabilityKey[]) {
  const result = new Set(capabilities);
  const visit = (key: OracleCapabilityKey) => {
    for (const dependency of ORACLE_CAPABILITY_REGISTRY[key].dependencies) {
      if (!result.has(dependency)) { result.add(dependency); visit(dependency); }
    }
  };
  capabilities.forEach(visit);
  return [...result];
}

export function planOracleRequest(question: string, context: OraclePlanningContext): OracleRequestPlan {
  const scope = temporalScope(question);
  const entities = extractOptions(question);
  const matches: string[] = [];
  const goals: OracleGoal[] = [];
  const explicit: OracleCapabilityKey[] = [];
  const inferred: OracleCapabilityKey[] = [];
  if (entities.length || /\b(compare|versus|vs\.?|which (?:one )?should|which (?:is )?better)\b/i.test(question)) { goals.push("compare"); matches.push("comparison"); }
  if (/\b(which (?:one )?should i (?:pick|choose)|what should i (?:pick|choose|do)|recommend|best option)\b/i.test(question)) { goals.push("recommend"); matches.push("recommendation"); }
  if (/\b(journal|entries|cosmic recall)\b/i.test(question)) { goals.push("recall"); explicit.push("journal_recall"); matches.push("journal_explicit"); }
  if (/\b(binaural|frequency|soundscape|meditation audio)\b/i.test(question)) { goals.push("generate_audio"); explicit.push("binaural_beats"); matches.push("binaural_explicit"); }
  if (/\b(synastry|compatible|compatibility|our charts|relationship chart)\b/i.test(question)) { goals.push("interpret"); explicit.push("synastry"); matches.push("synastry_explicit"); }
  if (/\b(birth|natal|my chart|my placements?|my houses?|my aspects?)\b/i.test(question)) { goals.push("interpret"); explicit.push("natal_chart"); matches.push("natal_explicit"); }
  if (/\b(transit|current sky|cosmic weather|planetary weather|retrograde|moon phase)\b/i.test(question)) { goals.push("interpret"); explicit.push("cosmic_weather"); matches.push("sky_explicit"); }
  if (scope !== "none") { inferred.push("cosmic_weather"); matches.push(`temporal_${scope}`); }
  if (scope !== "none") {
    inferred.push("personal_transits");
    matches.push(context.hasBirthData ? "temporal_personalization" : "temporal_personalization_unavailable");
  }
  if (!goals.length) goals.push("inform");
  inferred.push("general_conversation");

  if (context.explicitFeatureKey === "birth_chart") explicit.push("natal_chart");
  if (context.explicitFeatureKey === "synastry") explicit.push("synastry");
  if (context.explicitFeatureKey === "journal_recall") explicit.push("journal_recall");
  if (context.explicitFeatureKey === "binaural_beats") explicit.push("binaural_beats");

  const required = expandDependencies(unique([...explicit, ...inferred]));
  const unavailable: OracleRequestPlan["unavailableCapabilities"] = [];
  const unresolved: string[] = [];
  for (const capability of required) {
    const manifest = ORACLE_CAPABILITY_REGISTRY[capability];
    if (manifest.requiresBirthData && !context.hasBirthData) unavailable.push({ capability, reason: "canonical_birth_data_missing" });
    if (manifest.requiresJournalConsent && !context.hasJournalConsent) unavailable.push({ capability, reason: "journal_consent_required" });
    if (manifest.requiresSynastryPayload && !context.hasSynastryPayload) unavailable.push({ capability, reason: "second_chart_missing" });
  }
  for (const item of unavailable) if (ORACLE_CAPABILITY_REGISTRY[item.capability].failureBehavior === "request_prerequisite") unresolved.push(item.reason);

  return {
    version: "oracle-planner-v1", goals: unique(goals), temporalScope: scope, entities,
    explicitCapabilities: unique(explicit), inferredCapabilities: unique(inferred), requiredCapabilities: required,
    optionalCapabilities: [], unavailableCapabilities: unavailable, forbiddenCapabilities: [], unresolvedRequirements: unique(unresolved),
    deterministicRuleMatches: unique(matches), classifier: context.classifier ?? { source: "none" },
    responseContract: { mustCompareAllOptions: entities.length > 1 || goals.includes("compare"), mustRecommend: goals.includes("recommend"), practicalSafety: /\b(?:ride|riding|motorbike|motorcycle|diving|dive|hike|climb|drive|swim)\b/i.test(question) },
  };
}
