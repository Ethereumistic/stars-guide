/**
 * convex/horoscopes/admin.ts — Admin override + admin query endpoints.
 *
 * All functions here require admin auth via requireAdmin.
 * These are internal admin tools — not exposed to the public frontend.
 *
 * Admin mutations:
 *   overrideHoroscope      — manually replace a horoscope's content + set status=overridden
 *   retryFailedGeneration  — reset status to pending and re-trigger generation for sign+date
 *
 * Admin queries:
 *   listHoroscopesForDate  — all 12 signs for a date, with optional status filter
 *   getFailedGenerations   — list horoscopes with status=failed (date filter optional)
 *
 * Admin actions:
 *   recomputeAstrologyContext — trigger computeDailyContext for a date
 *   retryFailedGeneration      — reset + re-trigger (uses ctx.scheduler)
 *
 * Internal helpers (in helpers.ts):
 *   _checkAdmin            — internal query used by actions to verify admin auth
 *   _resetHoroscopeStatus  — internal mutation to reset a horoscope to pending
 */
import { query, mutation, action } from "../_generated/server";
import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { requireAdmin } from "../lib/adminGuard";

const { internal, api } = require("../_generated/api") as any;
const checkAdminRef = makeFunctionReference<"query">("horoscopes/helpers:_checkAdmin");
const listHoroscopesForDateRef = makeFunctionReference<"query">("horoscopes/admin:listHoroscopesForDate");
const resetHoroscopeStatusRef = makeFunctionReference<"mutation">("horoscopes/helpers:_resetHoroscopeStatus");
const generateForSignRef = makeFunctionReference<"action">("horoscopes/generateForSign:generateForSign");

// ─── VALID SIGNS ─────────────────────────────────────────────────────────
const VALID_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

// ─── ADMIN QUERIES ───────────────────────────────────────────────────────

/**
 * listHoroscopesForDate — Admin view of all signs for a given date.
 * Optionally filter by status. Returns the full record including failed/pending.
 */
export const listHoroscopesForDate = query({
    args: {
        date: v.string(),
        status: v.optional(v.union(
            v.literal("pending"),
            v.literal("generated"),
            v.literal("failed"),
            v.literal("overridden"),
        )),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        let q = ctx.db
            .query("daily_horoscopes")
            .withIndex("by_date", (q) => q.eq("date", args.date));

        const all = await q.collect();

        if (args.status !== undefined) {
            return all.filter((h) => h.status === args.status);
        }
        return all;
    },
});

/**
 * getAstrologyContext — Admin query to fetch the daily_astrology_context for a date.
 */
export const getAstrologyContext = query({
    args: { date: v.string() },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        return await ctx.db
            .query("daily_astrology_context")
            .withIndex("by_date", (q) => q.eq("date", args.date))
            .unique();
    },
});

/**
 * getFailedGenerations — List all horoscopes with status=failed.
 * Optionally restrict to a specific date.
 */
export const getFailedGenerations = query({
    args: { date: v.optional(v.string()) },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const all = args.date
            ? await ctx.db
                .query("daily_horoscopes")
                .withIndex("by_date", (q) => q.eq("date", args.date!))
                .collect()
            : await ctx.db.query("daily_horoscopes").collect();

        return all.filter((h) => h.status === "failed");
    },
});

// ─── ADMIN MUTATIONS ─────────────────────────────────────────────────────

/**
 * overrideHoroscope — Admin manually sets/replaces the horoscope content.
 * Sets status = "overridden" so it's clear this was a manual override.
 * Accepts v2 format (hook + bodyText + mantra + dailyPillars) or v1 format for backward compatibility.
 */
export const overrideHoroscope = mutation({
    args: {
        date: v.string(),
        sign: v.string(),
        content: v.any(), // Flexible to support v1 and v2 content formats
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        if (!VALID_SIGNS.includes(args.sign as typeof VALID_SIGNS[number])) {
            throw new Error(`Invalid sign: ${args.sign}`);
        }

        const existing = await ctx.db
            .query("daily_horoscopes")
            .withIndex("by_date_sign", (q) =>
                q.eq("date", args.date).eq("sign", args.sign)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                status: "overridden",
                content: args.content,
            });
            return existing._id;
        } else {
            return await ctx.db.insert("daily_horoscopes", {
                date: args.date,
                sign: args.sign,
                status: "overridden",
                content: args.content,
            });
        }
    },
});

// ─── ADMIN ACTIONS (use ctx.scheduler or ctx.runQuery/runMutation) ────────

/**
 * retryFailedGeneration — Reset a failed horoscope to pending and
 * re-trigger generation.
 *
 * Must be an action because it uses ctx.scheduler.
 */
export const retryFailedGeneration = action({
    args: {
        date: v.string(),
        sign: v.string(),
        providerId: v.optional(v.string()),
        modelId: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<string> => {
        // Admin check via internal query (actions don't have ctx.db)
        await ctx.runQuery(checkAdminRef, {});

        if (!VALID_SIGNS.includes(args.sign as typeof VALID_SIGNS[number])) {
            throw new Error(`Invalid sign: ${args.sign}`);
        }

        // Find the existing record
        const existing = await ctx.runQuery(listHoroscopesForDateRef, {
            date: args.date,
        }) as any[];

        const record = existing.find((h: any) => h.sign === args.sign);
        if (!record) {
            throw new Error(`No horoscope record found for ${args.sign} on ${args.date}`);
        }

        // Reset status via internal mutation
        await ctx.runMutation(resetHoroscopeStatusRef, {
            horoscopeId: record._id,
        });

        // Trigger re-generation via internal action (passing optional provider/model override)
        await ctx.scheduler.runAfter(0, generateForSignRef, {
            date: args.date,
            sign: args.sign,
            providerId: args.providerId ?? undefined,
            modelId: args.modelId ?? undefined,
        });

        return record._id;
    },
});

/**
 * recomputeAstrologyContext — Admin trigger to recompute the daily
 * astrology context snapshot for a date.
 *
 * Must be an action because it uses ctx.scheduler.
 */
export const recomputeAstrologyContext = action({
    args: { date: v.string() },
    handler: async (ctx, args): Promise<void> => {
        // Admin check via internal query (actions don't have ctx.db)
        await ctx.runQuery(internal.horoscopes.helpers._checkAdmin, {});

        // Compute the daily astrology context
        await ctx.scheduler.runAfter(0, internal.horoscopes.computeDailyContext.computeDailyContext, {
            date: args.date,
        });
    },
});

/**
 * triggerDailyGeneration — Admin trigger to generate all 12 signs for a date.
 * Computes the astrology context first, then enqueues all 12 sign jobs
 * staggered 30s apart (matching the cron pipeline).
 * Accepts optional provider/model override.
 */
export const triggerDailyGeneration = action({
    args: {
        date: v.string(),
        providerId: v.optional(v.string()),
        modelId: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<void> => {
        // Admin check
        await ctx.runQuery(internal.horoscopes.helpers._checkAdmin, {});

        const { date, providerId, modelId } = args;

        // 1. Ensure fresh astronomical context
        await ctx.runAction(internal.horoscopes.computeDailyContext.computeDailyContext, { date });

        // 2. Resolve stagger setting
        const settings = await ctx.runQuery(
            internal.horoscopes.queueDailyGenerations.getHoroscopeCronSettings,
            {},
        );
        const staggerMs = (settings?.staggerSeconds ?? 30) * 1000;

        // 3. Enqueue 12 sign jobs
        const SIGNS = [
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
        ];
        const baseTime = Date.now();

        for (let i = 0; i < SIGNS.length; i++) {
            const sign = SIGNS[i];
            const scheduledAt = baseTime + i * staggerMs;
            await ctx.scheduler.runAt(
                scheduledAt,
                internal.horoscopes.generateForSign.generateForSign,
                { sign, date, providerId: providerId ?? undefined, modelId: modelId ?? undefined },
            );
            await ctx.runMutation(internal.horoscopes.queueDailyGenerations.markQueued, {
                date,
                sign,
            });
        }
    },
});

/**
 * triggerGenerationForSigns — Admin trigger to generate horoscopes for
 * specific signs only. If a sign already has a record (even generated),
 * it resets it to pending and re-triggers, effectively overwriting.
 * Accepts optional provider/model override.
 */
export const triggerGenerationForSigns = action({
    args: {
        date: v.string(),
        signs: v.array(v.string()),
        providerId: v.optional(v.string()),
        modelId: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<void> => {
        // Admin check
        await ctx.runQuery(internal.horoscopes.helpers._checkAdmin, {});

        const { date, signs, providerId, modelId } = args;

        // Validate signs
        for (const sign of signs) {
            if (!VALID_SIGNS.includes(sign as typeof VALID_SIGNS[number])) {
                throw new Error(`Invalid sign: ${sign}`);
            }
        }

        // Ensure fresh astronomical context
        await ctx.runAction(internal.horoscopes.computeDailyContext.computeDailyContext, { date });

        // Resolve stagger setting
        const settings = await ctx.runQuery(
            internal.horoscopes.queueDailyGenerations.getHoroscopeCronSettings,
            {},
        );
        const staggerMs = (settings?.staggerSeconds ?? 30) * 1000;

        const baseTime = Date.now();

        for (let i = 0; i < signs.length; i++) {
            const sign = signs[i];
            const scheduledAt = baseTime + i * staggerMs;

            // Mark as queued (resets existing records to pending)
            await ctx.runMutation(internal.horoscopes.queueDailyGenerations.markQueued, {
                date,
                sign,
            });

            await ctx.scheduler.runAt(
                scheduledAt,
                internal.horoscopes.generateForSign.generateForSign,
                { sign, date, providerId: providerId ?? undefined, modelId: modelId ?? undefined },
            );
        }
    },
});
