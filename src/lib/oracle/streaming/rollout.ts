export const ORACLE_STREAMING_V2_ENABLED_KEY = "oracle_streaming_v2_enabled";
export const ORACLE_STREAMING_V2_ROLLOUT_PERCENT_KEY = "oracle_streaming_v2_rollout_percent";
export const ORACLE_STREAMING_V2_SHADOW_PERCENT_KEY = "oracle_streaming_v2_shadow_percent";

export type OracleStreamingRolloutMode = "v2" | "shadow" | "buffered";

export type OracleStreamingRollout = {
  mode: OracleStreamingRolloutMode;
  bucket: number;
  enabled: boolean;
  rolloutPercent: number;
  shadowPercent: number;
};

function clampPercent(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, Math.floor(parsed)));
}

/** Stable FNV-1a bucket so the same user remains in the same rollout cohort. */
export function oracleStreamingRolloutBucket(userId: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < userId.length; index += 1) {
    hash ^= userId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 100;
}

export function resolveOracleStreamingRollout(
  userId: string,
  settings: Record<string, string | undefined>,
): OracleStreamingRollout {
  // Missing or malformed rollout configuration must never expose every user to
  // progressive publication. Operators explicitly enable and advance cohorts.
  const enabled = settings[ORACLE_STREAMING_V2_ENABLED_KEY] === "true";
  const rolloutPercent = clampPercent(
    settings[ORACLE_STREAMING_V2_ROLLOUT_PERCENT_KEY],
    0,
  );
  const shadowPercent = clampPercent(
    settings[ORACLE_STREAMING_V2_SHADOW_PERCENT_KEY],
    0,
  );
  const bucket = oracleStreamingRolloutBucket(userId);
  const mode: OracleStreamingRolloutMode = !enabled
    ? "buffered"
    : bucket < rolloutPercent
      ? "v2"
      : bucket < Math.min(100, rolloutPercent + shadowPercent)
        ? "shadow"
        : "buffered";
  return { mode, bucket, enabled, rolloutPercent, shadowPercent };
}
