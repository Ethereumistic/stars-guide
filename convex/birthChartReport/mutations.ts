import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const getUserForReport = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const saveCompletedReport = internalMutation({
  args: {
    userId: v.id("users"),
    markdown: v.string(),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, {
      birthChartReport: {
        ...(user.birthChartReport ?? {}),
        status: "completed",
        markdown: args.markdown,
        generatedAt: Date.now(),
        version: args.version,
        errorMessage: undefined,
      },
    });
  },
});
