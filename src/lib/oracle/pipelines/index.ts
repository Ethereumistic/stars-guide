/**
 * Pipeline Registry
 *
 * Central registry for all Oracle pipelines. The orchestrator uses
 * getPipeline(key) to look up active pipelines by their PipelineKey.
 *
 * To add a new pipeline:
 * 1. Create the pipeline file in this directory (e.g., synastry.ts)
 * 2. Import it here
 * 3. Call registerPipeline(yourPipeline)
 *
 * No other code changes needed — the intent router and orchestrator
 * will pick it up automatically.
 */

import type { PipelineKey, OraclePipeline } from "../pipelineTypes";
import { genericChatPipeline } from "./genericChat";
import { birthChartPipeline } from "./birthChart";
import { journalRecallPipeline } from "./journalRecall";
import { binauralBeatsPipeline } from "./binauralBeats";

const pipelineRegistry = new Map<PipelineKey, OraclePipeline>();

function registerPipeline(pipeline: OraclePipeline): void {
  if (pipelineRegistry.has(pipeline.key)) {
    throw new Error(`Pipeline "${pipeline.key}" is already registered`);
  }
  pipelineRegistry.set(pipeline.key, pipeline);
}

registerPipeline(genericChatPipeline);
registerPipeline(birthChartPipeline);
registerPipeline(journalRecallPipeline);
registerPipeline(binauralBeatsPipeline);

/**
 * Look up a pipeline by its key.
 * Returns undefined if no pipeline is registered for that key.
 */
export function getPipeline(key: PipelineKey): OraclePipeline | undefined {
  return pipelineRegistry.get(key);
}

/**
 * Get all registered pipelines.
 * Useful for debugging and introspection.
 */
export function getAllPipelines(): OraclePipeline[] {
  return Array.from(pipelineRegistry.values());
}