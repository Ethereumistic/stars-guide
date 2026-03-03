/**
 * Internal queries used by server-side actions to fetch data from DB.
 * These CANNOT live in ai.ts because that file has "use node" and
 * only actions can be defined in Node.js runtime files.
 */
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getJobDetails = internalQuery({
    args: { jobId: v.id("generationJobs") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.jobId);
    },
});

export const getZeitgeistInternal = internalQuery({
    args: { zeitgeistId: v.id("zeitgeists") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.zeitgeistId);
    },
});

export const getSystemSettingInternal = internalQuery({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("systemSettings")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();
    },
});

export const getCosmicWeatherInternal = internalQuery({
    args: { date: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("cosmicWeather")
            .withIndex("by_date", (q) => q.eq("date", args.date))
            .unique();
    },
});

/**
 * validateAdmin — Internal query that checks if the current user is an admin.
 * Used by public action wrappers that need auth validation but lack direct DB access.
 */
export const validateAdmin = internalQuery({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const user = await ctx.db.get(userId);
        if (!user || user.role !== "admin") return null;

        return userId;
    },
});

/**
 * getHookInternal — Fetch a specific hook by ID for the AI generation pipeline.
 */
export const getHookInternal = internalQuery({
    args: { hookId: v.id("hooks") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.hookId);
    },
});
