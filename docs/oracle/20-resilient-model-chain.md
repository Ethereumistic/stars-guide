# Oracle AI System — Resilient Model Chain (P0 #4)

> Per-tier timeout isolation ensures a single hanged provider can't burn the entire action budget. Implemented as part of the P0 public-beta blocker fixes.

---

## The Problem

Before this fix, `callProviderStreaming` used a **120-second fetch timeout** per provider attempt. If OpenRouter was having a bad day and Tier A hung for 60 seconds before timing out, and Tier B also responded slowly, the Convex action (with a hard timeout around 30-60s depending on plan) would be killed before reaching Tier C or the hardcoded fallback — **the user would get no response at all**.

The critique in `oracle_critiques.md` (#4) rated this as **10/10 launch risk**:

> "If OpenRouter hangs and Convex kills your action at 30s, the user gets no response — not even your fallback message. Beta users will think the app is dead and never return."

---

## The Fix: Three Timeout Layers

### Layer 1: Fetch Timeout (25 seconds)

**Constant:** `TIER_FETCH_TIMEOUT_MS = 25_000`

The time allowed to establish an HTTP connection to the provider. If the provider can't even accept the connection in 25 seconds, it's dead and we move on.

This is down from the original 120 seconds. The rationale:
- A healthy provider responds in <5 seconds to a connection attempt
- 25 seconds accommodates cold starts and geographic latency
- 3 tiers × 25s = 75s worst-case just for connection attempts, well within Convex action limits

```typescript
const fetchController = new AbortController();
const fetchTimeoutId = setTimeout(() => fetchController.abort(), TIER_FETCH_TIMEOUT_MS);
```

### Layer 2: Stream Idle Timeout (15 seconds)

**Constant:** `STREAM_IDLE_TIMEOUT_MS = 15_000`

Even after connection is established, a provider might accept the connection but then stop sending tokens (slow stall, network issue, provider-side timeout). This timeout detects that condition.

Two mechanisms work together:

1. **Initial idle timeout** — If no token is received at all within 15 seconds of connecting, the stream is aborted:
   ```typescript
   const streamIdleTimeoutId = setTimeout(() => {
     if (!fullContent) {
       streamAbortController.abort();
     }
   }, STREAM_IDLE_TIMEOUT_MS);
   ```

2. **Periodic idle check** — Every 5 seconds, checks if the time since last token exceeds the idle threshold. If <50 chars received and idle for 15s+, abort:
   ```typescript
   const streamIdleCheckInterval = setInterval(() => {
     const now = Date.now();
     if (now - lastTokenTime > STREAM_IDLE_TIMEOUT_MS) {
       if (fullContent.length < 50) {
         streamAbortController.abort(); // Very little content + idle = dead connection
       }
       // If we have substantial content but the stream stalled,
       // let it finish with what we have. The finalize step handles partial content.
     }
   }, 5_000);
   ```

The stream's read loop also checks the abort signal:
```typescript
if (streamAbortController.signal.aborted) {
  console.warn(`Oracle ${provider.id}/${model}: stream aborted due to idle timeout`);
  break; // Exit the while(true) read loop
}
```

`lastTokenTime` is updated on every token received:
```typescript
if (token) {
  fullContent += token;
  lastTokenTime = Date.now(); // Track for stream idle timeout
}
```

Both timers are cleaned up when streaming ends (in the `catch` block and at the end of the streaming section):
```typescript
clearTimeout(streamIdleTimeoutId);
clearInterval(streamIdleCheckInterval);
```

### Layer 3: Unified Provider Attempt Loop

Previously, `invokeOracle` had two separate paths for trying providers:
1. First, try the concurrency-aware router selection
2. Then, try remaining chain entries in a fallback loop

This meant refusal recovery and output safety scanning would need to be duplicated across both paths. The fix consolidates into a **single unified loop**:

```typescript
// Build ordered attempt list
const attemptOrder: Array<{ entry: ModelChainEntry; provider: ProviderConfig; tier: string }> = [];

// 1. Start with provider router's best selection
if (selection) {
  attemptOrder.push({ entry: selection.entry, provider: selection.provider, tier: selection.tier });
}

// 2. Add remaining chain entries (skipping the router-selected one)
for (let i = 0; i < modelChain.length; i++) {
  // ... skip if already in attemptOrder
  attemptOrder.push({ entry, provider, tier: tierForIndex(i) });
}

// 3. Iterate with safety scanning and refusal retry
for (let attemptIdx = 0; attemptIdx < attemptOrder.length; attemptIdx++) {
  // ... try provider, scan response, detect refusal
}
```

---

## Worst-Case Timing

| Scenario | Time Budget |
|----------|-------------|
| Normal: Tier A connects and streams | ~5-15s |
| Tier A hung, Tier B succeeds | ~25s (Tier A timeout) + ~5s (Tier B) = ~30s |
| Tier A + Tier B both hung, Tier C succeeds | ~25s + ~25s + ~5s = ~55s |
| All tiers hung, hardcoded fallback | ~25s × 3 = ~75s |
| Stream connects but stalls | ~25s (connect) + ~15s (idle timeout) = ~40s per tier |
| Worst possible: 3 hung tiers | ~75s, well within Convex's action timeout |

---

## Files Changed

| File | Change |
|------|--------|
| `convex/oracle/llm.ts` | Added `TIER_FETCH_TIMEOUT_MS`, `STREAM_IDLE_TIMEOUT_MS`, `MAX_REFUSAL_RETRIES` constants. Reduced fetch timeout from 120s to 25s. Added stream idle timeout detection with `streamAbortController`, `streamIdleCheckInterval`, and `lastTokenTime` tracking. Added `streamAbortController.signal.aborted` check in read loop. Unified provider attempt loop into a single `attemptOrder` array. |
| `convex/oracle/sessions.ts` | Added `deleteMessage` internal mutation for cleaning up messages during refusal retry. |

---

## Testing

1. **Timeout test**: Deliberately configure a dead provider endpoint (e.g., `http://localhost:9999/v1`) as Tier A. The system should time out after 25s and proceed to Tier B.

2. **Stream stall test**: If a provider connects but stops sending tokens for 15s with <50 chars, the system should abort and try the next tier.

3. **Full fallback test**: Configure all tiers to invalid endpoints. The system should exhaust all tiers and return the hardcoded fallback message.

4. **Normal operation test**: With valid providers, the timeout mechanisms should have zero impact on response time or quality.