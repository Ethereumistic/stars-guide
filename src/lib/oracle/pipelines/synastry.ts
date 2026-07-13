/**
 * Synastry Pipeline
 *
 * Activated when the user asks about compatibility, relationship chart
 * overlay, or anything that involves comparing TWO birth charts.
 *
 * The user's chart is always present. The second person's chart
 * (partner/friend/etc.) is provided via synastryData on the PipelineContext.
 *
 * Key: We use role-based labels throughout. Instead of "Chart A" and
 * "Chart B", the Oracle addresses "you" and "{relationship} ({name})".
 *
 * Data flow:
 * - System prompt: soul document + synastry instructions + timespace
 * - User message: your chart data + their chart data + relationship context + question
 */

import type {
  OraclePipeline,
  PipelineContext,
  SystemPromptBlock,
  UserMessageBlock,
} from "../pipelineTypes";

import { buildUniversalBirthContext } from "../featureContext";
import {
  getSynastryInstructions,
  buildSynastryChartBContext,
  buildSynastryComparisonContext,
} from "../synastryContext";
import type { StoredBirthData } from "../../birth-chart/types";

export const synastryPipeline: OraclePipeline = {
  key: "synastry",

  dataRequirements: {
    needsBirthData: true, // User's own chart is required
    needsJournalContext: false, // Synastry doesn't need journal context
    expandedJournalBudget: false,
    needsTimespace: true,
    needsSynastryData: true, // Second chart + relationship type
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
    // Use role-based labels — pass chart B name and relationship info
    if (ctx.synastryData) {
      systemBlocks.push({
        content: getSynastryInstructions(
          ctx.synastryData.chartBName || "the other person",
          ctx.synastryData.relationship,
          ctx.synastryData.relationshipCategory,
        ),
        priority: 80,
        label: "synastry_instructions",
      });
    } else {
      systemBlocks.push({
        content: getSynastryInstructions("the other person", "partner"),
        priority: 80,
        label: "synastry_instructions",
      });
    }

    // Timespace context
    if (ctx.timespaceContext) {
      systemBlocks.push({
        content: ctx.timespaceContext,
        priority: 50,
        label: "timespace",
      });
    }

    // ── User message blocks ────────────────────────────────────────────────

    // User's chart data (addressed as "your chart")
    if (ctx.birthData) {
      userBlocks.push({
        content: `[YOUR CHART DATA]\n${ctx.birthData}`,
        label: "chart_a_data",
      });
    } else {
      // User doesn't have chart data — ask for it
      systemBlocks.push({
        content: [
          "[YOUR CHART DATA UNAVAILABLE]",
          "The user has requested a synastry reading but does not have their own birth data on file.",
          "Ask them for their birth date, exact birth time, and birth city/country before proceeding.",
          "Do NOT invent or assume any placements.",
          "[END YOUR CHART DATA UNAVAILABLE]",
        ].join("\n"),
        priority: 75,
        label: "chart_a_unavailable",
      });
    }

    // Second person's chart data
    if (ctx.synastryData) {
      const chartBContext = buildSynastryChartBContext(ctx.synastryData);
      userBlocks.push({
        content: chartBContext,
        label: "chart_b_data",
      });
      if (ctx.rawBirthData) {
        const comparisonContext = buildSynastryComparisonContext(
          ctx.rawBirthData as StoredBirthData,
          ctx.synastryData,
        );
        if (comparisonContext) {
          userBlocks.push({
            content: comparisonContext,
            label: "synastry_comparison_evidence",
          });
        }
      }
    } else {
      // No chart B data — shouldn't happen if UI validation works, but handle gracefully
      systemBlocks.push({
        content: [
          "[SECOND PERSON'S CHART DATA MISSING]",
          "The user selected a synastry reading but no second chart data was provided.",
          "Ask the user to provide the second person's birth information (date, time, and location) before proceeding.",
          "Do NOT invent or assume any placements.",
          "[END SECOND PERSON'S CHART DATA MISSING]",
        ].join("\n"),
        priority: 75,
        label: "chart_b_unavailable",
      });
    }

    return { systemBlocks, userBlocks };
  },
};
