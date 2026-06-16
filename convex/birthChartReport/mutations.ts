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
    structured: v.optional(v.any()),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const now = Date.now();

    await ctx.db.patch(args.userId, {
      birthChartReport: {
        ...(user.birthChartReport ?? {}),
        status: "completed",
        markdown: args.markdown,
        structured: args.structured,
        generatedAt: now,
        version: args.version,
        errorMessage: undefined,
      },
    });

    const reportSessionId = user.birthChartReport?.oracleSessionId;
    if (reportSessionId) {
      const session = await ctx.db.get(reportSessionId);
      if (session && session.userId === args.userId) {
        await ctx.db.patch(reportSessionId, {
          title: "Birth Chart Report",
          titleGenerated: true,
          featureKey: "birth_chart",
          updatedAt: now,
          lastMessageAt: now,
        });
      }
    }
  },
});
