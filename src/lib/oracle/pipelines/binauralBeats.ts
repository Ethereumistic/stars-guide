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

/**
 * Module-scoped storage for the last generated beat params within a request.
 *
 * buildPromptBlocks() stores the params here.
 * afterResponse() reads them and returns a PostResponseAction.
 *
 * CAVEAT: In Convex's Node runtime, concurrent actions share this module scope.
 * This works because within a single action invocation, buildPromptBlocks() is
 * always called before afterResponse(), and the storage is overwritten each time
 * — so the most recent call's params are always correct for that invocation's
 * afterResponse(). Concurrent actions that don't use binaural will never call
 * buildPromptBlocks, so they'll see null and return no action.
 */
// Store the full output of generateBinauralBeat (params + rationale)
// afterResponse() strips rationale and stores only the params part
let lastGeneratedBeat: ReturnType<typeof generateBinauralBeat> | null = null;

export const binauralBeatsPipeline: OraclePipeline = {
  key: "binaural_beats",

  dataRequirements: {
    needsBirthData: false,
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
    lastGeneratedBeat = beat;

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

  afterResponse(_response: string, _ctx: PipelineContext): PostResponseAction[] {
    if (lastGeneratedBeat) {
      const { rationale: _rationale, ...params } = lastGeneratedBeat;
      const actions: PostResponseAction[] = [
        {
          type: "store_binaural_params",
          payload: params,
        },
      ];
      // Clear after reading — don't hold references across requests
      lastGeneratedBeat = null;
      return actions;
    }
    return [];
  },
};