import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayStreamDeadlines } from "./streamDeadlines";

describe("GatewayStreamDeadlines", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("aborts a connection that misses its deadline", () => {
    const deadlines = new GatewayStreamDeadlines({
      connectDeadlineMs: 100,
      idleDeadlineMs: 200,
      overallDeadlineMs: 1_000,
    });
    vi.advanceTimersByTime(100);
    expect(deadlines.signal.aborted).toBe(true);
    expect(deadlines.abortCode).toBe("connect_timeout");
  });

  it("resets idle time on valid provider activity", () => {
    const deadlines = new GatewayStreamDeadlines({
      connectDeadlineMs: 100,
      idleDeadlineMs: 200,
      overallDeadlineMs: 1_000,
    });
    deadlines.markConnected();
    vi.advanceTimersByTime(150);
    deadlines.markActivity();
    vi.advanceTimersByTime(150);
    expect(deadlines.signal.aborted).toBe(false);
    vi.advanceTimersByTime(50);
    expect(deadlines.abortCode).toBe("idle_timeout");
  });

  it("keeps the overall deadline active after headers and activity", () => {
    const deadlines = new GatewayStreamDeadlines({
      connectDeadlineMs: 100,
      idleDeadlineMs: 500,
      overallDeadlineMs: 300,
    });
    deadlines.markConnected();
    vi.advanceTimersByTime(200);
    deadlines.markActivity();
    vi.advanceTimersByTime(100);
    expect(deadlines.abortCode).toBe("overall_timeout");
  });

  it("supports explicit cancellation and cleanup without later aborts", () => {
    const onAbort = vi.fn();
    const cancelled = new GatewayStreamDeadlines({
      connectDeadlineMs: 100,
      idleDeadlineMs: 200,
      overallDeadlineMs: 1_000,
      onAbort,
    });
    cancelled.cancel();
    expect(cancelled.abortCode).toBe("cancelled");
    expect(onAbort).toHaveBeenCalledWith("cancelled");

    const disposed = new GatewayStreamDeadlines({
      connectDeadlineMs: 100,
      idleDeadlineMs: 200,
      overallDeadlineMs: 1_000,
      onAbort,
    });
    disposed.dispose();
    vi.runAllTimers();
    expect(disposed.signal.aborted).toBe(false);
    expect(onAbort).toHaveBeenCalledTimes(1);
  });
});
