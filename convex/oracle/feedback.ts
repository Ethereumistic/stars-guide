import { internalQuery, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";

const outcomeValidator = v.union(
  v.literal("resonant"),
  v.literal("not_relevant"),
  v.literal("not_yet_known"),
);

/** Explicit user feedback only; Oracle must never infer this state. */
export const setMessageOutcome = mutation({
  args: { messageId: v.id("oracle_messages"), outcome: v.optional(outcomeValidator) },
  handler: async (ctx, { messageId, outcome }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const message = await ctx.db.get(messageId);
    if (!message || message.role !== "assistant") throw new Error("Assistant message not found");
    const session = await ctx.db.get(message.sessionId);
    if (!session || session.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.patch(messageId, { outcome });
  },
});

/** Save or remove a response as a time-bounded, user-controlled watch item. */
export const toggleWatchItem = mutation({
  args: { messageId: v.id("oracle_messages"), reviewInDays: v.optional(v.number()) },
  handler: async (ctx, { messageId, reviewInDays }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const message = await ctx.db.get(messageId);
    if (!message || message.role !== "assistant") throw new Error("Assistant message not found");
    const session = await ctx.db.get(message.sessionId);
    if (!session || session.userId !== userId) throw new Error("Unauthorized");
    if (message.watchReviewAt) {
      await ctx.db.patch(messageId, { watchReviewAt: undefined });
      return { saved: false };
    }
    const days = Math.min(90, Math.max(1, Math.round(reviewInDays ?? 7)));
    await ctx.db.patch(messageId, { watchReviewAt: Date.now() + days * 24 * 60 * 60 * 1000 });
    return { saved: true };
  },
});

/** Bounded private memory derived only from explicit user feedback. */
export const getConfirmedMemory = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const sessions = await ctx.db.query("oracle_sessions")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);
    const observations: Array<{ messageId: Id<"oracle_messages">; outcome: "resonant" | "not_relevant"; excerpt: string; createdAt: number }> = [];
    for (const session of sessions) {
      const messages = await ctx.db.query("oracle_messages")
        .withIndex("by_session_created", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(30);
      for (const message of messages) {
        if (message.role !== "assistant" || (message.outcome !== "resonant" && message.outcome !== "not_relevant")) continue;
        observations.push({
          messageId: message._id,
          outcome: message.outcome,
          excerpt: message.content.replace(/\s+/g, " ").trim().slice(0, 500),
          createdAt: message.createdAt,
        });
      }
    }
    return observations.sort((a, b) => b.createdAt - a.createdAt).slice(0, 12);
  },
});
