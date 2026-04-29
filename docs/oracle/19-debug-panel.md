# Oracle AI System — Admin Debug Panel

> Source: ORACLE_EXPLAINED.md §19

The Oracle Debug Panel is a client-side component that provides real-time observability into the Oracle LLM pipeline for admin users. It is visible only to users with `role === "admin"` and is rendered as a fixed-position overlay on the bottom-right corner of every `/oracle` page.

---

## 19.1 Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│              Oracle Debug Panel (z-[100])                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Model Override   │ Select provider + custom model  │ │
│  │  Token Counters   │ Prompt / Completion / Total     │ │
│  │  Timing           │ Server pipeline + Client obs.  │ │
│  │  Request Info     │ Session / Feature / Hash        │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

Data flow:

  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │ invokeOracle │────▶│  oracle_     │────▶│  React UI    │
  │ (Convex      │     │  messages    │     │  (useQuery   │
  │  action)     │     │  (DB table)  │     │  reaction)   │
  └──────────────┘     └──────────────┘     └──────────────┘
         │                                         ▲
         │          ┌──────────────┐               │
         └─────────▶│  Zustand     │───────────────┘
           (return │  store       │  (client-side timing)
            value)  │  (debug      │
                    │   metrics)   │
                    └──────────────┘
```

**Key files:**
- `src/components/oracle/debug/oracle-debug-panel.tsx` — UI component
- `src/store/use-oracle-store.ts` — Zustand store with debug state
- `src/app/oracle/layout.tsx` — Renders the panel for `user.role === "admin"`
- `src/app/oracle/chat/[sessionId]/page.tsx` — Captures timing and passes model overrides
- `convex/oracle/llm.ts` — Server-side timing instrumentation and model override
- `convex/oracle/sessions.ts` — `patchMessageTiming` and `finalizeStreamingMessage` mutations
- `convex/oracle/debug.ts` — `adminGetDebugProviders` query

---

## 19.2 Visibility and Access Control

The panel is conditionally rendered in `src/app/oracle/layout.tsx`:

```tsx
{user?.role === "admin" && <OracleDebugPanel />}
```

There is no server-side gate on the panel itself — the check is client-side only. The queries it uses (`getSessionWithMessages`, `adminGetDebugProviders`) enforce their own authorization (`getSessionWithMessages` verifies session ownership; `adminGetDebugProviders` calls `requireAdmin()`).

The panel can be toggled with **⌘+D / Ctrl+D** keyboard shortcut, or by clicking the bug icon (collapsed state) / chevron-down button (expanded state).

---

## 19.3 Model Override

Admins can override the model used for Oracle responses without changing the global model chain configuration.

**How it works:**
1. The admin selects a provider from the configured providers list (populated via `adminGetDebugProviders` query)
2. Types a custom model name (or picks from known models per provider type)
3. Clicks "Apply Override"
4. On the next Oracle invocation, `invokeOracle` receives an optional `debugModelOverride` parameter: `{ providerId: string, model: string }`
5. The override is prepended to the model chain as Tier A, so it's tried first
6. If the override model fails, the fallback chain continues normally (Tier B, C, etc.)
7. The `debugModelUsed` field on the message records whether the override was actually used

**Implementation in `invokeOracle` (`convex/oracle/llm.ts`):**

```typescript
let modelChain = config.modelChain;
let debugModelUsed: string | null = null;

if (args.debugModelOverride) {
    const overrideEntry: ModelChainEntry = {
        providerId: args.debugModelOverride.providerId,
        model: args.debugModelOverride.model,
    };
    modelChain = [overrideEntry, ...modelChain];
    debugModelUsed = `${args.debugModelOverride.providerId}/${args.debugModelOverride.model}`;
}
```

**Override state persistence:** The override is stored in the Zustand oracle store (`debugModelOverride`) and persists across messages until the admin clears it. It is NOT persisted to the database — it's a per-session client-side setting.

---

## 19.4 Token Counters

The panel displays token usage from the **last assistant message** in the current session:

| Counter | Source | Field on `oracle_messages` |
|---------|--------|------------------------|
| Prompt Tokens | LLM response `usage.prompt_tokens` | `promptTokens` |
| Completion Tokens | LLM response `usage.completion_tokens` | `completionTokens` |
| Total | Computed: prompt + completion | — |

These values are populated during `callProviderStreaming` — for streaming responses, they're extracted from the SSE `usage` chunk (when available); for non-streaming responses, from the JSON response body.

The panel also shows the `modelUsed` and `fallbackTierUsed` for the last message, giving immediate visibility into which model actually responded and whether it was a fallback tier.

---

## 19.5 Timing Metrics

Timing metrics are captured at two levels: **server-side** (LLM pipeline) and **client-side** (observed by the user).

### 19.5.1 Server-Side Timing (LLM Pipeline)

These metrics measure the server-side cost of each Oracle invocation. They are captured instrumentally inside `invokeOracle` and `callProviderStreaming`:

| Metric | What it measures | Point A | Point B |
|--------|-----------------|---------|--------|
| Prompt Build | Time to assemble the full prompt (soul, birth data, journal, timespace, feature, history) | `actionStartTime` (handler entry) | `promptBuildEndTime` (after `buildPrompt()` returns) |
| Request Queue | Time from prompt assembly done to LLM HTTP request sent (includes any internal Convex overhead between chains) | `promptBuildEndTime` | `fetchStartTime` (before `fetch()` call) |
| TTFT (Time to First Token) | Time from HTTP request start to first SSE content token parsed | `fetchStartTime` | `firstTokenTime` (first `delta.content` parsed from SSE) |
| Initial Decode | Time from first token to ~200 characters of output | `firstTokenTime` | `initialDecodeTime` (when `fullContent.length >= 200`) |
| Total Server | Wall-clock time for the entire `invokeOracle` handler | `actionStartTime` | `totalEndTime` (after `callProviderStreaming` returns and title/quota are persisted) |

**For non-streaming responses:** TTFT and Initial Decode are both set to `Date.now()` at the point of JSON response parsing, since the entire response is received at once.

**For short responses** (under 200 chars): `initialDecodeTime` is set to `Date.now()` at stream end.

**Data persistence:** These metrics are stored directly on the `oracle_messages` document via a `patchMessageTiming` internal mutation, called immediately after `callProviderStreaming` succeeds:

```typescript
// In invokeOracle, after the LLM call succeeds:
if (result.messageId) {
    await ctx.runMutation(internal.oracle.sessions.patchMessageTiming, {
        messageId: result.messageId,
        timingPromptBuildMs: timingMetrics.promptBuildMs,
        timingRequestQueueMs: timingMetrics.requestQueueMs,
        timingTtftMs: timingMetrics.ttftMs,
        timingInitialDecodeMs: timingMetrics.initialDecodeMs,
        timingTotalMs: timingMetrics.totalMs,
        debugModelUsed: i === 0 && debugModelUsed ? debugModelUsed : undefined,
    });
}
```

The `LLMResponse` return type also includes `timingMetrics` as an optional field, which serves as a **secondary path** — the action return value is captured by the client-side store. The UI reads from the message document (primary) and falls back to the store (secondary).

### 19.5.2 Client-Side Timing (Observed)

These metrics measure what the user actually experiences:

| Metric | What it measures | Point A | Point B |
|--------|-----------------|---------|--------|
| Observed TTFT | Click → first token visible in UI | `requestStartMs` (when `invokeOracle` is called) | `firstContentMs` (when the last assistant message first has content > 0 characters via the reactive query) |
| Observed Total | Click → stream complete | `requestStartMs` | `completeMs` (when the `invokeOracle` action Promise resolves) |

**Implementation:**
- `requestStartMs` is set to `Date.now()` immediately before calling `invokeOracle`
- `firstContentMs` is captured by a `useEffect` that watches `sessionData.messages` — the first time an assistant message has content during streaming, it records `Date.now()`. This is only set once per request (subsequent updates are ignored via `firstContentMs !== null` guard).
- `completeMs` is set when the `invokeOracle` Promise resolves
- Critically, when setting `completeMs`, the `firstContentMs` is **preserved** (not overwritten to null), ensuring the TTFT measurement survives through to completion.

---

## 19.6 Request Info Section

The panel shows contextual information about the current Oracle session:

| Field | Source | Notes |
|-------|--------|-------|
| Session | `sessionId` from Zustand store | Last 8 characters of the Convex ID |
| Messages | `sessionData.messages.length` | Count of all messages in current session |
| Feature | `sessionData.featureKey` + `sessionData.birthChartDepth` | Shows active feature (e.g. `birth_chart/full` or `none`) |
| Status | `sessionData.status` | `active` or `completed` |
| System Prompt Hash | `lastAssistantMsg.systemPromptHash` | Simple hash of the system prompt used for that response, for quick comparison across messages |

---

## 19.7 Keyboard Shortcut

The `⌘+D` / `Ctrl+D` keyboard shortcut toggles the debug panel open/closed. It's registered in `src/app/oracle/layout.tsx` with an event listener scoped to admin users only:

```tsx
React.useEffect(() => {
    if (user?.role !== "admin") return;
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "d") {
            e.preventDefault();
            setDebugOpen(!debugOpen);
        }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
}, [user?.role, debugOpen, setDebugOpen]);
```

---

## 19.8 Database Schema Additions

Six new optional fields were added to the `oracle_messages` table to support the debug panel:

| Field | Type | Description |
|-------|------|------------|
| `timingPromptBuildMs` | `v.optional(v.number())` | Milliseconds spent assembling the prompt |
| `timingRequestQueueMs` | `v.optional(v.number())` | Milliseconds from prompt assembly to LLM HTTP request start |
| `timingTtftMs` | `v.optional(v.number())` | Milliseconds from LLM request start to first token received |
| `timingInitialDecodeMs` | `v.optional(v.number())` | Milliseconds from first token to ~200 chars of output |
| `timingTotalMs` | `v.optional(v.number())` | Total wall-clock milliseconds for the `invokeOracle` handler |
| `debugModelUsed` | `v.optional(v.string())` | The `providerId/model` string when a debug override is active |

These fields are always `undefined` for user messages (only populated on assistant messages). They are written via `patchMessageTiming` (for timing data after `callProviderStreaming` completes) and `finalizeStreamingMessage` (for token counts, model, tier, hash). Both are internal mutations — not publicly callable.

---

## 19.9 Zustand Debug State

The `useOracleStore` (Zustand) was extended with the following debug-specific state:

| Field | Type | Purpose |
|-------|------|---------|
| `debugOpen` | `boolean` | Whether the debug panel is expanded (default: `true`) |
| `debugModelOverride` | `{ providerId: string; model: string } \| null` | Active model override, passed to `invokeOracle` as `debugModelOverride` arg |
| `debugLastMetrics` | `TimingMetrics \| null` | Server-side timing metrics from the last `invokeOracle` return value (fallback path) |
| `debugDebugModelUsed` | `string \| null` | Records which model override was actually used (from action return) |
| `debugClientTiming` | `{ requestStartMs, firstContentMs, completeMs }` | Client-side observed timing (set around `invokeOracle` calls) |

---

## 19.10 Data Flow Summary

**On each Oracle invocation (admin user, chat page):**

1. Client captures `requestStartMs = Date.now()`
2. Client calls `setDebugClientTiming({ requestStartMs, firstContentMs: null, completeMs: null })`
3. Client awaits `invokeOracle({ sessionId, userQuestion, timezone, debugModelOverride? })`
4. Server (`invokeOracle` handler):
   - Captures `actionStartTime = Date.now()`
   - Assembles prompt (birth data, journal, timespace, features)
   - Captures `promptBuildEndTime = Date.now()`
   - Prepends `debugModelOverride` to model chain if provided
   - Iterates model chain, calls `callProviderStreaming`
   - `callProviderStreaming` tracks `fetchStartTime`, `firstTokenTime`, `initialDecodeTime`, `messageId`
   - On success: computes `timingMetrics`, calls `patchMessageTiming` to persist timing on the message document
   - Returns `LLMResponse` including `timingMetrics` and `debugModelUsed`
5. Client receives result:
   - Stores `result.timingMetrics` → `debugLastMetrics` in Zustand store (fallback)
   - Stores `result.debugModelUsed` → `debugDebugModelUsed` in Zustand store
   - Sets `completeMs = Date.now()` in client timing (preserves `firstContentMs`)
6. Separately, client-side `useEffect` tracks streaming progress:
   - When the last assistant message first has content: `firstContentMs = Date.now()`
   - Only captured once per request (guarded by `firstContentMs !== null` check)
7. Debug panel reads from two sources:
   - **Primary**: `sessionData.messages[last].timingPromptBuildMs` etc. (from reactive query)
   - **Secondary**: `debugLastMetrics` from Zustand store (from action return)

---

## 19.11 Special Considerations

**Kill switch and crisis responses:** These early-return paths in `invokeOracle` do NOT produce timing metrics or call `patchMessageTiming`. The debug panel will show `—` for all timing fields on such messages, which is correct — no LLM invocation occurred.

**Fallback responses:** When all models in the chain fail, the hardcoded fallback also produces no timing metrics. `debugModelUsed` is `null` and timing fields are `undefined`.

**Non-streaming mode:** When `stream_enabled = false`, TTFT and Initial Decode are both set to `Date.now()` at the point of JSON response parsing. This is because the entire response arrives at once — there's no streaming to decompose into distinct token arrival phases. The metrics still show meaningful Prompt Build and Total Server times.

**Hooks order invariant:** The `OracleDebugPanel` component calls all React hooks (useOracleStore, useQuery, useMemo, useState, useCallback) **before** any conditional returns. This ensures the hooks order is consistent regardless of the `debugOpen` state, preventing the "Rendered fewer hooks than expected" error.

**Dropdown z-index:** The provider Select dropdown uses `position="popper"`, `side="top"`, and `style={{ zIndex: 99999 }}` to ensure it renders above the debug panel's `z-[100]` fixed overlay. The dropdown opens upward since the panel is anchored to the bottom-right corner.

**Admin debug page vs. debug panel:** The `/admin/oracle/debug` page and the `/oracle` debug panel serve different purposes:
- The admin page is a standalone inspector for any session (past or present), with full prompt reconstruction, quota details, raw JSON, and feature injection inspection
- The debug panel is a live, always-on overlay that shows real-time timing, token counts, and model override for the current session
- Both read from the same `oracle_messages` table, so timing data stored by the panel is also visible in the admin debug page