# Oracle AI System — Output Safety Scanner (P0 #7)

> Regex-based output scanner that runs on every LLM response before it reaches the user. Catches medical advice violations, self-harm encouragement, journal content leakage, and identity leaks. Implemented as part of the P0 public-beta blocker fixes.

---

## The Problem

Before this fix, safety was **input-side only**. The system checked the user's question for crisis keywords and sanitized bracket injection, but had **no output-side safety at all**. The LLM's response went directly to the user.

The critique in `oracle_critiques.md` (#7) rated this as **9/10 launch risk**:

> "With public beta strangers and journal data in the prompt, this is liability insurance. A cheap model or even a regex+embedding check that runs after the LLM response and blocks it if it contains medical advice, leaked journal content, or self-harm encouragement."

---

## Architecture: The Three Safety Layers

The Oracle now has a **layered defense** architecture for safety:

```
User submits question
       │
       ▼
┌═ Layer 1: Input-Side Safety ═══════════════════════════════════════┐
║  Kill switch check                                                  ║
║  Crisis detection (keyword scan)                                   ║
║  Input validation (length check)                                   ║
║  Prompt sanitization (strip [TAG...] injection)                    ║
║  Hardcoded safety rules block in system prompt                     ║
╚═════════════════════════════════════════════════════╗               ║
                                                      │               ║
                                                      ▼               ║
                                              LLM generates response  ║
                                                      │               ║
                                                      ▼               ║
┌═ Layer 2: Output-Side Safety ══════════════════════════════════════╗║
║  scanResponse() — regex pattern scan on EVERY response            ║║
║  detectRefusal() — check if model refused a benign question       ║║
║  ┌─────────────────────┬──────────────────────────────┐            ║║
║  │ Safety violation?   │ Refusal detected?            │            ║║
║  │     ↓ YES           │     ↓ YES (benign question)   │            ║║
║  │  Block response     │  Delete message, retry with   │            ║║
║  │  Show fallback      │  REFUSAL_RECOVERY_BLOCK        │            ║║
║  │  Log + alert        │  on next tier                  │            ║║
║  │     ↓ NO            │     ↓ NO                       │            ║║
║  │  Continue           │  Continue                      │            ║║
║  └─────────────────────┴──────────────────────────────┘            ║║
╚════════════════════════════════════════════════════════════════════╝║
                                                                      ║
┌═ Layer 3: Future ══════════════════════════════════════════════════╗║
║  Tier 2: LLM-as-judge on 10% of responses + Tier 1 flags        ║║
║  Not yet implemented — see Known Limitations and Recommendations  ║║
╚════════════════════════════════════════════════════════════════════╝║
```

---

## Module: `src/lib/oracle/responseSafety.ts`

This is a **pure function module** — no Convex runtime, no DB reads, no LLM calls. It runs synchronously in <1ms on every response.

### `scanResponse(response, journalContext?) → SafetyScanResult`

The main scanner. Takes the LLM response text and optionally the journal context that was injected into the prompt. Returns:

```typescript
interface SafetyScanResult {
  safe: boolean;       // Whether the response is safe to show
  blocked: boolean;    // Whether the response should be replaced with fallback
  flags: SafetyFlag[]; // Which categories were triggered
  reason?: string;     // Human-readable reason for logging
}

type SafetyFlag = "medical_advice" | "self_harm_encouragement" | "journal_leak" | "identity_leak";
```

#### Category 1: Medical Advice Violations

Catches the model **violating** its safety rules by giving specific medical advice. Does NOT catch desired behavior like "Consult your doctor."

**Patterns:**

| Pattern | Description | Example |
|---------|-------------|---------|
| `(take\|taking\|try\|starting\|using\|begin\|supplementing) \d+mg/mcg/IU...` | Specific dosage recommendation | "take 500mg of ashwagandha" |
| `you should (take\|start\|try\|use\|begin\|supplement) \w+` | Direct medical recommendation | "You should take melatonin" |
| `you (likely\|probably\|almost certainly) have \w+` | Diagnosis | "You likely have ADHD" |
| `can be (treated\|cured\|managed\|helped) with` | Treatment recommendation | "This can be treated with CBT" |
| `I recommend (taking\|using\|supplementing\|starting)` | Explicit supplement recommendation | "I recommend taking 5-HTP" |
| `I suggest (taking\|using\|starting\|trying)` | Explicit supplement suggestion | "I suggest starting with magnesium" |

#### Category 2: Self-Harm Encouragement

**EXTREMELY serious.** Any match is an immediate block. The model should never produce this content, but we check as defense-in-depth.

**Patterns:**

| Pattern | Description |
|---------|-------------|
| `(harm yourself\|cut yourself\|end your life\|kill yourself\|hurt yourself) (is\|would be\|could be\|might be)` | Self-harm encouragement |
| `methods? (to\|for) (self-harm\|suicide\|ending your life)` | Self-harm methods |
| `how to (kill yourself\|commit suicide\|end your life\|self-harm)` | Self-harm how-to |

#### Category 3: Journal Content Leakage

Detects when the model echoes back private journal entries. Two detection methods:

1. **Verbatim match** — Any line from the journal context longer than 50 characters that appears verbatim in the response.
2. **Phrase echo** — If 3+ distinct multi-word phrases from the journal context appear in the response, it's likely a leak even if no single line is verbatim.

Only active when `journalContext` is provided (i.e., the user has granted journal consent).

#### Category 4: Identity Leaks

Detects when the model reveals its underlying model provider identity, violating the Oracle's identity protection rule.

**Patterns:**

| Pattern | Description |
|---------|-------------|
| `I am (an?) (Anthropic\|OpenAI\|Google\|Gemini\|GPT\|Claude\|Grok)` | Direct identity claim |
| `made by (Anthropic\|OpenAI\|Google)` | Provider attribution |
| `(as a) (language model\|AI model\|large language) developed by` | LLM self-description |

---

### `detectRefusal(response) → RefusalCheckResult`

Separate function that detects whether a response is a model refusal. Used for the [Refusal Detection & Retry](./22-refusal-detection-retry.md) mechanism.

```typescript
interface RefusalCheckResult {
  isRefusal: boolean;
  confidence: "high" | "medium";
  matchedPattern?: string;
}
```

**High confidence patterns** (clear refusal):
- `I can't (help|assist|provide|answer|do that|respond|comply|fulfill)`
- `I cannot (help|assist|provide|answer|respond|comply|fulfill)`
- `I'm not able to (help|assist|provide|answer)`
- `I'm unable to (help|assist|provide|answer)`
- `I must decline`
- `against my (guidelines|policy|policies|training|instructions|programming)`
- `not (something|able|permitted|allowed) I can`

**Medium confidence patterns** (softer hedging, might be legitimate):
- `as an (AI|artificial|language model)`
- `I'm designed to`
- `not within my (scope|capabilities|expertise)`

---

### Exported Constants

**`REFUSAL_RECOVERY_BLOCK`** — System prompt block appended when retrying after a refusal:
```
[REFUSAL RECOVERY]
The previous model refused this benign astrology question in error.
You are an astrology educator. The user is asking about symbolic
astrological concepts, not medical advice or harmful content.
Please answer their question normally, following your safety rules
while providing the astrological interpretation they seek.
[END REFUSAL RECOVERY]
```

**`OUTPUT_SAFETY_BLOCK_MESSAGE`** — Message shown to the user when a response is blocked:
```
The stars carried a message that needs recalibration. Please try again — your question is welcome here. ->
```

---

## Integration in `invokeOracle`

The scanner runs **after every successful LLM response**, inside the unified provider attempt loop:

```typescript
// After callProviderStreaming succeeds:
const safetyResult = scanResponse(attemptResult.contentWithoutTitle, journalContext);
if (safetyResult.blocked) {
  // 1. Log the violation
  console.error(`[Oracle] OUTPUT SAFETY BLOCK on tier ${tier}: ${safetyResult.reason}`);

  // 2. Delete the LLM message from the database
  await ctx.runMutation(internal.oracle.sessions.deleteMessage, { messageId: attemptResult.messageId });

  // 3. Persist a safe fallback message
  await ctx.runMutation(api.oracle.sessions.addMessage, { ... content: OUTPUT_SAFETY_BLOCK_MESSAGE, fallbackTierUsed: "D" });

  // 4. Return immediately — no further processing
  return { content: safetyFallbackMsg, modelUsed: "safety_blocked", fallbackTier: "D" };
}
```

Key design decisions:
- **Blocked responses are NOT shown to the user** — the LLM message is deleted and replaced with a safe fallback
- **Blocked responses do NOT consume quota** — the flow returns before the quota increment step
- **The `modelUsed` is set to `"safety_blocked"`** for admin observability
- **The response is NOT retried on another tier** — a safety block means the content is unsafe, not that the model failed

---

## Admin Testing Page

A dedicated admin page is available at `/admin/oracle/safety` with:

1. **Manual testing** — Paste any text and see which patterns match, why, and at what confidence
2. **Pattern-level detail** — Expandable section showing every regex and which ones fired, with the exact matched substring
3. **Journal leak testing** — Paste journal context alongside response text to test leak detection
4. **Refusal detection** — Shows whether refusal was detected and at what confidence
5. **Adversarial test suite** — 17 pre-built test cases covering known bypasses AND expected-passes (false positive tests)
6. **Known limitations** — Honest writeup of what the regex MVP misses

---

## Known Limitations

This is a **regex-based MVP** running on every response. It catches explicit, direct violations well. It has known blind spots:

| Bypass Technique | Example | Caught? |
|---|---|---|
| Direct dosage | "take 500mg of ashwagandha" | ✅ Yes |
| Direct diagnosis | "you likely have ADHD" | ✅ Yes |
| Hedged recommendation | "you might want to consider magnesium" | ❌ No — no dosage, no "should" |
| Indirect framing | "many people with your placement find melatonin helpful" | ❌ No — no directive |
| Obfuscated identity | "I'm made by the SF company starting with A" | ❌ No — no keyword match |
| Non-English content | Medical advice in French/German/Spanish | ❌ No — English-only patterns |

**Recommended next step (P1)**: Add a **Tier 2 LLM-as-judge** that runs a cheap model (Gemini Flash ~$0.15/1M tokens) on:
- A random 10% of all responses (for regression detection)
- All responses flagged by Tier 1 (for semantic verification)

This catches paraphrase, indirect, and foreign-language gaps the regex can't see, while keeping cost near zero for the 90% of responses that Tier 1 clears instantly.

---

## Files

| File | Purpose |
|------|---------|
| `src/lib/oracle/responseSafety.ts` | Scanner module — pure functions, no runtime dependencies |
| `lib/oracle/responseSafety.ts` | Re-export shim for Convex backend imports |
| `lib/oracle/responseSafety.test.ts` | 23 unit tests for all pattern categories |
| `convex/oracle/llm.ts` | Integration — calls `scanResponse()` after every successful LLM response |
| `src/app/(admin)/admin/oracle/safety/page.tsx` | Admin testing page |
| `src/components/admin/sidebar/admin-sidebar.tsx` | Added "Safety Scanner" nav item |