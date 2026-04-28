# Oracle AI System — Full Technical Explanation (v2)

> This document provides a complete, in-detail technical explanation of the Oracle AI system at stars.guide, covering every layer from admin configuration through the LLM invocation pipeline to user-facing output. Includes Journal integration (consent-gated context, Cosmic Recall, journal prompt suggestions). Updated for Oracle Tools v2 architecture (universal birth context, unified birth_chart feature with dynamic depth, cross-context mixing). Last updated: 2026-04-28.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Admin Configuration Surface](#3-admin-configuration-surface)
4. [Prompt Assembly Pipeline](#4-prompt-assembly-pipeline)
5. [Multi-Provider Model Chain](#5-multi-provider-model-chain)
6. [Streaming Architecture](#6-streaming-architecture)
7. [Safety & Crisis Detection](#7-safety--crisis-detection)
8. [Session & Conversation Management](#8-session--conversation-management)
9. [Quota System](#9-quota-system)
10. [Feature System (Birth Chart, Cosmic Recall, etc.)](#10-feature-system-birth-chart-cosmic-recall-etc)
11. [Birth Context Injection](#11-birth-context-injection)
12. [Journal Context Injection](#12-journal-context-injection)
13. [Intent Classification (Auto-Activation)](#13-intent-classification-auto-activation)
14. [Cross-Context Mixing](#14-cross-context-mixing)
15. [User-Facing Flow (End-to-End Walkthrough)](#15-user-facing-flow-end-to-end-walkthrough)
16. [Operational Controls](#16-operational-controls)
17. [Session Title Generation](#17-session-title-generation)
18. [Key Design Decisions & Trade-offs](#18-key-design-decisions--trade-offs)

---

## 1. System Architecture Overview

The Oracle is a conversational astrology AI built on a **Convex + Next.js** stack. The architecture has five distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                       │
│  /oracle/new      — Landing page + first question input      │
│  /oracle/chat/[id] — Chat view with streaming responses      │
│  /admin/oracle/* — Admin settings UI                         │
│  Zustand Store   — Client-side Oracle state management       │
└──────────────────────────┬──────────────────────────────────┘
                           │ Convex React hooks
                           │ (useQuery, useMutation, useAction)
┌──────────────────────────▼──────────────────────────────────┐
│                   BACKEND (Convex)                            │
│  oracle/llm.ts       — invokeOracle action (Node runtime)   │
│  oracle/sessions.ts  — Session & message CRUD               │
│  oracle/settings.ts  — Admin settings read/write              │
│  oracle/quota.ts     — Server-authoritative quota checks      │
│  oracle/features.ts  — Feature injection queries             │
│  oracle/upsertProviders.ts — Provider/chain config mutations │
│  lib/adminGuard.ts   — Admin authorization enforcement        │
│                                                               │
│  ═══ Oracle Tools v2 Architecture ═══                        │
│  lib/oracle/features.ts — Unified birth_chart, intent         │
│                           classification with depth           │
│  lib/oracle/featureContext.ts — Universal birth context       │
│                                  builder + depth instructions │
│                                                               │
│  ═══ Journal Integration (consent-gated) ═══                 │
│  journal/context.ts  — [JOURNAL CONTEXT] block builder       │
│  journal/consent.ts  — Consent read/write for Oracle access   │
│  journal/entries.ts  — Journal entry reads for context        │
└──────────────────────────┬──────────────────────────────────┘
                           │ fetch (OpenAI-compatible API)
┌──────────────────────────▼──────────────────────────────────┐
│              INFERENCE PROVIDERS (external)                  │
│  OpenRouter, Ollama, OpenAI-compatible endpoints             │
│  Model fallback chain: Tier A → Tier B → Tier C → Tier D    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              JOURNAL SYSTEM (peer, consent-gated)            │
│  See tasks/JOURNAL_EXPLAINED.md for full documentation       │
│  Provides [JOURNAL CONTEXT] block when consent is granted   │
│  oracle_messages.journalPrompt — Journal prompt suggestions  │
│  journal_recall feature — Cosmic Recall with expanded context │
└─────────────────────────────────────────────────────────────┘
```

Key architectural properties:
- **Server-authoritative**: All quota checks, prompt assembly, and LLM calls happen server-side. Client-side quota displays are UX-only hints.
- **Streaming-first**: Tokens stream from the LLM through Convex into the reactive UI in near-real-time (300ms flush intervals).
- **Hardcoded safety first**: The safety rules block is hardcoded in code, always position 1 in the system prompt, and cannot be overridden by admin-editable settings.
- **Multi-provider resilience**: A ranked fallback chain tries multiple models/providers; if all fail, a hardcoded fallback message is returned.
- **Universal birth context** (v2): Birth data is ALWAYS injected into the prompt when available, regardless of which feature is active. Depth is controlled by instructions, not data scope.
- **Cross-context mixing** (v2): Birth data, journal context, and timespace context coexist in every prompt. A Cosmic Recall session can reference Venus placements because birth data is always present.

---

## 2. Database Schema

The Oracle uses five Convex tables defined in `convex/schema.ts`:

### `oracle_settings` (Table 12, schema lines 279-295)
Key-value configuration store. Every admin-editable setting is a row with:
- `key` — unique identifier (indexed)
- `value` — always stored as string, parsed at app layer
- `valueType` — `"string" | "number" | "boolean" | "json"`
- `label` — human-readable name for admin UI
- `description` — optional explanation
- `group` — categorization: `"soul" | "model" | "token_limits" | "provider" | "quota" | "operations" | "safety"`
- `updatedAt`, `updatedBy` — audit trail

**Known setting keys:**
| Key | Group | ValueType | Default | Purpose |
|-----|-------|-----------|---------|---------|
| `oracle_soul` | soul | string | DEFAULT_ORACLE_SOUL | Unified personality document |
| `temperature` | model | number | 0.82 | LLM sampling temperature |
| `top_p` | model | number | 0.92 | Nucleus sampling threshold |
| `stream_enabled` | model | boolean | true | Enable token-by-token streaming |
| `model_chain` | model | json | DEFAULT_MODEL_CHAIN | Ordered model fallback entries |
| `max_response_tokens` | token_limits | number | 1000 | `max_tokens` parameter to LLM |
| `max_context_messages` | token_limits | number | 20 | Max history messages in prompt |
| `providers_config` | provider | json | DEFAULT_PROVIDERS | Provider endpoint definitions |
| `quota_limit_free` | quota | number | 5 | Free tier question cap |
| `quota_limit_popular` | quota | number | 5 | Popular tier 24h cap |
| `quota_limit_premium` | quota | number | 10 | Premium tier 24h cap |
| `quota_limit_moderator` | quota | number | 10 | Moderator 24h cap |
| `quota_limit_admin` | quota | number | 999 | Admin cap |
| `kill_switch` | operations | boolean | false | Emergency Oracle off switch |
| `fallback_response_text` | safety | string | "The stars are momentarily beyond my reach..." | Hardcoded fallback copy |
| `crisis_response_text` | safety | string | "I see you, and what you're carrying right now matters deeply..." | Crisis response copy |

### `oracle_sessions` (Table 14, schema lines 312-332)
Conversation sessions. Each session tracks:
- `userId` — owner
- `title` — initially truncated question, replaced by AI-generated title
- `titleGenerated` — boolean, prevents re-triggering title generation
- `featureKey` — optional, e.g. `"birth_chart"` or `"journal_recall"`
- `birthChartDepth` — optional, `"core"` or `"full"` — controls reading depth when `featureKey === "birth_chart"`
- `status` — `"active"` or `"completed"`
- `messageCount` — denormalized counter
- `primaryModelUsed` — e.g. `"openrouter/google/gemini-2.5-flash"`
- `usedFallback` — true if Tier B+ was needed
- `starType` — optional `"beveled" | "cursed"` pin tier
- Timestamps: `createdAt`, `updatedAt`, `lastMessageAt`

### `oracle_messages` (Table 15, schema lines 334-354)
Individual messages within sessions:
- `sessionId` — foreign key to sessions (indexed)
- `role` — `"user"` or `"assistant"`
- `content` — message text
- `modelUsed` — which LLM produced this (assistant only)
- `promptTokens`, `completionTokens` — token usage metadata (assistant only)
- `fallbackTierUsed` — `"A" | "B" | "C" | "D"` (assistant only; D = hardcoded fallback)
- `systemPromptHash` — optional string; snapshot of system prompt for observability
- `journalPrompt` — optional string (assistant only); journal prompt suggested by Oracle via `JOURNAL_PROMPT:` line in response
- `createdAt`

### `oracle_quota_usage` (Table 13, schema lines 298-309)
Per-user quota tracking:
- `userId` — indexed
- `dailyCount` — questions in current 24h window
- `dailyWindowStart` — timestamp when window started
- `lifetimeCount` — total questions ever (never decremented)
- `lastQuestionAt`, `updatedAt`

### `oracle_feature_injections` (Table 11, schema lines 268-276)
Per-feature prompt augmentation blocks:
- `featureKey` — indexed, e.g. `"birth_chart"`, `"journal_recall"`, `"birth_chart_depth_core"`, `"birth_chart_depth_full"`
- `contextText` — the prompt block injected into the system prompt
- `isActive`, `version`, timestamps

---

## 3. Admin Configuration Surface

The admin UI lives at `/admin/oracle/settings` (file: `src/app/admin/oracle/settings/page.tsx`). It is a tabbed interface with 6 tabs:

### Tab 1: Soul
- Full-text editor for the unified soul document (`oracle_soul` key)
- Shows character count
- "Restore Default" button to reset to `DEFAULT_ORACLE_SOUL`
- Save triggers `upsertSetting` mutation

### Tab 2: Providers
- `ProviderManager` component (`src/components/oracle-admin/provider-manager.tsx`)
- Add/remove provider endpoints
- Each provider has: `id`, `name`, `type` (openrouter/ollama/openai_compatible), `baseUrl`, `apiKeyEnvVar`
- API keys are NOT stored in the database — only the **environment variable name** is stored. The actual key is read from `process.env[provider.apiKeyEnvVar]` at invocation time.
- Saved as JSON string via `upsertProvidersConfig` mutation which validates with `validateProvidersConfig()`

### Tab 3: Model
- `ModelChainEditor` component (`src/components/oracle-admin/model-chain-editor.tsx`)
- Ordered list of `{providerId, model}` entries with drag reorder
- Each entry shows its fallback tier badge (A, B, C...)
- Model combobox with known model suggestions per provider type
- Temperature slider (0–1, step 0.05, default 0.82)
- Top-p slider (0.5–1, step 0.01, default 0.92)
- Streaming toggle (default on)
- Saves providers + chain + temperature + top_p + stream_enabled atomically

### Tab 4: Limits
- `max_response_tokens` — sent as `max_tokens` to the LLM (100–16000, default 1000)
- `max_context_messages` — max conversation history messages in prompt (2–100, default 20)

### Tab 5: Quotas
- Per-role quota limits: free, popular, premium, moderator, admin
- Free tier uses lifetime cap; all others use rolling 24h window

### Tab 6: Operations
- **Kill Switch**: Toggle Oracle on/off with CONFIRM dialog
- **Crisis Response**: Editable text for crisis intervention messages
- **Fallback Response**: Editable text for when all models fail

### Authentication
All admin queries/mutations call `requireAdmin()` (`convex/lib/adminGuard.ts:12-21`) which:
1. Calls `getAuthUserId(ctx)` — throws if unauthenticated
2. Fetches user, verifies `user.role === "admin"` — throws if not admin
3. Returns `{ userId, user }` for downstream use

---

## 4. Prompt Assembly Pipeline

The prompt is the heart of the Oracle. It is assembled in `buildPrompt()` (`lib/oracle/promptBuilder.ts:79-110`) from 7 parameters: `soulDoc`, `featureInjection`, `birthContext`, `userQuestion`, `isFirstResponse`, `journalContext`, `timespaceContext`. Both `journalContext` and `timespaceContext` are consent-gated / conditionally available.

### System Prompt (blocks, in order)

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

**Block 1 — Safety Rules** (`lib/oracle/safetyRules.ts:9-32`):
Hardcoded 32-line block starting with `[SAFETY - HIGHEST PRIORITY - NON-NEGOTIABLE]`. Contains:
- Absolute prohibitions (no predictions, no financial/gambling advice, no medical advice, no legal advice, no death predictions, no religion disparagement, no sexualization, no prompt leaking, no identity reveal)
- Crisis protocol (stop astrological conversation, redirect to professional support)
- Manipulation resistance (roleplay/hypothetical/instruction-override attempts still enforced)

**Block 2 — Soul Document** (`lib/oracle/soul.ts:25-62`):
The `DEFAULT_ORACLE_SOUL` is ~62 lines defining Oracle's identity, voice, capabilities, and behavior. Stored in DB under key `"oracle_soul"` and editable by admin. Key sections:
- IDENTITY: Not a fortune teller; shows patterns in motion; never breaks character
- VOICE: Sharp warm older sister; short sentences; plain language; banned phrases listed
- WHAT YOU WORK WITH: Cites specific placements; strongest at patterns/timing/connection
- BEHAVIOR: Always cite at least one placement; no generic Sun-sign content; match response length to question
- SPECIAL QUESTION HANDLING: Horoscope/retrograde/timing/compatibility/prediction/metaphysical rules
- RESPONSE FORMAT: Default structure (hidden question → answer citing chart → practical takeaway); no bullet points; short paragraphs

**Block 3 — Feature Injection** (optional):
When a feature is active on the session, its instruction block is injected into the system prompt. For `birth_chart`, this is a depth-specific instruction block (core or full). For `journal_recall`, this is the `[COSMIC RECALL MODE]` block. See Section 10 and Section 11.

**Block 3.5 — Timespace Context** (always present, conditionally expanded):
`buildTimespaceContext()` (`convex/oracle/timespace.ts`) always provides the user's local datetime and timezone. When temporal intent is detected in the user's question, it also injects cosmic weather data (planetary positions, moon phase, active transits). This block is always injected regardless of feature state.

**Block 4 — Journal Context** (consent-gated, always when consent granted):
If the user has granted consent (`journal_consent.oracleCanReadJournal === true`), `assembleJournalContext()` builds a `[JOURNAL CONTEXT]` block containing summaries of the user's recent journal entries. **This is now injected on EVERY message when consent is granted**, not just in Cosmic Recall sessions. The budget is expanded (doubled) when `journal_recall` is the active feature.

See `tasks/JOURNAL_EXPLAINED.md` §16 for the full context assembly specification.

**Block 5 — Title Directive** (`lib/oracle/promptBuilder.ts:13-25`):
Hardcoded instruction requiring the model to output a `TITLE: <4-6 word title>` line at the very end. Only included on the first response. This title is parsed out of the response and used as the session title.

**Block 6 — Journal Prompt Suggestion Directive** (optional):
Only included when journal context is present AND it's the first response. Instructs Oracle that it MAY optionally output a `JOURNAL_PROMPT: <reflective question>` line if its response naturally touches on emotional themes. This is parsed from the response, stored on the message as `journalPrompt`, and surfaced in the UI as a "Journal about this" button. See `tasks/JOURNAL_EXPLAINED.md` §19.

### User Message (2 blocks)

Built by `buildUserMessage()` (`lib/oracle/promptBuilder.ts:61-73`):

```
[Block 1: [BIRTH CHART DATA]]               ← if birth data available (universal, always injected)
[Block 2: sanitized user question]
```

**Universal Birth Data** (v2 architectural change):
Birth chart data is ALWAYS injected in the user message when the user has `birthData` saved — regardless of which feature is active. This is the key v2 change: birth data is not feature-gated. A Cosmic Recall session can reference the user's Venus placement because the full chart is always present. The same full data is injected for both "core" and "full" depth readings; the depth controls what the model *focuses on*, not what data it sees.

**Sanitization** (`lib/oracle/promptBuilder.ts:102-106`):
Before the user's text enters the prompt, `sanitizeUserQuestion()` strips any bracket-tagged content matching `[SYSTEM...]`, `[BIRTH...]`, `[USER...]`, `[FEATURE...]`, `[SAFETY...]`, `[END...]` to prevent tag injection attacks.

**Conversation History**:
Between the system prompt and the final user message, the full conversation history is inserted as alternating `{role, content}` messages. The last user message is removed from history if it matches the current question. History is truncated to the last `maxContextMessages` (default 20) entries, then further truncated to fit within `MAX_CONTEXT_CHARS = 16000` (~4000 tokens).

### Final Message Array Sent to LLM

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

## 5. Multi-Provider Model Chain

The Oracle uses a **ranked fallback chain** of LLM models, each backed by a configured provider. This is the core resilience mechanism.

### Configuration

**Providers** (`src/lib/oracle/providers.ts:11-17`):
```typescript
interface ProviderConfig {
  id: string;          // e.g. "openrouter"
  name: string;        // "OpenRouter"
  type: ProviderType;  // "openrouter" | "ollama" | "openai_compatible"
  baseUrl: string;     // "https://openrouter.ai/api/v1"
  apiKeyEnvVar: string; // "OPENROUTER_API_KEY"
}
```

**Model Chain** (`src/lib/oracle/providers.ts:19-22`):
```typescript
interface ModelChainEntry {
  providerId: string;  // references a ProviderConfig.id
  model: string;       // e.g. "google/gemini-2.5-flash"
}
```

**Defaults** (`src/lib/oracle/providers.ts:24-38`):
```
Provider: OpenRouter (openrouter, https://openrouter.ai/api/v1)
Chain:
  Tier A: openrouter / google/gemini-2.5-flash
  Tier B: openrouter / anthropic/claude-sonnet-4
  Tier C: openrouter / x-ai/grok-4.1-fast
```

### Fallback Logic

In `invokeOracle` (`convex/oracle/llm.ts`):

```pseudo
for each entry in modelChain (index i):
  tier = tierForIndex(i)  // 0→"A", 1→"B", 2→"C", ...
  provider = find provider where provider.id == entry.providerId
  if provider not found: skip, log error
  try:
    result = callProviderStreaming(provider, entry.model, ...)
    if result:
      persist message, increment quota
      return { content, modelUsed, fallbackTier }
  catch error:
    log error, continue to next entry

# All models failed:
return hardcoded fallback message (Tier D)
```

The tier label function (`providers.ts:44-48`): index 0 → "A", 1 → "B", ..., 25 → "Z", beyond that uses numeric index.

### Request Construction

For each attempt, `callProviderStreaming()` builds:

1. **URL**: `buildProviderUrl(provider)` — strips trailing slashes, appends `/chat/completions`
2. **Headers**: `buildProviderHeaders(provider, apiKey)`:
   - OpenRouter: `Authorization: Bearer {key}`, `HTTP-Referer: https://stars.guide`, `X-Title: Stars.Guide Oracle`
   - Ollama: optional `Authorization: Bearer {key}` if key present
   - OpenAI-compatible: `Authorization: Bearer {key}`
   - All: `Content-Type: application/json`

3. **Body**:
```json
{
  "model": "<entry.model>",
  "messages": [system, ...history, user],
  "temperature": 0.82,
  "max_tokens": 1000,
  "top_p": 0.92,
  "stream": true
}
```

4. **API key resolution**: `process.env[provider.apiKeyEnvVar]` — keys are never in the DB, only env var names.

### Validation

On admin save, `upsertProvidersConfig` (`convex/oracle/upsertProviders.ts:11-81`) calls:
- `validateProvidersConfig()` — checks unique IDs, valid types, non-empty baseUrls, apiKeyEnvVar required for non-Ollama
- `validateModelChain()` — checks all providerId references exist, no duplicate provider+model combos, valid model strings

---

## 6. Streaming Architecture

The Oracle streams tokens in real-time from the LLM through Convex into the React UI.

### Non-streaming path (stream_enabled = false)

`convex/oracle/llm.ts`:
1. Parse complete JSON response
2. Extract `content` from `choices[0].message.content`
3. Parse title from content (`parseTitleFromResponse`)
4. Create streaming message placeholder via `createStreamingMessage`
5. Immediately finalize with `finalizeStreamingMessage`
6. Return

### Streaming path (stream_enabled = true, default)

`convex/oracle/llm.ts`:

1. **Create message placeholder**: `createStreamingMessage` inserts an empty `oracle_messages` row (role=assistant, content="")
2. **Read SSE stream**: Uses `response.body.getReader()` + `TextDecoder` to read Server-Sent Events
3. **Parse chunks**: Each `data: {json}` line is parsed; `choices[0].delta.content` tokens are appended to `fullContent`
4. **Periodic flush**: Every 100ms (first 2s) then 300ms, the accumulated content is written to Convex via `updateStreamingContent` — this triggers Convex reactivity which updates the UI
5. **Track usage**: If `parsed.usage` exists, `promptTokens` and `completionTokens` are captured
6. **On stream complete**: Parse title from full response, strip title line, write final cleaned content via `updateStreamingContent`, then call `finalizeStreamingMessage` with metadata (model, tokens, tier)
7. **Error handling**: If stream errors mid-way with partial content, the partial content is kept. If stream errors with zero content, a recovery message is inserted.

### Convex Internal Mutations for Streaming

These are `internalMutation` (not publicly callable):
- `createStreamingMessage` (`sessions.ts`): Creates empty assistant message, increments session messageCount
- `updateStreamingContent` (`sessions.ts`): Patches message content in-place (called every 100-300ms during streaming)
- `finalizeStreamingMessage` (`sessions.ts`): Sets final content, modelUsed, tokens, tier; updates session metadata (primaryModelUsed, usedFallback, status)

### Client-side streaming behavior

On the chat page (`src/app/oracle/chat/[sessionId]/page.tsx`):
1. Client calls `invokeOracle` action (Convex useAction)
2. Client sets `isStreaming = true`
3. Convex reactive query `getSessionWithMessages` automatically updates as `updateStreamingContent` writes partial content
4. The chat UI renders messages from this reactive query, showing the growing content with a blinking cursor
5. When the action resolves, client sets `isStreaming = false`

---

## 7. Safety & Crisis Detection

### Hardcoded Safety Rules (Section 4, Block 1)

The safety rules are deliberately **not editable** from the admin panel and **not stored in the database**. Changing them requires a code deploy. They are always the first block in the system prompt and prefixed with `[SAFETY - HIGHEST PRIORITY - NON-NEGOTIABLE]`.

This is a deliberate design choice: safety rules should require engineering review, not just admin access.

### Crisis Detection (pre-LLM)

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

### Kill Switch (pre-LLM)

`convex/oracle/llm.ts`:

The first thing `invokeOracle` does is check the `kill_switch` setting:
1. If `"true"`, immediately return the `fallback_response_text` (or default)
2. Persist as assistant message with `modelUsed: "kill_switch"`, `fallbackTierUsed: "D"`
3. No LLM call is made
4. No quota consumed

### Input Validation (pre-LLM)

`convex/oracle/llm.ts`:
- Maximum question length: 2000 characters (`MAX_USER_QUESTION_LENGTH`)

### Prompt Injection Defense (post-input)

`lib/oracle/promptBuilder.ts`:
- `sanitizeUserQuestion()` strips any `[SYSTEM...]`, `[BIRTH...]`, `[USER...]`, `[FEATURE...]`, `[SAFETY...]`, `[END...]` tagged content from user input

---

## 8. Session & Conversation Management

### Lifecycle

1. **Creation** — `createSession` mutation (`sessions.ts`):
   - Requires authenticated user
   - Stores `userId`, `featureKey` (optional), initial title (first 40 chars of question + "..."), status="active"
   - Inserts first user message into `oracle_messages`
   - Returns `sessionId`

2. **Oracle Invocation** — `invokeOracle` action (`llm.ts`):
   - Loads session with all messages
   - Verifies session belongs to user
   - Assembles prompt, tries model chain
   - Persists assistant message
   - Increments quota (first response only)
   - Generates title (first response only)

3. **Follow-up Questions** — `addMessage` mutation + `invokeOracle` action:
   - Client calls `addMessage` to persist user message
   - Client calls `invokeOracle` with the same question text
   - The full conversation history is included in the prompt (truncated to `maxContextMessages`)

4. **Session List** — `getUserSessions` query (`sessions.ts`):
   - Returns last 50 sessions for current user, ordered by most recent

5. **Session Operations**:
   - `updateSessionStatus` — mark active/completed
   - `updateSessionFeature` — change which feature is active
   - `updateSessionBirthChartDepth` — change birth chart reading depth (core/full), internal mutation only
   - `renameSession` — manually change session title
   - `setSessionStarType` — assign "beveled" or "cursed" pin tier
   - `deleteSession` — cascade delete all messages then session

### Legacy Session Migration

Sessions created before Oracle Tools v2 may have `featureKey: "birth_chart_core"` or `"birth_chart_full"`. On the next `invokeOracle` call, these are automatically migrated:
- `resolvedFeatureKey` is set to `"birth_chart"`
- The session is patched via `updateSessionFeature` with the new key
- `birthChartDepth` is set to `"full"` if the old key was `birth_chart_full`, `"core"` otherwise
- This migration happens transparently; users see no disruption

---

## 9. Quota System

### Server-Authoritative Design

The quota check happens in `checkQuota` (`convex/oracle/quota.ts:14-73`). This is a **Convex query** — the server is the authority. Client-side displays are only UX hints.

### Quota Logic by Plan

| Plan | Reset Type | Behavior |
|------|-----------|----------|
| free | Lifetime | `limit - lifetimeCount`; never resets |
| popular | Rolling 24h | `limit - dailyCount`; resets when window expires |
| premium | Rolling 24h | Same as popular |
| moderator | Rolling 24h | Same as popular |
| admin | Rolling 24h | Same, but very high limit (999) |

The plan is determined by: `(user.role === "admin" || user.role === "moderator") ? user.role : user.tier`

### Reading Limits

- Limit: read from `oracle_settings` key `quota_limit_{plan}` (defaults: free=5, popular=5, premium=10, moderator=10, admin=999)
- Reset type: read from `oracle_settings` key `quota_reset_{plan}` (default: free="never", others not in defaults — falls to "never" then uses daily)

### Increment

`incrementQuota` mutation (`quota.ts:82-127`):
- Called only after a successful LLM response (not for crisis/kill-switch/hardcoded-fallback)
- Increments both `dailyCount` and `lifetimeCount`
- If 24h window expired, resets `dailyCount` to 1 and starts new window

### Client-side UX

- First question page: shows "X questions remaining" with reset time
- Chat page: shows remaining count; when exhausted, shows upgrade CTA or countdown timer
- Free tier lifetime cap → upgrade prompt
- Daily cap → countdown timer until reset

---

## 10. Feature System (Birth Chart, Cosmic Recall, etc.)

### Oracle Tools v2 Architecture

The v2 architecture unifies the two birth chart features into a single `birth_chart` tool with a `depth` field (`"core"` or `"full"`). Birth chart **data** is always injected (not feature-gated). Birth chart **instructions** vary by depth.

### Feature Definitions

Defined in `src/lib/oracle/features.ts`. Seven features are registered:

| Key | Label | Implemented | Requires Birth Data | Requires Journal Consent | Menu Group |
|-----|-------|-------------|---------------------|--------------------------|------------|
| `attach_files` | Add photos & files | No | No | No | primary |
| `birth_chart` | Birth chart analysis | Yes | Yes | No | primary |
| `synastry_core` | Synastry analysis | No | Yes | No | more |
| `synastry_full` | Deep synastry analysis | No | Yes | No | more |
| `sign_card_image` | Create sign card image | No | Yes | No | more |
| `binaural_beat` | Create binaural beat | No | No | No | more |
| `journal_recall` | Cosmic Recall | Yes | No | Yes | primary |

Only `birth_chart` and `journal_recall` are currently implemented.

### Feature Selection Flow

1. User opens the `+` menu in `OracleInput` component
2. Clicks a feature → `onFeatureSelect(featureKey)` is called
3. In `/oracle/new`: stores in Zustand, focuses input, pre-fills default prompt
4. In `/oracle/chat/[id]`: calls `updateSessionFeature` mutation to persist to session, also updates Zustand
5. When user submits, the `featureKey` is passed to `createSession`

### Feature Injection

When `invokeOracle` detects an active feature on the session (`session.featureKey`):

1. Resolves the `OracleFeatureDefinition` via `getOracleFeature()`
2. For `birth_chart`:
   - Reads `session.birthChartDepth` (defaults to `"core"` if unset)
   - Attempts to load `oracle_feature_injections` for key `birth_chart_depth_{core|full}` (admin-editable)
   - Falls back to hardcoded `getBirthChartDepthInstructions(depth)` from `featureContext.ts`
   - The instruction block goes into the system prompt; the data goes into the user message separately
3. For other features:
   - Queries `oracle_feature_injections` table for a matching `featureKey` row → this becomes the `featureInjection` string injected into the system prompt
   - Falls back to `activeFeature.fallbackInjectionText`
4. Birth data is ALWAYS injected regardless of feature — see Section 11

### Default Prompts

Features can define a `defaultPrompt` that pre-fills the input:
- `birth_chart`: "Analyze my birth chart through my Sun, Moon, and Ascendant, including the houses they fall in."
- `journal_recall`: "Look through my journal and help me find patterns"

### Sign Preview Cards

When `birth_chart` is the active feature, `OracleSignPreviewCards` renders the user's Sun/Moon/Ascendant signs as visual cards above the input, showing sign icon, sign name, element, and house.

---

## 11. Birth Context Injection

> This section documents the v2 universal birth context architecture. Birth data is always injected when the user has it saved — regardless of which feature is active. Depth is controlled by instructions, not data scope.

### Architecture: Data vs. Instructions

The v2 architecture separates **birth data** from **birth chart reading instructions**:

| Layer | Where | What | When |
|-------|-------|------|------|
| Birth data | User message (`[BIRTH CHART DATA]`) | All placements, houses, aspects | ALWAYS when `user.birthData` exists |
| Reading instructions | System prompt (feature injection) | Core depth or Full depth instructions | Only when `birth_chart` feature is active |

This separation is the key v2 change. Previously, "core" mode threw away most of the data (only injecting Sun/Moon/Ascendant), and "full" mode injected everything. Now both depths get the SAME full data — the instruction block tells the model which to focus on.

### Universal Birth Context Builder

`buildUniversalBirthContext()` in `src/lib/oracle/featureContext.ts`:

This function is called **before** feature selection check in `invokeOracle`, making it independent of `activeFeature`. It ALWAYS returns the full chart:

```
Treat the stored chart data below as canonical truth. Do not invent different signs, houses, or aspects.
Birth data: 2000-04-14 at 15:17
Location: New York, US | Timezone: America/New_York

Canonical stored placements:
- Ascendant: Cancer (House 1, direct)
- Sun: Aries 14.25° (House 10, direct, dignity: exaltation)
- Moon: Pisces 22.01° (House 9, direct)
- Mercury: Aries 8.10° (House 10, retrograde)
- Venus: Gemini 1.66° (House 11, direct, dignity: domicile)
- Mars: Leo 15.30° (House 2, direct)
... (all 14 placements)

House signatures:
H1:Cancer | H2:Leo | H3:Virgo | ... | H12:Gemini

Stored aspects:
- Sun conjunction Venus (orb 1.66°)
- Moon trine Jupiter (orb 0.82°)
... (up to 8, sorted by tightest orb)
```

### Depth-Specific Instructions

When `birth_chart` is the active feature, a depth-specific instruction block is injected into the system prompt:

**Core Depth** (`birth_chart_depth_core`):
```
[BIRTH CHART READING — CORE DEPTH]
Focus on how the Big Three (Sun, Moon, Ascendant) interact as a triad.
Explain each house placement — the house IS the context, the sign is the style.
For aspects, prioritize the tightest orbs. Name what the aspect creates.
Identify the primary tension or friction point and name it directly.
Output format: 1) Chart Ruler / Core Identity, 2) The Big Three, 3) Key Aspects, 4) Tension/Friction.
[END BIRTH CHART READING — CORE DEPTH]
```

**Full Depth** (`birth_chart_depth_full`):
```
[BIRTH CHART READING — FULL DEPTH]
Give a layered interpretation of the full chart while staying anchored to the stored placements.
Prioritize deeper synthesis: themes, clusters, houses, aspects, Nodes, Part of Fortune.
Identify the primary tension AND the primary gift. Name both directly.
[END BIRTH CHART READING — FULL DEPTH]
```

Both depths receive the SAME data via the user message. The instructions just tell the model where to focus.

### Depth Resolution

In `invokeOracle`:
1. If `session.featureKey === "birth_chart"`, read `session.birthChartDepth`
2. If `birthChartDepth` is not set, default to `"core"`
3. Load depth instructions: try DB injection (`birth_chart_depth_core` / `birth_chart_depth_full`), fall back to hardcoded `getBirthChartDepthInstructions(depth)`

### Data Sources

The birth context builder reads from `user.birthData` which has two schemas:
1. **Legacy**: `birthData.placements[]` with `{body, sign, house}`
2. **Chart**: `birthData.chart` with ascendant, planets (with longitude/retrograde/dignity), houses, aspects

Both are handled gracefully. The builder resolves placements from `chart.planets` first, falling back to `placements`.

### birthCalculator.ts (alternate, currently unused in LLM path)

`src/lib/oracle/birthCalculator.ts` provides `calculateBirthContext()` and `calculateDegradedBirthContext()` which compute charts on-the-fly from raw birth data. These are designed for when birth data changes and the chart hasn't been pre-stored. The current LLM path uses pre-stored chart data via `buildUniversalBirthContext()` instead.

### Token Budget

Full birth data injection costs ~450 tokens vs. ~175 tokens for the old core-only data. The net cost difference is ~0.03 cents per message — negligible given the architectueal simplicity it enables.

---

## 12. Journal Context Injection

The Journal system provides a consent-gated `[JOURNAL CONTEXT]` block that is injected into Oracle's system prompt when the user has granted access. This is Oracle's single biggest differentiator — it can reference the user's actual emotional patterns, correlate them with astrological transits, and give dramatically more personalized readings.

See `tasks/JOURNAL_EXPLAINED.md` for the complete Journal system documentation. Below is the Oracle-specific integration.

### How Journal Context Enters the Oracle Pipeline (v2)

In `invokeOracle` (`convex/oracle/llm.ts`):

1. Journal consent is checked BEFORE intent classification, so the classifier can gate `journal_recall` activation:
   ```typescript
   let hasJournalConsent = false;
   if (user?._id) {
       try {
           const consent = await ctx.runQuery(api.journal.consent.getConsent, {});
           hasJournalConsent = consent?.oracleCanReadJournal === true;
       } catch (e) {
           // Non-blocking
       }
   }
   ```

2. After feature injection and birth context assembly, journal context is ALWAYS assembled when consent is granted — **not just in Cosmic Recall sessions**:
   ```typescript
   const isCosmicRecall = activeFeature?.key === "journal_recall";
   try {
       if (user?._id && hasJournalConsent) {
           journalContext = await ctx.runQuery(
               internal.journal.context.assembleJournalContext,
               { userId: user._id, expandedBudget: isCosmicRecall },
           );
       }
   } catch (e) {
       journalContext = null;
   }
   ```

3. `journalContext` is passed to `buildPrompt()` and inserted into the system prompt.

4. When journal context is present, the `JOURNAL_PROMPT_DIRECTIVE` is also included, instructing Oracle that it may suggest a journal prompt.

### Consent Enforcement

The `assembleJournalContext` function (`convex/journal/context.ts`) queries `journal_consent` for the user. If `oracleCanReadJournal !== true`, it immediately returns `null`. This is enforced **server-side** — the client cannot bypass it.

### Granular Data Inclusion

The context builder respects four consent flags:

| Flag | Effect on Journal Context |
|------|------------------------|
| `includeEntryContent` | If false, entry text is omitted from summaries |
| `includeMoodData` | If false, emotions and energy level are omitted |
| `includeDreamData` | If false, dream-specific data is omitted |
| `lookbackDays` | Controls how many days of entries Oracle can see (30/90/365/9999) |

### Budget Constraints

| Context Type | Budget | Max Entry Chars | Max Entries |
|-------------|--------|-----------------|------------|
| Normal (any feature with consent) | 4,000 | 500 | 10 |
| Cosmic Recall (expanded) | 8,000 | 1,000 | 20 |

### Journal Prompt Parsing

After Oracle generates a response, `parseJournalPromptFromResponse()` (`lib/oracle/promptBuilder.ts`) checks for a `JOURNAL_PROMPT: <text>` line. If found:
1. The prompt text is extracted and stripped of quotes
2. The `JOURNAL_PROMPT:` line is removed from the displayed content
3. The prompt is stored on the `oracle_messages` row as `journalPrompt`
4. The UI shows a "✦ Journal about this" button that navigates to the composer with the prompt pre-filled

### Cosmic Recall Feature

`journal_recall` is an Oracle feature (`menuGroup: "primary"`, `implemented: true`, `requiresJournalConsent: true`) that gives Oracle deep access to the user's journal for pattern analysis.

**What's different from normal journal context:**
- `expandedBudget: true` → all limits doubled
- Feature injection text: `[COSMIC RECALL MODE]` block instructs Oracle to search journal entries, cite specific dates, and connect emotional patterns to astro events
- The Oracle input menu checks `requiresJournalConsent` and queries consent status; if not granted, the feature is disabled with "Requires journal access" tooltip

**What's the same (v2 change):**
- Journal context is now always present in the system prompt when consent is granted, even in non-Cosmic-Recall sessions. The difference is only the budget and the feature instructions.

---

## 13. Intent Classification (Auto-Activation)

The Oracle can automatically activate features based on the user's natural language question, without requiring the user to click the `[+]` menu. This is handled by `classifyOracleToolIntent()` in `src/lib/oracle/features.ts`.

### Interface

```typescript
export type BirthChartDepth = "core" | "full";

export interface ToolIntentResult {
  featureKey: OracleFeatureKey | null;  // The tool to auto-activate, or null
  depth?: BirthChartDepth;              // For birth_chart only: reading depth
  reason: string;                       // Why this decision was made
}
```

### Pipeline

When `invokeOracle` runs and no feature is active on the session:

1. Fetch journal consent status
2. Call `classifyOracleToolIntent(question, currentFeatureKey, hasBirthData, hasJournalConsent)`
3. If intent matches, persist both `featureKey` and `depth` to the session:
   ```typescript
   if (intent.featureKey) {
       await ctx.runMutation(api.oracle.sessions.updateSessionFeature, {
           sessionId, featureKey: intent.featureKey,
       });
       if (intent.depth) {
           await ctx.runMutation(internal.oracle.sessions.updateSessionBirthChartDepth, {
               sessionId, depth: intent.depth,
           });
       }
   }
   ```

### Priority Order

Classification follows a strict priority order:

1. **If feature already active** → return `{ featureKey: null, reason: "manual" }` — never override explicit user choice
2. **Journal recall patterns** → if matched AND `hasJournalConsent === true` → `{ featureKey: "journal_recall", reason: "journal_intent" }`
3. **Birth chart full patterns** → if matched AND `hasBirthData === true` → `{ featureKey: "birth_chart", depth: "full", reason: "deep_chart_intent" }`
4. **Birth chart core patterns** → if matched AND `hasBirthData === true` → `{ featureKey: "birth_chart", depth: "core", reason: "core_chart_intent" }`
5. **No match** → `{ featureKey: null, reason: "no_match" }`

**Why journal before birth chart:** Journal intent is explicit ("journal", "entries", "Cosmic Recall"). Birth chart intent is broader ("chart", "placements"). Running journal first prevents a journal question like *"What did I journal about my chart?"* from being misclassified as a birth chart request.

### Consent Gates

Both birth chart and journal recall are consent-gated at the classifier level:
- **No birth data** → `birth_chart` patterns return `null`, no auto-activation
- **No journal consent** → `journal_recall` patterns return `null`, no auto-activation

This means the AI responds generically without the relevant context, which is the correct behavior — the user simply hasn't provided the required data or consent.

### Pattern Sets

**`BIRTH_CHART_FULL_PATTERNS`** (10 patterns, checked before core — more specific):
```
"deep analysis of my chart", "deep dive into my chart", "all my placements",
"read my entire chart", "Venus in my chart", "what about my nodes",
"my houses", "aspects in my chart", "synthesize my full chart",
"chart ruler", "domicile", "exaltation"
```

**`BIRTH_CHART_CORE_PATTERNS`** (9 patterns, broader):
```
"analyze my birth chart", "my Sun sign", "what does my chart say",
"read my chart", "my birth chart", "dive into my chart",
"what do my placements", "interpret my chart", "full chart analysis"
```

**`JOURNAL_RECALL_PATTERNS`** (12 patterns, explicit journal intent):
```
"cosmic recall", "recall my journal", "look through my journal",
"search my journal", "what did I journal about", "my journal entries",
"patterns in my journal", "connect my journal to astrology",
"what was I experiencing based on my journal", "my journal says",
"what happened on [date]", "dig into my journal"
```

User-facing patterns intentionally include `natal\s*chart` as a synonym — users do say "natal chart", and the regexes match it alongside "birth chart".

### Reclassification

If `session.featureKey` is already set (manually or from prior auto-activation), classification is skipped. This means:
- Once a tool is set, it stays locked for the session
- Users who want to switch tools start a new session (same behavior as clicking `[+]` → selecting a new feature)

### Relaxed Rule for Generic Sessions

When `featureKey === null` (no feature active), classification re-runs on EVERY message (not just the first). This covers:
- Message 1: "Hey" → no tool
- Message 2: "Analyze my birth chart" → auto-activate `birth_chart`

Once a tool is activated, it persists for the session.

---

## 14. Cross-Context Mixing

This is the biggest UX win of the v2 architecture. Because birth data is always injected (not feature-gated) and journal context is always injected (not feature-gated), multiple context blocks coexist in every prompt.

### Context Visibility by Session Type

| Session type | Birth data visible | Journal visible | Timespace visible |
|--------------|-------------------|-----------------|-------------------|
| Generic chat (no tool) | ✅ (if saved) | ✅ (if consent) | ✅ |
| `birth_chart` (core or full) | ✅ | ✅ (if consent) | ✅ |
| `journal_recall` | ✅ (if saved) | ✅ (expanded budget) | ✅ |

### Example: Cosmic Recall + Birth Chart

User: *"Look through my journal and tell me why my relationships have been so intense lately."*

**Injected context:**
```
[SYSTEM PROMPT]
[COSMIC RECALL MODE] instructions
...
[SYSTEM PROMPT continues with journal context, timespace, etc.]

[USER MESSAGE]
[BIRTH CHART DATA]
Treat the stored chart data below as canonical truth...
Sun: Gemini (House 11) | Venus: Gemini (House 11) | ... all placements ...
House signatures: H1:Leo | ...
Stored aspects: Sun conjunction Venus (orb 1.66°) | ...
[END BIRTH CHART DATA]

Look through my journal and tell me why my relationships have been so intense lately.
```

The AI can now:
1. Search journal entries for relationship mentions
2. See the user's Sun-Venus conjunction in Gemini (H11 — house of friendship/community)
3. Check if any transits are currently activating Venus
4. Give an answer that connects journal patterns + birth chart + current transits

This cross-context mixing is the future of the Oracle.

---

## 15. User-Facing Flow (End-to-End Walkthrough)

### Phase 1: User Opens Oracle

1. User navigates to `/oracle` → server-side redirect to `/oracle/new`
2. Layout (`src/app/oracle/layout.tsx`) wraps all oracle pages with sidebar + top bar
3. `OracleNewPage` renders: greeting with username, Oracle icon with pulse animation, `OracleInput` component
4. Client queries `checkQuota` and `getSetting("kill_switch")`
5. If kill switch is on, shows "The Oracle rests" instead of input
6. Quota remaining is displayed below input

### Phase 2: User Types Question

1. User types in `OracleInput` — standard text input with Enter-to-send
2. Optional: user selects a feature from `+` dropdown menu
3. If feature requires birth data but user has none, the feature context will include a "birth data unavailable" block (handled server-side)
4. If feature requires journal consent but user hasn't granted it, the feature is disabled in the dropdown with "Requires journal access" tooltip
5. Zustand store tracks `pendingQuestion` and `selectedFeatureKey`

### Phase 3: User Submits

1. `handleSubmit` in `OracleNewPage` calls `createSession` mutation with `{ featureKey, questionText }`
2. `createSession` creates `oracle_sessions` row + first `oracle_messages` row (role=user)
3. Returns `sessionId`
4. Zustand: `setSessionId(sessionId)`, `setOracleResponding()`
5. Client navigates to `/oracle/chat/${sessionId}`

### Phase 4: Oracle Invokes

1. `OracleChatPage` renders, observes `state === "oracle_responding"`
2. Detects there's a user message without a corresponding assistant response
3. Calls `invokeOracle` action with `{ sessionId, userQuestion, timezone }`
4. **Server-side execution** (the full `invokeOracle` pipeline):
   a. Input validation (max length check)
   b. Kill switch check → if on, return fallback
   c. Crisis detection → if triggered, return crisis response
   d. Load session + messages
   e. Load runtime settings (soul, model params, providers, chain)
   f. Load user (birthData, identity)
   g. **Build universal birth context** — ALWAYS if `user.birthData` exists (`buildUniversalBirthContext`)
   h. Resolve active feature (with legacy migration for `birth_chart_core`/`birth_chart_full`)
   i. Fetch journal consent status
   j. Run intent classification (`classifyOracleToolIntent`) if no feature active — auto-activate and persist `featureKey` + `birthChartDepth`
   k. Build feature injection (depth-specific for `birth_chart`, standard for others)
   l. **Assemble journal context** — ALWAYS if `hasJournalConsent === true` (expanded budget for Cosmic Recall)
   m. Build timespace context
   n. Build prompt (system = safety + soul + feature injection + timespace + journal; user = birth data + question)
   o. Build conversation history (truncated)
   p. Iterate model chain:
      - For each entry: find provider, resolve API key from env, build URL/headers/body, fetch
      - If streaming: create message placeholder, read SSE stream, flush every 100-300ms, parse title, finalize
      - If non-streaming: parse complete response, create/finalize message
      - On success: increment quota (first response only), generate title, return
      - On failure: log, try next model
   q. If all models fail: insert hardcoded fallback message
5. Action resolves, client sets `isStreaming = false`, `setConversationActive()`

### Phase 5: User Sees Response

1. During streaming: Convex reactive queries update the message content every 100-300ms
2. UI shows growing text with blinking cursor
3. After completion: full response visible, copy button appears
4. Session title updated (from TITLE: line parsing)
5. Quota indicator updated

### Phase 6: Follow-up Questions

1. User types follow-up in bottom input bar
2. `handleSendFollowUp` fires:
   a. Calls `addMessage` mutation to persist user message
   b. Sets pending optimistic message for immediate display
   c. Calls `invokeOracle` with the new question
3. The LLM receives full conversation history, so context is maintained
4. Birth data is re-built fresh per-message (never stale)
5. Response appears as new assistant message

### Phase 7: Session Sidebar

- Left sidebar lists all sessions (most recent first, max 50)
- Each session shows title, model used indicator
- Actions: rename, star type (beveled/cursed), delete
- "New Divination" button to start fresh
- Search modal (Cmd+K style) for finding past sessions

---

## 16. Operational Controls

### Kill Switch

- Key: `kill_switch` in `oracle_settings`
- Values: `"true"` (offline) or `"false"` (live)
- Effect: When `"true"`, every `invokeOracle` call immediately returns the fallback message without calling any LLM
- Admin UI: Toggle switch with CONFIRM dialog requiring user to type "CONFIRM"
- Also shown on `/admin/oracle` overview page with LIVE/OFFLINE badge

### Fallback Response Text

- Key: `fallback_response_text` in `oracle_settings`
- Used in two places: kill switch response and all-models-failed response
- Default: "The stars are momentarily beyond my reach - cosmic interference is rare, but it happens. Please try again in a moment. ->"
- Editable in admin Operations tab

### Crisis Response Text

- Key: `crisis_response_text` in `oracle_settings`
- Default: "I see you, and what you're carrying right now matters deeply. Please reach out to the Crisis Text Line - text HOME to 741741 - or call the 988 Suicide & Crisis Lifeline."
- Editable in admin Operations tab

---

## 17. Session Title Generation

### Old Approach (removed)
Previously a separate LLM call generated the session title. This was removed during the Oracle rebuild.

### Current Approach
The Oracle model itself generates the title as a `TITLE:` line at the end of its first response.

**How it works:**
1. The `ORACLE_TITLE_DIRECTIVE` (hardcoded as the last block in every system prompt) instructs the model: "On the very last line of your response, output: TITLE: <4-6 word session summary>"
2. `invokeOracle` calls `parseTitleFromResponse(content)` which:
   - Searches for a `TITLE: <text>` line (case-insensitive regex: `/^\s*TITLE:\s*(.+?)\s*$/im`)
   - If found: extracts title, strips surrounding quotes, truncates to 60 chars, removes the TITLE line from content
   - If not found: returns `title: null`, content unchanged
3. On first response only (`isFirstResponse`), the title is saved via `updateSessionTitle` (sets `titleGenerated: true`)
4. If no `TITLE:` line was found, falls back to `deriveTitleFromContent()` which takes the first sentence, strips astro symbols and arrow suffixes, truncates to 60 chars
5. The cleaned content (without the TITLE line) is what the user actually sees

**Why this approach:** The model already has full context of the question + its own answer, so it produces a better title than a cold call to a separate model would. It also eliminates a separate LLM call, saving cost and latency.

---

## 18. Key Design Decisions & Trade-offs

### 1. Hardcoded Safety Rules vs. DB-Stored
Safety rules are hardcoded in code, not editable from admin. This is intentional: changes require code review and a deploy, preventing a single admin from accidentally weakening safety. The trade-off is slower iteration on safety rules.

### 2. Single Soul Document vs. Modular Sections
The old 7-document soul system was replaced with one unified `oracle_soul` document. This simplifies admin editing (one textarea vs. seven) and reduces prompt assembly complexity from 7 parameters to fewer. The trade-off is that the document is larger and less modular.

### 3. Title Generation via Response Append vs. Separate Call
Embedding the title directive in the main prompt and parsing it from the response saves a separate LLM call. The trade-off is that not all models reliably follow the instruction, requiring the `deriveTitleFromContent` fallback.

### 4. Env-Var API Keys vs. DB-Stored Keys
API keys are never stored in the database. Only the **environment variable name** is stored. The actual key is resolved from `process.env` at runtime. This prevents database leaks from exposing API keys but requires environment configuration on the Convex deployment.

### 5. Birth Data in User Message vs. System Prompt (v2 refined)
The birth chart **data** lives in the user message as `[BIRTH CHART DATA]`, while the birth chart **reading instructions** (core vs full depth) live in the system prompt. This separation ensures:
- The model treats chart data as user-provided facts (not system instructions)
- Instructions are system-level directives the model must follow
- Depth can be changed without altering data injection

### 6. Universal Birth Context vs. Feature-Gated Data (v2 change)
Birth data is now injected for EVERY message when `user.birthData` exists, regardless of which feature is active. Previously, birth data was only injected when a birth chart feature was active. This enables cross-context mixing (a Cosmic Recall session can reference Venus) and eliminates data loss when switching features. The token cost increase (~275 tokens) is negligible (~0.03 cents per message).

### 7. Depth via Instructions, Not Data Scope (v2 change)
Previously, "core" mode only injected Sun/Moon/Ascendant (3 placements, 4 aspects) while "full" mode injected everything (14 placements, 12 houses, 8 aspects). The v2 architecture ALWAYS injects the full data and uses instruction blocks to tell the model where to focus. This means:
- A user in "core" mode who asks "What about my Venus?" gets a real answer — the AI sees Venus
- No data is thrown away based on feature selection
- The AI always has the full picture
- Depth is a prompt instruction, not a data filter

### 8. Journal Context is Universal When Consented (v2 change)
Journal context is now injected on EVERY message when `journal_consent.oracleCanReadJournal === true`, not just in Cosmic Recall sessions. Cosmic Recall changes the budget (doubled) and adds feature instructions, but the data is always present. This means any Oracle session can naturally reference the user's journal without requiring the user to activate Cosmic Recall explicitly.

### 9. Streaming Flush Interval (100-300ms)
The streaming flush interval starts at 100ms (first 2 seconds) then increases to 300ms. This balances UI responsiveness (fast initial token display) against Convex write load (each flush is a mutation). Too frequent would increase costs; too slow would make streaming feel laggy.

### 10. Quota Incremented Only on Success
Quota is only incremented after a successful LLM response. Crisis responses, kill-switch responses, and all-models-failed responses do NOT consume quota. This means failures don't penalize the user.

### 11. Admin Guard as the Real Enforcement
The `requireAdmin()` check in every admin-facing Convex function is the real security layer, not the Next.js route guards. A motivated attacker could call Convex functions directly via the API; `requireAdmin` ensures they'd be rejected.

### 12. Journal Context is Non-Blocking
Journal context assembly is wrapped in try/catch in `invokeOracle`. If it fails for any reason (consent missing, database error, empty journal), Oracle proceeds without journal context. The user always gets a reading — just without journal-awareness. This ensures the Journal integration never degrades Oracle's reliability.

### 13. Journal Consent is Server-Enforced
The consent check happens server-side in `assembleJournalContext()`. The `[JOURNAL CONTEXT]` block is only built when `journal_consent.oracleCanReadJournal === true`. The client cannot bypass this — even if the frontend failed to check consent, the backend function would return `null`. The `requiresJournalConsent` flag on Oracle features is a UX hint (greying out disabled features), not a security enforcement.

### 14. Journal Prompt Suggestions are Optional
The `JOURNAL_PROMPT_DIRECTIVE` uses the word "MAY" (not "MUST"). Oracle only suggests a journal prompt when it naturally touches on emotional themes. This avoids spammy prompts on every response and maintains the conversational feel.

### 15. Intent Classification Before Feature Injection (v2 change)
The intent classifier runs BEFORE feature injection in `invokeOracle`. This means the classification decision gates which feature (if any) gets activated. The classifier itself is consent-gated: birth chart patterns require `hasBirthData`, journal recall patterns require `hasJournalConsent`. This prevents auto-activation of features the user can't actually use.

### 16. Legacy Feature Key Migration (v2 change)
Sessions created before v2 may have `featureKey: "birth_chart_core"` or `"birth_chart_full"`. Rather than requiring a database migration, the `invokeOracle` action detects these legacy keys on the next call and automatically patches the session to `featureKey: "birth_chart"` with the appropriate `birthChartDepth`. This is transparent to the user and requires no admin action.

---

*Document generated from codebase analysis. All file references use the format `filepath:startLine-endLine`. Last updated: 2026-04-28.*