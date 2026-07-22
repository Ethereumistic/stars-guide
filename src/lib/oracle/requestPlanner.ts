import { ORACLE_CAPABILITY_REGISTRY, type OracleCapabilityKey, type OracleGoal, type OracleRequestPlan, type OracleTemporalScope } from "./capabilities";
import { isBinauralBeatRequest } from "./features";

export interface OraclePlanningContext {
  hasBirthData: boolean;
  availableNatalEntities?: string[];
  hasJournalConsent: boolean;
  hasSynastryPayload?: boolean;
  explicitFeatureKey?: string | null;
  classifier?: OracleRequestPlan["classifier"];
}

const FULL_NATAL_REQUEST = /\b(?:full|fully|whole|overall|entire|complete|everything|all placements|every single|0\s*(?:to|-)\s*100|birth chart report|chart overview)\b/i;
const CONTEXT_OPT_OUT = /\b(?:(?:do not|don't|never)\s+(?:use|include|reference|access|read|draw\s+from)|without(?:\s+(?:using|including|referencing|accessing|reading))?)\b/i;
const NATAL_CONTEXT_REFERENCE = /\b(?:birth\s*chart|natal\s*chart|my\s+chart|my\s+placements?|my\s+houses?|my\s+aspects?)\b/i;
const JOURNAL_CONTEXT_REFERENCE = /\b(?:my\s+)?(?:journal|journal entries|entries)\b/i;
const COSMIC_WEATHER_REFERENCE = /\b(?:transits?|current sky|cosmic weather|planetary weather|retrograde|moon phase)\b/i;
const PERSONAL_TIMING_REFERENCE = /\b(?:my|personal)\s+(?:current\s+)?transits?\b|\b(?:transits?|current sky|cosmic weather|planetary weather|planets?)\b.{0,60}\b(?:affect|impact|influence)\s+(?:me|my)\b|\b(?:affecting|impacting|influencing)\s+(?:me|my)\b|\b(?:for me|in my (?:birth\s+|natal\s+)?chart)\b|\bwhat\s+should\s+i\s+(?:do|focus|expect|watch|look)\b/i;
const NATAL_ENTITY_ALIASES: Array<{ id: string; label: string; aliases: string[] }> = [
  { id: "ascendant", label: "Ascendant", aliases: ["ascendant", "rising"] },
  { id: "sun", label: "Sun", aliases: ["sun"] },
  { id: "moon", label: "Moon", aliases: ["moon"] },
  { id: "mercury", label: "Mercury", aliases: ["mercury"] },
  { id: "venus", label: "Venus", aliases: ["venus"] },
  { id: "mars", label: "Mars", aliases: ["mars"] },
  { id: "jupiter", label: "Jupiter", aliases: ["jupiter"] },
  { id: "saturn", label: "Saturn", aliases: ["saturn"] },
  { id: "uranus", label: "Uranus", aliases: ["uranus"] },
  { id: "neptune", label: "Neptune", aliases: ["neptune"] },
  { id: "pluto", label: "Pluto", aliases: ["pluto"] },
  { id: "north_node", label: "North Node", aliases: ["north node"] },
  { id: "south_node", label: "South Node", aliases: ["south node"] },
  { id: "part_of_fortune", label: "Part of Fortune", aliases: ["part of fortune", "fortune"] },
  { id: "chiron", label: "Chiron", aliases: ["chiron"] },
];

function natalCoverageContract(question: string, availableNatalEntities?: string[]) {
  const full = FULL_NATAL_REQUEST.test(question);
  const available = new Set(availableNatalEntities ?? []);
  const selected = full
    ? NATAL_ENTITY_ALIASES.filter((entity) => !availableNatalEntities || available.has(entity.id))
    : NATAL_ENTITY_ALIASES.filter((entity) => entity.aliases.some((alias) => new RegExp(`\\b${alias.replace(/ /g, "\\s+")}\\b`, "i").test(question)));
  return { requiresFullNatalCoverage: full, requiredNatalEntities: selected.map((entity) => entity.label) };
}

const unique = <T,>(items: T[]) => [...new Set(items)];

/**
 * A self-contained sky/weather question belongs in generic chat even when a
 * session previously used the birth-chart feature. Personal transit evidence
 * is selected separately by the request plan when the wording asks for it.
 */
export function isCosmicWeatherRequest(question: string): boolean {
  return COSMIC_WEATHER_REFERENCE.test(question);
}

export function detectExplicitCapabilityExclusions(question: string): OracleCapabilityKey[] {
  const clauses = question.split(/[.!?;]+/);
  const excluded: OracleCapabilityKey[] = [];
  if (clauses.some((clause) => CONTEXT_OPT_OUT.test(clause) && NATAL_CONTEXT_REFERENCE.test(clause))) excluded.push("natal_chart");
  if (clauses.some((clause) => CONTEXT_OPT_OUT.test(clause) && JOURNAL_CONTEXT_REFERENCE.test(clause))) excluded.push("journal_recall");
  return excluded;
}

function withoutExplicitContextExclusionClauses(question: string): string {
  return question
    .split(/[.!?;]+/)
    .filter((clause) => !(
      CONTEXT_OPT_OUT.test(clause)
      && (NATAL_CONTEXT_REFERENCE.test(clause) || JOURNAL_CONTEXT_REFERENCE.test(clause))
    ))
    .join(". ");
}

function temporalScope(question: string): OracleTemporalScope {
  if (/\b(today|tonight|this (?:morning|afternoon|evening|day)|good day for)\b/i.test(question)) return "today";
  if (/\b(now|currently|right now|current sky|current transits?|cosmic weather|planetary weather)\b/i.test(question)) return "current";
  if (/\b(yesterday|ago|last (?:night|week|month))\b/i.test(question)) return "historical";
  const isRatingScale = /\b(?:from\s+)?0\s*(?:to|-)\s*100\b/i.test(question);
  if (!isRatingScale && /\b(?:between|from)\s+\S+\s+(?:and|to)\s+\S+|\bnext (?:week|month|\d+ days)\b/i.test(question)) return "date_range";
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
  const entities = extractOptions(withoutExplicitContextExclusionClauses(question));
  const matches: string[] = [];
  const goals: OracleGoal[] = [];
  const explicit: OracleCapabilityKey[] = [];
  const inferred: OracleCapabilityKey[] = [];
  const forbidden = detectExplicitCapabilityExclusions(question);
  const forbidsNatal = forbidden.includes("natal_chart");
  const forbidsJournal = forbidden.includes("journal_recall");
  if (entities.length || /\b(compare|versus|vs\.?|which (?:one )?should|which (?:is )?better)\b/i.test(question)) { goals.push("compare"); matches.push("comparison"); }
  if (/\b(which (?:one )?should i (?:pick|choose)|what should i (?:pick|choose|do)|recommend|best option)\b/i.test(question)) { goals.push("recommend"); matches.push("recommendation"); }
  if (/\b(journal|entries|cosmic recall)\b/i.test(question) && !forbidsJournal) { goals.push("recall"); explicit.push("journal_recall"); matches.push("journal_explicit"); }
  if (isBinauralBeatRequest(question)) { goals.push("generate_audio"); explicit.push("binaural_beats"); matches.push("binaural_explicit"); }
  if (/\b(synastry|compatible|compatibility|our charts|relationship chart)\b/i.test(question)) { goals.push("interpret"); explicit.push("synastry"); matches.push("synastry_explicit"); }
  if (/\b(birth|natal|my chart|my placements?|my houses?|my aspects?)\b/i.test(question) && !forbidsNatal) { goals.push("interpret"); explicit.push("natal_chart"); matches.push("natal_explicit"); }
  const hasExplicitCosmicWeatherRequest = isCosmicWeatherRequest(question);
  if (hasExplicitCosmicWeatherRequest) { goals.push("interpret"); explicit.push("cosmic_weather"); matches.push("sky_explicit"); }
  if (scope !== "none") { inferred.push("cosmic_weather"); matches.push(`temporal_${scope}`); }
  const requestsPersonalTiming = PERSONAL_TIMING_REFERENCE.test(question)
    || goals.includes("recommend")
    || (context.explicitFeatureKey === "birth_chart" && !hasExplicitCosmicWeatherRequest);
  if (scope !== "none" && requestsPersonalTiming) {
    if (!forbidsNatal) {
      inferred.push("personal_transits");
      matches.push(context.hasBirthData ? "temporal_personalization" : "temporal_personalization_unavailable");
    } else {
      matches.push("temporal_personalization_forbidden");
    }
  }
  if (!goals.length) goals.push("inform");
  inferred.push("general_conversation");

  if (context.explicitFeatureKey === "birth_chart" && !forbidsNatal && !hasExplicitCosmicWeatherRequest) explicit.push("natal_chart");
  if (context.explicitFeatureKey === "synastry") explicit.push("synastry");
  if (context.explicitFeatureKey === "journal_recall" && !forbidsJournal) explicit.push("journal_recall");
  if (context.explicitFeatureKey === "binaural_beats") explicit.push("binaural_beats");

  const required = expandDependencies(unique([...explicit, ...inferred])).filter((capability) => !forbidden.includes(capability));
  const unavailable: OracleRequestPlan["unavailableCapabilities"] = [];
  const natalCoverage = scope === "none" && required.includes("natal_chart") && !required.includes("synastry")
    ? natalCoverageContract(question, context.availableNatalEntities)
    : { requiresFullNatalCoverage: false, requiredNatalEntities: [] };
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
    optionalCapabilities: [], unavailableCapabilities: unavailable, forbiddenCapabilities: forbidden, unresolvedRequirements: unique(unresolved),
    deterministicRuleMatches: unique(matches), classifier: context.classifier ?? { source: "none" },
    responseContract: {
      mustCompareAllOptions: entities.length > 1 || goals.includes("compare"),
      mustRecommend: goals.includes("recommend"),
      practicalSafety: /\b(?:ride|riding|motorbike|motorcycle|diving|dive|hike|climb|drive|swim)\b/i.test(question),
      ...natalCoverage,
    },
  };
}
