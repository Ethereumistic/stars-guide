# Oracle Architecture

This is the current implementation map for Oracle. Treat code as source of truth and keep this file focused on flow, contracts, and invariants.

## Runtime Surfaces

| Area | Files |
| --- | --- |
| New session UI | `src/app/(app)/oracle/new/page.tsx` |
| Chat UI | `src/app/(app)/oracle/chat/[sessionId]/page.tsx` |
| Composer | `src/components/oracle/input/` |
| Layout, sidebar, admin debug panel | `src/app/(app)/oracle/layout.tsx`, `src/components/oracle/` |
| Main LLM action | `convex/oracle/llm.ts` |
| Sessions and messages | `convex/oracle/sessions.ts` |
| Settings and providers | `convex/oracle/settings.ts`, `convex/oracle/upsertProviders.ts`, `src/lib/oracle/providers.ts` |
| Provider routing | `convex/oracle/providerRouter.ts` |
| User model policy | `convex/aiGateway/userModelOptions.ts`, `src/lib/ai/inference-preferences.ts` |
| Quota and pricing | `convex/oracle/quota.ts`, `convex/oracle/pricing.ts` |
| Pipeline definitions | `src/lib/oracle/pipelines/` |
| Shared pipeline types | `src/lib/oracle/pipelineTypes.ts` |
| Intent routing | `src/lib/oracle/intentRouter.ts`, `src/lib/oracle/intentRouterPrompt.ts` |
| Safety | `lib/oracle/safetyRules.ts`, `src/lib/oracle/responseSafety.ts` |

Root `lib/oracle/*` is partly compatibility re-exports for Convex imports. The richer shared implementation usually lives in `src/lib/oracle/*`; root `lib/oracle/soul.ts` and `lib/oracle/safetyRules.ts` contain real content.

## User Flow

1. `/oracle/new` checks quota and kill-switch state, then creates an Oracle session with the composer's opaque model-option key and reasoning effort.
2. `convex/oracle/sessions.ts` resolves access from the authenticated user's current tier, stores the effective preference and fallback reason on the session, and writes the raw per-turn request metadata to the first user message.
3. The app navigates to `/oracle/chat/[sessionId]`.
4. The chat page calls `api.oracle.llm.invokeOracle` unless the path is metadata-only, such as storing a generated binaural beat message.
5. Convex reactive queries stream message state back into the chat UI.
6. The final assistant message stores response content plus model, fallback tier, token/cost, timing, optional journal prompt, optional binaural params, and rating metadata.

## `invokeOracle` Flow

`convex/oracle/llm.ts` is the server-authoritative orchestrator.

1. Validate question length.
2. Check `kill_switch`; if enabled, persist fallback copy and return without LLM or quota usage.
3. Check hardcoded crisis regexes; if matched, persist crisis copy and return without LLM or quota usage.
4. Load session/messages, runtime settings, and the current user.
5. If the user has birth data but no completed Birth Chart Report, route into hardcoded report onboarding before normal LLM work.
6. Migrate legacy `birth_chart_core` / `birth_chart_full` feature keys to `birth_chart`.
7. Check journal consent.
8. Detect whether this is the first assistant response.
9. Run LLM-first intent routing with regex fallback.
10. Resolve pipelines from intents and manual feature selection, falling back to `generic_chat`.
11. Merge pipeline data requirements.
12. Gather only requested context: birth data/report, journal context, timespace context, feature injection, and synastry payload.
13. Ask pipelines to build system and user prompt blocks.
14. Prepend hardcoded safety rules, sort system blocks by priority, and add title/journal directives when needed.
15. Sanitize the user question before adding it to the prompt.
16. Run server-side quota pre-check before main model calls.
17. Build history and model settings, then re-resolve the session preference against the current user tier.
18. Select the resolved user-option chain or the feature-profile fallback chain; an authorized admin debug override remains highest priority.
19. Stream through provider tiers until success.
20. Scan accepted output. A blocked stream is atomically replaced with safe copy, while its original output and exact rule matches are quarantined in the admin-only turn trace. Trace writes are best-effort and cannot force a user-facing fallback.
21. On success, compute cost, update the message, increment quota on first assistant response, update title/timing/session state, and run pipeline `afterResponse` hooks.

## Pipeline Contract

Pipelines are pure modules registered in `src/lib/oracle/pipelines/index.ts`. Each pipeline declares:

- `key`: unique pipeline id.
- `dataRequirements`: context the orchestrator is allowed to fetch.
- `modelHint`: `fast`, `smart`, or `creative`.
- `buildPromptBlocks(ctx)`: system/user prompt contributions.
- `afterResponse(response, ctx)`: optional post-processing actions.

The important rule is that pipelines declare data needs up front. Do not add global context gathering because it makes privacy, prompt size, and debugging worse.

## Provider Path

Provider configuration and feature profiles live in `ai_providers` and `ai_feature_profiles`. API keys are referenced by environment variable name, not stored in the database.

For Oracle, `ai_user_model_options` can expose curated choices to selected subscription tiers. The client receives labels, access state, and allowed reasoning efforts only. `convex/aiGateway/userModelOptions.ts` validates the opaque selection server-side and returns the private provider chain to server code. Disabled rollout, invalid choices, downgrades, and missing defaults fail safely to the `oracle_chat` feature profile.

The AI Gateway walks the resolved chain in order, applies provider health/cooldown behavior, and records route telemetry. Admin debug overrides can force a provider/model for a request, but the server rejects them for non-admin users and never persists them globally.

## Quota Path

Quota is cost-based and uses microdollars. `convex/oracle/quota.ts` checks fixed burst and weekly windows using `quota_burst_*`, `quota_weekly_*`, `quota_burst_window_ms`, and `quota_weekly_window_ms`. `convex/oracle/pricing.ts` maps models to token prices.

Quota is checked before main LLM calls and incremented after a successful first assistant response. Crisis, kill-switch, and hardcoded onboarding paths do not consume quota.

## Safety Invariants

- Crisis detection is hardcoded in `convex/oracle/llm.ts` and runs before model calls.
- `ORACLE_SAFETY_RULES` is prepended before all pipeline blocks.
- User text is sanitized before prompt insertion.
- Output safety scanning runs before a response is accepted.
- Blocked output evidence is retained only in admin-authorized turn traces; the user-visible message is replaced in place with safe copy.
- Admin settings can alter copy, soul, providers, models, and quota values, but must not weaken server-enforced safety behavior.
- Journal context requires both pipeline demand and server-side consent.
- Birth data is included only when an active pipeline requests it.
