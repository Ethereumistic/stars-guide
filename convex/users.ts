import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const current = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null) {
            return null;
        }
        return await ctx.db.get(userId);
    },
});

export const updateBirthData = mutation({
    args: {
        date: v.string(),
        time: v.string(),
        location: v.object({
            lat: v.number(),
            long: v.number(),
            city: v.string(),
            country: v.string(),
            countryCode: v.optional(v.string()),
            displayName: v.optional(v.string()),
        }),
        sunSign: v.string(),
        moonSign: v.string(),
        risingSign: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null) {
            throw new Error("Not authenticated");
        }

        await ctx.db.patch(userId, {
            birthData: {
                date: args.date,
                time: args.time,
                location: args.location,
                sunSign: args.sunSign,
                moonSign: args.moonSign,
                risingSign: args.risingSign,
            },
        });

        // Referral System: Reward referrer if this user was pending
        const pendingReferral = await ctx.db
            .query("referrals")
            .withIndex("by_refereeId", (q) => q.eq("refereeId", userId))
            .filter((q) => q.eq(q.field("status"), "pending"))
            .first();

        if (pendingReferral) {
            const referrer = await ctx.db.get(pendingReferral.referrerId);
            if (referrer) {
                // Reward referrer
                await ctx.db.patch(referrer._id, {
                    stardust: (referrer.stardust || 0) + pendingReferral.rewardAmount,
                });
                // Mark referral as complete
                await ctx.db.patch(pendingReferral._id, {
                    status: "completed",
                });
            }
        }
    },
});

export const updateProfile = mutation({
    args: {
        phone: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null) {
            throw new Error("Not authenticated");
        }

        const updates: Record<string, string | undefined> = {};
        if (args.phone !== undefined) updates.phone = args.phone;

        if (Object.keys(updates).length > 0) {
            await ctx.db.patch(userId, updates);
        }
    },
});

export const updatePreferences = mutation({
    args: {
        notifications: v.optional(v.boolean()),
        publicChart: v.optional(v.boolean()),
        dailySparkTime: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        const currentPrefs = user.preferences || {
            dailySparkTime: "07:00",
            notifications: true
        };

        await ctx.db.patch(userId, {
            preferences: {
                ...currentPrefs,
                ...(args.notifications !== undefined && { notifications: args.notifications }),
                ...(args.dailySparkTime !== undefined && { dailySparkTime: args.dailySparkTime }),
            },
        });
    },
});

export const checkUsernameAvailability = mutation({
    args: { username: v.string() },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return { available: false, valid: false };
        }

        // Apply strict 10 checks per 5-minute window Rate Limit
        const MAX_CHECKS = 10;
        const WINDOW_MS = 5 * 60 * 1000;
        const now = Date.now();

        const limit = await ctx.db
            .query("rateLimits")
            .withIndex("by_userId_action", (q) =>
                q.eq("userId", userId).eq("action", "check_username")
            )
            .first();

        if (limit) {
            if (now > limit.resetAt) {
                // Window passed, reset count
                await ctx.db.patch(limit._id, { count: 1, resetAt: now + WINDOW_MS });
            } else if (limit.count >= MAX_CHECKS) {
                throw new Error("RATE_LIMITED");
            } else {
                // Inside window, increment
                await ctx.db.patch(limit._id, { count: limit.count + 1 });
            }
        } else {
            await ctx.db.insert("rateLimits", {
                userId,
                action: "check_username",
                count: 1,
                resetAt: now + WINDOW_MS,
            });
        }

        const normalized = args.username.trim();
        if (!/^[a-zA-Z0-9_]{1,15}$/.test(normalized)) {
            return { available: false, valid: false };
        }
        const existing = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", normalized))
            .first();
        return { available: !existing, valid: true };
    },
});

export const updateUsername = mutation({
    args: { username: v.string() },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        const normalized = args.username.trim();
        if (!/^[a-zA-Z0-9_]{1,15}$/.test(normalized)) {
            throw new Error("Invalid username format. Use 1-15 letters, numbers, and underscores.");
        }

        // Check 30 day limit
        const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
        if (user.lastUsernameChangeAt && Date.now() - user.lastUsernameChangeAt < COOLDOWN_MS) {
            throw new Error("You can only change your username once every 30 days.");
        }

        // Check availability
        const existing = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", normalized))
            .first();

        if (existing && existing._id !== userId) {
            throw new Error("Username is already taken");
        }

        await ctx.db.patch(userId, {
            username: normalized,
            lastUsernameChangeAt: Date.now(),
        });

        return { success: true };
    },
});
