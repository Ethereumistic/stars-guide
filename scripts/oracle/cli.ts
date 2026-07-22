import { planOracleRequest } from "../../src/lib/oracle/requestPlanner";
import { validateOracleResponse } from "../../src/lib/oracle/responseValidator";
import type { OracleEvidenceBundle } from "../../src/lib/oracle/capabilities";
import { OracleSectionStreamParser } from "../../src/lib/oracle/streaming/sectionParser";
import { SemanticBatchAccumulator } from "../../src/lib/oracle/streaming/semanticBatcher";
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
    const evidence: OracleEvidenceBundle = {
      requestedAt: scenario.fixedNow,
      timezone: scenario.timezone,
      warnings: [],
      items: plan.requiredCapabilities.map((capability) => ({ capability, label: capability, content: "synthetic test evidence", provenance: { source: "scenario_fixture", version: "1", calculatedAt: scenario.fixedNow, timezone: scenario.timezone } })),
      natalChart: turn.natalEvidence,
    };
    const violations = turn.response ? validateOracleResponse(turn.response.mocked, plan, evidence) : [];
    const missingViolations = (turn.response?.expectedViolationCodes ?? []).filter((code) => !violations.some((v) => v.code === code));
    let streamingResult: unknown;
    const streamingFailures: string[] = [];
    if (turn.streaming?.mode === "validated_sections") {
      const streaming = turn.streaming;
      const parser = new OracleSectionStreamParser({ plan: streaming.plan });
      const events = streaming.chunks.flatMap((chunk) => parser.push(chunk));
      events.push(...parser.finish());
      const sectionKeys = events.flatMap((event) => event.type === "section" ? [event.section.key] : []);
      const protocolViolationCodes: string[] = events.flatMap((event) => event.type === "violation" ? [event.code] : []);
      const missingSectionKeys = streaming.expectedSectionKeys.filter((key) => !sectionKeys.includes(key));
      const unexpectedSectionKeys = sectionKeys.filter((key) => !streaming.expectedSectionKeys.includes(key));
      const missingProtocolViolations = (streaming.expectedProtocolViolationCodes ?? [])
        .filter((code) => !protocolViolationCodes.includes(code));
      const fallback = parser.fallbackContent.length > 0;
      const fallbackContainsProtocolMarkers = parser.fallbackContent.includes("ORACLE_SECTION_V2");
      if (missingSectionKeys.length) streamingFailures.push(`missing_sections:${missingSectionKeys.join(",")}`);
      if (unexpectedSectionKeys.length) streamingFailures.push(`unexpected_sections:${unexpectedSectionKeys.join(",")}`);
      if (missingProtocolViolations.length) streamingFailures.push(`missing_protocol_violations:${missingProtocolViolations.join(",")}`);
      if (streaming.expectedFallback !== undefined && fallback !== streaming.expectedFallback) {
        streamingFailures.push(`fallback_expected:${streaming.expectedFallback}`);
      }
      if (fallbackContainsProtocolMarkers) streamingFailures.push("protocol_marker_leaked_to_fallback");
      streamingResult = { sectionKeys, protocolViolationCodes, fallback, fallbackContainsProtocolMarkers };
    } else if (turn.streaming?.mode === "guarded_batches") {
      const streaming = turn.streaming;
      const batcher = new SemanticBatchAccumulator({ minSentenceChars: 80, maxPendingChars: 180 });
      const batches = streaming.chunks.flatMap((chunk) => batcher.push(chunk));
      batches.push(...batcher.finish());
      if (batches.length < streaming.expectedMinBatches) {
        streamingFailures.push(`guarded_batches:${batches.length}<${streaming.expectedMinBatches}`);
      }
      streamingResult = { batchCount: batches.length, batchChars: batches.map((batch) => batch.length) };
    }
    return {
      message: turn.message,
      plan,
      violations,
      streaming: streamingResult,
      passed: !missing.length && !forbidden.length && !missingGoals.length && !missingViolations.length && !streamingFailures.length,
      failures: { missing, forbidden, missingGoals, missingViolations, streamingFailures },
    };
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
