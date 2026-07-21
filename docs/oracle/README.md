# Oracle Docs

Use this folder as a compact navigation layer. The current source of truth is still the implementation, but the files below are the maintained Oracle docs.

## Read First

- `AGENTS.md` at repo root - repo-wide rules and where-to-look paths.
- `00-MASTER-WIRING-GUIDE.md` - compact, current wiring map.
- `ORACLE_ARCHITECTURE.md` - flow, server contracts, safety, quota, and provider path.
- `ORACLE_FEATURES.md` - feature keys, pipelines, and data-gating matrix.
- `BIRTH_CHART_REPORT.md` - separate deterministic Oracle natal context and human report pipeline.
- `OPERATIONS_AND_DEBUG.md` - admin settings, providers, quota, debug panels, and troubleshooting.
- `ORACLE_EXPERIENCE_AUDIT.md` - product-quality audit of birth chart, report, cosmic weather, synastry, retention, and evaluation gaps.
- `ORACLE_COMPOSER_REDESIGN_PLAN.md` - implementation plan for the expanding composer, model/effort access, dictation, and `/admin/ai` routing controls.

## Source Of Truth

- Frontend routes: `src/app/(app)/oracle/`
- Oracle components: `src/components/oracle/`
- Convex backend: `convex/oracle/`
- Shared Oracle implementation: `src/lib/oracle/`
- Compatibility re-exports: `lib/oracle/`

## Current Core Flow

1. A session is created by `convex/oracle/sessions.ts`.
2. The chat page calls `api.oracle.llm.invokeOracle`.
3. `convex/oracle/llm.ts` loads session, user, settings, consent, and pipeline data.
4. Intent routing maps the message to one or more pipelines from `src/lib/oracle/pipelines/`.
5. Pipelines contribute system prompt blocks and user message blocks.
6. `invokeOracle` prepends hardcoded safety rules, checks quota, selects providers, streams, scans output, persists the result, and updates quota/timing/session metadata.

## Current Pipelines

- `generic_chat` - no birth data; uses journal context if consented.
- `birth_chart` - deterministic birth-data context, journal context if consented, timespace.
- `journal_recall` - expanded journal context, no birth data by default.
- `synastry` - user chart plus second chart/relationship payload, no journal context.
- `binaural_beats` - deterministic beat params through the Oracle pipeline; playback is browser Web Audio.

## Archive

Historical docs, audits, plans, and old subfolder explainers live in `archive/`. They may contain stale paths, stale quota names, stale binaural architecture, or pre-route-group paths. Verify any claim against code before copying it into canonical docs.

Known stale patterns:

- `src/app/oracle/...` should usually be `src/app/(app)/oracle/...`.
- `/admin/oracle/...` files should usually be under `src/app/(admin)/admin/oracle/...`.
- `quota_limit_*` was replaced by cost-based `quota_burst_*` and `quota_weekly_*` settings.
- Binaural beats are not currently a separate Cloudflare Worker POST flow in the app; current playback is browser Web Audio using stored/generated params.
- Archived `ORACLE_EXPLAINED.md` references `oracle/featureInjections.ts`; current query file is `convex/oracle/features.ts`.

## Documentation Rule

Prefer compact maps plus code pointers over duplicating implementation details. When Oracle wiring changes, update `00-MASTER-WIRING-GUIDE.md` first, then the specific canonical doc affected by the change.
