import { planOracleRequest } from "../../src/lib/oracle/requestPlanner";
import { validateOracleResponse } from "../../src/lib/oracle/responseValidator";
import type { OracleEvidenceBundle } from "../../src/lib/oracle/capabilities";
import { getScenario, scenarios } from "./scenarios";

const args = process.argv.slice(2);
const command = args[0] ?? "test";
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const has = (name: string) => args.includes(name);
const json = has("--json");
const fixtureContext = (fixture = "natal-user") => ({
  hasBirthData: fixture !== "no-natal-user",
  hasJournalConsent: fixture !== "journal-denied",
  hasSynastryPayload: fixture === "synastry-user",
});
const output = (value: unknown) => process.stdout.write(`${JSON.stringify(value, null, json ? 2 : 2)}\n`);

function runScenario(id: string) {
  const scenario = getScenario(id);
  if (!scenario) throw new Error(`Unknown scenario '${id}'. Available: ${scenarios.map((s) => s.id).join(", ")}`);
  const results = scenario.turns.map((turn) => {
    const plan = planOracleRequest(turn.message, fixtureContext(scenario.fixture));
    const missing = turn.requiredCapabilities.filter((key) => !plan.requiredCapabilities.includes(key));
    const forbidden = (turn.forbiddenCapabilities ?? []).filter((key) => plan.requiredCapabilities.includes(key));
    const missingGoals = (turn.requiredGoals ?? []).filter((goal) => !plan.goals.includes(goal as never));
    const evidence: OracleEvidenceBundle = { requestedAt: scenario.fixedNow, timezone: scenario.timezone, warnings: [], items: plan.requiredCapabilities.map((capability) => ({ capability, label: capability, content: "synthetic test evidence", provenance: { source: "scenario_fixture", version: "1", calculatedAt: scenario.fixedNow, timezone: scenario.timezone } })) };
    const violations = turn.response ? validateOracleResponse(turn.response.mocked, plan, evidence) : [];
    const missingViolations = (turn.response?.expectedViolationCodes ?? []).filter((code) => !violations.some((v) => v.code === code));
    return { message: turn.message, plan, violations, passed: !missing.length && !forbidden.length && !missingGoals.length && !missingViolations.length, failures: { missing, forbidden, missingGoals, missingViolations } };
  });
  return { scenario: scenario.id, passed: results.every((r) => r.passed), results };
}

async function main() {
  if (command === "plan") {
    const message = flag("--message"); if (!message) throw new Error("--message is required");
    output(planOracleRequest(message, fixtureContext(flag("--fixture")))); return;
  }
  if (command === "test" || command === "simulate" || command === "eval") {
    if (has("--live")) throw new Error("Live mode requires the admin Convex simulation endpoint; use deterministic/mock mode until deployment configuration is provided.");
    const selected = flag("--case") ?? flag("--scenario");
    const results = selected ? [runScenario(selected)] : scenarios.map((s) => runScenario(s.id));
    output(results); if (results.some((r) => !r.passed)) process.exitCode = 1; return;
  }
  if (command === "inspect" || command === "replay") throw new Error(`${command} requires a deployed Convex URL and admin token; use /admin/oracle/debug for deployed traces.`);
  throw new Error(`Unknown command '${command}'`);
}
main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
