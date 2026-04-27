import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { buildStoredBirthData } from "../src/lib/birth-chart/storage";

const dignityValidator = v.union(
    v.literal("domicile"),
    v.literal("exaltation"),
    v.literal("detriment"),
    v.literal("fall"),
    v.literal("peregrine"),
    v.null(),
);

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
        timezone: v.string(),
        utcTimestamp: v.string(),
        houseSystem: v.literal("whole_sign"),
        location: v.object({
            lat: v.number(),
            long: v.number(),
            city: v.string(),
            country: v.string(),
            countryCode: v.optional(v.string()),
            displayName: v.optional(v.string()),
        }),
        placements: v.array(v.object({
            body: v.string(),
            sign: v.string(),
            house: v.number(),
        })),
        chart: v.object({
            ascendant: v.union(
                v.object({
                    longitude: v.number(),
                    signId: v.string(),
                }),
                v.null(),
            ),
            planets: v.array(v.object({
                id: v.string(),
                signId: v.string(),
                houseId: v.number(),
                longitude: v.number(),
                retrograde: v.boolean(),
                dignity: dignityValidator,
            })),
            houses: v.array(v.object({
                id: v.number(),
                signId: v.string(),
                longitude: v.number(),
            })),
            aspects: v.array(v.object({
                planet1: v.string(),
                planet2: v.string(),
                type: v.union(
                    v.literal("conjunction"),
                    v.literal("sextile"),
                    v.literal("square"),
                    v.literal("trine"),
                    v.literal("opposition"),
                ),
                angle: v.number(),
                orb: v.number(),
            })),
        }),
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
                timezone: args.timezone,
                utcTimestamp: args.utcTimestamp,
                houseSystem: args.houseSystem,
                location: args.location,
                placements: args.placements,
                chart: args.chart,
            },
        });

        const pendingReferral = await ctx.db
            .query("referrals")
            .withIndex("by_refereeId", (q) => q.eq("refereeId", userId))
            .filter((q) => q.eq(q.field("status"), "pending"))
            .first();

        if (pendingReferral) {
            const referrer = await ctx.db.get(pendingReferral.referrerId);
            if (referrer) {
                const user = await ctx.db.get(userId);
                await ctx.db.patch(referrer._id, {
                    stardust: (referrer.stardust || 0) + pendingReferral.rewardAmount,
                });
                await ctx.db.patch(pendingReferral._id, {
                    status: "completed",
                });
                await ctx.db.insert("notifications", {
                    userId: referrer._id,
                    type: "referral_completed",
                    fromUserId: userId,
                    referralId: pendingReferral._id,
                    message: `${user?.username ?? "Someone"} joined through your invite! +${pendingReferral.rewardAmount} stardust`,
                    read: false,
                    createdAt: Date.now(),
                });
            }
        }
    },
});

export const backfillBirthDataCharts = internalMutation({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const users = await ctx.db.query("users").collect();
        const limit = args.limit ?? 50;
        let processed = 0;
        let updated = 0;
        let skipped = 0;

        for (const user of users) {
            if (!user.birthData || processed >= limit) {
                continue;
            }

            processed += 1;

            if (
                user.birthData.chart &&
                user.birthData.timezone &&
                user.birthData.utcTimestamp &&
                user.birthData.houseSystem
            ) {
                skipped += 1;
                continue;
            }

            const enrichedBirthData = buildStoredBirthData({
                date: user.birthData.date,
                time: user.birthData.time,
                location: user.birthData.location,
            });

            await ctx.db.patch(user._id, {
                birthData: enrichedBirthData,
            });
            updated += 1;
        }

        return {
            processed,
            updated,
            skipped,
        };
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
                await ctx.db.patch(limit._id, { count: 1, resetAt: now + WINDOW_MS });
            } else if (limit.count >= MAX_CHECKS) {
                throw new Error("RATE_LIMITED");
            } else {
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

        const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
        if (user.lastUsernameChangeAt && Date.now() - user.lastUsernameChangeAt < COOLDOWN_MS) {
            throw new Error("You can only change your username once every 30 days.");
        }

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
