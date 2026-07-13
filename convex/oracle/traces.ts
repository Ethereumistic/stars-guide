import { internalMutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";

export const storeTrace = internalMutation({
  args: { sessionId: v.id("oracle_sessions"), messageId: v.id("oracle_messages"), payload: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    const existing = await ctx.db.query("oracle_turn_traces").withIndex("by_message", (q) => q.eq("messageId", args.messageId)).first();
    const record = {
      sessionId: args.sessionId, messageId: args.messageId, userId: session.userId,
      version: "oracle-trace-v1", payload: args.payload,
      isSimulation: session.isSimulation, simulationRunId: session.simulationRunId, createdAt: Date.now(),
    };
    if (existing) await ctx.db.patch(existing._id, record);
    else await ctx.db.insert("oracle_turn_traces", record);
  },
});

export const adminGetSessionTraces = query({
  args: { sessionId: v.id("oracle_sessions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("oracle_turn_traces").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId)).order("asc").collect();
    return rows.map((row) => {
      try { return { ...row, trace: JSON.parse(row.payload) }; }
      catch { return { ...row, trace: null }; }
    });
  },
});
