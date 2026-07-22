# Operations And Debug

This doc covers runtime settings, provider configuration, quota, and debug tooling for Oracle.

## Admin Surfaces

| Surface | Route | Files |
| --- | --- | --- |
| Oracle admin landing | `/admin/oracle` | `src/app/(admin)/admin/oracle/page.tsx` |
| Runtime settings | `/admin/oracle/settings` | `src/app/(admin)/admin/oracle/settings/page.tsx` |
| Providers, feature profiles, and user model access | `/admin/ai` | `src/app/(admin)/admin/ai/page.tsx`, `src/components/ai-admin/user-model-options-panel.tsx` |
| Session/debug explorer | `/admin/oracle/debug` | `src/app/(admin)/admin/oracle/debug/page.tsx`, `convex/oracle/debug.ts` |
| Safety scanner test page | `/admin/oracle/safety` | `src/app/(admin)/admin/oracle/safety/page.tsx` |
| In-app debug panel | Oracle app layout | `src/components/oracle/debug/oracle-debug-panel.tsx` |

The in-app debug panel renders for admins from `src/app/(app)/oracle/layout.tsx`.

## Runtime Settings

Important `oracle_settings` keys include:

- `kill_switch`
- `crisis_response_text`
- `fallback_response_text`
- `temperature`
- `top_p`
- `stream_enabled`
- `oracle_streaming_v2_enabled`
- `oracle_streaming_v2_rollout_percent`
- `oracle_streaming_v2_shadow_percent`
- `max_tokens`
- `model_pricing`
- `quota_burst_budget_*`
- `quota_weekly_budget_*`
- `quota_burst_window_ms`
- `quota_weekly_window_ms`

Provider API keys are not stored in settings. Provider config stores environment variable names used by server code to read secrets.

`stream_enabled` controls user-visible progressive publication on the durable V2 path. When it is `false`, Oracle still uses the provider stream transport for framing, deadlines, usage, and cancellation, but approved content remains buffered until finalization. It does not disable SSE transport or the persisted placeholder/lifecycle.

Streaming V2 rollout is deterministic by user ID. `oracle_streaming_v2_enabled=false` is the one-setting rollback to buffered publication. When enabled, the live percentage receives progressive V2 publication; the following shadow percentage runs V2 framing/validation and metrics but buffers user-visible content until finalization. Missing settings fail closed to buffered publication (`false`, `0`, `0`), so a deployment must explicitly seed and advance cohorts. These controls never alter hardcoded safety, consent, quota, or ownership checks.

The customer chat derives busy state from the subscribed active turn, not browser-local streaming state. Refreshes and second tabs attach to the same turn; leaving the page does not cancel it. Stop is explicit. Retry creates a linked full turn, while Resume reopens the same incomplete validated-section turn, preserves approved rows, and requests only its missing deterministic keys.

The current user message is authoritative for data exclusions. Phrases such as “do not use my birth chart or journal” suppress those pipelines and contexts even when a prior session feature, account birth data, or journal consent exists. Ordinary quality-contract misses such as formatting, optional calibration, or recommendation wording are retained in traces for review but do not replace benign output. Hardcoded output-safety matches and canonical natal contradictions remain blocking.

Provider definitions and feature model chains live in `ai_providers` and `ai_feature_profiles` and are edited only at `/admin/ai`. Oracle's optional user-facing choices live in `ai_user_model_options`; use the **User models** tab to assign tier access, per-tier defaults, reasoning efforts, and ordered fallback chains. Reasoning effort is user-selectable across all five levels by default; enable **Restrict choices** only for a route that cannot support particular effort values. The removed provider/model keys may still appear in migrated databases or read-only debug snapshots, but they are not runtime inputs.

## Provider Routing

The main Oracle action delegates provider/model selection and streaming transport to the `oracle_chat` AI Gateway profile. When user selection is enabled, the server first resolves the session's opaque option key against the user's current tier and uses that option's private chain. If access changed or configuration is incomplete, the feature-profile chain is the safe fallback. The gateway records attempts and owns fallback, cooldown, and provider health. Oracle retains prompt assembly, hardcoded safety, quota, consent gates, message persistence, and output scanning. The V2 runner persists approved ordinary batches or validated natal sections into the existing assistant placeholder and never awaits a Convex write per provider token. Legacy provider/model settings shown in debug output are read-only migration context.

The debug panel can pass `debugModelOverride` to `invokeOracle`. This override is local to that request, is accepted only for admins, and is not written back to Oracle settings.

## Quota

Backend quota is cost-based. `checkQuota` reads burst and weekly budgets, returns remaining microdollar budget, and blocks on `burst_cap` or `weekly_cap`. `incrementQuota` records cost after a successful first assistant response.

`calculateCostMicro` uses model pricing plus token counts and applies a 100-microdollar minimum to every provider attempt, including free-suffix models. This is a quota allowance unit, not a claim that the provider charged money.

Known drift: `src/app/(admin)/admin/oracle/settings/page.tsx` still contains old `quota_limit_*` UI state and save calls. Backend quota uses `quota_burst_*` and `quota_weekly_*`; clean up the admin UI before relying on it for quota changes.

## Debugging A Response

Start with `/admin/oracle/debug` for stored session/message history, model/tier usage, timing fields, provider chain, and safety/kill-switch stats. The Prompt Assembly tab shows execution-time system/user prompt manifests and the report interpretation manifest when they were recorded. These contain labels, versions, sizes, and hashes—not sensitive prompt contents. The expandable prompt preview is reconstructed from current code/settings and is explicitly not historical evidence.

The durable turn timeline separates request acceptance, action/provider start, provider connection, first provider token, first approved content, first persistence, first client visibility, validation/repair, and terminal state. Provider connect duration ends when response headers arrive; TTFT begins there and ends on the first text delta. Approval is timestamped before its durable write, so approved-to-persisted latency is measurable. Fleet health summarizes partials, malformed frames, natal protocol fallback, repeated repair, slow provider-to-persistence gaps, stale active turns, and rollout cohorts. Client-visible timing is clamped, ownership-checked, accepted once, and never treated as lifecycle authority.

`recover-stale-oracle-turns` runs every five minutes. It marks abandoned turns failed, incomplete, or cancelled after the 11-minute liveness window, preserves already-approved content, schedules idempotent quota charging, and never invokes or retries a model.

The User & Birth tab shows Birth Chart Report eligibility, reason, pipeline/contract versions, current and stored chart fingerprints, selection mode, and included sections. A normal natal answer remains valid when the report is ineligible because canonical birth data is independent. `pipeline_version_stale`, fingerprint mismatch, invalid structured contract, or legacy pattern semantics explain why the interpretation layer was omitted.

When output scanning intervenes, the Messages tab shows an admin-only quarantine card containing the exact rule IDs, matched fragments, reason, and original model response. Older traces created before this evidence was added cannot recover already-deleted output.

Use the in-app debug panel when reproducing a live chat issue. It shows:

- selected override provider/model
- effective model-option key and reasoning effort
- requested option/effort and any access/configuration fallback reason
- last assistant model and fallback tier
- prompt/completion tokens
- server timing fields
- client-observed streaming timing

Use `/admin/oracle/safety` when testing `scanResponse` behavior against candidate output.

## Common Checks

| Symptom | Check |
| --- | --- |
| Oracle returns offline copy | `kill_switch` and `fallback_response_text` |
| User gets crisis copy | crisis regexes in `convex/oracle/llm.ts` and `crisis_response_text` |
| Streamed answer changes to recalibration copy | Inspect the durable turn `safeErrorCode`. For `output_safety_blocked`, use Messages → Output safety evidence and inspect the exact rule/match. For `response_contract_failed`, confirm the request actually selected a natal capability and inspect canonical contradiction codes; ordinary advisory contract misses should not block publication. |
| Dedicated report session stays pending | Report `onboardingStep`, origin session ownership, and questionnaire submission/job state |
| Quota blocks too early | burst/weekly budget settings and `oracle_quota_usage` cost fields |
| Unexpected model | session model-option key, current user tier, per-tier default, feature-profile fallback, provider config, debug override, and gateway events |
| Missing journal context | pipeline requirements plus server-side journal consent |
| Missing birth context | active pipeline data requirements |
| Missing report interpretation layer | User & Birth → report eligibility reason, pipeline version 7, contract v3, and matching source fingerprints |
| Omitted planet/point in a full-chart answer | trace request-plan `requiredNatalEntities` and response-contract violations |
| Invented natal aspect | trace violations for `unsupported_natal_aspect`; compare against canonical stored aspects |
| Binaural playback issue | stored/generated beat params and browser Web Audio path |

## Production Evaluation Gate

Run `oracle/evaluation:runProductionEvaluation` as an authenticated admin before changing the Oracle soul, safety-adjacent prompt behavior, or the production model chain. The action runs the versioned fixed suite against every configured `oracle_chat` tier and stores the complete latest result in the `evaluation_latest` Oracle setting. Release only when the returned top-level `passed` value is `true`; provider errors are failures, not skipped cases.
