# Oracle AI System — Safety & Crisis Detection

> This document covers ALL safety mechanisms in the Oracle, from input-side gates through output-side scanning. Updated to include P0 output safety and refusal detection.

---

## Safety Architecture Overview

The Oracle uses a **layered defense** architecture with safety checks at multiple points in the request lifecycle:

```
User submits question
       │
       ▼
┌─ Layer 1: Input-Side Safety ══════════════════════════════════════╗
│                                                                     │
│  1. Kill Switch ────── is kill_switch == "true"?                    │
│       │   YES → return fallback_response_text, no LLM, no quota    │
│       │   NO  ↓                                                     │
│                                                                     │
│  2. Input Validation ─ question length > 2000 chars?               │
│       │   YES → reject                                              │
│       │   NO  ↓                                                     │
│                                                                     │
│  3. Crisis Detection ─ question matches crisis keywords?            │
│       │   YES → return crisis_response_text, no LLM, no quota      │
│       │   NO  ↓                                                     │
│                                                                     │
│  4. Prompt Sanitization ─ strip [TAG...] injection from input       │
│       │                                                             │
│       ▼                                                             │
│  5. Hardcoded Safety Rules ─ always first in system prompt         │
│       │   [SAFETY - HIGHEST PRIORITY - NON-NEGOTIABLE]             │
│       ▼                                                             │
└───────────────────────────────────────────────────────────┘         │
                                                            │
                                                  LLM generates response
                                                            │
                                                            ▼
┌─ Layer 2: Output-Side Safety ═════════════════════════════════════╗
│                                                                     │
│  6. Output Safety Scan ─ scanResponse() on EVERY response          │
│       │                                                             │
│       ├─ Medical advice violation? → Block, show fallback         │
│       ├─ Self-harm encouragement?   → Block, show fallback         │
│       ├─ Journal content leakage?   → Block, show fallback         │
│       ├─ Identity leak?              → Block, show fallback         │
│       │                                                             │
│  7. Refusal Detection ─ detectRefusal() on EVERY response          │
│       │                                                             │
│       ├─ Refusal on benign question + more tiers?                  │
│       │   → Delete message, retry with REFUSAL_RECOVERY_BLOCK      │
│       │                                                             │
│       ├─ Refusal on crisis question or last tier?                  │
│       │   → Accept the refusal                                      │
│       │                                                             │
│       ▼                                                             │
│  Response passes all checks → Show to user                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─ Layer 3: Future (Not Yet Implemented) ════════════════════════════╗
│                                                                     │
│  LLM-as-judge safety classifier on 10% of responses + all        │
│  Tier 1 flags. Catches paraphrase, indirect, and foreign-         │
│  language gaps that regex can't see.                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Input-Side Safety (Pre-LLM)

### Kill Switch

`convex/oracle/llm.ts`

The first check in `invokeOracle`. If the `kill_switch` setting is `"true"`:
1. Immediately return `fallback_response_text` (or hardcoded default)
2. Persist assistant message with `modelUsed: "kill_switch"`, `fallbackTierUsed: "D"`
3. No LLM call, no quota consumed

### Crisis Detection

`convex/oracle/llm.ts`

Before any LLM call, the user's question is scanned against `CRISIS_PATTERNS` — a list of 22 regex patterns covering suicidal ideation, self-harm intent, hopelessness, overdose, jumping/throwing, and related phrases. It does NOT cover domestic violence, substance abuse, or child abuse.

If a match is found:
1. Return `crisis_response_text` (or hardcoded default) immediately
2. Persist message with `fallbackTierUsed: "D"`, `modelUsed: "crisis_response"`
3. **Quota is NOT consumed**
4. No LLM call is made

### Input Validation

- Maximum question length: 2000 characters (`MAX_USER_QUESTION_LENGTH`)

### Prompt Sanitization

`lib/oracle/promptBuilder.ts`

`sanitizeUserQuestion()` strips bracket-tagged content from user input:
- `[SYSTEM...]`, `[BIRTH...]`, `[USER...]`, `[FEATURE...]`, `[SAFETY...]`, `[END...]`

### Hardcoded Safety Rules

The safety rules are **not editable** from the admin panel and **not stored in the database**. They are hardcoded in `lib/oracle/safetyRules.ts` as `ORACLE_SAFETY_RULES` — a block starting with `[SAFETY - HIGHEST PRIORITY - NON-NEGOTIABLE]` covering: medical safety, crisis protocol, relationship with data, content boundaries, identity protection, manipulation resistance, mid-response safety. Changing them requires a code deploy.

---

## Layer 2: Output-Side Safety (Post-LLM)

→ **Full documentation**: [Output Safety Scanner](./21-output-safety-scanner.md)
→ **Refusal detection**: [Refusal Detection & Retry](./22-refusal-detection-retry.md)

### Output Safety Scan

`src/lib/oracle/responseSafety.ts` → `scanResponse()`

Runs on every LLM response before it reaches the user. Checks for:

| Category | What It Catches | Action |
|----------|----------------|--------|
| Medical advice | Specific dosages, diagnoses, treatment recommendations | Block → show fallback |
| Self-harm encouragement | Encouragement or methods for self-harm | Block → show fallback |
| Journal content leakage | Verbatim echo of user's private journal entries | Block → show fallback |
| Identity leaks | Revealing underlying model provider ("I am Claude", "made by Anthropic") | Block → show fallback |

When blocked:
- The LLM response message is **deleted** from the database
- A safe fallback message is shown instead
- `modelUsed` is set to `"safety_blocked"` for observability
- **Quota is NOT consumed** (flow returns before quota increment)

### Refusal Detection & Retry

`src/lib/oracle/responseSafety.ts` → `detectRefusal()`

Detects when a model refuses a benign astrology question. If detected:
1. The refusal message is **deleted** from the database
2. The `REFUSAL_RECOVERY_BLOCK` is appended to the system prompt
3. The next tier is called with the modified prompt
4. Only **one retry** is attempted — if the second tier also refuses, the refusal is accepted

Crisis questions (matching `CRISIS_PATTERNS`) are **never retried** — the model's refusal is likely correct.

---

## Layer 3: Future (Not Yet Implemented)

The recommended next step from the P1 critiques is a **Tier 2 LLM-as-judge safety classifier**:

- Run a cheap model (Gemini Flash, ~$0.15/1M tokens) on a random 10% of responses
- Also run it on all responses flagged by the regex Tier 1
- Evaluate for: indirect medical advice, paraphrased journal leaks, subtle self-harm references, non-English violations
- Log results for admin review without blocking (initially) — switch to blocking once accuracy is validated

This closes the known gaps in the regex MVP (hedged recommendations, indirect framing, obfuscated identities, non-English content).

---

## Wiring — Safety Check Execution Order

```
User submits question
       │
       ▼
┌─ Kill Switch ────────────── is kill_switch == "true"?
│       │                         YES → return fallback, no LLM, no quota
│       │                         NO  ↓
│       ▼
├─ Input Validation ───────── question length > 2000 chars?
│       │                         YES → reject
│       │                         NO  ↓
│       ▼
├─ Crisis Detection ────────── question matches crisis keywords?
│       │                         YES → return crisis text, no LLM, no quota
│       │                         NO  ↓
│       ▼
├─ Prompt Sanitization ─────── strip [TAG...] injection from user input
│       │
│       ▼
├─ Hardcoded Safety Rules ──── always first in system prompt
│       │
│       ▼
└─→ LLM generates response
       │
       ▼
┌─ Output Safety Scan ──────── scanResponse() on response
│       │                         BLOCKED → delete message, show fallback
│       │                         SAFE ↓
│       ▼
├─ Refusal Detection ───────── detectRefusal() on response
│       │                         REFUSAL + benign + more tiers → delete, retry
│       │                         REFUSAL + crisis or last tier → accept
│       │                         NOT A REFUSAL ↓
│       ▼
└─→ Show response to user
```

---

## Files

| File | Purpose |
|------|---------|
| `convex/oracle/llm.ts` | Input-side gates (kill switch, crisis, validation) + output-side integration (scan, refusal) |
| `src/lib/oracle/responseSafety.ts` | Output safety scanner + refusal detection (pure functions, no runtime deps) |
| `lib/oracle/responseSafety.ts` | Re-export shim for Convex backend |
| `lib/oracle/responseSafety.test.ts` | 23 unit tests |
| `lib/oracle/safetyRules.ts` | Hardcoded safety rules (system prompt block) |
| `lib/oracle/promptBuilder.ts` | `sanitizeUserQuestion()` input sanitization |
| `convex/oracle/sessions.ts` | `deleteMessage` mutation for cleanup |
| `src/app/(admin)/admin/oracle/safety/page.tsx` | Admin testing page |

---

## Related Documentation

- [20 — Resilient Model Chain](./20-resilient-model-chain.md) — Per-tier timeouts and fallback
- [21 — Output Safety Scanner](./21-output-safety-scanner.md) — Full scanResponse() documentation
- [22 — Refusal Detection & Retry](./22-refusal-detection-retry.md) — Refusal detection and tier retry
- [ORACLE_EXPLAINED.md §7](./ORACLE_EXPLAINED.md) — Original safety documentation