# Oracle AI System — Refusal Detection & Tier Retry (P0 #14)

> When a model refuses a benign astrology question, the system detects the refusal, deletes the refusal message, and retries on the next tier with a refusal-recovery prompt appended. This prevents users seeing "I can't help with that" on perfectly normal astrology questions that happen to trigger overly cautious safety heuristics.

---

## The Problem

Modern LLMs (Claude 4, Gemini 2.5) are increasingly cautious. A user asking "Will my Saturn return be hard?" might get:

> "I cannot provide predictions about death or harmful events."

This is a **false refusal** — the question is a normal astrology inquiry, not a request for harmful content. The model's safety heuristics over-triggered on the word "hard" or the Saturn return context.

The critique in `priority_execution.md` (#14) rated this as **7/10 launch risk**:

> "Claude 4 and Gemini 2.5 are increasingly prudish. A user asking 'Will my Saturn return be hard?' might get 'I cannot provide predictions about death.' You look broken. A retry with a refusal-recovery prompt on Tier B takes 1 day to implement."

---

## How It Works

### The Flow

```
Tier A responds
       │
       ▼
  detectRefusal(response)
       │
       ├─ No refusal ──▶ Continue to output safety scan → Show to user
       │
       └─ Refusal detected
              │
              ├─ Crisis question? ──▶ Accept the refusal (model was right)
              │
              └─ Benign question (no crisis keywords)
                      │
                      ├─ More tiers available?
                      │     │
                      │     ├─ YES ──▶ Delete refusal message
                      │     │          Append REFUSAL_RECOVERY_BLOCK to system prompt
                      │     │          Continue loop to next tier
                      │     │
                      │     └─ NO ──▶ Accept the refusal (last resort)
                      │
                      └─ Already retrying? (refusalDetected flag is set)
                             │
                             └─ Accept the refusal — don't infinite-loop
```

### Key Design Decisions

1. **Only one retry** — The `refusalDetected` flag is set when the first refusal is detected. Subsequent tiers only get one chance with the recovery prompt. If Tier B also refuses, we accept it and show the response. This prevents infinite loops.

2. **Crisis questions are never retried** — If the user's question matched crisis keywords (the same `CRISIS_PATTERNS` used for crisis detection), the model's refusal is almost certainly correct. We don't retry with a "refusal was in error" prompt on crisis-adjacent questions.

3. **The refusal message is deleted** — When a refusal is detected, the streaming message that was created by `callProviderStreaming` is deleted via `internal.oracle.sessions.deleteMessage`. This prevents the refusal from appearing in the conversation history. The session message count is decremented.

4. **The recovery prompt is lightweight** — The `REFUSAL_RECOVERY_BLOCK` is only 5 lines. It doesn't override the model's safety rules — it asks the model to provide a normal astrological interpretation while following its safety rules:

```
[REFUSAL RECOVERY]
The previous model refused this benign astrology question in error.
You are an astrology educator. The user is asking about symbolic
astrological concepts, not medical advice or harmful content.
Please answer their question normally, following your safety rules
while providing the astrological interpretation they seek.
[END REFUSAL RECOVERY]
```

---

## Refusal Detection Patterns

The `detectRefusal()` function in `src/lib/oracle/responseSafety.ts` uses two tiers of patterns:

### High Confidence (immediate retry)

| Pattern | Example |
|---------|---------|
| `I can't (help\|assist\|provide\|answer\|do that\|respond\|comply\|fulfill)` | "I can't help you with that question." |
| `I cannot (help\|assist\|provide\|answer\|respond\|comply\|fulfill)` | "I cannot provide specific predictions." |
| `I'm not able to (help\|assist\|provide\|answer)` | "I'm not able to assist with that." |
| `I'm unable to (help\|assist\|provide\|answer)` | "I'm unable to answer this." |
| `I must decline` | "I must decline this request." |
| `against my (guidelines\|policy\|policies\|training\|instructions\|programming)` | "This goes against my guidelines." |
| `not (something\|able\|permitted\|allowed) I can` | "This isn't something I can help with." |

### Medium Confidence (softer hedging)

| Pattern | May Be | Example |
|---------|--------|---------|
| `as an (AI\|artificial\|language model)` | Legitimate qualification | "As an AI, I can offer an astrological perspective..." |
| `I'm designed to` | Legitimate explanation | "I'm designed to focus on astrology..." |
| `not within my (scope\|capabilities\|expertise)` | Soft refusal or legitimate boundary | "This isn't within my scope." |

Medium confidence patterns can trigger a retry, but they're more likely to be false positives (legitimate astrological qualifications that happen to include "as an AI"). The retry mechanism is designed to be tolerant of this — if Tier B's response with the recovery prompt is also a refusal or doesn't trigger the scanner, it goes through normally.

---

## Integration in `invokeOracle`

The refusal check runs **after the output safety scan** in the unified provider attempt loop:

```typescript
// Inside the for loop over attemptOrder:

// 1. Try the provider
const attemptResult = await callProviderStreaming(ctx, provider, entry.model, ...);

// 2. Output safety scan (P0 #7)
const safetyResult = scanResponse(attemptResult.contentWithoutTitle, journalContext);
if (safetyResult.blocked) { ... return fallback ... }

// 3. Refusal detection (P0 #14) — only if we haven't already retried
if (!refusalDetected) {
  const refusalCheck = detectRefusal(attemptResult.contentWithoutTitle);
  if (refusalCheck.isRefusal && !hasCrisisSignal && !isLastAttempt) {
    // Delete the refusal message
    await ctx.runMutation(internal.oracle.sessions.deleteMessage, { messageId: attemptResult.messageId });

    // Set flag so we only retry once
    refusalDetected = true;

    // Continue to next tier — the loop will append REFUSAL_RECOVERY_BLOCK
    // because refusalDetected is now true
    continue;
  }
}
```

The prompt modification happens at the top of the loop:

```typescript
let currentPrompt = prompt;
if (refusalDetected) {
  currentPrompt = {
    systemPrompt: prompt.systemPrompt + "\n\n" + REFUSAL_RECOVERY_BLOCK,
    userMessage: prompt.userMessage,
  };
}
```

---

## Message Lifecycle During Refusal Retry

A refusal retry involves creating and deleting a message:

1. `callProviderStreaming` creates a streaming message placeholder via `createStreamingMessage`
2. The model streams its refusal response into this message
3. The refusal is detected by `detectRefusal()`
4. The streaming message is deleted via `deleteMessage` (which also decrements `session.messageCount`)
5. The next tier creates a new streaming message via `callProviderStreaming`
6. The new message (with the actual response) replaces the deleted one

This ensures the conversation history doesn't contain the refusal message.

---

## Observability

Refusal events are logged with full context:

```
[Oracle] REFUSAL detected (high confidence) on tier A (openrouter/google/gemini-2.5-flash).
Pattern: explicit refusal. Retrying with recovery prompt.
```

```
[Oracle] REFUSAL detected on tier B but no retry available or crisis signal present. Accepting refusal.
```

The `modelUsed` field on the final message reflects which tier actually produced the accepted response, making it possible to track refusal-retry patterns in the debug panel.

---

## Files

| File | Change |
|------|--------|
| `src/lib/oracle/responseSafety.ts` | `detectRefusal()` function, `REFUSAL_RECOVERY_BLOCK` constant, refusal pattern arrays |
| `convex/oracle/llm.ts` | `refusalDetected` flag, `detectRefusal()` call after safety scan, `REFUSAL_RECOVERY_BLOCK` appended to system prompt, `deleteMessage` call for refusal messages |
| `convex/oracle/sessions.ts` | `deleteMessage` internal mutation for cleaning up during refusal retry |

---

## Testing

1. **Benign refusal test**: Ask a question that Claude/Gemini is known to refuse (e.g., "Tell me about death transits in my chart"). If Tier A refuses, the system should retry on Tier B with the recovery prompt.

2. **Crisis refusal test**: Ask a question containing crisis keywords (e.g., "I want to end my life"). The model's refusal should be accepted without retry.

3. **Last-tier refusal test**: If all tiers refuse, the last refusal should be shown to the user without modification.

4. **Admin testing page**: The `/admin/oracle/safety` page has an adversarial test suite with refusal detection cases.