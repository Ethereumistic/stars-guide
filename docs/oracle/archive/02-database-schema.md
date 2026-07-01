# Oracle AI System — Database Schema

> Source: ORACLE_EXPLAINED.md §2

The Oracle uses five Convex tables defined in `convex/schema.ts`:

---

## `oracle_settings` (Table 20)

Key-value configuration store. Every admin-editable setting is a row with:
- `key` — unique identifier (indexed)
- `value` — always stored as string, parsed at app layer
- `valueType` — `"string" | "number" | "boolean" | "json"`
- `label` — human-readable name for admin UI
- `description` — optional explanation
- `group` — categorization: actual code queries by `"soul"`, `"model"`, `"token_limits"`, `"provider"`, and `"quota"`; the schema comment lists `"model" | "quota" | "content" | "safety" | "operational"`
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

---

## `oracle_sessions` (Table 22)

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

---

## `oracle_messages` (Table 28)

Individual messages within sessions:
- `sessionId` — foreign key to sessions (indexed)
- `role` — `"user"` or `"assistant"`
- `content` — message text
- `modelUsed` — which LLM produced this (assistant only)
- `promptTokens`, `completionTokens` — token usage metadata (assistant only)
- `fallbackTierUsed` — `"A" | "B" | "C" | "D"` (assistant only; D = hardcoded fallback)
- `systemPromptHash` — optional string; snapshot of system prompt for observability
- `journalPrompt` — optional string (assistant only); journal prompt suggested by Oracle via `JOURNAL_PROMPT:` line in response
- `timingPromptBuildMs` — optional number; milliseconds spent assembling the prompt (context loading, birth data, journal, timespace, etc.)
- `timingRequestQueueMs` — optional number; milliseconds from prompt assembly completion to LLM HTTP request sent (includes provider lookup, URL building, header construction, and network overhead)
- `timingTtftMs` — optional number; milliseconds from LLM HTTP request start to first content token received (Time to First Token, including network RTT and prompt processing)
- `timingInitialDecodeMs` — optional number; milliseconds from first token to ~200 characters of output (measures initial generation speed after TTFT)
- `timingTotalMs` — optional number; total wall-clock milliseconds from `invokeOracle` handler start to completion
- `debugModelUsed` — optional string; when a debug model override is active, records the `providerId/model` string (e.g. `openrouter/anthropic/claude-sonnet-4`)
- `audioData` — optional string (deprecated)
- `audioStorageId` — optional storage ID
- `audioUrl` — optional string
- `binauralParams` — optional any; binaural beat parameters
- `rating` — optional union of `"thumbs_up" | "thumbs_down"`
- `ratingAt` — optional number; timestamp when rating was set
- `createdAt`

---

## `oracle_quota_usage` (Table 21)

Per-user quota tracking:
- `userId` — indexed
- `burstCost` — `v.optional(v.float64())`; microdollars spent in current 5h burst window
- `burstWindowStart` — `v.optional(v.float64())`; timestamp when current 5h window started
- `weeklyCost` — `v.optional(v.float64())`; microdollars spent in current 7d weekly window
- `weeklyWindowStart` — `v.optional(v.float64())`; timestamp when current 7d window started
- `lastQuestionAt`, `updatedAt

---

## `oracle_feature_injections` (Table 19)

Per-feature prompt augmentation blocks:
- `featureKey` — indexed, e.g. `"birth_chart"`, `"journal_recall"`, `"birth_chart_depth_core"`, `"birth_chart_depth_full"`
- `contextText` — the prompt block injected into the system prompt
- `isActive`, `version`, timestamps

---

## Wiring — How the Tables Connect

```
oracle_settings ──────────────────────────────────────────────
  ↳ Read by: invokeOracle (soul, model params, kill switch)
  ↳ Read by: checkQuota (quota limits)
  ↳ Read by: Admin UI (all settings)
  ↳ Written by: Admin UI mutations (upsertSetting)

oracle_sessions ──────────────────────────────────────────────
  ↳ Created by: createSession mutation
  ↳ Read by: invokeOracle (loads session + messages)
  ↳ Read by: getUserSessions query (sidebar)
  ↳ Updated by: invokeOracle (title, modelUsed, status)
  ↳ Updated by: updateSessionFeature, updateSessionBirthChartDepth
  ↳ Deleted by: deleteSession (cascades to messages)
  ↳ Foreign key: userId → users table
      Foreign key: oracle_messages.sessionId → this table

oracle_messages ──────────────────────────────────────────────
  ↳ Created by: createSession (first user message)
  ↳ Created by: addMessage (follow-up user messages)
  ↳ Created by: createStreamingMessage (assistant placeholder)
  ↳ Updated by: updateStreamingContent (during streaming)
  ↳ Finalized by: finalizeStreamingMessage (final content + metadata)
  ↳ Patched by: patchMessageTiming (timing metrics + debug model)
  ↳ Foreign key: sessionId → oracle_sessions

oracle_quota_usage ───────────────────────────────────────────
  ↳ Read by: checkQuota query
  ↳ Incremented by: incrementQuota mutation (after successful LLM call only)
  ↳ Foreign key: userId → users table

oracle_feature_injections ───────────────────────────────────
  ↳ Read by: invokeOracle (feature instruction blocks)
  ↳ Written by: Admin UI (optional override for feature text)
```