# Oracle Docs Cleanup Handoff

This handoff is for a fresh agent tasked with reducing and regenerating `docs/oracle` documentation.

## Goal

Turn the Oracle docs from a sprawling historical archive into a small, reliable documentation set that helps agents and humans navigate the current implementation without bloating context windows.

The current folder has many stale or duplicate docs. Do not try to preserve everything by default.

## Current State

Recently updated files:

- `AGENTS.md` at repo root: now points agents to concise Oracle entry points.
- `docs/oracle/README.md`: new short entry point for Oracle docs.
- `docs/oracle/00-MASTER-WIRING-GUIDE.md`: replaced a huge stale master guide with a compact current wiring guide.

Important current source-of-truth code:

- Oracle routes: `src/app/(app)/oracle/`
- Admin Oracle routes: `src/app/(admin)/admin/oracle/`
- Oracle components: `src/components/oracle/`
- Main action: `convex/oracle/llm.ts`
- Sessions/messages: `convex/oracle/sessions.ts`
- Settings/providers: `convex/oracle/settings.ts`, `convex/oracle/upsertProviders.ts`, `src/lib/oracle/providers.ts`
- Quota/pricing: `convex/oracle/quota.ts`, `convex/oracle/pricing.ts`
- Provider selection: `convex/oracle/providerRouter.ts`
- Pipelines: `src/lib/oracle/pipelines/`
- Pipeline types: `src/lib/oracle/pipelineTypes.ts`
- Intent routing: `src/lib/oracle/intentRouter.ts`, `src/lib/oracle/intentRouterPrompt.ts`
- Feature definitions: `src/lib/oracle/features.ts`
- Birth context: `src/lib/oracle/featureContext.ts`, `src/lib/oracle/birthCalculator.ts`
- Synastry: `src/lib/oracle/synastryContext.ts`, `convex/oracle/synastry.ts`
- Safety: `lib/oracle/safetyRules.ts`, `src/lib/oracle/responseSafety.ts`
- Oracle store: `src/store/use-oracle-store.ts`

Note: root `lib/oracle/*` is partly compatibility re-exports for Convex imports. The richer implementation is usually under `src/lib/oracle/*`, except `soul.ts` and `safetyRules.ts`, whose real content lives under root `lib/oracle/`.

## Current Oracle Facts To Preserve

Use these as constraints when regenerating docs:

- Main orchestrator is `convex/oracle/llm.ts` export `invokeOracle`.
- `invokeOracle` validates length, checks kill switch, checks crisis keywords, loads session/settings/user, then may divert into Birth Chart Report onboarding if the user has birth data but no completed report.
- Normal Oracle flow uses LLM-first intent routing with regex fallback.
- Active intents map to pipelines from `src/lib/oracle/pipelines/`.
- Pipelines declare data requirements. The orchestrator gathers context only when required.
- Safety rules are hardcoded and prepended before all pipeline blocks.
- User question is sanitized before prompt use.
- Server-side quota pre-check happens before main LLM calls.
- Output safety scanning and refusal retry happen after streamed provider responses.
- Quota is cost-based using burst and weekly microdollar budgets.
- Quota increments only after successful first assistant response.
- Journal context requires both pipeline demand and server-side consent.
- Birth data is included only when at least one active pipeline requests it.
- Current pipelines:
  - `generic_chat`: no birth data; journal context if consented; timespace.
  - `birth_chart`: birth data/report; journal context if consented; timespace.
  - `journal_recall`: expanded journal context; no birth data by default; timespace.
  - `synastry`: user chart plus second chart/relationship payload; no journal context; timespace.
  - `binaural_beats`: deterministic beat params; raw birth data only for personalization; browser Web Audio playback.
- Available feature keys also include unimplemented UI items like `attach_files` and `sign_card_image`.

## Known Stale Claims In Existing Docs

Watch for and remove/fix these:

- `src/app/oracle/...` should generally be `src/app/(app)/oracle/...`.
- `src/app/admin/oracle/...` should generally be `src/app/(admin)/admin/oracle/...`.
- `quota_limit_*` and `quota_reset_*` are old. Current quota uses `quota_burst_*`, `quota_weekly_*`, and cost fields.
- `convex/oracle/featureInjections.ts` is stale. Current feature injection query file is `convex/oracle/features.ts`.
- Binaural beats are not currently a direct Cloudflare Worker POST flow in the app. Current UI creates/stores sessions/messages and plays generated params with browser Web Audio.
- “Every request has exactly two LLM calls” is wrong. Calls depend on manual feature selection, follow-up state, intent routing, gates, retries, and metadata-only paths.
- `ORACLE_EXPLAINED.md` and the numbered docs may duplicate older implementation details and should not be treated as authoritative.
- The `docs/oracle/review/` folder is an audit of stale docs. It is useful historically, but it is also more documentation bloat.

## Recommended Final Shape

Aim for 5-7 files total in `docs/oracle`, not 30+.

Recommended keep/regenerate:

- `README.md` - short navigation and policy.
- `00-MASTER-WIRING-GUIDE.md` - compact current map.
- `ORACLE_ARCHITECTURE.md` - generated from current code; one medium doc covering flow, tables, pipelines, safety, quota, provider path.
- `ORACLE_FEATURES.md` - current feature/pipeline matrix, including birth chart, journal recall, synastry, binaural beats, and unimplemented features.
- `BIRTH_CHART_REPORT.md` - only if Birth Chart Report remains closely tied to Oracle onboarding.
- `OPERATIONS_AND_DEBUG.md` - settings, provider config, debug panel, admin pages, common troubleshooting.

Archive or delete candidates:

- `ORACLE_EXPLAINED.md` - too large and already stale.
- Numbered docs `01` through `22` - mostly duplicate the master guide and each other.
- `review/` folder - historical audit; can be removed after useful findings are folded into new docs.
- `priority_execution.md`, `oracle_critiques.md`, `QUOTA_V2_COST_BASED_PLAN.md` - planning/history, not current docs.
- Deep subfolder docs for synastry/binaural may be archived unless regenerated from current code.

If deletion feels too aggressive, create `docs/oracle/archive/` and move historical files there. But the target should still be that agents only read `README.md` and `00-MASTER-WIRING-GUIDE.md` by default.

## Suggested Procedure For Fresh Agent

1. Read only:
   - `AGENTS.md`
   - `docs/oracle/README.md`
   - `docs/oracle/00-MASTER-WIRING-GUIDE.md`
   - This handoff file
2. Inspect current code files listed in “Current State.”
3. Generate a proposed new docs inventory with files to keep, regenerate, archive, or delete.
4. If the user approves deletion/archive, perform the filesystem changes.
5. Regenerate the recommended docs from code, not from old prose.
6. Keep each regenerated doc under about 150-250 lines unless there is a strong reason.
7. Update `docs/oracle/README.md` so it names only the new canonical docs.
8. Do not run build/lint unless the user explicitly asks.

## Acceptance Criteria

- A fresh agent can understand Oracle by reading `AGENTS.md`, `docs/oracle/README.md`, and `docs/oracle/00-MASTER-WIRING-GUIDE.md`.
- No canonical doc points to stale route paths.
- No canonical doc mentions `quota_limit_*` as current behavior.
- No canonical doc claims binaural beats are currently a separate Worker POST flow unless code has changed to make that true.
- The folder no longer encourages agents to read dozens of files.
- Historical docs are either deleted, archived, or clearly labeled non-authoritative.

