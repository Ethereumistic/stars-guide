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

/**
 * getOracleProvidersConfig — Reads the raw providers_config JSON from oracle_settings.
 * Used by the generation engine to route LLM calls to the correct provider.
 */
export const getOracleProvidersConfig = internalQuery({
    args: {},
    handler: async (ctx) => {
        const setting = await ctx.db
            .query("oracle_settings")
            .withIndex("by_key", (q) => q.eq("key", "providers_config"))
            .first();
        return setting?.value;
    },
});

/**
 * assembleSystemPrompt — v4: Assembles enabled context slots into a single
 * system prompt string. Falls back to the old monolithic master_context
 * from systemSettings when no context slots exist (backward compat).
 */
export const assembleSystemPrompt = internalQuery({
    args: {},
    handler: async (ctx) => {
        const slots = await ctx.db
            .query("contextSlots")
            .withIndex("by_order")
            .filter((q) => q.eq(q.field("isEnabled"), true))
            .collect();

        // v4 slots exist — assemble them
        if (slots.length > 0) {
            return slots
                .map((slot) => `## ${slot.label}\n\n${slot.content}`)
                .join("\n\n---\n\n");
        }

        // Fallback: use old monolithic master_context
        const legacy = await ctx.db
            .query("systemSettings")
            .withIndex("by_key", (q) => q.eq("key", "master_context"))
            .first();

        if (legacy?.content) {
            console.warn("[DEPRECATION] Using legacy master_context. Migrate to context slots.");
            return legacy.content;
        }

        // Neither exist — throw
        throw new Error(
            "No context slots configured and no legacy master_context found. " +
            "Please configure context in the Context Editor."
        );
    },
});
