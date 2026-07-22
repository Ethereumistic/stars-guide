export type SemanticBatcherOptions = {
  minSentenceChars?: number;
  maxPendingChars?: number;
};

const COMPLETE_LIST_OR_HEADING = /^(?:#{1,6}\s|[-*+]\s|\d+\.\s).+\n/gm;
const SENTENCE_BOUNDARY = /[.!?](?:["')\]]*)\s+/g;

/** Accumulates private deltas and exposes only stable semantic boundaries. */
export class SemanticBatchAccumulator {
  private readonly minSentenceChars: number;
  private readonly maxPendingChars: number;
  private pending = "";

  constructor(options: SemanticBatcherOptions = {}) {
    this.minSentenceChars = options.minSentenceChars ?? 96;
    this.maxPendingChars = options.maxPendingChars ?? 2_048;
  }

  get pendingChars(): number {
    return this.pending.length;
  }

  reset(): void {
    this.pending = "";
  }

  push(delta: string): string[] {
    if (delta) this.pending += delta;
    return this.takeReady(false);
  }

  finish(): string[] {
    return this.takeReady(true);
  }

  private takeReady(force: boolean): string[] {
    const batches: string[] = [];
    while (this.pending.length > 0) {
      const boundary = this.findBoundary(force);
      if (boundary <= 0) break;
      batches.push(this.pending.slice(0, boundary));
      this.pending = this.pending.slice(boundary);
      force = force && this.pending.length > 0;
    }
    return batches;
  }

  private findBoundary(force: boolean): number {
    const paragraph = this.pending.lastIndexOf("\n\n");
    if (paragraph >= 0) return paragraph + 2;

    let structured = 0;
    for (const match of this.pending.matchAll(COMPLETE_LIST_OR_HEADING)) {
      structured = Math.max(structured, (match.index ?? 0) + match[0].length);
    }
    if (structured > 0) return structured;

    let sentence = 0;
    for (const match of this.pending.matchAll(SENTENCE_BOUNDARY)) {
      const end = (match.index ?? 0) + match[0].length;
      if (end >= this.minSentenceChars) sentence = end;
    }
    if (sentence > 0) return sentence;

    if (this.pending.length >= this.maxPendingChars) {
      const whitespace = this.pending.lastIndexOf(" ", this.maxPendingChars);
      return whitespace >= Math.floor(this.maxPendingChars * 0.75)
        ? whitespace + 1
        : this.maxPendingChars;
    }
    return force ? this.pending.length : 0;
  }
}

