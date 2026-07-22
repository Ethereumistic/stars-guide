// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GatewayStreamEvent } from "../../src/lib/oracle/streaming/types";
import { streamAIGateway } from "./streaming";

const encoder = new TextEncoder();

function responseFrom(chunks: string[], contentType = "text/event-stream") {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }), { status: 200, headers: { "content-type": contentType } });
}

function fakeContext(providerCount: number) {
  const providers = Array.from({ length: providerCount }, (_, index) => ({
    providerId: `provider-${index + 1}`,
    name: `Provider ${index + 1}`,
    type: "ollama",
    baseUrl: "http://provider.invalid",
    apiKeyEnvVar: "UNUSED_FOR_OLLAMA",
  }));
  const queryResults: unknown[] = [
    {
      enabled: true,
      mode: "stream",
      chainJson: "[]",
      temperature: 0.5,
      maxTokens: 1_000,
      timeoutMs: 10_000,
      thinkingMode: "disabled",
    },
    providers,
    [],
  ];
  return {
    runQuery: vi.fn(async () => queryResults.shift()),
    runMutation: vi.fn(async () => null),
  };
}

function route(providerCount: number) {
  return {
    chain: Array.from({ length: providerCount }, (_, index) => ({
      providerId: `provider-${index + 1}`,
      model: `model-${index + 1}`,
    })),
    reasoningEffort: "disabled" as const,
    effectiveUserTier: "free",
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("streamAIGateway Phase C transport", () => {
  it("uses the tolerant decoder and emits typed non-blocking events", async () => {
    const fetchMock = vi.fn(async () => responseFrom([
      ": heartbeat\r\n",
      'data:{"choices":[{"delta":{"reasoning":"private","content":"Visible "}}]}\r\n\r\n',
      'data: {"choices":[],"usage":{"prompt_tokens":10,"completion_tokens":4}}\r\n\r\n',
      "data: [DONE]",
    ]));
    vi.stubGlobal("fetch", fetchMock);
    const events: GatewayStreamEvent[] = [];
    const connectedAt: number[] = [];
    const result = await streamAIGateway(fakeContext(1), {
      feature: "oracle_chat",
      messages: [{ role: "user", content: "hello" }],
      route: route(1),
      callbacks: {
        onEvent: (event) => events.push(event),
        onConnected: (metadata) => { connectedAt.push(metadata.connectedAt); },
      },
    });

    expect(result).toMatchObject({
      content: "Visible ",
      partial: false,
      promptTokens: 10,
      completionTokens: 4,
    });
    expect(result.diagnostics.reasoningCharCount).toBe(7);
    expect(events.some((event) => event.type === "reasoning_delta")).toBe(true);
    expect(result.content).not.toContain("private");
    expect(connectedAt).toHaveLength(1);
    expect(result.providerConnectedTime).toBe(connectedAt[0]);
  });

  it("falls back after raw partial data only when nothing was approved", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(responseFrom([
        'data: {"choices":[{"delta":{"content":"unpublished candidate"}}]}\n\n',
      ]))
      .mockResolvedValueOnce(responseFrom([
        'data: {"choices":[{"delta":{"content":"approved replacement"}}]}\n\n',
        "data: [DONE]\n\n",
      ]));
    vi.stubGlobal("fetch", fetchMock);
    const attempts: string[] = [];
    const result = await streamAIGateway(fakeContext(2), {
      feature: "oracle_chat",
      messages: [{ role: "user", content: "hello" }],
      route: route(2),
      callbacks: {
        onEvent: (event) => {
          if (event.type === "attempt_started") attempts.push(event.providerId);
        },
        canFallbackAfterError: () => true,
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(attempts).toEqual(["provider-1", "provider-2"]);
    expect(result).toMatchObject({ content: "approved replacement", partial: false });
  });

  it("returns a typed incomplete result instead of silently switching after publication", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(responseFrom([
        'data: {"choices":[{"delta":{"content":"already visible"}}]}\n\n',
      ]))
      .mockResolvedValueOnce(responseFrom([
        'data: {"choices":[{"delta":{"content":"must not run"}}]}\n\n',
        "data: [DONE]\n\n",
      ]));
    vi.stubGlobal("fetch", fetchMock);
    const result = await streamAIGateway(fakeContext(2), {
      feature: "oracle_chat",
      messages: [{ role: "user", content: "hello" }],
      route: route(2),
      callbacks: { canFallbackAfterError: () => false },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      content: "already visible",
      partial: true,
      errorCode: "partial_stream",
    });
  });

  it("classifies HTTP failures without logging provider response bodies", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("private upstream body", { status: 429 })));
    const errors: Array<{ code: string; message: string }> = [];
    await expect(streamAIGateway(fakeContext(1), {
      feature: "oracle_chat",
      messages: [{ role: "user", content: "hello" }],
      route: route(1),
      callbacks: {
        onError: (error) => { errors.push({ code: error.code, message: error.message }); },
      },
    })).rejects.toThrow("Provider rate limited the request");
    expect(errors).toEqual([{ code: "http_429", message: "Provider rate limited the request" }]);
    expect(JSON.stringify(errors)).not.toContain("private upstream body");
  });
});
