import { describe, expect, it } from "vitest";
import {
  oracleStreamingRolloutBucket,
  resolveOracleStreamingRollout,
} from "./rollout";

describe("Oracle Streaming V2 rollout", () => {
  it("buckets a user deterministically", () => {
    const first = oracleStreamingRolloutBucket("user-123");
    expect(oracleStreamingRolloutBucket("user-123")).toBe(first);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(100);
  });

  it("fails closed to buffered publication when settings are missing", () => {
    expect(resolveOracleStreamingRollout("user-123", {})).toMatchObject({
      mode: "buffered",
      enabled: false,
      rolloutPercent: 0,
      shadowPercent: 0,
    });
  });

  it("supports one-setting rollback to buffered publication", () => {
    expect(resolveOracleStreamingRollout("user-123", {
      oracle_streaming_v2_enabled: "false",
      oracle_streaming_v2_rollout_percent: "100",
    }).mode).toBe("buffered");
  });

  it("assigns non-live cohorts to shadow before buffered mode", () => {
    const userId = Array.from({ length: 1_000 }, (_, index) => `user-${index}`)
      .find((candidate) => {
        const bucket = oracleStreamingRolloutBucket(candidate);
        return bucket >= 10 && bucket < 25;
      });
    expect(userId).toBeDefined();
    expect(resolveOracleStreamingRollout(userId!, {
      oracle_streaming_v2_enabled: "true",
      oracle_streaming_v2_rollout_percent: "10",
      oracle_streaming_v2_shadow_percent: "15",
    }).mode).toBe("shadow");
  });
});
