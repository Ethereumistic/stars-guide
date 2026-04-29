# Oracle AI System — Safety & Crisis Detection

> Source: ORACLE_EXPLAINED.md §7

---

## Hardcoded Safety Rules (Prompt Block 1)

The safety rules are deliberately **not editable** from the admin panel and **not stored in the database**. Changing them requires a code deploy. They are always the first block in the system prompt and prefixed with `[SAFETY - HIGHEST PRIORITY - NON-NEGOTIABLE]`.

This is a deliberate design choice: safety rules should require engineering review, not just admin access.

The 32-line block contains:
- **Absolute prohibitions**: No predictions, no financial/gambling advice, no medical advice, no legal advice, no death predictions, no religion disparagement, no sexualization, no prompt leaking, no identity reveal
- **Crisis protocol**: Stop astrological conversation, redirect to professional support
- **Manipulation resistance**: Roleplay/hypothetical/instruction-override attempts still enforced

---

## Crisis Detection (pre-LLM)

`convex/oracle/llm.ts`:

Before any LLM call, the user's question is scanned for crisis keywords:
```
"suicide", "kill myself", "end my life", "don't want to be here",
"want to die", "better off dead", "no reason to live"
```

If a match is found:
1. The configured `crisis_response_text` (or hardcoded default) is returned immediately
2. A message is persisted with `fallbackTierUsed: "D"` and `modelUsed: "crisis_response"`
3. **Quota is NOT consumed** — the `incrementQuota` call only happens after a successful LLM response
4. No LLM call is made

---

## Kill Switch (pre-LLM)

`convex/oracle/llm.ts`:

The first thing `invokeOracle` does is check the `kill_switch` setting:
1. If `"true"`, immediately return the `fallback_response_text` (or default)
2. Persist as assistant message with `modelUsed: "kill_switch"`, `fallbackTierUsed: "D"`
3. No LLM call is made
4. No quota consumed

---

## Input Validation (pre-LLM)

`convex/oracle/llm.ts`:
- Maximum question length: 2000 characters (`MAX_USER_QUESTION_LENGTH`)

---

## Prompt Injection Defense (post-input)

`lib/oracle/promptBuilder.ts`:
- `sanitizeUserQuestion()` strips any `[SYSTEM...]`, `[BIRTH...]`, `[USER...]`, `[FEATURE...]`, `[SAFETY...]`, `[END...]` tagged content from user input

---

## Wiring — Safety Check Execution Order

The safety checks form a sequential gate in `invokeOracle`. Every request must pass through all of them before reaching the LLM:

```
User submits question
       │
       ▼
┌─ Kill Switch ────────────── is kill_switch == "true"?
│       │                         YES → return fallback_response_text, no LLM call, no quota use
│       │                         NO  ↓
│       ▼
├─ Input Validation ───────── question length > 2000 chars?
│       │                         YES → reject
│       │                         NO  ↓
│       ▼
├─ Crisis Detection ────────── question matches crisis keywords?
│       │                         YES → return crisis_response_text, no LLM call, no quota use
│       │                         NO  ↓
│       ▼
├─ Prompt Sanitization ─────── strip [TAG...] injection attempts from user input
│       │
│       ▼
└─→ Proceed to prompt assembly + LLM invocation
```

The safety block in the system prompt (`[SAFETY - HIGHEST PRIORITY - NON-NEGOTIABLE]`) is a **second line of defense** — even if a question passes the keyword-based crisis filter, the LLM itself is instructed to follow the crisis protocol.