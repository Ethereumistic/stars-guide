import { mutation } from "./_generated/server";
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
