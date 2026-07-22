import type { GatewayErrorCode } from "../../src/lib/oracle/streaming/types";

type DeadlineOptions = {
  connectDeadlineMs: number;
  idleDeadlineMs: number;
  overallDeadlineMs: number;
  onAbort?: (code: GatewayErrorCode) => void;
};

/**
 * Owns the single AbortController used for both fetch and response-body reads.
 * It is intentionally transport-agnostic so the gateway can wire it in Phase C.
 */
export class GatewayStreamDeadlines {
  readonly controller = new AbortController();
  private readonly options: DeadlineOptions;
  private connectTimer: ReturnType<typeof setTimeout> | undefined;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private overallTimer: ReturnType<typeof setTimeout> | undefined;
  private mutableAbortCode: GatewayErrorCode | undefined;
  private disposed = false;

  constructor(options: DeadlineOptions) {
    this.options = options;
    this.connectTimer = setTimeout(
      () => this.abort("connect_timeout"),
      options.connectDeadlineMs,
    );
    this.overallTimer = setTimeout(
      () => this.abort("overall_timeout"),
      options.overallDeadlineMs,
    );
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get abortCode(): GatewayErrorCode | undefined {
    return this.mutableAbortCode;
  }

  markConnected(): void {
    if (this.disposed || this.controller.signal.aborted) return;
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = undefined;
    this.resetIdleTimer();
  }

  markActivity(): void {
    if (this.disposed || this.controller.signal.aborted || !this.idleTimer) return;
    this.resetIdleTimer();
  }

  cancel(): void {
    this.abort("cancelled");
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clearTimers();
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(
      () => this.abort("idle_timeout"),
      this.options.idleDeadlineMs,
    );
  }

  private abort(code: GatewayErrorCode): void {
    if (this.disposed || this.controller.signal.aborted) return;
    this.mutableAbortCode = code;
    this.clearTimers();
    this.controller.abort(code);
    this.options.onAbort?.(code);
  }

  private clearTimers(): void {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.overallTimer) clearTimeout(this.overallTimer);
    this.connectTimer = undefined;
    this.idleTimer = undefined;
    this.overallTimer = undefined;
  }
}

