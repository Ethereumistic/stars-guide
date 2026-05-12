/**
 * Generic Chat Pipeline
 *
 * The default pipeline when NO feature intent is detected.
 * Intentionally does NOT inject birth data — this is the fix for the
 * "lobotomization" problem. Generic chat breathes. The AI can have a
 * normal conversation without being force-fed 14 placements.
 *
 * Journal context is still included when consented because journal
 * provides emotional context ("the user has been feeling anxious lately")
 * without forcing the AI to talk about astrology. It's additive, not directive.
 */

import type {
  OraclePipeline,
  PipelineContext,
  SystemPromptBlock,
  UserMessageBlock,
} from "../pipelineTypes";

export const genericChatPipeline: OraclePipeline = {
  key: "generic_chat",

  dataRequirements: {
    needsBirthData: false, // ← THIS IS THE FIX FOR THE LOBOTOMIZATION
    needsJournalContext: true, // Journal is additive, not directive
    expandedJournalBudget: false,
    needsTimespace: true,
    needsSynastryData: false,
  },

  modelHint: "fast",

  buildPromptBlocks(ctx: PipelineContext): {
    systemBlocks: SystemPromptBlock[];
    userBlocks: UserMessageBlock[];
  } {
    const systemBlocks: SystemPromptBlock[] = [];

    // Soul document (priority 90 — after safety, before features)
    systemBlocks.push({
      content: ctx.soulDoc,
      priority: 90,
      label: "soul_document",
    });

    // Timespace context (priority 50)
    if (ctx.timespaceContext) {
      systemBlocks.push({
        content: ctx.timespaceContext,
        priority: 50,
        label: "timespace",
      });
    }

    // Journal context (priority 40 — additive emotional context)
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