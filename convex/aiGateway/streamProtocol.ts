import type {
  GatewayStreamEvent,
  StreamDecoderDiagnostics,
  StreamFrameErrorCategory,
  StreamWireProtocol,
} from "../../src/lib/oracle/streaming/types";

const DEFAULT_MAX_EVENT_CHARS = 256_000;
const DEFAULT_MAX_BUFFER_CHARS = 512_000;

type DecoderOptions = {
  protocol: StreamWireProtocol;
  maxEventChars?: number;
  maxBufferChars?: number;
  now?: () => number;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function textFromPart(value: unknown): string {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "";
  if (typeof value.text === "string") return value.text;
  if (isRecord(value.text) && typeof value.text.value === "string") {
    return value.text.value;
  }
  return "";
}

function visibleText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .filter((part) => {
      if (!isRecord(part) || typeof part.type !== "string") return true;
      return !/reasoning|thinking/i.test(part.type);
    })
    .map(textFromPart)
    .join("");
}

function privateReasoningText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map(textFromPart).join("");
}

function privateReasoningFromContent(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .filter(
      (part) => isRecord(part)
        && typeof part.type === "string"
        && /reasoning|thinking/i.test(part.type),
    )
    .map(textFromPart)
    .join("");
}

export class GatewayStreamProtocolDecoder {
  private readonly protocol: StreamWireProtocol;
  private readonly maxEventChars: number;
  private readonly maxBufferChars: number;
  private readonly now: () => number;
  private readonly utf8Decoder = new TextDecoder();
  private lineBuffer = "";
  private sseDataLines: string[] = [];
  private sseEventChars = 0;
  private droppingSseEvent = false;
  private finished = false;
  private terminal = false;
  private completionObserved = false;
  private emittedText = false;
  private readonly mutableDiagnostics: StreamDecoderDiagnostics = {
    malformedFrameCount: 0,
    droppedFrameCount: 0,
    reasoningCharCount: 0,
    errorCategories: [],
  };

  constructor(options: DecoderOptions) {
    this.protocol = options.protocol;
    this.maxEventChars = options.maxEventChars ?? DEFAULT_MAX_EVENT_CHARS;
    this.maxBufferChars = options.maxBufferChars ?? DEFAULT_MAX_BUFFER_CHARS;
    this.now = options.now ?? Date.now;
  }

  get diagnostics(): StreamDecoderDiagnostics {
    return {
      ...this.mutableDiagnostics,
      errorCategories: [...this.mutableDiagnostics.errorCategories],
    };
  }

  get terminalReceived(): boolean {
    return this.terminal;
  }

  push(chunk: Uint8Array | string): GatewayStreamEvent[] {
    if (this.finished || this.terminal) return [];
    const text =
      typeof chunk === "string"
        ? chunk
        : this.utf8Decoder.decode(chunk, { stream: true });
    return this.consumeText(text, false);
  }

  finish(): GatewayStreamEvent[] {
    if (this.finished) return [];
    this.finished = true;
    const trailing = this.utf8Decoder.decode();
    const events = this.consumeText(trailing, true);
    if (!this.terminal && this.completionObserved) {
      this.terminal = true;
      events.push({ type: "done" });
    }
    return events;
  }

  private recordError(category: StreamFrameErrorCategory): void {
    this.mutableDiagnostics.malformedFrameCount += 1;
    if (!this.mutableDiagnostics.errorCategories.includes(category)) {
      this.mutableDiagnostics.errorCategories.push(category);
    }
  }

  private consumeText(text: string, eof: boolean): GatewayStreamEvent[] {
    const events: GatewayStreamEvent[] = [];
    this.lineBuffer += text;

    while (this.lineBuffer.length > 0) {
      let boundary = -1;
      let boundaryLength = 0;
      for (let index = 0; index < this.lineBuffer.length; index += 1) {
        const character = this.lineBuffer[index];
        if (character === "\n") {
          boundary = index;
          boundaryLength = 1;
          break;
        }
        if (character === "\r") {
          if (index === this.lineBuffer.length - 1 && !eof) break;
          boundary = index;
          boundaryLength = this.lineBuffer[index + 1] === "\n" ? 2 : 1;
          break;
        }
      }

      if (boundary < 0) break;
      const line = this.lineBuffer.slice(0, boundary);
      this.lineBuffer = this.lineBuffer.slice(boundary + boundaryLength);
      events.push(...this.consumeLine(line));
      if (this.terminal) {
        this.lineBuffer = "";
        return events;
      }
    }

    if (this.lineBuffer.length > this.maxBufferChars) {
      this.recordError("buffer_too_large");
      this.mutableDiagnostics.droppedFrameCount += 1;
      this.lineBuffer = "";
      events.push({
        type: "error",
        code: "malformed_stream",
        partial: this.emittedText,
        retryable: true,
      });
    }

    if (eof && !this.terminal) {
      if (this.lineBuffer.length > 0) {
        events.push(...this.consumeLine(this.lineBuffer));
        this.lineBuffer = "";
      }
      if (this.protocol === "sse") {
        events.push(...this.dispatchSseEvent());
      }
    }
    return events;
  }

  private consumeLine(line: string): GatewayStreamEvent[] {
    if (this.protocol === "ndjson") {
      if (line.trim().length === 0) return [];
      return this.decodeProviderPayload(line.trim());
    }

    if (line === "") return this.dispatchSseEvent();
    if (line.startsWith(":")) return [];

    const colon = line.indexOf(":");
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "retry" && value && !/^\d+$/.test(value)) {
      this.recordError("invalid_retry");
      return [];
    }
    if (field !== "data" || this.droppingSseEvent) return [];

    this.sseEventChars += value.length;
    if (this.sseEventChars > this.maxEventChars) {
      this.recordError("event_too_large");
      this.mutableDiagnostics.droppedFrameCount += 1;
      this.sseDataLines = [];
      this.droppingSseEvent = true;
      return [{
        type: "error",
        code: "malformed_stream",
        partial: this.emittedText,
        retryable: true,
      }];
    }
    this.sseDataLines.push(value);
    return [];
  }

  private dispatchSseEvent(): GatewayStreamEvent[] {
    if (this.droppingSseEvent) {
      this.droppingSseEvent = false;
      this.sseEventChars = 0;
      this.sseDataLines = [];
      return [];
    }
    if (this.sseDataLines.length === 0) {
      this.sseEventChars = 0;
      return [];
    }
    const data = this.sseDataLines.join("\n");
    this.sseDataLines = [];
    this.sseEventChars = 0;
    return this.decodeProviderPayload(data);
  }

  private decodeProviderPayload(data: string): GatewayStreamEvent[] {
    if (data.trim() === "[DONE]") {
      this.terminal = true;
      return [{ type: "done" }];
    }

    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      this.recordError("invalid_json");
      this.mutableDiagnostics.droppedFrameCount += 1;
      return [];
    }
    if (!isRecord(payload)) {
      this.recordError("unsupported_payload");
      this.mutableDiagnostics.droppedFrameCount += 1;
      return [];
    }

    if (payload.error !== undefined) {
      return [{
        type: "error",
        code: "provider_error_frame",
        partial: this.emittedText,
        retryable: true,
      }];
    }

    const events: GatewayStreamEvent[] = [];
    const firstChoice = Array.isArray(payload.choices) && isRecord(payload.choices[0])
      ? payload.choices[0]
      : undefined;
    const delta = firstChoice && isRecord(firstChoice.delta)
      ? firstChoice.delta
      : undefined;
    const text = visibleText(delta?.content) || visibleText(firstChoice?.text);
    const reasoning = [
      privateReasoningText(delta?.reasoning),
      privateReasoningText(delta?.reasoning_content),
      privateReasoningText(delta?.thinking),
      privateReasoningFromContent(delta?.content),
    ].join("");

    if (reasoning.length > 0) {
      this.mutableDiagnostics.reasoningCharCount += reasoning.length;
      events.push({ type: "reasoning_delta", charCount: reasoning.length });
    }
    if (text.length > 0) {
      this.emittedText = true;
      events.push({ type: "text_delta", text, receivedAt: this.now() });
    }

    if (isRecord(payload.usage)) {
      const promptTokens = finiteNumber(payload.usage.prompt_tokens)
        ?? finiteNumber(payload.usage.input_tokens);
      const completionTokens = finiteNumber(payload.usage.completion_tokens)
        ?? finiteNumber(payload.usage.output_tokens);
      if (promptTokens !== undefined || completionTokens !== undefined) {
        events.push({ type: "usage", promptTokens, completionTokens });
      }
    }

    if (firstChoice && firstChoice.finish_reason !== undefined && firstChoice.finish_reason !== null) {
      this.completionObserved = true;
    }

    const recognized = Boolean(firstChoice) || isRecord(payload.usage);
    if (!recognized && events.length === 0) {
      this.recordError("unsupported_payload");
      this.mutableDiagnostics.droppedFrameCount += 1;
    }
    return events;
  }
}
