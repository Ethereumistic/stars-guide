import { describe, expect, it } from "vitest";
import {
  assertOracleTurnTransition,
  canTransitionOracleTurn,
} from "./publicationState";

describe("Oracle turn lifecycle", () => {
  it("accepts the documented happy path and cancellation path", () => {
    expect(canTransitionOracleTurn("queued", "planning")).toBe(true);
    expect(canTransitionOracleTurn("planning", "connecting")).toBe(true);
    expect(canTransitionOracleTurn("connecting", "generating")).toBe(true);
    expect(canTransitionOracleTurn("generating", "validating")).toBe(true);
    expect(canTransitionOracleTurn("validating", "complete")).toBe(true);
    expect(canTransitionOracleTurn("generating", "cancel_requested")).toBe(true);
    expect(canTransitionOracleTurn("cancel_requested", "cancelled")).toBe(true);
  });

  it("rejects terminal exits and skipped states", () => {
    expect(canTransitionOracleTurn("complete", "generating")).toBe(false);
    expect(canTransitionOracleTurn("queued", "complete")).toBe(false);
    expect(() => assertOracleTurnTransition("failed", "retrying")).toThrow(
      "Illegal Oracle turn transition: failed -> retrying",
    );
  });
});
