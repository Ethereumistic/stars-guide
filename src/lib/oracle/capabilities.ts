export const ORACLE_CAPABILITIES = [
  "cosmic_weather", "natal_chart", "personal_transits", "synastry",
  "journal_recall", "binaural_beats", "general_conversation",
] as const;

export type OracleCapabilityKey = (typeof ORACLE_CAPABILITIES)[number];
export type OracleGoal = "inform" | "interpret" | "compare" | "recommend" | "reflect" | "generate_audio" | "recall";
export type OracleTemporalScope = "current" | "today" | "date_range" | "historical" | "none";

export interface OracleCapabilityManifest {
  key: OracleCapabilityKey;
  version: string;
  dependencies: OracleCapabilityKey[];
  requiresBirthData?: boolean;
  requiresJournalConsent?: boolean;
  requiresSynastryPayload?: boolean;
  modelHint: "fast" | "smart" | "creative";
  failureBehavior: "continue_without" | "request_prerequisite" | "block";
}

export const ORACLE_CAPABILITY_REGISTRY: Record<OracleCapabilityKey, OracleCapabilityManifest> = {
  cosmic_weather: { key: "cosmic_weather", version: "1", dependencies: [], modelHint: "fast", failureBehavior: "continue_without" },
  natal_chart: { key: "natal_chart", version: "1", dependencies: [], requiresBirthData: true, modelHint: "smart", failureBehavior: "continue_without" },
  personal_transits: { key: "personal_transits", version: "1", dependencies: ["cosmic_weather", "natal_chart"], requiresBirthData: true, modelHint: "smart", failureBehavior: "continue_without" },
  synastry: { key: "synastry", version: "1", dependencies: ["natal_chart"], requiresBirthData: true, requiresSynastryPayload: true, modelHint: "smart", failureBehavior: "request_prerequisite" },
  journal_recall: { key: "journal_recall", version: "1", dependencies: [], requiresJournalConsent: true, modelHint: "smart", failureBehavior: "request_prerequisite" },
  binaural_beats: { key: "binaural_beats", version: "1", dependencies: [], modelHint: "creative", failureBehavior: "continue_without" },
  general_conversation: { key: "general_conversation", version: "1", dependencies: [], modelHint: "fast", failureBehavior: "continue_without" },
};

export interface OracleRequestPlan {
  version: "oracle-planner-v1";
  goals: OracleGoal[];
  temporalScope: OracleTemporalScope;
  entities: string[];
  explicitCapabilities: OracleCapabilityKey[];
  inferredCapabilities: OracleCapabilityKey[];
  requiredCapabilities: OracleCapabilityKey[];
  optionalCapabilities: OracleCapabilityKey[];
  unavailableCapabilities: Array<{ capability: OracleCapabilityKey; reason: string }>;
  forbiddenCapabilities: OracleCapabilityKey[];
  unresolvedRequirements: string[];
  deterministicRuleMatches: string[];
  classifier?: { source: "gateway" | "regex" | "none"; raw?: unknown; confidence?: number; fallbackReason?: string };
  responseContract: { mustCompareAllOptions: boolean; mustRecommend: boolean; practicalSafety: boolean };
}

export interface EvidenceProvenance { source: string; version: string; calculatedAt: string; timezone?: string }
export interface OracleEvidenceItem { capability: OracleCapabilityKey; label: string; content: string; provenance: EvidenceProvenance }
export interface OracleEvidenceBundle { requestedAt: string; timezone: string; items: OracleEvidenceItem[]; warnings: string[] }

export interface OracleResponseViolation { code: string; message: string; severity: "error" | "warning" }

export interface OracleTurnTrace {
  version: "oracle-trace-v1";
  requestPlan: OracleRequestPlan;
  evidenceManifest: Array<{ capability: OracleCapabilityKey; label: string; source: string; version: string; size: number }>;
  promptManifest: Array<{ label: string; version: string; priority: number; hash: string }>;
  providerAttempts: Array<{ provider?: string; model?: string; tier?: string; durationMs?: number; outcome: string }>;
  violations: OracleResponseViolation[];
  repaired: boolean;
  createdAt: number;
}
