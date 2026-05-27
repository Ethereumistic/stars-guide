/**
 * queries.ts — Internal queries for email data access from actions.
 * Actions cannot use ctx.db directly — they must go through ctx.runQuery.
 * These are registered in schema and called from internalAction via ctx.runQuery.
 */
import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const getPreferencesByFrequency = internalQuery({
    args: { frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("none")) },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("emailPreferences")
            .filter((q) => q.eq(q.field("subscribed"), true).eq(q.field("frequency"), args.frequency))
            .collect();
    },
});

export const getActiveLeads = internalQuery({
    args: {},
    handler: async (_ctx) => {
        return [];
    },
});

export const getAllUsersWithEmail = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("users")
            .filter((q) => q.neq(q.field("email"), undefined))
            .collect();
    },
});

export const getAllSegments = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("emailSegments").collect();
    },
});

export const getDailyHoroscope = internalQuery({
    args: { sign: v.string(), date: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("daily_horoscopes")
            .filter((q) => q.eq(q.field("sign"), args.sign).eq(q.field("date"), args.date))
            .first();
    },
});

export const getDeliveriesForLead = internalQuery({
    args: { leadId: v.id("emailLeads") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("emailDeliveries")
            .filter((q) => q.eq(q.field("leadId"), args.leadId))
            .collect();
    },
});

export const getDeliveriesForUser = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("emailDeliveries")
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .order("desc")
            .collect();
    },
});

export const getUsersByTier = internalQuery({
    args: { tier: v.union(v.literal("free"), v.literal("popular"), v.literal("premium")) },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("tier"), args.tier))
            .collect();
    },
});

export const getLatestCosmicWeather = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("cosmicWeather").order("desc").first();
    },
});