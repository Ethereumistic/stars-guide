# AI Gateway Migration Handoff

This handoff is for the next agent continuing the move from Oracle-owned provider/model settings to a robust, feature-agnostic AI Gateway.

Current date/context for this document: 2026-07-01.

## Goal

Make `/admin/ai` the single root control surface and runtime gateway for all AI infrastructure:

- providers
- models
- fallback chains
- per-feature defaults
- non-streaming invocation
- streaming invocation
- testing
- observability
- health/failure handling

Oracle, horoscope generation, cosmic weather felt-language generation, zeitgeist synthesis, emotional translation/classification, birth chart reports, and future AI features should consume the gateway by feature key. Oracle must not own the global AI provider system.

## Current Status

The gateway foundation exists, and admin control is now mostly centralized. Runtime migration is still incomplete.

Implemented:

- New Convex tables exist in `convex/schema.ts`:
  - `ai_providers`
  - `ai_feature_profiles`
  - `ai_gateway_events`
- `convex/aiGateway/admin.ts` exists with:
  - admin provider list/upsert/disable APIs
  - admin feature profile list/upsert APIs
  - internal runtime helpers for enabled providers, feature profiles, and gateway event logging
  - `seedFromLegacyOracleSettings`, which copies legacy Oracle AI settings into gateway tables
- `convex/aiGateway/runtime.ts` exists with a first non-streaming `invokeAIGateway` internal action.
- `/admin/ai` provider management reads/writes `ai_providers`.
- `/admin/ai` has a Feature Profiles panel for `ai_feature_profiles`.
- `/admin/ai` can seed from legacy settings.
- `/admin/ai` can test non-streaming feature profiles through the gateway.
- `/admin/ai` endpoint testing now reads enabled providers from `ai_providers`.
- `/admin/oracle/settings` no longer exposes duplicate provider/model controls. It is now Oracle-specific: Soul, Limits, Quotas, Operations.
- Old Oracle settings provider/model editor components were removed from the UI.

Still incomplete:

- Gateway streaming is not implemented.
- Oracle chat streaming in `convex/oracle/llm.ts` still uses Oracle-owned provider/model fallback logic.
- Birth chart report generation still uses Oracle runtime settings/model chains.
- Zeitgeist synthesis and emotional translation/classification in `convex/ai.ts` still use legacy provider resolution and direct `callLLMEndpoint`.
- Cosmic weather felt-language generation in `convex/cosmicWeather.ts` still uses legacy provider resolution and direct `callLLMEndpoint`.
- New cron-based horoscope generation in `convex/horoscopes/generateForSign.ts` still resolves providers/models from `oracle_settings`, then runs its own fallback/backoff loop.
- Old/admin horoscope generation code in `convex/ai.ts` appears to be legacy relative to the newer cron path, but it still contains live actions used by admin wrappers. Do not delete it until all call sites are verified.
- `ai_provider_health` has not been added.
- Legacy Oracle provider/model settings still exist for compatibility and some runtime paths.

Update after migration slice on 2026-07-01:

- Added the `cosmic_weather_felt_language` feature profile default.
- Migrated `synthesizeZeitgeist` to `invokeAIGateway` with feature `zeitgeist_synthesis`.
- Migrated `synthesizeEmotionalZeitgeist` pass 1 to `emotional_translation` and pass 2 to `emotional_register_classification`.
- Migrated `generateFeltLanguage` to `invokeAIGateway` with feature `cosmic_weather_felt_language`.
- Updated the horoscope guide to reflect that the dedicated felt-language cron is disabled and felt language is consumed by `generateForSign` when present.

## Read First

Read these before editing:

- `docs/ai/AI_PROVIDERS_MODELS.md`
- `docs/horoscope/HOROSCOPES_EXPLAINED.md`
- `src/app/(admin)/admin/ai/page.tsx`
- `src/components/ai-admin/`
- `src/components/ai/ai-model-picker.tsx`
- `src/lib/ai/registry.ts`
- `convex/aiGateway/admin.ts`
- `convex/aiGateway/runtime.ts`
- `convex/lib/llmProvider.ts`
- `convex/cosmicWeather.ts`
- `convex/ai.ts`
- `convex/admin.ts`
- `convex/horoscopes/generateForSign.ts`
- `convex/horoscopes/queueDailyGenerations.ts`
- `convex/crons.ts`
- `convex/oracle/llm.ts`
- `convex/oracle/settings.ts`
- `convex/oracle/providerRouter.ts`
- `convex/birthChartReport/generate.ts`
- `convex/schema.ts`

Important TypeScript note:

- Several Convex files use `makeFunctionReference(...)` or untyped generated API refs such as `require("../_generated/api") as any`.
- This is intentional defensive work around Convex `TS2589: Type instantiation is excessively deep and possibly infinite`.
- Prefer small named `makeFunctionReference` constants. Use broad untyped generated refs only when a file has many generated API references and line-by-line typing keeps failing.

## Current Runtime Reality

There are multiple AI runtime paths today.

### Gateway Path

- File: `convex/aiGateway/runtime.ts`
- Function: `invokeAIGateway`
- Status: non-streaming only.
- Handles:
  - feature profile lookup
  - enabled provider lookup
  - chain iteration
  - fallback on retryable failures
  - event logging to `ai_gateway_events`

### Generic Provider Adapter

- File: `convex/lib/llmProvider.ts`
- Status: still used broadly.
- Handles:
  - OpenAI-compatible HTTP request construction
  - provider headers
  - thinking/reasoning parameters
  - response normalization

The gateway currently calls `callLLMEndpoint` from this file. That is acceptable for the next slice, but the long-term design should make provider adapter behavior explicit under `convex/aiGateway/` or clearly bless `convex/lib/llmProvider.ts` as the shared adapter.

### Oracle Streaming Path

- Files:
  - `convex/oracle/llm.ts`
  - `convex/oracle/providerRouter.ts`
- Status: still Oracle-owned.
- Do not migrate until gateway streaming has been implemented and tested.

### New Horoscope Cron Path

- Main files:
  - `convex/horoscopes/generateForSign.ts`
  - `convex/horoscopes/queueDailyGenerations.ts`
  - `convex/crons.ts`
  - `docs/horoscope/HOROSCOPES_EXPLAINED.md`
- Status: current lightweight cron-based generation path.
- Important correction from older handoff: production daily horoscope generation is no longer best described as `convex/ai.ts`. The current doc says the daily cron queues `horoscopes/generateForSign:generateForSign`.
- Current issue: `generateForSign.ts` still reads `oracle_settings.providers_config` and horoscope-specific Oracle settings, then builds its own fallback chain and retries.
- Current improvement already present: `generateForSign.ts` now includes `cosmicWeather.feltLanguage` in the horoscope prompt when available, even though parts of the horoscope doc still describe it as stored but unused. Verify current code before changing the doc.

### Legacy/Admin Horoscope Path

- File: `convex/ai.ts`
- Status: legacy/admin generation job engine plus zeitgeist/emotional synthesis actions.
- Contains older batch job code that reads providers from `oracle_settings` and calls `callLLMEndpoint` directly.
- Do not assume this path is dead. Verify call sites before removing or migrating.

### Zeitgeist And Emotional AI Paths

- File: `convex/ai.ts`
- Functions:
  - `synthesizeZeitgeist`
  - `synthesizeEmotionalZeitgeist`
- Admin wrappers:
  - `convex/admin.ts` has `synthesizeZeitgeistAction`
  - `convex/admin.ts` has `synthesizeEmotionalZeitgeistAction`
- Current issue:
  - Both use `internal.aiQueries.getOracleProvidersConfig`
  - Both parse `oracle_settings.providers_config`
  - Both resolve a provider manually
  - Both call `callLLMEndpoint` directly
- Target:
  - `synthesizeZeitgeist` should call `invokeAIGateway` with feature `zeitgeist_synthesis`.
  - Emotional pass 1 should call `invokeAIGateway` with feature `emotional_translation`.
  - Emotional pass 2 should call `invokeAIGateway` with feature `emotional_register_classification`.
  - Preserve prompts, output expectations, and the existing graceful fallback if classification fails.

### Cosmic Weather Felt Language

- File: `convex/cosmicWeather.ts`
- Function: `generateFeltLanguage`
- Cron status:
  - `convex/crons.ts` comment says the dedicated cron was burning LLM tokens and that felt language is generated on demand by `generateForSign`.
  - `docs/horoscope/HOROSCOPES_EXPLAINED.md` may still mention a daily `generate-felt-language` cron. Verify `convex/crons.ts` as source of truth before updating docs.
- Current issue:
  - `generateFeltLanguage` still imports `parseProvidersConfig`, `resolveProvider`, and `callLLMEndpoint`.
  - It should become a gateway consumer if kept.
- Target feature key:
  - Add or seed `cosmic_weather_felt_language`, or reuse a clearly named existing content-generation profile only if the team wants fewer profile keys.

## Feature Keys

Currently seeded initial profiles include:

- `oracle_chat`
- `oracle_intent`
- `birth_chart_report`
- `horoscope_generation`
- `zeitgeist_synthesis`
- `emotional_translation`
- `emotional_register_classification`
- `ai_admin_test`

Recommended addition:

- `cosmic_weather_felt_language`

Suggested defaults:

| Feature | Mode | Thinking | Safety | Quota | Notes |
|---|---|---|---|---|---|
| `oracle_chat` | `stream` | `auto` | `oracle` | `oracle_user` | Streaming; migrate last |
| `oracle_intent` | `json` or `chat` | `disabled` | `oracle` | `oracle_user` | Low temp, small max tokens |
| `birth_chart_report` | `json` | `disabled` or `low` | `oracle` | `oracle_user` | Strong structured model |
| `horoscope_generation` | `json` | `disabled` | `content_generation` | `admin_ops` | Current cron path |
| `cosmic_weather_felt_language` | `chat` | `disabled` or `low` | `content_generation` | `admin_ops` | If kept |
| `zeitgeist_synthesis` | `chat` | `auto` | `content_generation` | `admin_ops` | Plain text |
| `emotional_translation` | `chat` | `auto` | `content_generation` | `admin_ops` | Plain text |
| `emotional_register_classification` | `json` | `disabled` | `content_generation` | `admin_ops` | JSON array |
| `ai_admin_test` | `chat` | `auto` | `none` | `admin_ops` | Testing only |

## Target Gateway API

Keep non-streaming and streaming separate.

Existing non-streaming shape:

```ts
await ctx.runAction(invokeAIGatewayRef, {
  feature: "zeitgeist_synthesis",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
});
```

Recommended streaming shape:

```ts
await streamAIGateway(ctx, {
  feature: "oracle_chat",
  messages,
  callbacks: {
    onStart(metadata) {},
    onToken(token) {},
    onReasoningToken?(token) {},
    onComplete(result) {},
    onError(error) {},
  },
});
```

Do not force streaming through `invokeAIGateway`. Streaming has different lifecycle, cancellation, persistence, callback, and partial-output concerns.

## Robust Streaming Requirements

Implement gateway streaming before migrating Oracle chat.

Best-practice requirements:

- Gateway owns provider/model selection, fallback, retry classification, and telemetry.
- Oracle owns prompt assembly, crisis detection, kill switch, quota precheck, journal consent gates, birth-data pipeline gates, output safety scanning, persistence, and user-facing session state.
- Stream one provider/model at a time.
- If a stream fails before emitting meaningful content, the gateway may fall back to the next chain entry.
- If a stream fails after emitting user-visible content, do not silently continue with a different model into the same user-visible answer. Return a normalized partial-stream failure and let Oracle decide how to persist or recover.
- Support `AbortSignal`/timeout per attempt.
- Log an `ai_gateway_events` row per attempt:
  - feature
  - mode
  - provider
  - model
  - tier
  - status
  - error type/message
  - duration
  - token counts if available
- Normalize provider streaming formats:
  - OpenAI-compatible `data: {...}` SSE chunks
  - `[DONE]`
  - OpenRouter-compatible deltas
  - reasoning fields if surfaced by provider
- Do not leak chain-of-thought. If a provider emits reasoning content, keep it separate and only expose/store it where an admin/debug surface explicitly supports it.
- Preserve prompt caching/provider headers currently used in Oracle streaming if still needed.
- Keep fallback classification simple:
  - Retry/fallback on network error, timeout, 429, 500/502/503/504, empty pre-content stream.
  - Do not retry/fallback on missing API key, invalid provider config, request validation/400, safety block.

## Migration Plan From Here

### Phase A: Update Profiles And Docs

Status: done in the 2026-07-01 migration slice.

Tasks:

1. Add `cosmic_weather_felt_language` to the feature profile defaults in `convex/aiGateway/admin.ts`.
2. Make sure `seedFromLegacyOracleSettings` seeds it safely.
3. Update `docs/horoscope/HOROSCOPES_EXPLAINED.md` if it is stale about felt-language cron usage or whether felt language is consumed by `generateForSign`.
4. Keep legacy settings intact. Do not delete old keys yet.

### Phase B: Migrate Zeitgeist And Emotional AI Paths

Status: done in the 2026-07-01 migration slice.

Files:

- `convex/ai.ts`
- `convex/admin.ts`
- `convex/aiGateway/runtime.ts`

Tasks:

1. Add a named `makeFunctionReference` for `aiGateway/runtime:invokeAIGateway` in `convex/ai.ts`.
2. Replace direct provider resolution in `synthesizeZeitgeist` with gateway invocation:
   - feature: `zeitgeist_synthesis`
   - mode: `chat`
   - preserve system/user prompts
   - preserve return type: trimmed string
3. Replace emotional translation pass with gateway invocation:
   - feature: `emotional_translation`
   - mode: `chat`
   - preserve prompt
   - preserve return JSON shape from the action wrapper
4. Replace emotional register classification pass with gateway invocation:
   - feature: `emotional_register_classification`
   - mode: `json`
   - preserve graceful catch/fallback to empty register
5. Decide what to do with `providerId`/`modelId` args on admin wrappers:
   - Best compatibility: pass them as gateway `overrides` when supplied.
   - Long-term: UI should test/edit feature profiles in `/admin/ai`, not pass raw provider/model around.
6. Verify `ai_gateway_events` logs success/failure per pass.

Acceptance:

- `synthesizeZeitgeist` no longer reads `oracle_settings.providers_config`.
- `synthesizeEmotionalZeitgeist` no longer reads `oracle_settings.providers_config`.
- Existing admin UI behavior is preserved.
- Classification failure still does not fail the whole emotional translation action.

### Phase C: Migrate Cosmic Weather Felt Language

Status: done in the 2026-07-01 migration slice.

Files:

- `convex/cosmicWeather.ts`
- `convex/aiGateway/admin.ts`

Tasks:

1. Add or verify profile `cosmic_weather_felt_language`.
2. Replace direct provider resolution in `generateFeltLanguage` with `invokeAIGateway`.
3. Preserve idempotency: skip if `feltLanguage` exists unless `force` is true.
4. Preserve prompt output rules.
5. Verify cron/on-demand behavior in `convex/crons.ts` before changing scheduling.

Acceptance:

- `generateFeltLanguage` no longer reads `oracle_settings.providers_config`.
- Events log under `cosmic_weather_felt_language`.
- Horoscope generation still receives `cosmicWeather.feltLanguage` when present.

### Phase D: Migrate New Horoscope Cron Generation

Status: not done.

Files:

- `convex/horoscopes/generateForSign.ts`
- `convex/horoscopes/queueDailyGenerations.ts`
- `docs/horoscope/HOROSCOPES_EXPLAINED.md`

Tasks:

1. Treat `convex/horoscopes/generateForSign.ts` as the current daily horoscope generation path unless code review proves otherwise.
2. Replace its provider/model resolution and provider fallback loop with `invokeAIGateway`.
3. Preserve:
   - prompt construction via `buildHoroscopePrompt`
   - Zod validation
   - JSON parse/recovery
   - 450-character enforcement
   - similarity guard
   - `contextSnapshotId` persistence
   - failed status writes
4. Use feature `horoscope_generation`, mode `json`.
5. Decide how to handle admin overrides:
   - If `args.providerId` and `args.modelId` are passed, forward them as gateway `overrides`.
   - Otherwise use feature profile chain.
6. Keep content validation retry separate from provider fallback:
   - Gateway owns provider/model fallback.
   - Horoscope owns "the model returned malformed/invalid horoscope content" repair/retry behavior.

Acceptance:

- `generateForSign.ts` no longer reads `oracle_settings.providers_config`.
- `getHoroscopeModelSettings` is removed or left unused only temporarily with no call sites.
- `modelUsed` stores the provider/model returned by the gateway.
- `ai_gateway_events` contains horoscope generation attempts.

### Phase E: Add Gateway Streaming

Status: not done.

Files:

- `convex/aiGateway/runtime.ts` or new `convex/aiGateway/streaming.ts`
- `convex/lib/llmProvider.ts` or new provider adapter file
- `convex/oracle/llm.ts`

Tasks:

1. Add a streaming provider adapter for OpenAI-compatible SSE.
2. Add a gateway streaming function that:
   - loads feature profile
   - walks chain
   - applies timeout/abort
   - streams tokens through callbacks
   - logs per-attempt telemetry
   - handles pre-content fallback
   - returns normalized final metadata
3. Add tests or focused local verification for:
   - successful stream
   - timeout before first token
   - failure after partial tokens
   - provider fallback before first token
   - missing API key
4. Do not migrate Oracle chat until this is working independently.

### Phase F: Migrate Oracle Non-Chat Chains

Status: not done.

Move these before full Oracle chat:

- `oracle_intent`
- `birth_chart_report`

Preserve Oracle safety and consent rules. Birth data remains pipeline-gated. Journal context remains pipeline-gated and consent-gated.

### Phase G: Migrate Oracle Chat Streaming

Status: not done.

Only after gateway streaming is stable.

Preserve Oracle invariants:

- crisis detection before LLM
- kill switch before LLM
- hardcoded safety rules prepended before all prompt blocks
- quota pre-check before main model calls
- output safety scanning after model output
- refusal retry behavior
- journal consent gate
- birth data pipeline gate
- synastry user-facing language, no "Chart A" / "Chart B"

The gateway should own provider/model/fallback mechanics. Oracle should own Oracle-specific prompt assembly, safety, quota policy, persistence, and UX state.

### Phase H: Deprecate Legacy Oracle AI Settings

Status: not started.

Only after runtime paths use gateway tables:

- stop writing `providers_config`
- stop writing `model_chain`
- stop writing `intent_model_chain`
- stop writing `birth_chart_report_model_chain`
- stop writing `horoscope_provider`
- stop writing `horoscope_model`
- stop writing `horoscope_fallback_provider`
- stop writing `horoscope_fallback_model`

Keep a read-only migration/debug view temporarily if helpful.

## Acceptance Criteria

- `/admin/ai` is the only admin surface for global AI provider/profile management.
- Providers are structured rows in `ai_providers`.
- Every active AI feature has a feature profile.
- Zeitgeist synthesis uses the gateway.
- Emotional translation/classification uses the gateway.
- Cosmic weather felt-language generation uses the gateway if kept.
- Current daily horoscope cron generation uses the gateway.
- Birth chart report generation uses the gateway.
- Oracle intent uses the gateway.
- Oracle chat streaming uses gateway streaming.
- Oracle still enforces crisis/safety behavior server-side.
- Gateway logs each AI attempt with feature, provider, model, status, latency, token usage when available, and error.
- Legacy Oracle provider/model settings are no longer active runtime sources.

## Risks And Guardrails

- Do not break Oracle safety. Keep crisis/safety hardcoded and server-enforced.
- Do not remove old settings until every runtime path has been migrated.
- Do not assume old horoscope generation code is dead without verifying call sites.
- Do not treat `/admin/ai` non-streaming tests as proof that Oracle streaming works.
- Do not invent a complex policy language.
- Do not make all features share Oracle quota automatically.
- Do not hide provider failures; log normalized errors.
- Do not silently switch models after user-visible streaming content has already begun.
- Do not leak provider reasoning/chain-of-thought into user-facing output.

## Suggested Next PR

Best next implementation PR:

1. Migrate `convex/horoscopes/generateForSign.ts` to `invokeAIGateway`.
2. Preserve horoscope validation/recovery logic.
3. Remove unused horoscope model/provider legacy helpers only after no call sites remain.

Then:

1. Implement gateway streaming robustly.
2. Migrate Oracle non-chat chains.
3. Migrate Oracle chat streaming last.
