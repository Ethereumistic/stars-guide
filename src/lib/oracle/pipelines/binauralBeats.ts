/**
 * Binaural Beats Pipeline
 *
 * Activated when the user asks for a binaural beat, meditation sound,
 * sleep frequency, or anything matching the binaural intent patterns.
 *
 * This pipeline has two phases:
 * 1. buildPromptBlocks() — deterministically generates the beat and injects
 *    context about it into the system prompt so the AI can explain it naturally.
 * 2. afterResponse() — returns the generated beat params as a PostResponseAction
 *    so the orchestrator can persist them to the message record.
 *
 * Does NOT need birth data or journal context. The beat is generated purely
 * from the user's question text (intent extraction + duration parsing).
 */

import type {
  OraclePipeline,
  PipelineContext,
  SystemPromptBlock,
  UserMessageBlock,
  PostResponseAction,
} from "../pipelineTypes";
import type { StoredBirthData } from "../../birth-chart/types";
import { generateBinauralBeat } from "../../binaural-presets";
import { getBinauralBeatContext } from "../featureContext";

export const binauralBeatsPipeline: OraclePipeline = {
  key: "binaural_beats",

  dataRequirements: {
    needsBirthData: false,
    needsBirthChartReportContext: false,
    needsJournalContext: false,
    expandedJournalBudget: false,
    needsTimespace: true,
    needsSynastryData: false,
  },

  modelHint: "creative",

  buildPromptBlocks(ctx: PipelineContext): {
    systemBlocks: SystemPromptBlock[];
    userBlocks: UserMessageBlock[];
  } {
    const systemBlocks: SystemPromptBlock[] = [];

    // Soul document
    systemBlocks.push({
      content: ctx.soulDoc,
      priority: 90,
      label: "soul_document",
    });

    // Deterministic beat generation from the user's question + birth data personalization
    const birthDataForPersonalization = (ctx.rawBirthData as StoredBirthData | null) ?? undefined;
    const beat = generateBinauralBeat(ctx.userQuestion, birthDataForPersonalization);

    // Binaural beat context — tells the AI what beat was generated
    // DB injection overrides the deterministic context when present
    const binauralContext =
      ctx.featureInjection ??
      getBinauralBeatContext({
        leftHz: beat.leftHz,
        rightHz: beat.rightHz,
        waveform: beat.waveform,
        noiseVolume: beat.noiseVolume,
        noiseCutoff: beat.noiseCutoff,
        durationSeconds: beat.durationSeconds,
        rationale: beat.rationale,
      });

    systemBlocks.push({
      content: binauralContext,
      priority: 80,
      label: "binaural_beat_context",
    });

    // Timespace
    if (ctx.timespaceContext) {
      systemBlocks.push({
        content: ctx.timespaceContext,
        priority: 50,
        label: "timespace",
      });
    }

    return { systemBlocks, userBlocks: [] };
  },

  afterResponse(_response: string, ctx: PipelineContext): PostResponseAction[] {
    // Regeneration is deterministic and avoids module-scoped state leaking between
    // concurrent Convex action invocations.
    const birthData = (ctx.rawBirthData as StoredBirthData | null) ?? undefined;
    const { rationale: _rationale, ...params } = generateBinauralBeat(
      ctx.userQuestion,
      birthData,
    );
    return [{ type: "store_binaural_params", payload: params }];
  },
};
