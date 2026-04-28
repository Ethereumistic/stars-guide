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
        };

        await ctx.db.patch(userId, {
            preferences: {
                ...currentPrefs,
                ...(args.dailySparkTime !== undefined && { dailySparkTime: args.dailySparkTime }),
            },
        });
    },
});

export const updateSettings = mutation({
    args: {
        publicChart: v.optional(v.number()),
        notifications: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        const currentSettings = user.settings || {
            publicChart: 2,
            notifications: true,
        };

        await ctx.db.patch(userId, {
            settings: {
                ...currentSettings,
                ...(args.publicChart !== undefined && { publicChart: args.publicChart }),
                ...(args.notifications !== undefined && { notifications: args.notifications }),
            },
        });
    },
});

export const getStarsPageUser = query({
    args: { username: v.string() },
    handler: async (ctx, args) => {
        // Always require authentication
        const viewerId = await getAuthUserId(ctx);
        if (!viewerId) {
            return { access: "unauthenticated" as const };
        }

        // Lookup user by username
        const targetUser = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", args.username))
            .first();

        if (!targetUser) {
            return { access: "not_found" as const };
        }

        const publicChart = targetUser.settings?.publicChart ?? 2;

        // Helper: return granted payload
        const granted = () => ({
            access: "granted" as const,
            user: {
                _id: targetUser._id,
                username: targetUser.username,
                image: targetUser.image,
            },
            birthData: targetUser.birthData ?? null,
        });

        // Public (2) — any authenticated user can view
        if (publicChart === 2) {
            return granted();
        }

        // Private (0) — nobody except the owner
        if (publicChart === 0) {
            if (viewerId === targetUser._id) {
                return granted();
            }
            return { access: "private" as const };
        }

        // Friends Only (1) — owner always sees
        if (viewerId === targetUser._id) {
            return granted();
        }

        // Check if viewer and target are friends
        const forward = await ctx.db
            .query("friendships")
            .withIndex("by_requester_addressee", (q) =>
                q.eq("requesterId", viewerId).eq("addresseeId", targetUser._id)
            )
            .first();

        const reverse = forward ? null : await ctx.db
            .query("friendships")
            .withIndex("by_requester_addressee", (q) =>
                q.eq("requesterId", targetUser._id).eq("addresseeId", viewerId)
            )
            .first();

        const friendship = forward || reverse;
        const areFriends = !!friendship && friendship.status === "accepted";

        if (areFriends) {
            return granted();
        }

        return { access: "friends_only" as const };
    },
});

/**
 * One-time migration: moves preferences.notifications → settings.notifications,
 * creates default settings for users who don't have them, and strips the
 * legacy featureFlags field from all documents.
 *
 * Run once via: npx convex run users:migrateSettings
 */
export const migrateSettings = internalMutation({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        let migrated = 0;
        let skipped = 0;

        for (const user of users) {
            const patches: any = {};
            let needsPatch = false;

            // --- 1. Strip legacy featureFlags ---
            if ((user as any).featureFlags !== undefined) {
                patches.featureFlags = undefined; // removes the field
                needsPatch = true;
            }

            // --- 2. Migrate preferences.notifications → settings.notifications ---
            if (!user.settings) {
                // No settings yet — create from preferences.notifications or defaults
                const notifications = (user.preferences as any)?.notifications ?? true;
                patches.settings = {
                    publicChart: 2,
                    notifications,
                };
                needsPatch = true;

                // Also strip notifications from preferences if present
                if (user.preferences && "notifications" in user.preferences) {
                    const { notifications: _, ...restPrefs } = user.preferences as any;
                    patches.preferences = restPrefs;
                }
            } else if (user.preferences && "notifications" in user.preferences) {
                // Settings exist but preferences still has stale notifications
                const { notifications: _, ...restPrefs } = user.preferences as any;
                patches.preferences = restPrefs;
                needsPatch = true;
            }

            if (needsPatch) {
                await ctx.db.patch(user._id, patches);
                migrated++;
            } else {
                skipped++;
            }
        }

        return { migrated, skipped, total: users.length };
    },
});


