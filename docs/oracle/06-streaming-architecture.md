# Oracle AI System — Streaming Architecture

> Source: ORACLE_EXPLAINED.md §6

The Oracle streams tokens in real-time from the LLM through Convex into the React UI.

---

## Non-streaming Path (stream_enabled = false)

`convex/oracle/llm.ts`:
1. Parse complete JSON response
2. Extract `content` from `choices[0].message.content`
3. Parse title from content (`parseTitleFromResponse`)
4. Create streaming message placeholder via `createStreamingMessage`
5. Immediately finalize with `finalizeStreamingMessage`
6. Return

---

## Streaming Path (stream_enabled = true, default)

`convex/oracle/llm.ts`:

1. **Create message placeholder**: `createStreamingMessage` inserts an empty `oracle_messages` row (role=assistant, content="")
2. **Read SSE stream**: Uses `response.body.getReader()` + `TextDecoder` to read Server-Sent Events
3. **Parse chunks**: Each `data: {json}` line is parsed; `choices[0].delta.content` tokens are appended to `fullContent`
4. **Periodic flush**: Every 100ms (first 2s) then 300ms, the accumulated content is written to Convex via `updateStreamingContent` — this triggers Convex reactivity which updates the UI
5. **Track usage**: If `parsed.usage` exists, `promptTokens` and `completionTokens` are captured
6. **On stream complete**: Parse title from full response, strip title line, write final cleaned content via `updateStreamingContent`, then call `finalizeStreamingMessage` with metadata (model, tokens, tier)
7. **Error handling**: If stream errors mid-way with partial content, the partial content is kept. If stream errors with zero content, a recovery message is inserted.

---

## Convex Internal Mutations for Streaming

These are `internalMutation` (not publicly callable):
- `createStreamingMessage` (`sessions.ts`): Creates empty assistant message, increments session messageCount
- `updateStreamingContent` (`sessions.ts`): Patches message content in-place (called every 100-300ms during streaming)
- `finalizeStreamingMessage` (`sessions.ts`): Sets final content, modelUsed, tokens, tier, timing metrics, debug model override; updates session metadata (primaryModelUsed, usedFallback, status)
- `patchMessageTiming` (`sessions.ts`): Patches timing metrics (`timingPromptBuildMs`, `timingRequestQueueMs`, `timingTtftMs`, `timingInitialDecodeMs`, `timingTotalMs`) and `debugModelUsed` onto an existing message document; called by `invokeOracle` after a successful LLM call to persist observability data for the Admin Debug Panel (see [Debug Panel](./19-debug-panel.md))

---

## Client-Side Streaming Behavior

On the chat page (`src/app/oracle/chat/[sessionId]/page.tsx`):
1. Client calls `invokeOracle` action (Convex useAction)
2. Client sets `isStreaming = true`
3. Convex reactive query `getSessionWithMessages` automatically updates as `updateStreamingContent` writes partial content
4. The chat UI renders messages from this reactive query, showing the growing content with a blinking cursor
5. When the action resolves, client sets `isStreaming = false`

---

## Timing Instrumentation

Since v2 (Debug Panel), the streaming path and the non-streaming path both capture detailed timing metrics:

- `fetchStartTime` — `Date.now()` immediately before the `fetch()` call to the LLM
- `firstTokenTime` — `Date.now()` when the first `delta.content` token is parsed from the SSE stream (for streaming) or when the JSON response is received (for non-streaming)
- `initialDecodeTime` — `Date.now()` when `fullContent.length >= 200` (measures initial generation speed); falls back to `Date.now()` at stream end for short responses
- `messageId` — the ID of the streaming message placeholder, returned so `invokeOracle` can patch timing data onto it

These low-level timestamps are combined with higher-level `invokeOracle` timestamps (`actionStartTime`, `promptBuildEndTime`, `totalEndTime`) to produce the `TimingMetrics` structure persisted on each message (see [Debug Panel](./19-debug-panel.md)).

---

## Wiring — Data Flow During Streaming

```
LLM Provider (SSE stream)
       │
       │ data: {"choices":[{"delta":{"content":"token"}}]}
       │
       ▼
callProviderStreaming() [convex/oracle/llm.ts]
       │
       ├── Every 100-300ms:
       │     updateStreamingContent (internalMutation)
       │         └──▶ Patches oracle_messages.content in-place
       │
       ├── On stream complete:
       │     finalizeStreamingMessage (internalMutation)
       │         └──▶ Sets final content, model, tokens, tier, hash, timing
       │
       └── Returns: content, modelUsed, fallbackTier, messageId, timing
              │
              ▼
       invokeOracle patches timing via patchMessageTiming
              │
              ▼
       Convex Reactivity ──────────▶ UI auto-updates via useQuery(getSessionWithMessages)
                                     showing growing text + blinking cursor

       Client also captures:
       - requestStartMs (before invokeOracle)
       - firstContentMs (when assistant message first has content)
       - completeMs (when invokeOracle resolves)
              │
              ▼
       Zustand store (debugLastMetrics, debugClientTiming)
              │
              ▼
       Debug Panel reads from these + oracle_messages fields
```