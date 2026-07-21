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
- `max_tokens`
- `model_pricing`
- `quota_burst_budget_*`
- `quota_weekly_budget_*`
- `quota_burst_window_ms`
- `quota_weekly_window_ms`

Provider API keys are not stored in settings. Provider config stores environment variable names used by server code to read secrets.

Provider definitions and feature model chains live in `ai_providers` and `ai_feature_profiles` and are edited only at `/admin/ai`. Oracle's optional user-facing choices live in `ai_user_model_options`; use the **User models** tab to assign tier access, per-tier defaults, reasoning efforts, and ordered fallback chains. The removed provider/model keys may still appear in migrated databases or read-only debug snapshots, but they are not runtime inputs.

## Provider Routing

The main Oracle action delegates provider/model selection and streaming transport to the `oracle_chat` AI Gateway profile. When user selection is enabled, the server first resolves the session's opaque option key against the user's current tier and uses that option's private chain. If access changed or configuration is incomplete, the feature-profile chain is the safe fallback. The gateway records attempts and owns fallback, cooldown, and provider health. Oracle retains prompt assembly, hardcoded safety, quota, consent gates, message persistence, and output scanning. Legacy provider/model settings shown in debug output are read-only migration context.

The debug panel can pass `debugModelOverride` to `invokeOracle`. This override is local to that request, is accepted only for admins, and is not written back to Oracle settings.

## Quota

Backend quota is cost-based. `checkQuota` reads burst and weekly budgets, returns remaining microdollar budget, and blocks on `burst_cap` or `weekly_cap`. `incrementQuota` records cost after a successful first assistant response.

`calculateCostMicro` uses model pricing plus token counts. Free-suffix models return zero token cost, but quota code still tracks activity timestamps.

Known drift: `src/app/(admin)/admin/oracle/settings/page.tsx` still contains old `quota_limit_*` UI state and save calls. Backend quota uses `quota_burst_*` and `quota_weekly_*`; clean up the admin UI before relying on it for quota changes.

## Debugging A Response

Start with `/admin/oracle/debug` for stored session/message history, model/tier usage, timing fields, provider chain, and safety/kill-switch stats. When output scanning intervenes, the Messages tab shows an admin-only quarantine card containing the exact rule IDs, matched fragments, reason, and original model response. Older traces created before this evidence was added cannot recover already-deleted output.

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
| Streamed answer changes to recalibration copy | Messages → Output safety evidence in `/admin/oracle/debug`; inspect rule ID, matched fragment, and quarantined response |
| Dedicated report session stays pending | Report `onboardingStep`, origin session ownership, and questionnaire submission/job state |
| Quota blocks too early | burst/weekly budget settings and `oracle_quota_usage` cost fields |
| Unexpected model | session model-option key, current user tier, per-tier default, feature-profile fallback, provider config, debug override, and gateway events |
| Missing journal context | pipeline requirements plus server-side journal consent |
| Missing birth context | active pipeline data requirements |
| Binaural playback issue | stored/generated beat params and browser Web Audio path |
## Production Evaluation Gate

Run `oracle/evaluation:runProductionEvaluation` as an authenticated admin before changing the Oracle soul, safety-adjacent prompt behavior, or the production model chain. The action runs the versioned fixed suite against every configured `oracle_chat` tier and stores the complete latest result in the `evaluation_latest` Oracle setting. Release only when the returned top-level `passed` value is `true`; provider errors are failures, not skipped cases.
