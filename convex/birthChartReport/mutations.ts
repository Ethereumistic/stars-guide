import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { fingerprintBirthChart } from "../../src/lib/birth-chart/report-context";

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
    sourceChartFingerprint: v.string(),
    generationProviderId: v.string(),
    generationModel: v.string(),
    generationTier: v.string(),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (!user.birthData || fingerprintBirthChart(user.birthData) !== args.sourceChartFingerprint) {
      throw new Error("Birth data changed during report generation; discarding stale artifact");
    }

    const now = Date.now();

    await ctx.db.patch(args.userId, {
      birthChartReport: {
        ...(user.birthChartReport ?? {}),
        status: "completed",
        markdown: args.markdown,
        structured: args.structured,
        generatedAt: now,
        generationProviderId: args.generationProviderId,
        generationModel: args.generationModel,
        generationTier: args.generationTier,
        promptTokens: args.promptTokens,
        completionTokens: args.completionTokens,
        version: args.version,
        sourceChartFingerprint: args.sourceChartFingerprint,
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
          featureKey: "birth_chart_report",
          primaryModelUsed: `${args.generationProviderId}/${args.generationModel}`,
          updatedAt: now,
          lastMessageAt: now,
        });
      }
    }
  },
});
