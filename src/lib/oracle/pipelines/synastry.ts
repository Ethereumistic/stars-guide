/**
 * Synastry Pipeline
 *
 * Activated when the user asks about compatibility, relationship chart
 * overlay, or anything that involves comparing TWO birth charts.
 *
 * Chart A (the user) is always present. Chart B (partner/friend) is
 * provided via synastryData on the PipelineContext.
 *
 * Data flow:
 * - System prompt: soul document + synastry instructions + timespace
 * - User message: Chart A data + Chart B data + relationship type + question
 */

import type {
  OraclePipeline,
  PipelineContext,
  SystemPromptBlock,
  UserMessageBlock,
} from "../pipelineTypes";

import { buildUniversalBirthContext } from "../featureContext";
import { getSynastryInstructions, buildSynastryChartBContext } from "../synastryContext";

export const synastryPipeline: OraclePipeline = {
  key: "synastry",

  dataRequirements: {
    needsBirthData: true, // Chart A (user's own chart) is required
    needsJournalContext: false, // Synastry doesn't need journal context
    expandedJournalBudget: false,
    needsTimespace: true,
    needsSynastryData: true, // Chart B + relationship type
  },

  modelHint: "smart", // Synastry analysis benefits from deeper reasoning

  buildPromptBlocks(ctx: PipelineContext): {
    systemBlocks: SystemPromptBlock[];
    userBlocks: UserMessageBlock[];
  } {
    const systemBlocks: SystemPromptBlock[] = [];
    const userBlocks: UserMessageBlock[] = [];

    // Soul document (highest priority)
    systemBlocks.push({
      content: ctx.soulDoc,
      priority: 90,
      label: "soul_document",
    });

    // Synastry-specific instructions (high priority)
    systemBlocks.push({
      content: getSynastryInstructions(),
      priority: 80,
      label: "synastry_instructions",
    });

    // Timespace context
    if (ctx.timespaceContext) {
      systemBlocks.push({
        content: ctx.timespaceContext,
        priority: 50,
        label: "timespace",
      });
    }

    // ── User message blocks ────────────────────────────────────────────────

    // Chart A data (user's chart)
    if (ctx.birthData) {
      userBlocks.push({
        content: `[CHART A DATA — Primary Person]\n${ctx.birthData}`,
        label: "chart_a_data",
      });
    } else {
      // User doesn't have chart data — ask for it
      systemBlocks.push({
        content: [
          "[CHART A DATA UNAVAILABLE]",
          "The user has requested a synastry reading but does not have their own birth data on file.",
          "Ask them for their birth date, exact birth time, and birth city/country before proceeding.",
          "Do NOT invent or assume any placements.",
          "[END CHART A DATA UNAVAILABLE]",
        ].join("\n"),
        priority: 75,
        label: "chart_a_unavailable",
      });
    }

    // Chart B data (partner/friend's chart)
    if (ctx.synastryData) {
      const chartBContext = buildSynastryChartBContext(ctx.synastryData);
      userBlocks.push({
        content: chartBContext,
        label: "chart_b_data",
      });
    } else {
      // No Chart B data — shouldn't happen if UI validation works, but handle gracefully
      systemBlocks.push({
        content: [
          "[CHART B DATA MISSING]",
          "The user selected a synastry reading but no second chart data was provided.",
          "Ask the user to provide the second person's birth information (date, time, and location) before proceeding.",
          "Do NOT invent or assume any placements.",
          "[END CHART B DATA MISSING]",
        ].join("\n"),
        priority: 75,
        label: "chart_b_unavailable",
      });
    }

    return { systemBlocks, userBlocks };
  },
};