# Oracle AI System — Full Technical Explanation (v1)

> This document provides a complete, in-detail technical explanation of the Oracle AI system at stars.guide, covering every layer from admin configuration through the LLM invocation pipeline to user-facing output. Written against the current codebase state as of 2026-04-19.

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
10. [Feature System (Birth Chart, etc.)](#10-feature-system-birth-chart-etc)
11. [Natal Context Injection](#11-natal-context-injection)
12. [User-Facing Flow (End-to-End Walkthrough)](#12-user-facing-flow-end-to-end-walkthrough)
13. [Operational Controls](#13-operational-controls)
14. [Session Title Generation](#14-session-title-generation)
15. [Key Design Decisions & Trade-offs](#15-key-design-decisions--trade-offs)

---

## 1. System Architecture Overview

The Oracle is a conversational astrology AI built on a **Convex + Next.js** stack. The architecture has four distinct layers:

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
└──────────────────────────┬──────────────────────────────────┘
                           │ fetch (OpenAI-compatible API)
┌──────────────────────────▼──────────────────────────────────┐
│              INFERENCE PROVIDERS (external)                  │
│  OpenRouter, Ollama, OpenAI-compatible endpoints             │
│  Model fallback chain: Tier A → Tier B → Tier C → Tier D    │
└─────────────────────────────────────────────────────────────┘
```

Key architectural properties:
- **Server-authoritative**: All quota checks, prompt assembly, and LLM calls happen server-side. Client-side quota displays are UX-only hints.
- **Streaming-first**: Tokens stream from the LLM through Convex into the reactive UI in near-real-time (300ms flush intervals).
- **Hardcoded safety first**: The safety rules block is hardcoded in code, always position 1 in the system prompt, and cannot be overridden by admin-editable settings.
- **Multi-provider resilience**: A ranked fallback chain tries multiple models/providers; if all fail, a hardcoded fallback message is returned.

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
- `featureKey` — optional, e.g. `"birth_chart_core"` or `"birth_chart_full"`
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
- `featureKey` — indexed, e.g. `"birth_chart_core"`
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

The prompt is the heart of the Oracle. It is assembled in `buildPrompt()` (`lib/oracle/promptBuilder.ts:79-95`) from exactly 4 parameters: `soulDoc`, `featureInjection`, `natalContext`, `userQuestion`.

### System Prompt (4 blocks, in order)

Built by `buildSystemPrompt()` (`lib/oracle/promptBuilder.ts:41-53`):

```
[Block 1: ORACLE_SAFETY_RULES]    ← hardcoded, always first, non-negotiable
[Block 2: soulDoc]                ← from oracle_settings key "oracle_soul"
[Block 3: featureInjection]       ← from oracle_feature_injections table (if active feature)
[Block 4: ORACLE_TITLE_DIRECTIVE] ← hardcoded, always last
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
Loaded from `oracle_feature_injections` table for the active feature. See Section 10.

**Block 4 — Title Directive** (`lib/oracle/promptBuilder.ts:13-25`):
Hardcoded instruction requiring the model to output a `TITLE: <4-6 word title>` line at the very end. This title is parsed out of the response and used as the session title, replacing the old separate title-generation LLM call.

### User Message (2 blocks)

Built by `buildUserMessage()` (`lib/oracle/promptBuilder.ts:61-73`):

```
[Block 1: [NATAL CHART DATA]]     ← if birth data available (from feature context builder)
[Block 2: sanitized user question]
```

**Sanitization** (`lib/oracle/promptBuilder.ts:102-106`):
Before the user's text enters the prompt, `sanitizeUserQuestion()` strips any bracket-tagged content matching `[SYSTEM...]`, `[NATAL...]`, `[USER...]`, `[FEATURE...]`, `[SAFETY...]`, `[END...]` to prevent tag injection attacks.

**Conversation History**:
Between the system prompt and the final user message, the full conversation history is inserted as alternating `{role, content}` messages. The last user message is removed from history if it matches the current question. History is truncated to the last `maxContextMessages` (default 20) entries.

### Final Message Array Sent to LLM

```json
[
  { "role": "system",  "content": "<blocks 1-4 concatenated>" },
  { "role": "user",    "content": "previous question 1" },
  { "role": "assistant","content": "previous answer 1" },
  ...  // up to maxContextMessages
  { "role": "user",    "content": "<natal block + current question>" }
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

In `invokeOracle` (`convex/oracle/llm.ts:199-250`):

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

For each attempt, `callProviderStreaming()` (`convex/oracle/llm.ts:284-490`) builds:

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

`convex/oracle/llm.ts:345-373`:
1. Parse complete JSON response
2. Extract `content` from `choices[0].message.content`
3. Parse title from content (`parseTitleFromResponse`)
4. Create streaming message placeholder via `createStreamingMessage`
5. Immediately finalize with `finalizeStreamingMessage`
6. Return

### Streaming path (stream_enabled = true, default)

`convex/oracle/llm.ts:375-490`:

1. **Create message placeholder**: `createStreamingMessage` inserts an empty `oracle_messages` row (role=assistant, content="")
2. **Read SSE stream**: Uses `response.body.getReader()` + `TextDecoder` to read Server-Sent Events
3. **Parse chunks**: Each `data: {json}` line is parsed; `choices[0].delta.content` tokens are appended to `fullContent`
4. **Periodic flush**: Every 300ms (`STREAM_FLUSH_INTERVAL_MS`), the accumulated content is written to Convex via `updateStreamingContent` — this triggers Convex reactivity which updates the UI
5. **Track usage**: If `parsed.usage` exists, `promptTokens` and `completionTokens` are captured
6. **On stream complete**: Parse title from full response, strip title line, write final cleaned content via `updateStreamingContent`, then call `finalizeStreamingMessage` with metadata (model, tokens, tier)
7. **Error handling**: If stream errors mid-way with partial content, the partial content is kept. If stream errors with zero content, a recovery message is inserted.

### Convex Internal Mutations for Streaming

These are `internalMutation` (not publicly callable):
- `createStreamingMessage` (`sessions.ts:177-199`): Creates empty assistant message, increments session messageCount
- `updateStreamingContent` (`sessions.ts:201-209`): Patches message content in-place (called every 300ms during streaming)
- `finalizeStreamingMessage` (`sessions.ts:211-244`): Sets final content, modelUsed, tokens, tier; updates session metadata (primaryModelUsed, usedFallback, status)

### Client-side streaming behavior

On the chat page (`src/app/oracle/chat/[sessionId]/page.tsx:89-124`):
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

`convex/oracle/llm.ts:27-35, 89-114`:

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

`convex/oracle/llm.ts:62-87`:

The first thing `invokeOracle` does is check the `kill_switch` setting:
1. If `"true"`, immediately return the `fallback_response_text` (or default)
2. Persist as assistant message with `modelUsed: "kill_switch"`, `fallbackTierUsed: "D"`
3. No LLM call is made
4. No quota consumed

### Input Validation (pre-LLM)

`convex/oracle/llm.ts:56-60`:
- Maximum question length: 2000 characters (`MAX_USER_QUESTION_LENGTH`)

### Prompt Injection Defense (post-input)

`lib/oracle/promptBuilder.ts:102-106`:
- `sanitizeUserQuestion()` strips any `[SYSTEM...]`, `[NATAL...]`, `[USER...]`, `[FEATURE...]`, `[SAFETY...]`, `[END...]` tagged content from user input

---

## 8. Session & Conversation Management

### Lifecycle

1. **Creation** — `createSession` mutation (`sessions.ts:42-76`):
   - Requires authenticated user
   - Stores `userId`, `featureKey` (optional), initial title (first 40 chars of question + "..."), status="active"
   - Inserts first user message into `oracle_messages`
   - Returns `sessionId`

2. **Oracle Invocation** — `invokeOracle` action (`llm.ts:49-277`):
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

4. **Session List** — `getUserSessions` query (`sessions.ts:6-18`):
   - Returns last 50 sessions for current user, ordered by most recent

5. **Session Operations**:
   - `updateSessionStatus` — mark active/completed
   - `updateSessionFeature` — change which feature is active
   - `renameSession` — manually change session title
   - `setSessionStarType` — assign "beveled" or "cursed" pin tier
   - `deleteSession` — cascade delete all messages then session

### Session Title Generation

Titles are generated **by the Oracle model itself** during its first response (see Section 14). The session starts with a truncated-question placeholder and the title is replaced once the first AI response includes a `TITLE:` line.

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

## 10. Feature System (Birth Chart, etc.)

### Feature Definitions

Defined in `src/lib/oracle/features.ts`. Seven features are registered:

| Key | Label | Implemented | Requires Birth Data | Menu Group |
|-----|-------|-------------|---------------------|------------|
| `attach_files` | Add photos & files | No | No | primary |
| `birth_chart_core` | Birth chart analysis | Yes | Yes | primary |
| `birth_chart_full` | Deep birth chart analysis | Yes | Yes | primary |
| `synastry_core` | Synastry analysis | No | Yes | more |
| `synastry_full` | Deep synastry analysis | No | Yes | more |
| `sign_card_image` | Create sign card image | No | Yes | more |
| `binaural_beat` | Create binaural beat | No | No | more |

Only `birth_chart_core` and `birth_chart_full` are currently implemented.

### Feature Selection Flow

1. User opens the `+` menu in `OracleInput` component
2. Clicks a feature → `onFeatureSelect(featureKey)` is called
3. In `/oracle/new`: stores in Zustand, focuses input, pre-fills default prompt
4. In `/oracle/chat/[id]`: calls `updateSessionFeature` mutation to persist to session, also updates Zustand
5. When user submits, the `featureKey` is passed to `createSession`

### Feature Injection

When `invokeOracle` detects an active feature on the session (`session.featureKey`):

1. Resolves the `OracleFeatureDefinition` via `getOracleFeature()`
2. If the feature exists, queries `oracle_feature_injections` table for a matching `featureKey` row → this becomes the `featureInjection` string injected into the system prompt
3. If the feature `requiresBirthData`, fetches the current user's `birthData` from the `users` table
4. Builds natal context via `buildFeatureContext()` (see Section 11)
5. If birth data is unavailable, injects an instruction to not pretend knowledge

### Default Prompts

Features can define a `defaultPrompt` that pre-fills the input:
- `birth_chart_core`: "Analyze my birth chart through my Sun, Moon, and Ascendant, including the houses they fall in."
- `birth_chart_full`: "Give me a deep analysis of my full birth chart using all of my natal placements."

### Sign Preview Cards

When a birth chart feature is selected, `OracleSignPreviewCards` renders the user's Sun/Moon/Ascendant signs as visual cards above the input, showing sign icon, sign name, element, and house.

---

## 11. Natal Context Injection

This is the Oracle's critical advantage — every user's natal chart is pre-loaded into the prompt.

### Context Builder

`buildFeatureContext()` in `src/lib/oracle/featureContext.ts:232-244`:

- `birth_chart_core` → `buildCoreFeatureContext()` (lines 140-180)
- `birth_chart_full` → `buildFullFeatureContext()` (lines 182-230)
- Other features → empty string

### Core Feature Context Format

```
[FEATURE CONTEXT]
Feature: Birth chart analysis
Treat the stored chart data below as canonical truth. Do not invent different signs, houses, or aspects.
Prioritize a reading of the Sun, Moon, and Ascendant, explain their houses, and synthesize how those three placements interact.
Birth data: 2000-04-14 at 15:17
Location: New York, US | Timezone: America/New_York

Canonical primary placements:
- Sun: Aries 14.25° (House 10)
- Moon: Pisces 22.01° (House 9)
- Ascendant: Cancer (House 1, direct, dignity: domicile)

Most relevant stored aspects:
- Sun conjunction Moon (orb 2.30°)
- Venus trine Jupiter (orb 1.15°)
...

Reading scope: Focus on personality, emotional nature, outward style, and how the houses shape expression.
[END FEATURE CONTEXT]
```

### Full Feature Context Format

Same structure but includes:
- ALL planetary placements (not just Sun/Moon/Ascendant)
- House signatures line: `H1:Cancer | H2:Leo | ...`
- Up to 8 aspects (sorted by tightest orb)
- Broader reading scope: "layered interpretation of the full chart while staying anchored to the stored placements"

### Data Sources

The feature context builder reads from `user.birthData` which has two schemas:
1. **Legacy**: `birthData.placements[]` with `{body, sign, house}`
2. **Chart**: `birthData.chart` with ascendant, planets (with longitude/retrograde/dignity), houses, aspects

Both are handled gracefully. The builder resolves placements from `chart.planets` first, falling back to `placements`.

### NatalCalculator (alternate, currently unused in LLM path)

`src/lib/oracle/natalCalculator.ts` provides `calculateNatalContext()` and `calculateDegradedNatalContext()` which compute charts on-the-fly from raw birth data. These are designed for when birth data changes and the chart hasn't been pre-stored. The current LLM path uses pre-stored chart data via `buildFeatureContext()` instead.

---

## 12. User-Facing Flow (End-to-End Walkthrough)

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
4. Zustand store tracks `pendingQuestion` and `selectedFeatureKey`

### Phase 3: User Submits

1. `handleSubmit` in `OracleNewPage` calls `createSession` mutation with `{ featureKey, questionText }`
2. `createSession` creates `oracle_sessions` row + first `oracle_messages` row (role=user)
3. Returns `sessionId`
4. Zustand: `setSessionId(sessionId)`, `setOracleResponding()`
5. Client navigates to `/oracle/chat/${sessionId}`

### Phase 4: Oracle Invokes

1. `OracleChatPage` renders, observes `state === "oracle_responding"`
2. Detects there's a user message without a corresponding assistant response
3. Calls `invokeOracle` action with `{ sessionId, userQuestion }`
4. **Server-side execution** (the full `invokeOracle` pipeline):
   a. Input validation (max length check)
   b. Kill switch check → if on, return fallback
   c. Crisis detection → if triggered, return crisis response
   d. Load session + messages
   e. Load runtime settings (soul, model params, providers, chain)
   f. Resolve feature: query feature injection, load user birth data, build natal context
   g. Build prompt (system = safety + soul + feature injection + title directive; user = natal data + question)
   h. Build conversation history (truncated)
   i. Iterate model chain:
      - For each entry: find provider, resolve API key from env, build URL/headers/body, fetch
      - If streaming: create message placeholder, read SSE stream, flush every 300ms, parse title, finalize
      - If non-streaming: parse complete response, create/finalize message
      - On success: increment quota (first response only), generate title, return
      - On failure: log, try next model
   j. If all models fail: insert hardcoded fallback message
5. Action resolves, client sets `isStreaming = false`, `setConversationActive()`

### Phase 5: User Sees Response

1. During streaming: Convex reactive queries update the message content every 300ms
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
4. Response appears as new assistant message

### Phase 7: Session Sidebar

- Left sidebar lists all sessions (most recent first, max 50)
- Each session shows title, model used indicator
- Actions: rename, star type (beveled/cursed), delete
- "New Divination" button to start fresh
- Search modal (Cmd+K style) for finding past sessions

---

## 13. Operational Controls

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

## 14. Session Title Generation

### Old Approach (removed)
Previously a separate LLM call generated the session title. This was removed during the Oracle rebuild.

### Current Approach
The Oracle model itself generates the title as a `TITLE:` line at the end of its first response.

**How it works:**
1. The `ORACLE_TITLE_DIRECTIVE` (hardcoded as the last block in every system prompt) instructs the model: "After your complete response, you MUST output a session title on the final line in this EXACT format: TITLE: <4-6 word title summarizing this session>"
2. `invokeOracle` calls `parseTitleFromResponse(content)` which:
   - Searches for a `TITLE: <text>` line (case-insensitive regex: `/^\s*TITLE:\s*(.+?)\s*$/im`)
   - If found: extracts title, strips surrounding quotes, truncates to 60 chars, removes the TITLE line from content
   - If not found: returns `title: null`, content unchanged
3. On first response only (`isFirstResponse`), the title is saved via `updateSessionTitle` (sets `titleGenerated: true`)
4. If no `TITLE:` line was found, falls back to `deriveTitleFromContent()` which takes the first sentence, strips astro symbols and arrow suffixes, truncates to 60 chars
5. The cleaned content (without the TITLE line) is what the user actually sees

**Why this approach:** The model already has full context of the question + its own answer, so it produces a better title than a cold call to a separate model would. It also eliminates a separate LLM call, saving cost and latency.

---

## 15. Key Design Decisions & Trade-offs

### 1. Hardcoded Safety Rules vs. DB-Stored
Safety rules are hardcoded in code, not editable from admin. This is intentional: changes require code review and a deploy, preventing a single admin from accidentally weakening safety. The trade-off is slower iteration on safety rules.

### 2. Single Soul Document vs. Modular Sections
The old 7-document soul system was replaced with one unified `oracle_soul` document. This simplifies admin editing (one textarea vs. seven) and reduces prompt assembly complexity from 7 parameters to 4. The trade-off is that the document is larger and less modular.

### 3. Title Generation via Response Append vs. Separate Call
Embedding the title directive in the main prompt and parsing it from the response saves a separate LLM call. The trade-off is that not all models reliably follow the instruction, requiring the `deriveTitleFromContent` fallback.

### 4. Env-Var API Keys vs. DB-Stored Keys
API keys are never stored in the database. Only the **environment variable name** is stored. The actual key is resolved from `process.env` at runtime. This prevents database leaks from exposing API keys but requires environment configuration on the Convex deployment.

### 5. Feature Injections in System Prompt vs. User Message
Feature context (natal chart data) is split: the feature *injection text* (describing what to focus on) goes in the system prompt as Block 3, while the actual *natal chart data* goes in the user message as `[NATAL CHART DATA]`. This separation ensures the model treats the chart data as user-provided facts while the reading instructions are system-level directives.

### 6. Streaming Flush Interval (300ms)
The 300ms `STREAM_FLUSH_INTERVAL_MS` balances UI responsiveness against Convex write load. Each flush is a mutation; too frequent would increase costs, too slow would make streaming feel laggy.

### 7. Quota Incremented Only on Success
Quota is only incremented after a successful LLM response (line 227). Crisis responses, kill-switch responses, and all-models-failed responses do NOT consume quota. This means failures don't penalize the user.

### 8. Admin Guard as the Real Enforcement
The `requireAdmin()` check in every admin-facing Convex function is the real security layer, not the Next.js route guards. A motivated attacker could call Convex functions directly via the API; `requireAdmin` ensures they'd be rejected.

---

*Document generated from codebase analysis. All file references use the format `filepath:startLine-endLine`. Last updated: 2026-04-19.*