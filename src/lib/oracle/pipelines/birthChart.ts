/**
 * Birth Chart Pipeline
 *
 * Activated when the user asks about their chart, placements, transits,
 * or any astrology-specific question that needs natal data.
 *
 * Birth data is injected in the USER MESSAGE (not system prompt), preserving
 * the design decision: "The model treats chart data as user-provided facts,
 * not system instructions."
 *
 * Depth instructions go in the SYSTEM PROMPT — they tell the model HOW to
 * interpret the data, not WHAT the data is.
 */

import type {
  OraclePipeline,
  PipelineContext,
  SystemPromptBlock,
  UserMessageBlock,
} from "../pipelineTypes";
import { getBirthChartDepthInstructions } from "../featureContext";

export const birthChartPipeline: OraclePipeline = {
  key: "birth_chart",

  dataRequirements: {
    needsBirthData: true, // This pipeline injects the chart
    needsJournalContext: true, // Journal adds emotional depth to readings
    expandedJournalBudget: false,
    needsTimespace: true,
    needsSynastryData: false,
  },

  modelHint: "smart", // Chart readings benefit from smarter models

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

    // Depth instructions control how to interpret the deterministic chart.
    const depth = ctx.birthChartDepth ?? "core";
    const depthInstructions = ctx.featureInjection ?? getBirthChartDepthInstructions(depth);
    systemBlocks.push({
      content: depthInstructions,
      priority: 95,
      label: `birth_chart_depth_${depth}`,
    });

    // Timespace
    if (ctx.timespaceContext) {
      systemBlocks.push({
        content: ctx.timespaceContext,
        priority: 50,
        label: "timespace",
      });
    }

    // Journal context
    if (ctx.journalContext) {
      systemBlocks.push({
        content: ctx.journalContext,
        priority: 40,
        label: "journal_context",
      });
    }

    // Birth chart data goes in USER MESSAGE (not system prompt)
    // This preserves the design decision that chart data is user-provided facts.
    // If the user has no birth data on file, tell the AI the data is missing so
    // it asks the user for it instead of hallucinating placements.
    const userBlocks: UserMessageBlock[] = [];
    if (ctx.birthData) {
      userBlocks.push({
        content: `[BIRTH CHART DATA]\n${ctx.birthData}`,
        label: "birth_chart_data",
      });
    } else {
      systemBlocks.push({
        content: [
          "[CHART DATA UNAVAILABLE]",
          "The user has requested a birth chart reading but does not have birth data on file.",
          "Ask them for their birth date, exact birth time, and birth city/country.",
          "Do NOT invent or assume any placements, signs, or houses.",
          "Once they provide their data, you will be able to give them the reading described above.",
          "[END CHART DATA UNAVAILABLE]",
        ].join("\n"),
        priority: 75, // Just below depth instructions, above context
        label: "birth_data_unavailable",
      });
    }

    return { systemBlocks, userBlocks };
  },
};
