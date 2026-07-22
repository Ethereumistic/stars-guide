/**
 * Journal Recall (Cosmic Recall) Pipeline
 *
 * Activated when the user asks the Oracle to search their journal for
 * patterns, correlations, or insights. Uses an expanded journal context
 * budget because journal recall needs more entries to find patterns.
 *
 * By default, does NOT inject birth data. BUT if the intent router detects
 * BOTH journal_recall AND birth_chart, both pipelines activate and compose —
 * the birth_chart pipeline's userBlocks will include chart data.
 *
 * The Cosmic Recall mode instructions override any DB-stored feature injection
 * for the journal_recall key, ensuring the AI stays in "pattern search" mode.
 */

import type {
  OraclePipeline,
  PipelineContext,
  SystemPromptBlock,
  UserMessageBlock,
} from "../pipelineTypes";

const COSMIC_RECALL_INJECTION = [
  "[COSMIC RECALL MODE]",
  "The user has asked you to search their journal for patterns and correlations with astrological events.",
  "Use the journal context below to identify recurring emotional themes, astrological correlations, and growth patterns.",
  "Cite specific entries by date and relate them to the astrological weather at the time.",
  "[END COSMIC RECALL MODE]",
].join("\n");

export const journalRecallPipeline: OraclePipeline = {
  key: "journal_recall",

  dataRequirements: {
    needsBirthData: false, // Journal recall doesn't need chart data by default
    needsBirthChartReportContext: false,
    needsJournalContext: true, // Obviously needs journal
    expandedJournalBudget: true, // Doubled budget for Cosmic Recall
    needsTimespace: true,
    needsSynastryData: false,
  },

  modelHint: "smart", // Pattern analysis benefits from smarter models

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

    // Cosmic Recall mode instructions
    // DB injection overrides hardcoded instructions when present
    const recallInstructions =
      ctx.featureInjection ?? COSMIC_RECALL_INJECTION;
    systemBlocks.push({
      content: recallInstructions,
      priority: 80,
      label: "cosmic_recall_mode",
    });

    // Timespace
    if (ctx.timespaceContext) {
      systemBlocks.push({
        content: ctx.timespaceContext,
        priority: 50,
        label: "timespace",
      });
    }

    // Journal context (expanded budget — orchestrator handles the budget)
    if (ctx.journalContext) {
      systemBlocks.push({
        content: ctx.journalContext,
        priority: 40,
        label: "journal_context",
      });
    }

    return { systemBlocks, userBlocks: [] };
  },
};
