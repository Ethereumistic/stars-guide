# Oracle AI System — Prompt Assembly Pipeline

> Source: ORACLE_EXPLAINED.md §4

The prompt is the heart of the Oracle. It is assembled in `buildPrompt()` (`lib/oracle/promptBuilder.ts:79-110`) from 7 parameters: `soulDoc`, `featureInjection`, `birthContext`, `userQuestion`, `isFirstResponse`, `journalContext`, `timespaceContext`. Both `journalContext` and `timespaceContext` are consent-gated / conditionally available.

---

## System Prompt (blocks, in order)

Built by `buildSystemPrompt()` (`lib/oracle/promptBuilder.ts:41-70`):

```
[Block 1: ORACLE_SAFETY_RULES]              ← hardcoded, always first, non-negotiable
[Block 2: soulDoc]                          ← from oracle_settings key "oracle_soul"
[Block 3: featureInjection]                 ← feature-specific instructions (if active feature)
[Block 3.5: timespaceContext]               ← local datetime + cosmic weather (always injected)
[Block 4: journalContext]                   ← from journal/context.ts assembleJournalContext (if consent granted)
[Block 5: ORACLE_TITLE_DIRECTIVE]           ← hardcoded, only on first response
[Block 6: JOURNAL_PROMPT_DIRECTIVE]         ← hardcoded, only if journalContext is present + first response
```

### Block 1 — Safety Rules (`lib/oracle/safetyRules.ts:9-32`)

Hardcoded 32-line block starting with `[SAFETY - HIGHEST PRIORITY - NON-NEGOTIABLE]`. Contains:
- Absolute prohibitions (no predictions, no financial/gambling advice, no medical advice, no legal advice, no death predictions, no religion disparagement, no sexualization, no prompt leaking, no identity reveal)
- Crisis protocol (stop astrological conversation, redirect to professional support)
- Manipulation resistance (roleplay/hypothetical/instruction-override attempts still enforced)

**Not editable from admin panel. Not stored in the database. Changes require a code deploy.**

### Block 2 — Soul Document (`lib/oracle/soul.ts:25-62`)

The `DEFAULT_ORACLE_SOUL` is ~62 lines defining Oracle's identity, voice, capabilities, and behavior. Stored in DB under key `"oracle_soul"` and editable by admin. Key sections:
- IDENTITY: Not a fortune teller; shows patterns in motion; never breaks character
- VOICE: Sharp warm older sister; short sentences; plain language; banned phrases listed
- WHAT YOU WORK WITH: Cites specific placements; strongest at patterns/timing/connection
- BEHAVIOR: Always cite at least one placement; no generic Sun-sign content; match response length to question
- SPECIAL QUESTION HANDLING: Horoscope/retrograde/timing/compatibility/prediction/metaphysical rules
- RESPONSE FORMAT: Default structure (hidden question → answer citing chart → practical takeaway); no bullet points; short paragraphs

### Block 3 — Feature Injection (optional)

When a feature is active on the session, its instruction block is injected into the system prompt. For `birth_chart`, this is a depth-specific instruction block (core or full). For `journal_recall`, this is the `[COSMIC RECALL MODE]` block. See [Feature System](./10-feature-system.md) and [Birth Context Injection](./11-birth-context-injection.md).

### Block 3.5 — Timespace Context (always present, conditionally expanded)

`buildTimespaceContext()` (`convex/oracle/timespace.ts`) always provides the user's local datetime and timezone. When temporal intent is detected in the user's question, it also injects cosmic weather data (planetary positions, moon phase, active transits). This block is always injected regardless of feature state.

### Block 4 — Journal Context (consent-gated, always when consent granted)

If the user has granted consent (`journal_consent.oracleCanReadJournal === true`), `assembleJournalContext()` builds a `[JOURNAL CONTEXT]` block containing summaries of the user's recent journal entries. **This is now injected on EVERY message when consent is granted**, not just in Cosmic Recall sessions. The budget is expanded (doubled) when `journal_recall` is the active feature.

See [Journal Context Injection](./12-journal-context-injection.md) for the full context assembly specification.

### Block 5 — Title Directive (`lib/oracle/promptBuilder.ts:13-25`)

Hardcoded instruction requiring the model to output a `TITLE: <4-6 word title>` line at the very end. Only included on the first response. This title is parsed out of the response and used as the session title.

### Block 6 — Journal Prompt Suggestion Directive (optional)

Only included when journal context is present AND it's the first response. Instructs Oracle that it MAY optionally output a `JOURNAL_PROMPT: <reflective question>` line if its response naturally touches on emotional themes. This is parsed from the response, stored on the message as `journalPrompt`, and surfaced in the UI as a "Journal about this" button. See [Journal Context Injection](./12-journal-context-injection.md).

---

## User Message (2 blocks)

Built by `buildUserMessage()` (`lib/oracle/promptBuilder.ts:61-73`):

```
[Block 1: [BIRTH CHART DATA]]               ← if birth data available (universal, always injected)
[Block 2: sanitized user question]
```

**Universal Birth Data** (v2 architectural change):
Birth chart data is ALWAYS injected in the user message when the user has `birthData` saved — regardless of which feature is active. This is the key v2 change: birth data is not feature-gated. A Cosmic Recall session can reference the user's Venus placement because the full chart is always present. The same full data is injected for both "core" and "full" depth readings; the depth controls what the model *focuses on*, not what data it sees.

**Sanitization** (`lib/oracle/promptBuilder.ts:102-106`):
Before the user's text enters the prompt, `sanitizeUserQuestion()` strips any bracket-tagged content matching `[SYSTEM...]`, `[BIRTH...]`, `[USER...]`, `[FEATURE...]`, `[SAFETY...]`, `[END...]` to prevent tag injection attacks.

---

## Conversation History

Between the system prompt and the final user message, the full conversation history is inserted as alternating `{role, content}` messages. The last user message is removed from history if it matches the current question. History is truncated to the last `maxContextMessages` (default 20) entries, then further truncated to fit within `MAX_CONTEXT_CHARS = 16000` (~4000 tokens).

---

## Final Message Array Sent to LLM

```json
[
  { "role": "system",  "content": "<blocks 1-6 concatenated>" },
  { "role": "user",    "content": "previous question 1" },
  { "role": "assistant","content": "previous answer 1" },
  ...  // up to maxContextMessages
  { "role": "user",    "content": "<birth chart data + current question>" }
]
```

---

## Wiring — How the Prompt Pipeline Connects to Other Components

```
invokeOracle (entry point)
  │
  ├─ loadRuntimeSettings() ──────────▶ reads oracle_settings for soul, model params, kill_switch
  │
  ├─ buildUniversalBirthContext() ───▶ reads user.birthData → produces [BIRTH CHART DATA] block
  │                                       (see 11-birth-context-injection.md)
  │
  ├─ getOracleFeature() ────────────▶ resolves active feature + depth → produces featureInjection
  │                                       (see 10-feature-system.md)
  │
  ├─ assembleJournalContext() ───────▶ reads journal_consent + journal_entries → produces [JOURNAL CONTEXT] block
  │                                       (see 12-journal-context-injection.md)
  │
  ├─ buildTimespaceContext() ────────▶ produces local datetime + cosmic weather
  │
  ├─ classifyOracleToolIntent() ─────▶ may auto-activate a feature → updates session → loop back to feature injection
  │                                       (see 13-intent-classification.md)
  │
  ├─ buildSystemPrompt() ────────────▶ concatenates blocks 1-6 (safety → soul → feature → timespace → journal → title/prompt dir)
  │
  ├─ buildUserMessage() ─────────────▶ concatenates birth data + sanitized question
  │
  └─ buildPrompt() ──────────────────▶ final message array [system, ...history, user]
                                         → sent to model chain
```