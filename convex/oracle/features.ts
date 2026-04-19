import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";

/**
 * Feature injection queries.
 *
 * Moved here from injections.ts (deleted during Oracle rebuild).
 * Only the feature injection table survived the rebuild —
 * categories, templates, follow-ups, scenario injections, and
 * prompt versions are all gone.
 */

export const getFeatureInjection = query({
    args: { featureKey: v.string() },
    handler: async (ctx, { featureKey }) => {
        return await ctx.db
            .query("oracle_feature_injections")
            .withIndex("by_feature", (q) => q.eq("featureKey", featureKey))
            .first();
    },
});

export const listAllFeatureInjections = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await ctx.db.query("oracle_feature_injections").collect();
    },
});