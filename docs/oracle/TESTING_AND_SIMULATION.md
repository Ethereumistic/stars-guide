# Oracle Testing and Simulation

The Oracle planner and response contract are testable without starting Next.js or calling an LLM.

## Commands

```bash
pnpm oracle:test
pnpm oracle:test --case motorbike-vs-diving
pnpm oracle:plan --message "is it a good day for a motorbike ride or diving?" --fixture natal-user
pnpm oracle:simulate --scenario motorbike-vs-diving --mock-model
```

Pass `--json` to receive machine-readable output. Commands exit non-zero when a scenario assertion fails.

## Test layers

- `requestPlanner.test.ts` verifies deterministic capability planning and response-contract validation.
- `scripts/oracle/scenarios.ts` contains versioned multi-turn regression fixtures.
- `scripts/oracle/cli.ts` runs the same planner and validator used by `invokeOracle`.
- Accepted production turns store `oracle-trace-v1` records in `oracle_turn_traces`; `/admin/oracle/debug` receives these traces with the session detail.

The live CLI mode is intentionally fail-closed until a deployment supplies an authenticated admin simulation endpoint. It must never impersonate an existing user or bypass normal Oracle safety and consent enforcement.

## Capability behavior

Temporal requests activate `cosmic_weather`. They also resolve the `personal_transits` dependency graph; with canonical natal data this supplies the code-calculated overlay, while without natal data the plan records the unavailable capability and continues from collective sky evidence.

Capability manifests are TypeScript contracts. Markdown can document or provide prompt guidance, but it does not grant data access or define safety behavior.
