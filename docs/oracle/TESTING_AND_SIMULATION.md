# Oracle Testing and Simulation

The Oracle planner and response contract are testable without starting Next.js or calling an LLM.

## Commands

```bash
# Entire local suite: Vitest, the two node:test suites, and deterministic Oracle scenarios
vp run test

# Individual layers
vp run test:vitest
vp run test:node
vp run oracle:test
vp run oracle:test -- --case motorbike-vs-diving
vp run oracle:plan -- --message "is it a good day for a motorbike ride or diving?" --fixture natal-user
vp run oracle:simulate -- --scenario motorbike-vs-diving --mock-model
```

Pass `--json` to receive machine-readable output. Commands exit non-zero when a scenario assertion fails.

`vitest.config.ts` excludes the two suites authored with `node:test`; `vp run test:node` runs those explicitly. This keeps unfiltered `vp run test:vitest` and the unified `vp run test` reproducible rather than letting Vitest discover incompatible test files.

## Test layers

- `requestPlanner.test.ts` verifies deterministic capability planning and response-contract validation.
- `scripts/oracle/scenarios.ts` contains versioned multi-turn regression fixtures.
- `scripts/oracle/cli.ts` runs the same planner and validator used by `invokeOracle`.
- Accepted production turns store `oracle-trace-v1` records in `oracle_turn_traces`; `/admin/oracle/debug` receives these traces with the session detail.

The live CLI mode is intentionally fail-closed until a deployment supplies an authenticated admin simulation endpoint. It must never impersonate an existing user or bypass normal Oracle safety and consent enforcement.

Phase D's local suite also covers the ownership-checked conversation subscription, active-turn hydration, approved section delivery, honest persisted stage copy, and smart-scroll geometry. Authenticated refresh, second-tab, scroll, Stop, and recovery acceptance still requires an already-running permitted environment and the dedicated test account workflow.

Phase E adds deterministic coverage for auth-independent stored-user route resolution, stable rollout bucketing and buffered rollback, once-only ownership-checked client-visible timing, and stale-turn maintenance that preserves partial approved content without invoking a model. The admin timeline and rollout settings still require authenticated browser acceptance in a permitted running environment.

The Streaming V2 scenario set covers full natal contract enforcement, valid framed sections, invented-aspect rejection, malformed-protocol fallback, partial sections, ordinary guarded batches, journal-consent positive/denied controls, and a non-natal negative control. These are deterministic lower-layer checks; they do not replace the ten-scenario authenticated browser matrix.

## Capability behavior

Temporal requests activate `cosmic_weather`. They also resolve the `personal_transits` dependency graph; with canonical natal data this supplies the code-calculated overlay, while without natal data the plan records the unavailable capability and continues from collective sky evidence.

Capability manifests are TypeScript contracts. Markdown can document or provide prompt guidance, but it does not grant data access or define safety behavior.
