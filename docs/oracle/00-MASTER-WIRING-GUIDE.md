# Oracle AI - Master Wiring Guide

This is the short, current map for the Oracle feature. It should stay small enough to read at the start of a task.

For details, inspect code first. Older long-form docs were moved to `archive/` and may be stale.

## Main Entry Points

| Area | Current files |
| --- | --- |
| New Oracle session | `src/app/(app)/oracle/new/page.tsx` |
| Chat UI | `src/app/(app)/oracle/chat/[sessionId]/page.tsx` |
| Composer and preferences | `src/components/oracle/input/`, `src/lib/ai/inference-preferences.ts` |
| Oracle layout/sidebar/debug panel | `src/app/(app)/oracle/layout.tsx`, `src/components/oracle/` |
| Main Convex action | `convex/oracle/llm.ts` (`invokeOracle`) |
| Sessions/messages | `convex/oracle/sessions.ts` |
| Settings/providers | `convex/oracle/settings.ts`, `convex/oracle/upsertProviders.ts`, `src/lib/oracle/providers.ts` |
| Quota | `convex/oracle/quota.ts`, `convex/oracle/pricing.ts` |
| Provider selection | `convex/oracle/providerRouter.ts` |
| User model access/routing | `convex/aiGateway/userModelOptions.ts` |
| Pipelines | `src/lib/oracle/pipelines/` |
| Pipeline types | `src/lib/oracle/pipelineTypes.ts` |
| Intent routing | `src/lib/oracle/intentRouter.ts`, `src/lib/oracle/intentRouterPrompt.ts` |
| Feature definitions | `src/lib/oracle/features.ts` |
| Birth context | `src/lib/oracle/featureContext.ts`, `src/lib/oracle/birthCalculator.ts` |
| Synastry context | `src/lib/oracle/synastryContext.ts`, `convex/oracle/synastry.ts` |
| Safety | `lib/oracle/safetyRules.ts`, `src/lib/oracle/responseSafety.ts` |
| Oracle state | `src/store/use-oracle-store.ts` |
| Admin settings/debug | `src/app/(admin)/admin/oracle/settings/page.tsx`, `src/app/(admin)/admin/oracle/debug/page.tsx` |

Note: files under root `lib/oracle/` are partly compatibility re-exports for Convex imports. The richer shared implementation is under `src/lib/oracle/`, except `soul.ts` and `safetyRules.ts`, whose real content lives in root `lib/oracle/`.

## Current Product Flow

1. User opens `/oracle/new`.
2. The page checks quota and optional kill switch state.
3. User submits a question or chooses a feature. The composer sends only an opaque model-option key and reasoning effort; it never receives provider chains.
4. `createSession` resolves those preferences against the authenticated user's tier, writes the effective choice to `oracle_sessions`, and writes the first user `oracle_messages` row.
5. The app navigates to `/oracle/chat/[sessionId]`.
6. The chat page calls `api.oracle.llm.invokeOracle` unless the interaction is metadata-only, such as manually storing a generated binaural beat message.
7. Streaming message updates arrive through Convex reactive queries.
8. The final assistant message stores content, model/tier, token/cost metadata, timing metadata, optional journal prompt, optional binaural params, and rating state.

## `invokeOracle` Execution Order

The actual implementation is in `convex/oracle/llm.ts`.

1. Validate question length.
2. Check `kill_switch`; if on, add fallback assistant message and return with no LLM/quota.
3. Check crisis keywords; if matched, add crisis assistant message and return with no LLM/quota.
4. Load session/messages, runtime settings, and current user.
5. If the user has birth data but no completed Birth Chart Report, run the hardcoded report-onboarding path and return before normal LLM work.
6. Migrate legacy `birth_chart_core` / `birth_chart_full` session feature keys to unified `birth_chart`.
7. Check journal consent.
8. Determine whether this is the first assistant response.
9. Run LLM-first intent routing with regex fallback.
10. Resolve active pipelines from intents; fallback to `generic_chat`.
11. Persist auto-activated feature/depth to the session when applicable.
12. Merge pipeline data requirements.
13. Gather required birth data/report, journal context, timespace context, feature injection, and synastry payload.
14. Ask each active pipeline to build system/user prompt blocks.
15. Prepend hardcoded safety rules, sort system blocks by priority, add title/journal directives when needed.
16. Sanitize the user question and append it after user data blocks.
17. Run server-side quota pre-check before any main LLM call.
18. Build conversation history and model config.
19. Resolve the session's model option and reasoning effort against the current user tier. Fall back to the `oracle_chat` feature profile if selection is disabled, unavailable, or invalid.
20. Select provider/model chain order; an authorized admin debug override takes precedence.
21. Stream through model tiers until success.
22. After each successful streamed response, run output safety scanning. If blocked, atomically replace that message with safe fallback copy and retain the scanner rule matches plus quarantined candidate only in the admin-authorized turn trace. Trace persistence is best-effort and cannot change response behavior.
23. If the model refused a benign answer and more tiers remain, delete that refusal and retry with a recovery block.
24. If all tiers fail, add hardcoded fallback assistant message and return.
25. On success, compute cost, patch message cost, increment quota on first response, update title on first response, patch timing metrics, run pipeline `afterResponse` hooks, and mark the session active.

## Current Pipelines

| Pipeline | Trigger/source | Birth data | Journal context | Timespace | Synastry payload | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `generic_chat` | fallback/default | no | yes, if consented | yes | no | Does not inject birth data, but can include journal context. |
| `birth_chart` | manual feature or chart intent | yes | yes, if consented | yes | no | Prefers completed Birth Chart Report, uses raw chart as reference. |
| `journal_recall` | manual feature or journal intent | no by default | yes, expanded | yes | no | Can compose with birth chart when multiple intents are active. |
| `synastry` | manual feature or relationship/chart comparison intent | yes | no | yes | yes | Uses role/name labels, not user-facing "Chart A/B" language. |
| `binaural_beats` | manual feature or sound/frequency intent | raw data only for personalization | no | yes | no | Generates deterministic beat params; browser Web Audio handles playback. |

Available feature keys also include unimplemented UI items such as `attach_files` and `sign_card_image`.

## Data Model

Primary Oracle tables are in `convex/schema.ts`:

- `oracle_feature_injections`
- `oracle_settings`
- `oracle_quota_usage`
- `oracle_sessions` (effective model option, reasoning effort, and route fallback reason)
- `oracle_messages` (raw per-turn requested option/effort for diagnostics)
- `oracle_turn_traces` (admin-only planner, contract, provider, and output-safety evidence; blocked traces retain quarantined output)
- `ai_feature_profiles` (feature default chain and the user-selection rollout switch)
- `ai_user_model_options` (admin-defined, tier-gated model choices and reasoning policy)

Related tables/systems:

- `users.birthData` and `users.birthChartReport`
- `journal_consent` and journal entries/context
- friend birth data for synastry imports

## Safety And Privacy Invariants

- Safety rules are hardcoded and prepended before pipeline blocks.
- Admin settings can alter soul/model/provider/quota/fallback text, but must not weaken safety behavior.
- Crisis and kill-switch responses do not call the LLM or consume quota.
- Quota is checked server-side before main LLM calls and incremented server-side after successful first responses.
- Journal context requires both pipeline demand and server-side consent.
- Birth data is included only when at least one active pipeline requests it.
- User question text is sanitized before entering the final prompt.
- Output is scanned before being accepted.
- A blocked streamed message is replaced in place; its original output and exact scanner rule are visible only to admins through `/admin/oracle/debug`.
- Provider API keys are not stored in the DB; provider config stores env var names.
- Admin debug model override is request-local, server-authorized, and never persisted to Oracle settings. Non-admin overrides are rejected.

## Current Known Documentation Drift

Archived docs may still mention:

- `src/app/oracle/...` instead of `src/app/(app)/oracle/...`.
- `src/app/admin/oracle/...` instead of `src/app/(admin)/admin/oracle/...`.
- `quota_limit_*` settings, which were replaced by cost-based burst/weekly budget settings.
- Binaural beats as a direct Cloudflare Worker POST flow. Current app flow stores sessions/messages and plays generated params with browser Web Audio.
- `convex/oracle/featureInjections.ts`; current feature injection queries live in `convex/oracle/features.ts`.
- The old idea that every request has exactly two LLM calls. Current behavior depends on manual feature selection, first vs follow-up messages, intent routing, gates, retries, and non-LLM/metadata paths.

## How To Change Oracle Safely

1. Start from `convex/oracle/llm.ts` and the relevant pipeline file.
2. Check the frontend route/component that creates or submits the interaction.
3. Check schema fields before changing persisted data.
4. Keep pipeline data requirements honest; do not gather context globally "just in case."
5. Update this guide when wiring changes.
6. Avoid expanding this guide into a full implementation narrative; link to code instead.
