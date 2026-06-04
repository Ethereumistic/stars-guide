# Oracle AI System — Full Technical Explanation (v2)

> This document provides a complete, in-detail technical explanation of the Oracle AI system at stars.guide, covering every layer from admin configuration through the LLM invocation pipeline to user-facing output. Includes Journal integration (consent-gated context, Cosmic Recall, journal prompt suggestions), Oracle Tools v2 architecture (universal birth context, unified birth_chart feature with dynamic depth, cross-context mixing), **Synastry (two-chart overlay with role-based labeling)**, **Binaural Beats (Cloudflare Worker audio generation)**, **cost-based token quota (microdollar 5h burst + 7d weekly budgets)**, and the Admin Debug Panel (real-time LLM pipeline observability, model override, timing metrics, per-message cost). Last updated: 2026-06-04.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Admin Configuration Surface](#3-admin-configuration-surface)
4. [Prompt Assembly Pipeline — Pipeline-Based Tagged Blocks (v3)](#4-prompt-assembly-pipeline--pipeline-based-tagged-blocks-v3)
5. [Multi-Provider Model Chain](#5-multi-provider-model-chain)
6. [Streaming Architecture](#6-streaming-architecture)
7. [Safety & Crisis Detection](#7-safety--crisis-detection)
8. [Session & Conversation Management](#8-session--conversation-management)
9. [Quota System — Cost-Based Rate Limiting (V2)](#9-quota-system--cost-based-rate-limiting-v2)
10. [Feature System (Birth Chart, Synastry, Cosmic Recall, Binaural Beats)](#10-feature-system-birth-chart-synastry-cosmic-recall-binaural-beats)
11. [Birth Context Injection](#11-birth-context-injection)
12. [Journal Context Injection](#12-journal-context-injection)
13. [Intent Classification (Auto-Activation)](#13-intent-classification-auto-activation)
14. [Cross-Context Mixing](#14-cross-context-mixing)
15. [User-Facing Flow (End-to-End Walkthrough)](#15-user-facing-flow-end-to-end-walkthrough)
16. [Operational Controls](#16-operational-controls)
17. [Session Title Generation](#17-session-title-generation)
18. [Key Design Decisions & Trade-offs](#18-key-design-decisions--trade-offs)
19. [Admin Debug Panel](#19-admin-debug-panel)

---

## 1. System Architecture Overview

The Oracle is a conversational astrology AI built on a **Convex + Next.js** stack. The architecture has five distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                       │
│  /oracle/new      — Landing page + first question input      │
│  /oracle/chat/[id] — Chat view with streaming responses      │
│  /admin/oracle/* — Admin settings UI                         │
│  Debug Panel      — Real-time LLM observability (admin only)│
│  Zustand Store    — Client-side Oracle state management      │
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
│  oracle/debug.ts    — Admin debug queries (provider list, timing) │
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
| `model_chain` | model | json | DEFAULT_MODEL_CHAIN | Ordered model fallback entries for Oracle inference |
| `intent_model_chain` | model | json | DEFAULT_INTENT_MODEL_CHAIN | Model fallback chain for intent classification |
| `max_response_tokens` | token_limits | number | 1000 | `max_tokens` parameter to LLM |
| `max_context_messages` | token_limits | number | 20 | Max history messages in prompt |
| `providers_config` | provider | json | DEFAULT_PROVIDERS | Provider endpoint definitions |
| `model_pricing` | provider | json | DEFAULT_MODEL_PRICING | Per-model pricing table (prompt$/1M + completion$/1M) |
| `quota_burst_budget_free` | quota | number | 20000 | 5h burst budget in µ$ ($0.02) |
| `quota_burst_budget_popular` | quota | number | 100000 | 5h burst budget in µ$ ($0.10) |
| `quota_burst_budget_premium` | quota | number | 250000 | 5h burst budget in µ$ ($0.25) |
| `quota_burst_budget_moderator` | quota | number | 5000000 | 5h burst budget in µ$ ($5.00) |
| `quota_burst_budget_admin` | quota | number | 50000000 | 5h burst budget in µ$ ($50.00) |
| `quota_weekly_budget_free` | quota | number | 100000 | 7d weekly budget in µ$ ($0.10) |
| `quota_weekly_budget_popular` | quota | number | 500000 | 7d weekly budget in µ$ ($0.50) |
| `quota_weekly_budget_premium` | quota | number | 1500000 | 7d weekly budget in µ$ ($1.50) |
| `quota_weekly_budget_moderator` | quota | number | 25000000 | 7d weekly budget in µ$ ($25.00) |
| `quota_weekly_budget_admin` | quota | number | 250000000 | 7d weekly budget in µ$ ($250.00) |
| `quota_burst_window_ms` | quota | number | 18000000 | 5h window in ms |
| `quota_weekly_window_ms` | quota | number | 604800000 | 7d window in ms |
| `burst_min_cost_micro` | quota | number | 100 | Minimum µ$ charged per call even on free models (spam guard) |
| `kill_switch` | operations | boolean | false | Emergency Oracle off switch |
| `fallback_response_text` | safety | string | "The stars are momentarily beyond my reach..." | Hardcoded fallback copy |
| `crisis_response_text` | safety | string | "I see you, and what you're carrying right now matters deeply..." | Crisis response copy |

### `oracle_sessions` (Table 14, schema lines 312-332)
Conversation sessions. Each session tracks:
- `userId` — owner
- `title` — initially truncated question, replaced by AI-generated title
- `titleGenerated` — boolean, prevents re-triggering title generation
- `featureKey` — optional, e.g. `"birth_chart"`, `"journal_recall"`, `"synastry"`
- `birthChartDepth` — optional, `"core"` or `"full"` — controls reading depth when `featureKey === "birth_chart"`
- `synastryPayload` — optional, stores second person's chart data + relationship metadata for synastry sessions (`chartB`, `source`, `relationship`, `relationshipCategory`, `chartBName`)
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
- `costUsdMicro` — optional number; cost of this response in microdollars (1 USD = 1,000,000 µ$). Populated by `calculateCostMicro()` using the model pricing table. Zero for free-suffix models (e.g. `:free`).
- `fallbackTierUsed` — `"A" | "B" | "C" | "D"` (assistant only; D = hardcoded fallback)
- `systemPromptHash` — optional string; snapshot of system prompt for observability
- `journalPrompt` — optional string (assistant only); journal prompt suggested by Oracle via `JOURNAL_PROMPT:` line in response
- `timingPromptBuildMs` — optional number; milliseconds spent assembling the prompt (context loading, birth data, journal, timespace, etc.)
- `timingRequestQueueMs` — optional number; milliseconds from prompt assembly completion to LLM HTTP request start (includes network overhead and LLM queue wait)
- `timingTtftMs` — optional number; milliseconds from LLM HTTP request start to first content token received (Time to First Token, including network RTT and prompt processing)
- `timingInitialDecodeMs` — optional number; milliseconds from first token to ~200 characters of output (measures initial generation speed after TTFT)
- `timingTotalMs` — optional number; total wall-clock milliseconds from `invokeOracle` handler start to completion
- `debugModelUsed` — optional string; when a debug model override is active, records the `providerId/model` string (e.g. `openrouter/anthropic/claude-sonnet-4`)
- `createdAt`

### `oracle_quota_usage` (Table 13, schema lines 298-309)
Per-user quota tracking — **cost-based (V2)**. Replaced the old session-count caps with token-cost budgets in rolling windows:
- `userId` — indexed
- `burstCost` — microdollars spent in the current 5-hour burst window (burst abuse protection)
- `burstWindowStart` — timestamp when current 5h window started
- `weeklyCost` — microdollars spent in the current 7-day weekly window (the real budget)
- `weeklyWindowStart` — timestamp when current 7d window started
- `lastQuestionAt`, `updatedAt`

**Deprecated (kept for backward compat, no longer written):**
- `dailyCount` — old 24h question count
- `dailyWindowStart` — old 24h window start
- `lifetimeCount` — old free-tier lifetime cap

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
The Model tab now uses **inner sub-tabs** to manage separate model chains for different Oracle functions. This design is extensible — adding a new chain only requires a new slot entry.

**Sub-tabs:**
- **Oracle Inference** — `ModelChainEditor` for the main `model_chain`. Includes Temperature slider (0–1, step 0.05, default 0.82), Top-p slider (0.5–1, step 0.01, default 0.92), and Streaming toggle.
- **Intent Classification** — `ModelChainEditor` for the `intent_model_chain`. Hardcoded parameters shown as info (temp=0.1, max_tokens=150, stream=false, timeout=3s).
- (Extensible: add more slots to `MODEL_CHAIN_SLOTS` array for future chains like title generation)

Each sub-tab shows its own `ModelChainEditor` with drag-reorder, tier badges (A, B, C...), model combobox with capability badges, and provider-aware validation.

"Save All" button persists both model chains + temperature + top_p + stream_enabled atomically.

### Tab 4: Limits
- `max_response_tokens` — sent as `max_tokens` to the LLM (100–16000, default 1000)
- `max_context_messages` — max conversation history messages in prompt (2–100, default 20)

### Tab 5: Quotas
**Cost-based rate limiting (V2)** — no longer session-count caps.
- Per-tier burst budgets (5h window) and weekly budgets (7d window) in **microdollars** (µ$)
- `quota_burst_budget_{plan}` — e.g. free gets $0.02/5h, popular $0.10/5h, premium $0.25/5h
- `quota_weekly_budget_{plan}` — e.g. free gets $0.10/7d, popular $0.50/7d, premium $1.50/7d
- `quota_burst_window_ms` / `quota_weekly_window_ms` — rolling window durations
- `burst_min_cost_micro` — minimum µ$ per call even on `:free` models (default 100 µ$ = $0.0001)
- Model pricing table viewer — shows per-model prompt/completion $/1M tokens, editable as JSON
- Free-tier unlimited-lifetime-cap removed; all tiers use rolling cost windows

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

## 4. Prompt Assembly Pipeline — Pipeline-Based Tagged Blocks (v3)

The prompt is no longer assembled by a single monolithic `buildPrompt()` function with 7 positional parameters. Instead, the Oracle uses a **pipeline-based tagged block architecture**. Each feature (birth chart, synastry, journal recall, generic chat) is backed by a **pipeline** that declares `dataRequirements` and a `buildPromptBlocks()` function. A `PromptComposer` collects all blocks, sorts them by priority, applies conditional gates, and renders the final `[SYSTEM]` / `[USER]` split.

### Pipeline Architecture

```
invokeOracle
  ├── Intent Router resolves active pipeline(s)
  ├── Each pipeline declares dataRequirements:
  │     needsBirthData, needsJournalContext, expandedJournalBudget,
  │     needsTimespace, needsSynastryData
  ├── Pipeline gathers data (birth data, synastry payload, journal context, timespace)
  ├── Pipeline produces PromptBlocks: { type, label, priority, scope, content }
  ├── PromptComposer collects blocks from ALL active pipelines
  ├── Sorts by priority (highest first)
  ├── Splits into system blocks vs user blocks
  ├── Adds conversation history between system and final user block
  └── Renders to final messages array
```

**Key files:**
- `src/lib/oracle/pipelineTypes.ts` — `PipelineDefinition`, `PromptBlock`, `PipelineDataRequirements`
- `src/lib/oracle/pipelines/birthChart.ts` — Birth chart pipeline
- `src/lib/oracle/pipelines/synastry.ts` — Synastry pipeline (two-chart overlay)
- `src/lib/oracle/pipelines/journalRecall.ts` — Cosmic Recall pipeline
- `src/lib/oracle/pipelines/genericChat.ts` — Fallback pipeline
- `src/lib/oracle/promptComposer.ts` — Block collection, sorting, and rendering

### PromptBlock Structure

```typescript
interface PromptBlock {
  type: string;        // e.g. "safety", "soul", "feature_instruction", "birth_data"
  label: string;       // e.g. "soul_document", "synastry_instructions", "chart_a_data"
  priority: number;    // 90 = first, 10 = last
  scope: "system" | "user";  // Which message array it belongs to
  content: string;     // The actual text
}
```

### System Prompt Blocks (typical priority order)

| Priority | Label | Content | Source |
|----------|-------|---------|--------|
| 100 | `safety_rules` | `[SAFETY - HIGHEST PRIORITY]` block | Hardcoded |
| 90 | `soul_document` | Oracle persona / voice / identity | `oracle_settings.oracle_soul` |
| 80 | `feature_instruction` | Depth-specific or feature-specific instructions | Active pipeline (`birth_chart`, `synastry`, `journal_recall`) |
| 75 | `chart_a_unavailable` | Fallback if birth data missing | Conditional |
| 70 | `timespace` | Local datetime + cosmic weather | `buildTimespaceContext()` |
| 60 | `journal_context` | `[JOURNAL CONTEXT]` summaries | Consent-gated |
| 50 | `title_directive` | `TITLE:` instruction | First response only |
| 40 | `journal_prompt_directive` | `JOURNAL_PROMPT:` instruction | First response + journal present |

### User Message Blocks (typical order)

| Label | Content | Condition |
|-------|---------|-----------|
| `chart_a_data` | `[YOUR CHART DATA]` — full birth chart | `needsBirthData && user.birthData` |
| `chart_b_data` | `[THEIR {ROLE} — CHART DATA]` — second chart + relationship | `needsSynastryData && synastryPayload` |
| `question` | Sanitized user text | Always |

**Important:** The old `buildUniversalBirthContext()` still produces the canonical chart text, but it is now wrapped as a `PromptBlock` with `label: "chart_a_data"` and `scope: "user"`. The synastry pipeline adds a second block `label: "chart_b_data"` with the partner's chart and relationship context.

### Block 1 — Safety Rules (`lib/oracle/safetyRules.ts`)
Hardcoded 32-line block starting with `[SAFETY - HIGHEST PRIORITY - NON-NEGOTIABLE]`. Contains absolute prohibitions and crisis protocol. Always priority 100, always first.

### Block 2 — Soul Document (`lib/oracle/soul.ts`)
The `DEFAULT_ORACLE_SOUL` is ~62 lines defining Oracle's identity, voice, capabilities, and behavior. Stored in DB under key `"oracle_soul"` and editable by admin. Injected as `PromptBlock { type: "soul", label: "soul_document", priority: 90, scope: "system" }`.

### Block 3 — Feature Instructions (pipeline-specific)
Each pipeline contributes its own instruction block:
- **Birth chart**: `birth_chart_depth_core` or `birth_chart_depth_full` instructions
- **Synastry**: `synastry_instructions` with role-based labeling (e.g. "Your Sun conjuncts Alex's Moon" — never "Chart A's Sun conjuncts Chart B's Moon")
- **Journal Recall**: `[COSMIC RECALL MODE]` block with expanded budget
- **Generic Chat**: No feature instruction block

### Block 3.5 — Timespace Context
`buildTimespaceContext()` produces a block with local datetime and, when temporal intent is detected, cosmic weather data (planetary positions, moon phase, active transits). Always present.

### Block 4 — Journal Context (consent-gated)
If `journal_consent.oracleCanReadJournal === true`, `assembleJournalContext()` builds a `[JOURNAL CONTEXT]` block. **Injected on EVERY message when consent is granted**, not just Cosmic Recall sessions. Budget is expanded (doubled) when `journal_recall` is the active feature.

### Block 5 — Title Directive
Hardcoded instruction requiring `TITLE: <4-6 word title>` on the last line. Only included on the first response. Parsed by `parseTitleFromResponse()`.

### Block 6 — Journal Prompt Suggestion Directive
Only included when journal context is present AND it's the first response. Instructs Oracle it MAY output `JOURNAL_PROMPT: <reflective question>`.

### User Message: Universal Birth Data (v2)
Birth chart data is ALWAYS injected as a `chart_a_data` user block when `user.birthData` exists — regardless of which feature is active. This enables cross-context mixing (Cosmic Recall can reference Venus, synastry can reference the user's natal placements alongside the partner chart).

### User Message: Synastry Data (v2)
When `synastryPayload` is present on the session, the synastry pipeline adds a `chart_b_data` block containing the second person's full chart plus relationship metadata (`relationship`, `relationshipCategory`, `chartBName`). The system instructions explicitly ban "Chart A / Chart B" language in favor of role-based names.

### Sanitization
`sanitizeUserQuestion()` strips bracket-tagged content matching `[SYSTEM...]`, `[BIRTH...]`, `[USER...]`, `[FEATURE...]`, `[SAFETY...]`, `[END...]` to prevent tag injection attacks.

### Conversation History
Between the system prompt blocks and the final user message blocks, the full conversation history is inserted as alternating `{role, content}` messages. History is truncated to the last `maxContextMessages` (default 20) entries, then further truncated to fit within `MAX_CONTEXT_CHARS = 16000` (~4000 tokens).

### Final Message Array

```json
[
  { "role": "system",  "content": "<system blocks concatenated by priority>" },
  { "role": "user",    "content": "previous question 1" },
  { "role": "assistant","content": "previous answer 1" },
  ...  // up to maxContextMessages
  { "role": "user",    "content": "<user blocks concatenated: chart_a_data + chart_b_data + question>" }
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

**Defaults — Oracle Inference** (`src/lib/oracle/providers.ts`):
```
Provider: OpenRouter (openrouter, https://openrouter.ai/api/v1)
Chain:
  Tier A: openrouter / google/gemini-2.5-flash
  Tier B: openrouter / anthropic/claude-sonnet-4
  Tier C: openrouter / x-ai/grok-4.1-fast
```

**Defaults — Intent Classification** (`DEFAULT_INTENT_MODEL_CHAIN`):
```
Provider: OpenRouter (openrouter, https://openrouter.ai/api/v1)
Chain:
  Tier A: openrouter / google/gemini-2.5-flash
  Tier B: openrouter / anthropic/claude-sonnet-4
```

Intent classification uses a **separate chain** from Oracle inference. It's stored as `intent_model_chain` in `oracle_settings` and can be configured independently at `/admin/oracle/settings` → Model tab → Intent Classification sub-tab. The intent router call uses hardcoded parameters for speed: temperature=0.1, max_tokens=150, stream=false, timeout=3000ms.

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

### Cost Calculation (V2)

After a successful LLM response, `invokeOracle` calculates the cost in **microdollars** (µ$):

```typescript
costMicro = calculateCostMicro(
  actualModelUsed,
  promptTokens,
  completionTokens,
  pricingTable, // from oracle_settings.model_pricing
);
```

The pricing table is a JSON mapping of `modelId → { promptPer1M: number, completionPer1M: number }` in USD per 1M tokens. Example:
- `google/gemini-2.5-flash`: $0.15/$0.60 per 1M
- `anthropic/claude-sonnet-4`: $3.00/$15.00 per 1M
- `:free`-suffixed models: $0.00

If a model is missing from the table, a conservative default ($3.00/$15.00) is used to prevent under-billing.

The cost is stored on the message (`oracle_messages.costUsdMicro`) and passed to `incrementQuota` for budget tracking.

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
- `finalizeStreamingMessage` (`sessions.ts`): Sets final content, modelUsed, tokens, tier, timing metrics, debug model override; updates session metadata (primaryModelUsed, usedFallback, status)
- `patchMessageTiming` (`sessions.ts`): Patches timing metrics (`timingPromptBuildMs`, `timingRequestQueueMs`, `timingTtftMs`, `timingInitialDecodeMs`, `timingTotalMs`) and `debugModelUsed` onto an existing message document; called by `invokeOracle` after a successful LLM call to persist observability data for the Admin Debug Panel (see Section 19)

### Client-side streaming behavior

On the chat page (`src/app/oracle/chat/[sessionId]/page.tsx`):
1. Client calls `invokeOracle` action (Convex useAction)
2. Client sets `isStreaming = true`
3. Convex reactive query `getSessionWithMessages` automatically updates as `updateStreamingContent` writes partial content
4. The chat UI renders messages from this reactive query, showing the growing content with a blinking cursor
5. When the action resolves, client sets `isStreaming = false`

### Timing Instrumentation

Since v2 (Debug Panel), the streaming path and the non-streaming path both capture detailed timing metrics:

- `fetchStartTime` — `Date.now()` immediately before the `fetch()` call to the LLM
- `firstTokenTime` — `Date.now()` when the first `delta.content` token is parsed from the SSE stream (for streaming) or when the JSON response is received (for non-streaming)
- `initialDecodeTime` — `Date.now()` when `fullContent.length >= 200` (measures initial generation speed); falls back to `Date.now()` at stream end for short responses
- `messageId` — the ID of the streaming message placeholder, returned so `invokeOracle` can patch timing data onto it

These low-level timestamps are combined with higher-level `invokeOracle` timestamps (`actionStartTime`, `promptBuildEndTime`, `totalEndTime`) to produce the `TimingMetrics` structure persisted on each message (see Section 19).

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

## 9. Quota System — Cost-Based Rate Limiting (V2)

The Oracle quota system was rebuilt from session-count caps to **token-cost-based budgets** denominated in microdollars (µ$). A short generic chat costs ~$0.001 while a deep synastry reading with full context might cost ~$0.03. Cost is the honest unit.

### Server-Authoritative Design

The quota check happens in `checkQuota` (`convex/oracle/quota.ts`). This is a **Convex query** — the server is the authority. Client-side displays are only UX hints.

### Budget Model: 5h Burst + 7d Weekly

| Tier | 5h Burst Budget | 7d Weekly Budget | Rationale |
|------|-----------------|-------------------|-----------|
| free | $0.02 (20,000 µ$) | $0.10 (100,000 µ$) | ~5-10 short chats or 1-2 deep readings per week |
| popular | $0.10 (100,000 µ$) | $0.50 (500,000 µ$) | ~20-40 short chats or 5-8 deep readings per week |
| premium | $0.25 (250,000 µ$) | $1.50 (1,500,000 µ$) | ~50+ short chats or 15+ deep readings per week |
| moderator | $5.00 | $25.00 | Effectively unlimited for ops |
| admin | $50.00 | $250.00 | Effectively unlimited |

**Why two windows?**
- **5h burst** prevents a free user from burning their whole weekly budget in one sitting.
- **7d weekly** is the real budget — generous enough for normal use, tight enough to cap costs.
- Both are rolling windows, not calendar-based.

### Cost Calculation

```typescript
costUsdMicro = (promptTokens * promptPricePerToken) + (completionTokens * completionPricePerToken)
```

Price per token = `pricePer1M / 1,000,000`. Stored as **microdollars** to avoid floating point ($0.03 = 30,000 µ$).

**Free models:** `:free`-suffixed models (e.g. `google/gemini-2.5-flash:free`) cost $0.00 but still consume a minimum `burstMinCostMicro` (default 100 µ$ = $0.0001) to prevent infinite API spam.

**Missing token counts:** If a provider doesn't return usage metadata, the system falls back to `burstMinCostMicro`.

### `checkQuota` Query (V2)

Return type:
```typescript
{
  allowed: boolean;
  reason?: "unauthenticated" | "burst_cap" | "weekly_cap";
  burstRemaining: number;      // µ$ remaining in 5h window
  burstTotal: number;          // total 5h budget in µ$
  burstResetsAt?: number;      // timestamp when 5h window resets
  weeklyRemaining: number;     // µ$ remaining in 7d window
  weeklyTotal: number;         // total 7d budget in µ$
  weeklyResetsAt?: number;     // timestamp when 7d window resets
}
```

Logic:
1. Get user plan (role or tier)
2. Read burst/weekly budget limits from `oracle_settings`
3. Read window durations from `oracle_settings`
4. Fetch `oracle_quota_usage` for this user
5. If no usage record: `allowed=true`, remaining = budget
6. If burst window expired: reset `burstCost` to 0, set `burstWindowStart` = now
7. If weekly window expired: reset `weeklyCost` to 0, set `weeklyWindowStart` = now
8. Check: `burstBudget - burstCost > 0` AND `weeklyBudget - weeklyCost > 0`
9. If either is ≤ 0: denied. Reason = whichever window hit first.

### `incrementQuota` Mutation (V2)

Accepts `costUsdMicro: number` (required).

Logic:
1. Auth check
2. Fetch existing usage record
3. If no record: create with `burstCost: costUsdMicro`, `burstWindowStart: now`, `weeklyCost: costUsdMicro`, `weeklyWindowStart: now`
4. If record exists:
   - Check if burst window expired → reset `burstCost` to `costUsdMicro`, update `burstWindowStart`
   - Else: add `costUsdMicro` to `burstCost`
   - Check if weekly window expired → reset `weeklyCost` to `costUsdMicro`, update `weeklyWindowStart`
   - Else: add `costUsdMicro` to `weeklyCost`
5. Update `lastQuestionAt`, `updatedAt`

### `calculateCostMicro` Helper

Pure function in `convex/oracle/quota.ts` (or `convex/oracle/pricing.ts`):
```typescript
export function calculateCostMicro(
  modelUsed: string,
  promptTokens: number | undefined,
  completionTokens: number | undefined,
  pricingTable?: Record<string, { promptPer1M: number; completionPer1M: number }>
): number
```

No DB reads inside — the caller (`invokeOracle`) reads the pricing table from `oracle_settings` and passes it in.

### Client-Side UX

- **Before (V1):** "5 Oracle Questions remaining" / "3 questions remaining today"
- **After (V2):** "Oracle budget: $0.08 / $0.10 remaining this week" (free). Cosmic energy / percentage wording for paid tiers.
- **Burst indicator:** Subtle "Slow down — 5h limit at 60%" only shows when burst > 50% used.
- **Upgrade CTA:** Free at 0% weekly: "Upgrade to Cosmic Flow for 5x more Oracle access"
- **Countdown timer:** Resets to whichever window expires sooner (5h or 7d)

### Quota Check in `invokeOracle`

`checkQuota` is called on the client before `invokeOracle`. A server-side pre-check is also added at the top of the `invokeOracle` action (`checkQuotaServerSide` internal query) to close the TOCTOU gap between client check and LLM call.

---

## 10. Feature System (Birth Chart, Synastry, Cosmic Recall, Binaural Beats)

### Oracle Tools v2/v3 Architecture

The v2 architecture unifies the two birth chart features into a single `birth_chart` tool with a `depth` field. Birth chart **data** is always injected (not feature-gated). Birth chart **instructions** vary by depth. The v3 architecture adds **pipelines** — each feature is backed by a pipeline that declares `dataRequirements` and `buildPromptBlocks()`.

### Feature / Pipeline Definitions

Defined in `src/lib/oracle/features.ts` and `src/lib/oracle/pipelines/`. Eight features are registered:

| Key | Label | Implemented | Requires Birth Data | Requires Journal Consent | Requires Synastry Data | Menu Group | Execution Path |
|-----|-------|-------------|---------------------|--------------------------|------------------------|------------|----------------|
| `attach_files` | Add photos & files | No | No | No | No | primary | LLM |
| `birth_chart` | Birth chart analysis | Yes | Yes | No | No | primary | LLM |
| `synastry` | Synastry analysis | **Yes** | Yes | No | **Yes** | primary | LLM |
| `journal_recall` | Cosmic Recall | Yes | No | Yes | No | primary | LLM |
| `sign_card_image` | Create sign card image | No | Yes | No | No | more | LLM |
| `binaural_beats` | Create binaural beat | **Yes** | No | No | No | more | **Cloudflare Worker** |

**Binaural Beats is non-LLM.** It appears in the feature menu and intent router, but selecting it triggers a Cloudflare Worker that generates a 30-second loopable WAV via DSP math (phase accumulators + pink noise). The browser's Web Audio API handles looping and auto-stop. No Convex DB writes, no LLM call.

Only `birth_chart`, `synastry`, `journal_recall`, and `binaural_beats` are currently implemented.

### Feature Selection Flow

1. User opens the `+` menu in `OracleInput` component
2. Clicks a feature → `onFeatureSelect(featureKey)` is called
3. In `/oracle/new`: stores in Zustand, focuses input, pre-fills default prompt
4. In `/oracle/chat/[id]`: calls `updateSessionFeature` mutation to persist to session, also updates Zustand
5. When user submits, the `featureKey` is passed to `createSession`

**Synastry flow differs:** When `featureKey === "synastry"`, `SynastryCard` renders instead of `OracleChartPreviewCards`. The user imports a second chart (manual or friend), selects a relationship category + specific role, then submits. `createSession` receives `synastryPayload` containing `chartB`, `source`, `relationship`, `relationshipCategory`, and `chartBName`.

**Binaural beats flow differs:** When selected, `BinauralBeatsCard` renders with brain-state presets, carrier frequency, session duration, and ambient texture controls. Clicking "Generate & Play" POSTs to the Cloudflare Worker directly. No session is created. No LLM involved.

### Feature Injection (LLM features only)

When `invokeOracle` detects an active LLM feature on the session (`session.featureKey`):

1. Resolves the `PipelineDefinition` via the pipeline registry
2. For `birth_chart`:
   - Reads `session.birthChartDepth` (defaults to `"core"` if unset)
   - Attempts to load `oracle_feature_injections` for key `birth_chart_depth_{core|full}` (admin-editable)
   - Falls back to hardcoded depth instructions
   - The instruction block goes into the system prompt; the data goes into the user message separately
3. For `synastry`:
   - Reads `session.synastryPayload`
   - Builds `chart_a_data` block (user's chart) + `chart_b_data` block (partner's chart with role labels)
   - Injects `synastry_instructions` system block with role-based labeling (e.g. "Your Sun conjuncts Alex's Moon")
4. For `journal_recall`:
   - Queries `oracle_feature_injections` for `journal_recall` → `[COSMIC RECALL MODE]` block
   - Expands journal context budget to 8,000 chars
5. For other features:
   - Queries `oracle_feature_injections` table for a matching `featureKey` row
   - Falls back to `activeFeature.fallbackInjectionText`
6. Birth data is ALWAYS injected regardless of feature — see Section 11

### Default Prompts

Features can define a `defaultPrompt` that pre-fills the input:
- `birth_chart`: "Analyze my birth chart through my Sun, Moon, and Ascendant, including the houses they fall in."
- `journal_recall`: "Look through my journal and help me find patterns"
- `synastry`: "Compare our charts and show me where we align and where we clash."

### Sign Preview Cards

When `birth_chart` is the active feature, `OracleSignPreviewCards` renders the user's Sun/Moon/Ascendant signs as visual cards above the input, showing sign icon, sign name, element, and house.

When `synastry` is the active feature, `SynastryCard` renders with two-phase flow: **Add Chart** (manual or friend import) → **Select Relationship** (category grid → role grid). Charts collapse to compact mini-indicators during relationship selection.

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

1. Journal consent is checked BEFORE intent routing, so the router can filter `journal_recall` if the user hasn't consented:
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

The Oracle can automatically activate features based on the user's natural language question, without requiring the user to click the `[+]` menu. This is handled by the intent router — primarily `scoreIntentsWithLLM()` in `src/lib/oracle/intentRouter.ts`, with `scoreIntents()` as a regex fallback.

### Two-Path Architecture

The intent router uses a **fast LLM call** (~200 tokens, ~200-500ms) for semantic understanding, falling back to regex patterns on any failure (timeout, error, invalid JSON).

The LLM router handles what regex cannot:
- Typos: "analize my bierht chart" → `birth_chart`
- Creative phrasing: "what do my stars say about love?" → `birth_chart`
- Multi-intent: "search my journal for patterns with my Venus" → `journal_recall` + `birth_chart`
- Non-English: "mi carta astral" → `birth_chart`

### Interface

```typescript
interface IntentRouterResult {
  intents: ScoredIntent[];      // All matched intents, sorted by confidence
  hasMatch: boolean;           // Whether ANY non-generic intent matched
  primary: ScoredIntent | null;  // Highest-confidence intent
}

interface ScoredIntent {
  pipelineKey: PipelineKey;     // "birth_chart" | "journal_recall" | "synastry" | "binaural_beats" | "generic_chat"
  confidence: number;           // 0-1 (threshold: 0.5 to activate a pipeline)
  reason: string;               // "llm_intent_router" | "manual_selection" | regex reasons
  metadata?: Record<string, unknown>;  // e.g., { depth: "full", hasBirthData: true }
}
```

### Pipeline (How invokeOracle runs it)

When `invokeOracle` runs and no feature is active on the session:

1. Fetch journal consent status
2. Call `scoreIntentsWithLLM(question, hasBirthData, hasJournalConsent, currentFeatureKey, providers, intentModelChain)`
3. This tries the LLM call first; on any failure, falls back to `scoreIntents()` (regex)
4. If intent matches, persist both `featureKey` and `depth` to the session
5. Resolve active pipelines from intents with confidence ≥ 0.5
6. Each pipeline contributes system/user prompt blocks to the final prompt

### Consent Gates

Consent gating is applied **after** routing (the LLM doesn't know consent state):
- **No journal consent** → `journal_recall` intent is filtered out from results
- **No birth data** → `birth_chart` and `synastry` intents are still detected; the pipeline injects a `[CHART DATA UNAVAILABLE]` block instructing the AI to ask for data in chart-reading format, rather than falling back to generic chat
- **Synastry without Chart B** → `synastry` intent is detected but the pipeline will prompt the user to import a second chart

This is a critical design decision: intent detection is **never gated on data availability**. The AI should respond in the appropriate format regardless.

### Manual Selection Override

If `session.featureKey` is already set, the router returns immediately with `manual_selection` (confidence 1.0, **no LLM call**). This means the LLM router only fires on the **first message** of a new session.

### Multi-Intent Composition

Unlike the old single-pick classifier, the LLM router returns ALL matching intents. A message like "search my journal for patterns with my Venus placement" can activate both `journal_recall` and `birth_chart` simultaneously. The orchestrator merges their data requirements and prompt blocks.

### Regex Fallback Patterns

The patterns in `features.ts` still serve as the fallback path:
- **BIRTH_CHART_INTENT_PATTERNS** — chart reading intent
- **SYNASTRY_INTENT_PATTERNS** — synastry / compatibility / chart overlay intent (checked before birth chart patterns so "my chart with my partner" routes to synastry)
- **DEPTH_SIGNAL_FULL_PATTERNS** — depth signals for full vs core
- **JOURNAL_RECALL_PATTERNS** — journal search intent
- **BINAURAL_INTENT_PATTERNS** — sound / frequency / binaural intent

These are triggered when the LLM call fails (3-second timeout, network error, invalid JSON, all providers down).

### Reclassification

If `session.featureKey` is already set (manually or from prior auto-activation), routing short-circuits with no LLM call. This means:
- Once a tool is set, it stays locked for the session
- Subsequent messages add zero latency (no intent router call)
- Users who want to switch tools start a new session

### Relaxed Rule for Generic Sessions

When `featureKey === null` (no feature active), classification re-runs on EVERY message (not just the first). This covers:
- Message 1: "Hey" → no tool
- Message 2: "Analyze my birth chart" → auto-activate `birth_chart`

Once a tool is activated, it persists for the session.

---

## 14. Cross-Context Mixing

This is the biggest UX win of the v2 architecture. Because birth data is always injected (not feature-gated) and journal context is always injected (not feature-gated), multiple context blocks coexist in every prompt.

### Context Visibility by Session Type

| Session type | Birth data visible | Journal visible | Synastry visible | Timespace visible |
|--------------|-------------------|-----------------|------------------|-------------------|
| Generic chat (no tool) | ✅ (if saved) | ✅ (if consent) | — | ✅ |
| `birth_chart` (core or full) | ✅ | ✅ (if consent) | — | ✅ |
| `synastry` | ✅ (if saved) | ✅ (if consent) | ✅ (Chart B + relationship) | ✅ |
| `journal_recall` | ✅ (if saved) | ✅ (expanded budget) | — | ✅ |

### Example: Synastry + Journal + Birth Data

User: *"Why does my boyfriend Alex trigger my need for space? Look at my journal too."*

**Injected context (all coexisting):**
```
[SYSTEM PROMPT]
[SYNASTRY INSTRUCTIONS]
Never use labels like 'Chart A' or 'Chart B'. Use the person's name and relationship role.
...
[JOURNAL CONTEXT]
Recent entries mention feeling overwhelmed during social gatherings...
...
[TIMESPACE CONTEXT]
...

[USER MESSAGE]
[YOUR CHART DATA]
Sun: Gemini (H11) | Moon: Cancer (H12) | ...
[END YOUR CHART DATA]

[YOUR BOYFRIEND, ALEX — CHART DATA]
Sun: Capricorn (H3) | Moon: Aries (H6) | ...
Relationship: romantic · boyfriend
[END THEIR CHART DATA]

Why does my boyfriend Alex trigger my need for space? Look at my journal too.
```

The AI can now:
1. Search journal entries for "overwhelmed" / "space" patterns
2. See the user's Moon in Cancer H12 (emotional retreat needs)
3. See Alex's Sun in Capricorn H3 (practical, communicative, potentially overwhelming)
4. Check inter-chart aspects between the user's Moon and Alex's Mars/Saturn
5. Give an answer connecting journal patterns + synastry overlays + birth placements

This cross-context mixing is the future of the Oracle.

---

## 15. User-Facing Flow (End-to-End Walkthrough)

### Phase 1: User Opens Oracle

1. User navigates to `/oracle` → server-side redirect to `/oracle/new`
2. Layout (`src/app/oracle/layout.tsx`) wraps all oracle pages with sidebar + top bar
3. `OracleNewPage` renders: greeting with username, Oracle icon with pulse animation, `OracleInput` component
4. Client queries `checkQuota` (V2: burst/weekly remaining) and `getSetting("kill_switch")`
5. If kill switch is on, shows "The Oracle rests" instead of input
6. Quota remaining is displayed below input (budget/percentage wording, not "X questions")

### Phase 2: User Types Question / Selects Feature

1. User types in `OracleInput` — standard text input with Enter-to-send
2. Optional: user selects a feature from `+` dropdown menu
3. **If feature = `synastry`:** `SynastryCard` renders. User imports Chart B (manual date/time/location or friend import), selects relationship category + specific role. Charts collapse to compact mini-indicators. User types question.
4. **If feature = `binaural_beats`:** `BinauralBeatsCard` renders with brain-state presets, carrier Hz, duration, pink noise. User clicks "Generate & Play" — this bypasses the LLM pipeline entirely and POSTs to the Cloudflare Worker.
5. If feature requires birth data but user has none, the pipeline injects `[CHART DATA UNAVAILABLE]` block
6. If feature requires journal consent but user hasn't granted it, the feature is disabled in the dropdown with "Requires journal access" tooltip
7. Zustand store tracks `pendingQuestion` and `selectedFeatureKey`

### Phase 3: User Submits

1. `handleSubmit` in `OracleNewPage` calls `createSession` mutation with `{ featureKey, questionText }`
2. `createSession` creates `oracle_sessions` row + first `oracle_messages` row (role=user)
3. Returns `sessionId`
4. Zustand: `setSessionId(sessionId)`, `setOracleResponding()`
5. Client navigates to `/oracle/chat/${sessionId}`

### Phase 4: Oracle Invokes (LLM features only; binaural beats bypasses this)

1. `OracleChatPage` renders, observes `state === "oracle_responding"`
2. Detects there's a user message without a corresponding assistant response
3. Calls `invokeOracle` action with `{ sessionId, userQuestion, timezone }`
4. **Server-side execution** (the full `invokeOracle` pipeline):
   a. Input validation (max length check)
   b. Kill switch check → if on, return fallback
   c. Crisis detection → if triggered, return crisis response
   d. **Server-side quota pre-check** (`checkQuotaServerSide`) → if denied, return quota-exceeded message
   e. Load session with all messages
   f. Load runtime settings (soul, model params, providers, chain, **pricing table**)
   g. Load user (birthData, identity)
   h. **Build universal birth context** — ALWAYS if `user.birthData` exists (`buildUniversalBirthContext`) → emitted as `chart_a_data` block
   i. Resolve active pipeline from `session.featureKey` (with legacy migration for `birth_chart_core`/`birth_chart_full`)
   j. If `synastry` pipeline: gather `synastryPayload` → emit `chart_b_data` block with role labels
   k. Fetch journal consent status
   l. Run intent routing (`scoreIntentsWithLLM` — LLM call using `intentModelChain`, regex fallback) if no feature active — auto-activate and persist `featureKey` + `birthChartDepth`
   m. Pipeline produces `PromptBlock[]` with priorities; composer sorts and splits into system/user
   n. Build timespace context block
   o. Build prompt: system = safety + soul + feature instructions + timespace + journal; user = chart_a_data + chart_b_data + question
   p. Build conversation history (truncated)
   q. Iterate model chain:
      - For each entry: find provider, resolve API key from env, build URL/headers/body, fetch
      - If streaming: create message placeholder, read SSE stream, flush every 100-300ms, parse title, finalize
      - If non-streaming: parse complete response, create/finalize message
      - On success: **calculate cost** (`calculateCostMicro`), store on message (`costUsdMicro`), increment quota with cost (`incrementQuota({ costUsdMicro })`), generate title, return
      - On failure: log, try next model
   r. If all models fail: insert hardcoded fallback message
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
The old 7-document soul system was replaced with one unified `oracle_soul` document. This simplifies admin editing (one textarea vs. seven) and reduces prompt assembly complexity. The trade-off is that the document is larger and less modular.

### 3. Title Generation via Response Append vs. Separate Call
Embedding the title directive in the main prompt and parsing it from the response saves a separate LLM call. The trade-off is that not all models reliably follow the instruction, requiring the `deriveTitleFromContent` fallback.

### 4. Env-Var API Keys vs. DB-Stored Keys
API keys are never stored in the database. Only the **environment variable name** is stored. The actual key is resolved from `process.env` at runtime. This prevents database leaks from exposing API keys but requires environment configuration on the Convex deployment.

### 5. Birth Data in User Message vs. System Prompt (v2 refined)
The birth chart **data** lives in the user message as a `chart_a_data` block, while the birth chart **reading instructions** (core vs full depth, synastry instructions) live in the system prompt. This separation ensures the model treats chart data as user-provided facts (not system instructions). Depth is a prompt instruction, not a data filter.

### 6. Universal Birth Context vs. Feature-Gated Data (v2 change)
Birth data is now injected for EVERY message when `user.birthData` exists, regardless of which feature is active. Previously, birth data was only injected when a birth chart feature was active. This enables cross-context mixing (a Cosmic Recall session can reference Venus, a synastry session can reference the user's natal Moon alongside the partner chart). The token cost increase (~275 tokens) is negligible (~0.03 cents per message).

### 7. Depth via Instructions, Not Data Scope (v2 change)
Previously, "core" mode only injected Sun/Moon/Ascendant (3 placements, 4 aspects) while "full" mode injected everything (14 placements, 12 houses, 8 aspects). The v2 architecture ALWAYS injects the full data and uses instruction blocks to tell the model where to focus. This means a user in "core" mode who asks "What about my Venus?" gets a real answer — the AI sees Venus.

### 8. Journal Context is Universal When Consented (v2 change)
Journal context is now injected on EVERY message when `journal_consent.oracleCanReadJournal === true`, not just in Cosmic Recall sessions. Cosmic Recall changes the budget (doubled) and adds feature instructions, but the data is always present.

### 9. Cost-Based Quota vs. Session-Count Quota (V2 change)
The old system counted "1 question = 1 unit" regardless of cost. A short "hi" and a deep synastry reading both consumed the same quota. V2 replaces this with **microdollar budgets** in rolling 5h burst + 7d weekly windows. A generic chat costs ~$0.001; a synastry reading costs ~$0.03. This maps naturally to subscription pricing and prevents abuse.

### 10. Streaming Flush Interval (100-300ms)
The streaming flush interval starts at 100ms (first 2 seconds) then increases to 300ms. This balances UI responsiveness (fast initial token display) against Convex write load (each flush is a mutation). Too frequent would increase costs; too slow would make streaming feel laggy.

### 11. Quota Incremented Only on Success
Quota is only incremented after a successful LLM response. Crisis responses, kill-switch responses, and all-models-failed responses do NOT consume quota. This means failures don't penalize the user.

### 12. Admin Guard as the Real Enforcement
The `requireAdmin()` check in every admin-facing Convex function is the real security layer, not the Next.js route guards. A motivated attacker could call Convex functions directly via the API; `requireAdmin` ensures they'd be rejected.

### 13. Journal Context is Non-Blocking
Journal context assembly is wrapped in try/catch in `invokeOracle`. If it fails for any reason (consent missing, database error, empty journal), Oracle proceeds without journal context. The user always gets a reading — just without journal-awareness.

### 14. Journal Consent is Server-Enforced
The consent check happens server-side in `assembleJournalContext()`. The `[JOURNAL CONTEXT]` block is only built when `journal_consent.oracleCanReadJournal === true`. The client cannot bypass this.

### 15. Journal Prompt Suggestions are Optional
The `JOURNAL_PROMPT_DIRECTIVE` uses the word "MAY" (not "MUST"). Oracle only suggests a journal prompt when it naturally touches on emotional themes. This avoids spammy prompts on every response.

### 16. Intent Classification Before Feature Injection (v2/v3 change)
The intent router runs BEFORE pipeline block generation. It uses a fast LLM call for semantic understanding (handling typos, creative phrasing, multi-intent detection), falling back to regex on failure. Intent detection is NOT consent-gated — birth chart/synastry intents are always detected regardless of data availability. The pipeline then injects the appropriate `[CHART DATA UNAVAILABLE]` or `[THEIR {ROLE} — CHART DATA]` blocks.

### 17. Legacy Feature Key Migration (v2 change)
Sessions created before v2 may have `featureKey: "birth_chart_core"` or `"birth_chart_full"`. Rather than requiring a database migration, `invokeOracle` detects these legacy keys on the next call and automatically patches the session to `featureKey: "birth_chart"` with the appropriate `birthChartDepth`. This is transparent to the user.

### 18. Pipeline-Based Prompt Composition (v3 change)
The prompt is no longer assembled by a monolithic `buildPrompt()` with 7 positional parameters. Instead, **pipelines** produce typed `PromptBlock` objects with priorities. A composer sorts them and splits into system/user scopes. This enables clean multi-pipeline composition (synastry + journal + birth data all coexisting) and makes the prompt structure inspectable in the debug panel.

### 19. Synastry Role-Based Labeling (v3)
Synastry never uses "Chart A / Chart B" language. The system instructions, user message headers, and aspect tables all use role-based names (e.g. "Your Sun conjuncts Alex's Moon"). This is enforced by `getRelationshipLabel()` and `getRelationshipPhrase()` helpers, with a hardcoded ban on "Chart A / Chart B" in the synastry instructions block.

### 20. Binaural Beats as Non-LLM Feature
`binaural_beats` is the first feature that bypasses the LLM pipeline entirely. It triggers a Cloudflare Worker that generates a 30-second loopable WAV via DSP (phase accumulators + Voss-McCartney pink noise). The browser's Web Audio API loops it seamlessly and auto-stops after the chosen duration. This proves the feature menu can host both AI and non-AI tools.

---

*Document generated from codebase analysis. All file references use the format `filepath:startLine-endLine`. Last updated: 2026-06-04.*

---

## 19. Admin Debug Panel

The Oracle Debug Panel is a client-side component that provides real-time observability into the Oracle LLM pipeline for admin users. It is visible only to users with `role === "admin"` and is rendered as a fixed-position overlay on the bottom-right corner of every `/oracle` page.

### 19.1 Architecture Overview

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

### 19.2 Visibility and Access Control

The panel is conditionally rendered in `src/app/oracle/layout.tsx`:

```tsx
{user?.role === "admin" && <OracleDebugPanel />}
```

There is no server-side gate on the panel itself — the check is client-side only. The queries it uses (`getSessionWithMessages`, `adminGetDebugProviders`) enforce their own authorization (`getSessionWithMessages` verifies session ownership; `adminGetDebugProviders` calls `requireAdmin()`).

The panel can be toggled with **⌘+D / Ctrl+D** keyboard shortcut, or by clicking the bug icon (collapsed state) / chevron-down button (expanded state).

### 19.3 Model Override

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

### 19.4 Token Counters

The panel displays token usage from the **last assistant message** in the current session:

| Counter | Source | Field on `oracle_messages` |
|---------|--------|------------------------|
| Prompt Tokens | LLM response `usage.prompt_tokens` | `promptTokens` |
| Completion Tokens | LLM response `usage.completion_tokens` | `completionTokens` |
| Total | Computed: prompt + completion | — |

These values are populated during `callProviderStreaming` — for streaming responses, they're extracted from the SSE `usage` chunk (when available); for non-streaming responses, from the JSON response body.

The panel also shows the `modelUsed` and `fallbackTierUsed` for the last message, giving immediate visibility into which model actually responded and whether it was a fallback tier.

### 19.5 Timing Metrics

Timing metrics are captured at two levels: **server-side** (LLM pipeline) and **client-side** (observed by the user).

#### 19.5.1 Server-Side Timing (LLM Pipeline)

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

#### 19.5.2 Client-Side Timing (Observed)

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

### 19.6 Request Info Section

The panel shows contextual information about the current Oracle session:

| Field | Source | Notes |
|-------|--------|-------|
| Session | `sessionId` from Zustand store | Last 8 characters of the Convex ID |
| Messages | `sessionData.messages.length` | Count of all messages in current session |
| Feature | `sessionData.featureKey` + `sessionData.birthChartDepth` | Shows active feature (e.g. `birth_chart/full`, `synastry`, or `none`) |
| Status | `sessionData.status` | `active` or `completed` |
| System Prompt Hash | `lastAssistantMsg.systemPromptHash` | Simple hash of the system prompt used for that response |
| **Cost** | `lastAssistantMsg.costUsdMicro` | Per-message cost in microdollars (e.g. 30000 = $0.03) |
| **Burst Used** | Computed from `checkQuota` | Percentage of 5h budget consumed |
| **Weekly Used** | Computed from `checkQuota` | Percentage of 7d budget consumed |

### 19.7 Keyboard Shortcut

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

### 19.8 Database Schema Additions

Six new optional fields were added to the `oracle_messages` table to support the debug panel. A seventh field, `costUsdMicro`, was added for the cost-based quota system (V2):

| Field | Type | Description |
|-------|------|-------------|
| `timingPromptBuildMs` | `v.optional(v.number())` | Milliseconds spent assembling the prompt |
| `timingRequestQueueMs` | `v.optional(v.number())` | Milliseconds from prompt assembly to LLM HTTP request start |
| `timingTtftMs` | `v.optional(v.number())` | Milliseconds from LLM request start to first token received |
| `timingInitialDecodeMs` | `v.optional(v.number())` | Milliseconds from first token to ~200 chars of output |
| `timingTotalMs` | `v.optional(v.number())` | Total wall-clock milliseconds for the `invokeOracle` handler |
| `debugModelUsed` | `v.optional(v.string())` | The `providerId/model` string when a debug override is active |
| `costUsdMicro` | `v.optional(v.number())` | Cost of this response in microdollars (V2 quota system) |

These fields are always `undefined` for user messages (only populated on assistant messages). They are written via `patchMessageTiming` (for timing data after `callProviderStreaming` completes) and `finalizeStreamingMessage` (for token counts, model, tier, hash). Both are internal mutations — not publicly callable.

### 19.9 Zustand Debug State

The `useOracleStore` (Zustand) was extended with the following debug-specific state:

| Field | Type | Purpose |
|-------|------|---------|
| `debugOpen` | `boolean` | Whether the debug panel is expanded (default: `true`) |
| `debugModelOverride` | `{ providerId: string; model: string } \| null` | Active model override, passed to `invokeOracle` as `debugModelOverride` arg |
| `debugLastMetrics` | `TimingMetrics \| null` | Server-side timing metrics from the last `invokeOracle` return value (fallback path) |
| `debugDebugModelUsed` | `string \| null` | Records which model override was actually used (from action return) |
| `debugClientTiming` | `{ requestStartMs, firstContentMs, completeMs }` | Client-side observed timing (set around `invokeOracle` calls) |

### 19.10 Data Flow Summary

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

### 19.11 Special Considerations

**Kill switch and crisis responses:** These early-return paths in `invokeOracle` do NOT produce timing metrics or call `patchMessageTiming`. The debug panel will show `—` for all timing fields on such messages, which is correct — no LLM invocation occurred.

**Fallback responses:** When all models in the chain fail, the hardcoded fallback also produces no timing metrics. `debugModelUsed` is `null` and timing fields are `undefined`.

**Non-streaming mode:** When `stream_enabled = false`, TTFT and Initial Decode are both set to `Date.now()` at the point of JSON response parsing. This is because the entire response arrives at once — there's no streaming to decompose into distinct token arrival phases. The metrics still show meaningful Prompt Build and Total Server times.

**Hooks order invariant:** The `OracleDebugPanel` component calls all React hooks (useOracleStore, useQuery, useMemo, useState, useCallback) **before** any conditional returns. This ensures the hooks order is consistent regardless of the `debugOpen` state, preventing the "Rendered fewer hooks than expected" error.

**Dropdown z-index:** The provider Select dropdown uses `position="popper"`, `side="top"`, and `style={{ zIndex: 99999 }}` to ensure it renders above the debug panel's `z-[100]` fixed overlay. The dropdown opens upward since the panel is anchored to the bottom-right corner.

**Admin debug page vs. debug panel:** The `/admin/oracle/debug` page and the `/oracle` debug panel serve different purposes:
- The admin page is a standalone inspector for any session (past or present), with full prompt reconstruction, quota details, raw JSON, and feature injection inspection
- The debug panel is a live, always-on overlay that shows real-time timing, token counts, and model override for the current session
- Both read from the same `oracle_messages` table, so timing data stored by the panel is also visible in the admin debug page