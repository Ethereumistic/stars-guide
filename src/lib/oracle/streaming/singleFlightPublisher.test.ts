import { afterEach, describe, expect, it, vi } from "vitest";
import { SingleFlightSnapshotPublisher } from "./singleFlightPublisher";

afterEach(() => vi.useRealTimers());

describe("SingleFlightSnapshotPublisher", () => {
  it("keeps one write in flight and coalesces queued snapshots", async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    let concurrent = 0;
    let maxConcurrent = 0;
    const calls: Array<{ sequence: number; content: string }> = [];
    const publisher = new SingleFlightSnapshotPublisher({
      persist: async (snapshot) => {
        concurrent += 1;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        calls.push({ sequence: snapshot.sequence, content: snapshot.content });
        if (calls.length === 1) await firstGate;
        concurrent -= 1;
      },
    });

    publisher.enqueue({ content: "a".repeat(128) });
    publisher.enqueue({ content: "b".repeat(256) });
    publisher.enqueue({ content: "c".repeat(300) });
    expect(calls).toHaveLength(1);
    releaseFirst();
    await publisher.flushFinal();

    expect(maxConcurrent).toBe(1);
    expect(calls.map((call) => call.sequence)).toEqual([1, 2]);
    expect(calls[1].content).toBe("c".repeat(300));
    expect(publisher.writeCount).toBe(2);
    expect(publisher.maxQueuedChars).toBe(300);
  });

  it("flushes a small snapshot at the maximum latency", async () => {
    vi.useFakeTimers();
    const persist = vi.fn(async () => undefined);
    const publisher = new SingleFlightSnapshotPublisher({ persist });
    publisher.enqueue({ content: "short" });
    await vi.advanceTimersByTimeAsync(749);
    expect(persist).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(persist).toHaveBeenCalledOnce();
    await publisher.flushFinal();
  });

  it("retries with one stable sequence and fails safely after the bound", async () => {
    const sequences: number[] = [];
    let attempt = 0;
    const recovered = new SingleFlightSnapshotPublisher({
      persist: async (snapshot) => {
        sequences.push(snapshot.sequence);
        attempt += 1;
        if (attempt === 1) throw new Error("temporary");
      },
      sleep: async () => undefined,
    });
    await recovered.flushFinal({ content: "final" });
    expect(sequences).toEqual([1, 1]);

    const failed = new SingleFlightSnapshotPublisher({
      persist: async () => { throw new Error("durable failure"); },
      maxRetries: 1,
      sleep: async () => undefined,
    });
    await expect(failed.flushFinal({ content: "not lost" })).rejects.toThrow("durable failure");
  });

  it("continues sequence numbers across a resumed publisher", async () => {
    const sequences: number[] = [];
    const publisher = new SingleFlightSnapshotPublisher({
      persist: async (snapshot) => { sequences.push(snapshot.sequence); },
      initialSequence: 7,
      initialPersistedChars: 40,
    });
    await publisher.flushFinal({ content: "x".repeat(60) });
    expect(sequences).toEqual([8]);
    expect(publisher.maxQueuedChars).toBe(20);
  });
});
