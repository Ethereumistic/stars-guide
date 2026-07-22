# Oracle Docs

Use this folder as a compact navigation layer. The current source of truth is still the implementation, but the files below are the maintained Oracle docs.

## Read First

- `AGENTS.md` at repo root - repo-wide rules and where-to-look paths.
- `00-MASTER-WIRING-GUIDE.md` - compact, current wiring map.
- `ORACLE_ARCHITECTURE.md` - flow, server contracts, safety, quota, and provider path.
- `ORACLE_FEATURES.md` - feature keys, pipelines, and data-gating matrix.
- `BIRTH_CHART_REPORT.md` - canonical natal authority plus the fingerprint-gated human-report interpretation layer.
- `OPERATIONS_AND_DEBUG.md` - admin settings, providers, quota, debug panels, and troubleshooting.
- `ORACLE_EXPERIENCE_AUDIT.md` - product-quality audit of birth chart, report, cosmic weather, synastry, retention, and evaluation gaps.
- `ORACLE_COMPOSER_REDESIGN_PLAN.md` - implementation plan for the expanding composer, model/effort access, dictation, and `/admin/ai` routing controls.
- `ORACLE_STREAMING_V2_IMPLEMENTATION_PLAN.md` - production handoff for durable turns, guarded streaming, validated natal sections, cancellation, recovery, observability, testing, and rollout.

## Source Of Truth

- Frontend routes: `src/app/(app)/oracle/`
- Oracle components: `src/components/oracle/`
- Convex backend: `convex/oracle/`
- Shared Oracle implementation: `src/lib/oracle/`
- Compatibility re-exports: `lib/oracle/`

## Current Core Flow

1. A model-backed session and its first durable turn are created atomically by `convex/oracle/turns.ts`; follow-ups use the same module's `beginTurn` mutation.
2. The chat subscribes through `oracle/sessions:getSessionConversation` and does not invoke the model from a browser effect.
3. The scheduled runner claims the turn once, then `convex/oracle/llm.ts` loads the stored message, session, user, settings, consent, and pipeline data.
4. Intent routing maps the message to one or more pipelines from `src/lib/oracle/pipelines/`.
5. Pipelines contribute system prompt blocks and user message blocks.
6. The V2 action prepends a compact hardcoded safety reminder, checks quota, selects providers, streams through server-enforced guarded publication, persists approved content/lifecycle state, and updates quota/timing/session metadata.
7. Each turn records its fail-closed rollout cohort, bounded stage timeline, distinct connection/TTFT/approval/persistence milestones, sanitized stream counters, and best-effort first client-visible timestamp. Eligible validated-section Resume requests only missing keys on the same turn. A bounded cron terminalizes stale active turns without generating or retrying content.

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
