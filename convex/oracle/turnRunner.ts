"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";

const { internal: internalRef } = require("../_generated/api") as any;

/**
 * Claims the durable turn once, then runs the auth-independent V2 Oracle path.
 * The action loads the user question from the linked message, never from a
 * second client-supplied copy.
 */
export const invokeOracleTurn = internalAction({
  args: { turnId: v.id("oracle_turns") },
  handler: async (ctx, args) => {
    const claim = await ctx.runMutation(internalRef.oracle.turns.claimQueuedTurn, {
      turnId: args.turnId,
    });
    if (!claim.claimed) return claim;
    try {
      const result = await ctx.runAction(internalRef.oracle.llm.invokeOracleTurnV2, {
        turnId: args.turnId,
      });
      return { ...claim, completed: true, result };
    } catch {
      const state = await ctx.runQuery(
        internalRef.oracle.streamPublisher.getTurnExecutionState,
        { turnId: args.turnId },
      );
      if (state?.turn.active) {
        const preserveValidatedPartial = Boolean(
          state.turn.publicationMode === "validated_sections"
          && state.assistantMessage.content
          && ["connecting", "generating", "validating", "repairing", "retrying"]
            .includes(state.turn.status),
        );
        if (preserveValidatedPartial && state.turn.status === "connecting") {
          await ctx.runMutation(internalRef.oracle.turns.transitionTurn, {
            turnId: args.turnId,
            expectedStatus: "connecting",
            status: "retrying",
          });
        }
        const status = state.turn.status === "cancel_requested"
          ? "cancelled"
          : preserveValidatedPartial
            ? "incomplete"
            : "failed";
        await ctx.runMutation(internalRef.oracle.streamPublisher.finalizePublishedTurn, {
          turnId: args.turnId,
          status,
          content: state.assistantMessage.content
            || "The stars are momentarily beyond my reach. Please try again in a moment. ->",
          partial: Boolean(state.assistantMessage.content),
          safeErrorCode: status === "cancelled" ? "cancelled" : "runner_failed",
          safeErrorMessage: status === "cancelled"
            ? undefined
            : status === "incomplete"
              ? "The missing sections could not be completed; approved sections remain available."
              : "Oracle generation could not be completed.",
          persistenceWriteCount: state.turn.persistenceWriteCount ?? 0,
          maxQueuedChars: state.turn.maxQueuedChars ?? 0,
          fallbackTierUsed: "D",
        });
        await ctx.runMutation(internalRef.oracle.turns.chargeTurnQuota, {
          turnId: args.turnId,
        });
      }
      return { ...claim, completed: false };
    }
  },
});
