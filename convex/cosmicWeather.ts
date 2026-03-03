/**
 * cosmicWeather.ts — Convex functions for computing, storing, and
 * serving daily astronomical snapshots (Cosmic Weather).
 *
 * Internal functions are called by the cron job and the AI generation
 * action. The public query + mutation are used by the admin dashboard.
 */
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { query, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { computeSnapshot } from "./lib/astronomyEngine";
import { requireAdmin } from "./lib/adminGuard";

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL FUNCTIONS (used by cron + AI generation action)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * getForDate — Fetch the cosmic weather snapshot for a specific date.
 * Returns null if not yet computed.
 */
export const getForDate = internalQuery({
    args: { date: v.string() },
    handler: async (ctx, { date }) => {
        return await ctx.db
            .query("cosmicWeather")
            .withIndex("by_date", (q) => q.eq("date", date))
            .unique();
    },
});

/**
 * upsertSnapshot — Write the computed snapshot to DB.
 * Idempotent: if a record for the date already exists, it gets patched.
 */
export const upsertSnapshot = internalMutation({
    args: {
        date: v.string(),
        planetPositions: v.array(v.object({
            planet: v.string(),
            sign: v.string(),
            degreeInSign: v.number(),
            isRetrograde: v.boolean(),
        })),
        moonPhase: v.object({
            name: v.string(),
            illuminationPercent: v.number(),
        }),
        activeAspects: v.array(v.object({
            planet1: v.string(),
            planet2: v.string(),
            aspect: v.string(),
            orbDegrees: v.number(),
        })),
        generatedAt: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("cosmicWeather")
            .withIndex("by_date", (q) => q.eq("date", args.date))
            .unique();
        if (existing) {
            await ctx.db.patch(existing._id, args);
        } else {
            await ctx.db.insert("cosmicWeather", args);
        }
    },
});

/**
 * computeAndStore — Compute the astronomical snapshot and persist it.
 * Safe to call multiple times (idempotent via upsert).
 */
export const computeAndStore = internalAction({
    args: { date: v.string() },
    handler: async (ctx, { date }) => {
        const snapshot = computeSnapshot(date);
        await ctx.runMutation(internal.cosmicWeather.upsertSnapshot, {
            date,
            ...snapshot,
            generatedAt: Date.now(),
        });
    },
});

/**
 * dailyCosmicWeatherJob — Date-aware wrapper for the cron.
 * Convex crons can't pass dynamic args, so this computes the current
 * UTC date and then calls computeAndStore.
 */
export const dailyCosmicWeatherJob = internalAction({
    args: {},
    handler: async (ctx) => {
        const today = new Date().toISOString().split("T")[0];
        await ctx.runAction(internal.cosmicWeather.computeAndStore, { date: today });
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN-FACING FUNCTIONS (used by the dashboard UI)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * getCosmicWeatherForAdmin — Fetch today's cosmic weather for the admin
 * dashboard card. Returns null if not yet computed.
 */
export const getCosmicWeatherForAdmin = query({
    args: { date: v.string() },
    handler: async (ctx, { date }) => {
        await requireAdmin(ctx);
        return await ctx.db
            .query("cosmicWeather")
            .withIndex("by_date", (q) => q.eq("date", date))
            .unique();
    },
});

/**
 * recomputeCosmicWeather — Admin "Recompute" button.
 * Schedules the computeAndStore action for the given date.
 */
export const recomputeCosmicWeather = action({
    args: { date: v.string() },
    handler: async (ctx, { date }) => {
        await ctx.runAction(internal.cosmicWeather.computeAndStore, { date });
    },
});
