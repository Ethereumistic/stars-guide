import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── PUBLIC QUERY ─────────────────────────────────────────────────────────

/**
 * Check quota for the current user.
 * Returns { allowed, remaining, reason?, resetsAt? }
 * 
 * This is the SERVER-AUTHORITATIVE quota check.
 * Client-side checks are UX only — this is the law.
 */
export const checkQuota = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return { allowed: false, reason: "unauthenticated" as const, remaining: 0 };

        const user = await ctx.db.get(userId);
        if (!user) return { allowed: false, reason: "unauthenticated" as const, remaining: 0 };

        const plan = (user.role === "admin" || user.role === "moderator") ? user.role : user.tier as string;

        // Read limits from settings
        const limitKey = `quota_limit_${plan}`;
        const resetTypeKey = `quota_reset_${plan}`;

        const limitSetting = await ctx.db
            .query("oracle_settings")
            .withIndex("by_key", (q) => q.eq("key", limitKey))
            .first();
        const resetTypeSetting = await ctx.db
            .query("oracle_settings")
            .withIndex("by_key", (q) => q.eq("key", resetTypeKey))
            .first();

        const limit = limitSetting ? parseInt(limitSetting.value) : 0;
        const resetType = resetTypeSetting?.value ?? "never";

        const usage = await ctx.db
            .query("oracle_quota_usage")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (!usage) return { allowed: true, remaining: limit };

        if (resetType === "never") {
            // Free tier: check lifetime
            const remaining = limit - usage.lifetimeCount;
            return {
                allowed: remaining > 0,
                remaining: Math.max(0, remaining),
                reason: remaining <= 0 ? ("lifetime_cap" as const) : undefined,
            };
        }

        // Daily rolling window
        const now = Date.now();
        const windowMs = 24 * 60 * 60 * 1000;
        const windowExpired = now - usage.dailyWindowStart > windowMs;

        const count = windowExpired ? 0 : usage.dailyCount;
        const remaining = limit - count;

        return {
            allowed: remaining > 0,
            remaining: Math.max(0, remaining),
            reason: remaining <= 0 ? ("daily_cap" as const) : undefined,
            resetsAt: windowExpired ? undefined : usage.dailyWindowStart + windowMs,
        };
    },
});

// ─── MUTATIONS ────────────────────────────────────────────────────────────

/**
 * Increment quota after successful LLM call.
 * Called atomically in a Convex mutation to guarantee consistency.
 * Crisis responses do NOT consume quota.
 */
export const incrementQuota = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        const plan = (user.role === "admin" || user.role === "moderator") ? user.role : user.tier as string;
        const resetTypeSetting = await ctx.db
            .query("oracle_settings")
            .withIndex("by_key", (q) => q.eq("key", `quota_reset_${plan}`))
            .first();
        const resetType = resetTypeSetting?.value ?? "never";

        const now = Date.now();
        const existing = await ctx.db
            .query("oracle_quota_usage")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (!existing) {
            await ctx.db.insert("oracle_quota_usage", {
                userId,
                dailyCount: 1,
                dailyWindowStart: now,
                lifetimeCount: 1,
                lastQuestionAt: now,
                updatedAt: now,
            });
            return;
        }

        const windowMs = 24 * 60 * 60 * 1000;
        const windowExpired = now - existing.dailyWindowStart > windowMs;

        await ctx.db.patch(existing._id, {
            dailyCount: windowExpired ? 1 : existing.dailyCount + 1,
            dailyWindowStart: windowExpired ? now : existing.dailyWindowStart,
            lifetimeCount: existing.lifetimeCount + 1,
            lastQuestionAt: now,
            updatedAt: now,
        });
    },
});
