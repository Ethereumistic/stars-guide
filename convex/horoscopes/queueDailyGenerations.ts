/**
 * convex/horoscopes/queueDailyGenerations.ts — Cron entrypoint for daily horoscope generation.
 *
 * v1.0
 *
 * Registered as a Convex cron job via convex/crons.ts (fires at 02:00 UTC daily).
 * Orchestrates the full daily generation pipeline:
 *
 *   1. Compute today's date string (UTC, YYYY-MM-DD)
 *   2. Call computeDailyContext to ensure fresh astronomical context
 *   3. Enqueue 12 generateForSign jobs, staggered 30 s apart via ctx.scheduler.runAt
 *      (one independent action invocation per sign — failure for one does not block others)
 *
 * generateForSign itself handles LLM-level retry (one retry after 3 s) and marks
 * status=failed if retries are exhausted. Individual sign failures do not affect others.
 */

import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

const { internal } = require("../_generated/api") as any;

// ─── Constants ─────────────────────────────────────────────────────────────

const SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

/** Stagger between sign jobs (seconds). Override in oracle_settings key 'horoscope_stagger_seconds'. */
const DEFAULT_STAGGER_SECONDS = 30;

// ─── Config query ────────────────────────────────────────────────────────────

export const getHoroscopeCronSettings = internalQuery({
    args: {},
    handler: async (ctx) => {
        const staggerRow = await ctx.db
            .query("oracle_settings")
            .withIndex("by_key", (q) => q.eq("key", "horoscope_stagger_seconds"))
            .first();

        return {
            staggerSeconds: staggerRow
                ? Number(staggerRow.value)
                : DEFAULT_STAGGER_SECONDS,
        };
    },
});

// ─── Internal mutation — mark a sign as pending in daily_horoscopes ────────

export const markQueued = internalMutation({
    args: {
        date: v.string(),
        sign: v.string(),
    },
    handler: async (ctx, { date, sign }) => {
        const existing = await ctx.db
            .query("daily_horoscopes")
            .withIndex("by_date_sign", (q) => q.eq("date", date).eq("sign", sign))
            .first();

        if (existing) {
            if (existing.status === "pending") return; // already queued
            await ctx.db.patch(existing._id, {
                status: "pending",
                errors: undefined,
            });
        } else {
            await ctx.db.insert("daily_horoscopes", {
                date,
                sign,
                status: "pending",
                content: {
                    hook: "Pending generation.",
                    bodyText: "This horoscope is being generated. Check back shortly.",
                    mantra: "I trust the timing.",
                    dailyPillars: {
                        vibe: "aligning",
                        powerMove: "Check back soon",
                        blindSpot: "Coming soon",
                        luckySpark: "On the way",
                    },
                    domainScores: [
                        { name: "Love", score: 50 },
                        { name: "Career", score: 50 },
                        { name: "Family", score: 50 },
                        { name: "Health", score: 50 },
                        { name: "Finance", score: 50 },
                        { name: "Social", score: 50 },
                    ],
                },
                promptVersion: undefined,
            });
        }
    },
});

// ─── Main cron action ────────────────────────────────────────────────────────

export const queueDailyGenerations = internalAction({
    args: {},
    handler: async (ctx) => {
        // ── 1. Resolve today's date ────────────────────────────────────────────
        const now = new Date();
        const date = now.toISOString().slice(0, 10); // YYYY-MM-DD in UTC

        console.log(`[queueDailyGenerations] Starting daily generation for ${date}`);

        // ── 2. Verify astronomical context exists (pre-computed at 01:30) ─────
        const ctxRecord = await ctx.runQuery(
            internal.horoscopes.computeDailyContext.getDailyAstrologyContext,
            { date },
        );
        if (!ctxRecord) {
            console.warn(`[queueDailyGenerations] No context for ${date}, computing as fallback...`);
            await ctx.runAction(
                internal.horoscopes.computeDailyContext.computeDailyContext,
                { date },
            );
        } else {
            console.log(`[queueDailyGenerations] Context pre-computed for ${date}, skipping computation.`);
        }

        // ── 3. Resolve stagger from oracle_settings via internal query ──────────
        const settings = await ctx.runQuery(
            internal.horoscopes.queueDailyGenerations.getHoroscopeCronSettings,
            {},
        );
        const staggerMs =
            (settings?.staggerSeconds ?? DEFAULT_STAGGER_SECONDS) * 1000;

        console.log(
            `[queueDailyGenerations] Context ready — staggering ${SIGNS.length} signs by ${staggerMs / 1000}s`,
        );

        const baseTime = Date.now();

        // ── 4. Enqueue sign jobs staggered ──────────────────────────────────────
        const results: { sign: string; jobId: string; ok: boolean }[] = [];

        for (let i = 0; i < SIGNS.length; i++) {
            const sign = SIGNS[i];
            const delayMs = i * staggerMs;
            const scheduledAt = baseTime + delayMs;

            try {
                const jobId = await ctx.scheduler.runAt(
                    scheduledAt,
                    internal.horoscopes.generateForSign.generateForSign,
                    { sign, date },
                );

                await ctx.runMutation(
                    internal.horoscopes.queueDailyGenerations.markQueued,
                    { date, sign },
                );

                console.log(
                    `[queueDailyGenerations] Queued ${sign} @ ${new Date(scheduledAt).toISOString()} (job=${jobId})`,
                );
                results.push({ sign, jobId, ok: true });
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error(`[queueDailyGenerations] Failed to queue ${sign}: ${msg}`);
                results.push({ sign, jobId: "error", ok: false });
            }
        }

        const succeeded = results.filter((r) => r.ok).length;
        console.log(
            `[queueDailyGenerations] Done — ${succeeded}/${SIGNS.length} signs queued for ${date}`,
        );
    },
});
