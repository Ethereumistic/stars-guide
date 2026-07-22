import { describe, expect, it } from "vitest";
import { GatewayStreamProtocolDecoder } from "./streamProtocol";
import type { GatewayStreamEvent } from "../../src/lib/oracle/streaming/types";

const encoder = new TextEncoder();

function decodeBytes(
  source: string,
  splitPoints: number[],
  protocol: "sse" | "ndjson" = "sse",
) {
  const bytes = encoder.encode(source);
  const decoder = new GatewayStreamProtocolDecoder({
    protocol,
    now: () => 123,
  });
  const events: GatewayStreamEvent[] = [];
  let start = 0;
  for (const end of [...splitPoints, bytes.length]) {
    events.push(...decoder.push(bytes.slice(start, end)));
    start = end;
  }
  events.push(...decoder.finish());
  return { events, diagnostics: decoder.diagnostics, terminal: decoder.terminalReceived };
}

function textFrom(events: GatewayStreamEvent[]) {
  return events
    .filter((event): event is Extract<GatewayStreamEvent, { type: "text_delta" }> => event.type === "text_delta")
    .map((event) => event.text)
    .join("");
}

describe("GatewayStreamProtocolDecoder", () => {
  it("decodes identical SSE output across every byte boundary", () => {
    const source = [
      ": heartbeat\r\n",
      "event: message\r\n",
      "id: 7\r\n",
      "data:{\"choices\":\r\n",
      "data: [{\"delta\":{\"content\":\"Moon вњЁ\"}}]}\r\n\r\n",
      "data: [DONE]",
    ].join("");
    const byteLength = encoder.encode(source).length;

    for (let split = 1; split < byteLength; split += 1) {
      const result = decodeBytes(source, [split]);
      expect(textFrom(result.events), `split at byte ${split}`).toBe("Moon вњЁ");
      expect(result.events[result.events.length - 1], `split at byte ${split}`).toEqual({ type: "done" });
      expect(result.diagnostics.malformedFrameCount, `split at byte ${split}`).toBe(0);
      expect(result.terminal, `split at byte ${split}`).toBe(true);
    }
  });

  it("flushes a final buffered SSE event at EOF", () => {
    const result = decodeBytes(
      'data: {"choices":[{"delta":{"content":"final"}}]}',
      [],
    );
    expect(textFrom(result.events)).toBe("final");
    expect(result.terminal).toBe(false);
  });

  it("extracts typed text, private reasoning counts, and usage", () => {
    const source = [
      'data: {"choices":[{"delta":{"reasoning_content":"secret","content":[{"type":"text","text":"Visible"},{"type":"reasoning","text":"hidden"}]}}]}\n\n',
      'data: {"choices":[],"usage":{"input_tokens":11,"output_tokens":7}}\n\n',
      "data: [DONE]\n\n",
    ].join("");
    const result = decodeBytes(source, []);
    expect(textFrom(result.events)).toBe("Visible");
    expect(result.events).toContainEqual({ type: "reasoning_delta", charCount: 12 });
    expect(result.events).toContainEqual({
      type: "usage",
      promptTokens: 11,
      completionTokens: 7,
    });
    expect(result.diagnostics.reasoningCharCount).toBe(12);
    expect(textFrom(result.events)).not.toContain("secret");
    expect(textFrom(result.events)).not.toContain("hidden");
  });

  it("records malformed frames and continues with later valid events", () => {
    const source = [
      "retry: tomorrow\n",
      "data: {broken}\n\n",
      'data: {"choices":[{"text":"recovered"}]}\n\n',
      "data: [DONE]\n\n",
    ].join("");
    const result = decodeBytes(source, []);
    expect(textFrom(result.events)).toBe("recovered");
    expect(result.diagnostics.malformedFrameCount).toBe(2);
    expect(result.diagnostics.errorCategories).toEqual([
      "invalid_retry",
      "invalid_json",
    ]);
  });

  it("emits a typed provider error without exposing its payload", () => {
    const result = decodeBytes(
      'data: {"error":{"message":"sensitive provider detail"}}\n\n',
      [],
    );
    expect(result.events).toEqual([{
      type: "error",
      code: "provider_error_frame",
      partial: false,
      retryable: true,
    }]);
  });

  it("uses an explicit NDJSON decoder and flushes its final line", () => {
    const source = [
      '{"choices":[{"delta":{"content":"A"}}]}\r\n',
      '{"choices":[{"delta":{"content":"B"}}]}',
    ].join("");
    const result = decodeBytes(source, [1, 7, 19], "ndjson");
    expect(textFrom(result.events)).toBe("AB");
    expect(result.diagnostics.malformedFrameCount).toBe(0);
  });

  it("bounds oversized events and unframed buffers", () => {
    const eventDecoder = new GatewayStreamProtocolDecoder({
      protocol: "sse",
      maxEventChars: 8,
    });
    const eventResult = eventDecoder.push("data: 123456789\n\n");
    expect(eventResult).toContainEqual(expect.objectContaining({
      type: "error",
      code: "malformed_stream",
    }));
    expect(eventDecoder.diagnostics.errorCategories).toContain("event_too_large");

    const bufferDecoder = new GatewayStreamProtocolDecoder({
      protocol: "sse",
      maxBufferChars: 8,
    });
    const bufferResult = bufferDecoder.push("123456789");
    expect(bufferResult).toContainEqual(expect.objectContaining({
      type: "error",
      code: "malformed_stream",
    }));
    expect(bufferDecoder.diagnostics.errorCategories).toContain("buffer_too_large");
  });
});
