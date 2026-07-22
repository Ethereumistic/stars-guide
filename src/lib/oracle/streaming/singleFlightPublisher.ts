export type SnapshotWithContent = { content: string };

export type SequencedSnapshot<T extends SnapshotWithContent> = T & {
  sequence: number;
};

type TimerHandle = ReturnType<typeof setTimeout>;

export type SingleFlightPublisherOptions<T extends SnapshotWithContent> = {
  persist: (snapshot: SequencedSnapshot<T>) => Promise<void>;
  minIntervalMs?: number;
  minNewChars?: number;
  maxLatencyMs?: number;
  maxRetries?: number;
  retryBaseMs?: number;
  initialSequence?: number;
  initialPersistedChars?: number;
  now?: () => number;
  setTimer?: (callback: () => void, delayMs: number) => TimerHandle;
  clearTimer?: (handle: TimerHandle) => void;
  sleep?: (delayMs: number) => Promise<void>;
};

/**
 * Coalesces growing snapshots behind one in-flight persistence operation.
 * Retries keep the same sequence; newer snapshots replace queued stale ones.
 */
export class SingleFlightSnapshotPublisher<T extends SnapshotWithContent> {
  private readonly options: Required<Omit<SingleFlightPublisherOptions<T>, "persist">> & {
    persist: SingleFlightPublisherOptions<T>["persist"];
  };
  private latest: T | undefined;
  private inFlight: Promise<void> | undefined;
  private timer: TimerHandle | undefined;
  private pendingSince: number | undefined;
  private lastWriteAt = Number.NEGATIVE_INFINITY;
  private persistedChars: number;
  private nextSequence: number;
  private terminalError: unknown;
  private mutableWriteCount = 0;
  private mutableMaxQueuedChars = 0;

  constructor(options: SingleFlightPublisherOptions<T>) {
    this.options = {
      persist: options.persist,
      minIntervalMs: options.minIntervalMs ?? 200,
      minNewChars: options.minNewChars ?? 128,
      maxLatencyMs: options.maxLatencyMs ?? 750,
      maxRetries: options.maxRetries ?? 2,
      retryBaseMs: options.retryBaseMs ?? 50,
      initialSequence: options.initialSequence ?? 0,
      initialPersistedChars: options.initialPersistedChars ?? 0,
      now: options.now ?? Date.now,
      setTimer: options.setTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs)),
      clearTimer: options.clearTimer ?? clearTimeout,
      sleep: options.sleep ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs))),
    };
    this.nextSequence = this.options.initialSequence + 1;
    this.persistedChars = this.options.initialPersistedChars;
  }

  get writeCount(): number {
    return this.mutableWriteCount;
  }

  get maxQueuedChars(): number {
    return this.mutableMaxQueuedChars;
  }

  enqueue(snapshot: T): void {
    if (this.terminalError) return;
    this.latest = snapshot;
    this.pendingSince ??= this.options.now();
    this.mutableMaxQueuedChars = Math.max(
      this.mutableMaxQueuedChars,
      Math.max(0, snapshot.content.length - this.persistedChars),
    );
    this.schedule();
  }

  async flushFinal(snapshot?: T): Promise<void> {
    if (snapshot) this.enqueue(snapshot);
    this.clearScheduledTimer();
    while (this.inFlight || this.latest) {
      if (this.terminalError) throw this.terminalError;
      if (!this.inFlight) this.startWrite();
      await this.inFlight;
    }
    if (this.terminalError) throw this.terminalError;
  }

  private schedule(): void {
    if (this.inFlight || !this.latest || this.timer) return;
    const now = this.options.now();
    const newChars = Math.max(0, this.latest.content.length - this.persistedChars);
    const intervalRemaining = Math.max(0, this.options.minIntervalMs - (now - this.lastWriteAt));
    if (newChars >= this.options.minNewChars && intervalRemaining === 0) {
      this.startWrite();
      return;
    }
    const latencyRemaining = Math.max(
      0,
      this.options.maxLatencyMs - (now - (this.pendingSince ?? now)),
    );
    const delay = intervalRemaining > 0
      ? Math.min(latencyRemaining, intervalRemaining)
      : latencyRemaining;
    this.timer = this.options.setTimer(() => {
      this.timer = undefined;
      this.startWrite();
    }, delay || latencyRemaining || 1);
  }

  private startWrite(): void {
    if (this.inFlight || !this.latest || this.terminalError) return;
    this.clearScheduledTimer();
    const snapshot = this.latest;
    this.latest = undefined;
    this.pendingSince = undefined;
    const sequence = this.nextSequence++;
    this.inFlight = this.persistWithRetry({ ...snapshot, sequence })
      .then(() => {
        this.mutableWriteCount += 1;
        this.persistedChars = snapshot.content.length;
        this.lastWriteAt = this.options.now();
      })
      .catch((error) => {
        this.terminalError = error;
      })
      .finally(() => {
        this.inFlight = undefined;
        if (this.latest && !this.terminalError) this.schedule();
      });
  }

  private async persistWithRetry(snapshot: SequencedSnapshot<T>): Promise<void> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt += 1) {
      try {
        await this.options.persist(snapshot);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < this.options.maxRetries) {
          await this.options.sleep(this.options.retryBaseMs * (2 ** attempt));
        }
      }
    }
    throw lastError;
  }

  private clearScheduledTimer(): void {
    if (!this.timer) return;
    this.options.clearTimer(this.timer);
    this.timer = undefined;
  }
}
