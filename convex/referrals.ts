import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const recordReferral = mutation({
    args: {
        referrerUsername: v.string(),
    },
    handler: async (ctx, args) => {
        const refereeId = await getAuthUserId(ctx);
        if (!refereeId) throw new Error("Not authenticated");

        // Find the referrer by username
        const referrer = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", args.referrerUsername))
            .first();

        if (!referrer) {
            console.warn(`Referrer not found for username: ${args.referrerUsername}`);
            return { success: false, reason: "Referrer not found" };
        }

        if (referrer._id === refereeId) {
            return { success: false, reason: "Cannot refer yourself" };
        }

        // Check if the referee has already been referred
        const existingReferral = await ctx.db
            .query("referrals")
            .withIndex("by_refereeId", (q) => q.eq("refereeId", refereeId))
            .first();

        if (existingReferral) {
            return { success: false, reason: "User has already been referred" };
        }

        // Create pending referral
        await ctx.db.insert("referrals", {
            referrerId: referrer._id,
            refereeId: refereeId,
            status: "pending",
            rewardAmount: 1,
        });

        return { success: true };
    },
});

export const listMyReferrals = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return { referrals: [], stats: { total: 0, pending: 0, completed: 0, stardustEarned: 0 } };

        const referrals = await ctx.db
            .query("referrals")
            .withIndex("by_referrerId", (q) => q.eq("referrerId", userId))
            .collect();

        const results = [];
        let pending = 0;
        let completed = 0;
        let stardustEarned = 0;

        for (const ref of referrals) {
            const referee = await ctx.db.get(ref.refereeId);
            if (ref.status === "pending") pending++;
            if (ref.status === "completed") {
                completed++;
                stardustEarned += ref.rewardAmount;
            }
            results.push({
                referralId: ref._id,
                status: ref.status,
                rewardAmount: ref.rewardAmount,
                createdAt: ref._creationTime,
                referee: referee
                    ? {
                        _id: referee._id,
                        username: referee.username,
                        image: referee.image,
                    }
                    : null,
            });
        }

        // Sort newest first
        results.sort((a, b) => b.createdAt - a.createdAt);

        return {
            referrals: results,
            stats: {
                total: referrals.length,
                pending,
                completed,
                stardustEarned,
            },
        };
    },
});
