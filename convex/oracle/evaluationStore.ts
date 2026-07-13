import { internalMutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";

export const getLatestRun = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const setting = await ctx.db.query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", "evaluation_latest"))
      .unique();
    if (!setting) return null;
    try {
      return JSON.parse(setting.value) as unknown;
    } catch {
      return null;
    }
  },
});

export const saveLatestRun = internalMutation({
  args: { payload: v.string(), passed: v.boolean() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", "evaluation_latest"))
      .unique();
    const now = Date.now();
    const value = args.payload.slice(0, 500_000);
    const fields = {
      value,
      valueType: "json" as const,
      label: "Latest Oracle evaluation",
      description: args.passed ? "PASS" : "FAIL",
      group: "evaluation",
      updatedAt: now,
    };
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("oracle_settings", { key: "evaluation_latest", ...fields });
  },
});
