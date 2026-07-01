# Oracle AI System — Prompt Assembly Pipeline

> Source: ORACLE_EXPLAINED.md §4

The prompt is assembled by the **pipeline architecture**: each active pipeline (birth chart, journal recall, binaural beats, generic chat) contributes system prompt blocks and user message blocks. The orchestrator merges blocks from all active pipelines, sorts system blocks by priority, and concatenates them. Composition is done inline in `convex/oracle/llm.ts` — there is no separate `PromptComposer` class.

This replaces the older `buildPrompt()` / `buildSystemPrompt()` functions. The pipeline-driven approach enables:
- **Multi-intent composition**: birth_chart + journal_recall can be active simultaneously
- **Data-driven gathering**: each pipeline declares what it needs (birth data, journal context, timespace)
- **Priority-based ordering**: safety rules always first (priority 100), then other blocks
- **Pipeline-specific hooks**: e.g., binaural beats stores params after the response

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

### Block 1 — Safety Rules (`lib/oracle/safetyRules.ts`)

Hardcoded block starting with `[SAFETY - HIGHEST PRIORITY - NON-NEGOTIABLE]`. Contains:
- Absolute prohibitions (no predictions, no financial/gambling advice, no medical advice, no legal advice, no death predictions, no religion disparagement, no sexualization, no prompt leaking, no identity reveal)
- Crisis protocol (stop astrological conversation, redirect to professional support)
- Manipulation resistance (roleplay/hypothetical/instruction-override attempts still enforced)
- Identity protection, mid-response safety

**Not editable from admin panel. Not stored in the database. Changes require a code deploy.**

### Block 2 — Soul Document (`lib/oracle/soul.ts`)

The `DEFAULT_ORACLE_SOUL` defines Oracle's identity, voice, capabilities, and behavior. Also exports `MAX_RESPONSE_TOKENS_DEFAULT` (1000) and `MAX_CONTEXT_MESSAGES_DEFAULT` (20). Stored in DB under key `"oracle_soul"` and editable by admin. Key sections:
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

### Block 4 — Journal Context (pipeline-gated, consent-gated)

If a pipeline declares `needsJournalContext: true` **and** the user has granted consent (`journal_consent.oracleCanReadJournal === true`), `assembleJournalContext()` builds a `[JOURNAL CONTEXT]` block containing summaries of the user's recent journal entries. Not every session gets journal context — `binaural_beats` and `synastry` pipelines set `needsJournalContext: false`. The budget is expanded (doubled) when `journal_recall` is the active feature.

See [Journal Context Injection](./12-journal-context-injection.md) for the full context assembly specification.

### Block 5 — Title Directive (`lib/oracle/promptBuilder.ts`)

Hardcoded instruction wrapped in `[SESSION TITLE]` tags, requiring the model to output a `TITLE: <4-6 word title>` line at the very end. The directive notes the title line "will be used as metadata, not shown to the user." Only included on the first response.

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
Birth chart data is injected in the user message when the user has `birthData` saved **and** a pipeline declares `needsBirthData: true`. Only `birth_chart` and `synastry` pipelines do this. The `generic_chat` and `journal_recall` pipelines set `needsBirthData: false`. When data IS injected, the full chart is always included regardless of depth setting; the depth controls what the model *focuses on*, not what data it sees.

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
  ├─ scoreIntentsWithLLM() ──────────▶ LLM classify → regex fallback → IntentRouterResult
  │                                       (see 13-intent-classification.md)
  ├─ Resolve active pipelines ────────▶ map intents to pipeline objects, merge data requirements
  │
  ├─ Gather data per pipelines ──────▶ merged from ALL active pipelines
  │   ├─ buildUniversalBirthContext() ─▶ if ANY pipeline needs birth data
  │   ├─ assembleJournalContext()     ─▶ if ANY pipeline needs journal + consent
  │   └─ buildTimespaceContext()      ─▶ if ANY pipeline needs timespace
  │
  ├─ Each pipeline.buildPromptBlocks() ─ returns { systemBlocks[], userBlocks[] }
  │   ├─ birthChartPipeline   ──────────── depth instructions + birth data + [CHART DATA UNAVAILABLE]
  │   ├─ journalRecallPipeline ─────────── Cosmic Recall mode + journal context
  │   ├─ binauralBeatsPipeline ──────────── binaural protocol + personalization (needsBirthData=false)
  │   └─ genericChatPipeline   ──────────── soul-driven open conversation
  │
  ├─ Sort system blocks by priority (descending) ── safety=100, soul=90, features vary
  │
  ├─ Compose final prompt ──────────── safety + soul + merged feature blocks + timespace + journal + title
  │                                     + user blocks + sanitized question
  │
  └─ Iterate model chain ────────────▶ send to provider, stream response
```