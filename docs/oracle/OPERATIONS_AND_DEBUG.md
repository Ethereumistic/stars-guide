# Operations And Debug

This doc covers runtime settings, provider configuration, quota, and debug tooling for Oracle.

## Admin Surfaces

| Surface | Route | Files |
| --- | --- | --- |
| Oracle admin landing | `/admin/oracle` | `src/app/(admin)/admin/oracle/page.tsx` |
| Runtime settings | `/admin/oracle/settings` | `src/app/(admin)/admin/oracle/settings/page.tsx` |
| Session/debug explorer | `/admin/oracle/debug` | `src/app/(admin)/admin/oracle/debug/page.tsx`, `convex/oracle/debug.ts` |
| Safety scanner test page | `/admin/oracle/safety` | `src/app/(admin)/admin/oracle/safety/page.tsx` |
| In-app debug panel | Oracle app layout | `src/components/oracle/debug/oracle-debug-panel.tsx` |

The in-app debug panel renders for admins from `src/app/(app)/oracle/layout.tsx`.

## Runtime Settings

Important `oracle_settings` keys include:

- `kill_switch`
- `crisis_response_text`
- `fallback_response_text`
- `providers_config`
- `model_chain`
- `intent_model_chain`
- `birth_chart_report_model_chain`
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

## Provider Routing

The main Oracle action reads providers and model chain from settings. `selectProvider` walks the chain in order and reserves a provider slot if it is under `maxConcurrent`. Each provider call must release the slot in `finally`.

The debug panel can pass `debugModelOverride` to `invokeOracle`. This override is local to that request/session path and is not written back to Oracle settings.

## Quota

Backend quota is cost-based. `checkQuota` reads burst and weekly budgets, returns remaining microdollar budget, and blocks on `burst_cap` or `weekly_cap`. `incrementQuota` records cost after a successful first assistant response.

`calculateCostMicro` uses model pricing plus token counts. Free-suffix models return zero token cost, but quota code still tracks activity timestamps.

Known drift: `src/app/(admin)/admin/oracle/settings/page.tsx` still contains old `quota_limit_*` UI state and save calls. Backend quota uses `quota_burst_*` and `quota_weekly_*`; clean up the admin UI before relying on it for quota changes.

## Debugging A Response

Start with `/admin/oracle/debug` for stored session/message history, model/tier usage, timing fields, provider chain, and safety/kill-switch stats.

Use the in-app debug panel when reproducing a live chat issue. It shows:

- selected override provider/model
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
| No LLM call for user with birth data | Birth Chart Report status and onboarding step |
| Quota blocks too early | burst/weekly budget settings and `oracle_quota_usage` cost fields |
| Unexpected model | model chain, provider config, debug override, and provider concurrency |
| Missing journal context | pipeline requirements plus server-side journal consent |
| Missing birth context | active pipeline data requirements |
| Binaural playback issue | stored/generated beat params and browser Web Audio path |
