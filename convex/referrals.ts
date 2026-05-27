import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const MILESTONE_TIERS = {
  5: 10,   // 10 extra stardust at 5 referrals
  10: 25,  // 25 extra stardust at 10 referrals
  25: 50,  // 50 extra stardust at 25 referrals
} as const;

export const MILESTONE_NAMES = {
  5: "Cosmic Explorer",
  10: "Stellar Ambassador",
  25: "Galactic Guide",
} as const;

export const recordReferral = mutation({
  args: {
    referrerUsername: v.string(),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const refereeId = await getAuthUserId(ctx);
    if (!refereeId) throw new Error("Not authenticated");

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

    const existingReferral = await ctx.db
      .query("referrals")
      .withIndex("by_refereeId", (q) => q.eq("refereeId", refereeId))
      .first();

    if (existingReferral) {
      return { success: false, reason: "User has already been referred" };
    }

    await ctx.db.insert("referrals", {
      referrerId: referrer._id,
      refereeId: refereeId,
      status: "pending",
      rewardAmount: 1,
      utmSource: args.utmSource ?? undefined,
      utmMedium: args.utmMedium ?? undefined,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const completeReferral = mutation({
  args: { referralId: v.id("referrals") },
  handler: async (ctx, args) => {
    const referral = await ctx.db.get(args.referralId);
    if (!referral || referral.status !== "pending") {
      return { success: false, reason: "Not found or already completed" };
    }

    await ctx.db.patch(args.referralId, {
      status: "completed",
      completedAt: Date.now(),
    });

    const referrer = await ctx.db.get(referral.referrerId);
    let milestoneKey: number | undefined;
    if (referrer) {
      await ctx.db.patch(referrer._id, {
        stardust: (referrer.stardust ?? 0) + referral.rewardAmount,
      });

      const allReferrals = await ctx.db
        .query("referrals")
        .withIndex("by_referrerId", (q) => q.eq("referrerId", referrer._id))
        .collect();

      const completed = allReferrals.filter(
        (r) => r.status === "completed" || r.status === "milestone_rewarded"
      ).length;

      milestoneKey = ([25, 10, 5] as const).find((t) => completed >= t);
      if (milestoneKey) {
        const bonus = MILESTONE_TIERS[milestoneKey as keyof typeof MILESTONE_TIERS];
        await ctx.db.patch(referrer._id, {
          stardust: (referrer.stardust ?? 0) + bonus,
        });
        await ctx.db.patch(args.referralId, {
          status: "milestone_rewarded",
          milestoneTier: milestoneKey,
        });
      }
    }

    const referee = await ctx.db.get(referral.refereeId);
    if (referee && referee.tier === "free") {
      const trialMs = 7 * 24 * 60 * 60 * 1000;
      const currentEndsAt = referee.subEndsAt ?? Date.now();
      await ctx.db.patch(referee._id, {
        subEndsAt: Math.max(currentEndsAt, Date.now()) + trialMs,
      });
    }

    if (referrer) {
      await ctx.db.insert("notifications", {
        userId: referrer._id,
        type: "referral_completed",
        referralId: args.referralId,
        message: `Your referral completed! +${referral.rewardAmount} ✨`,
        read: false,
        createdAt: Date.now(),
      });
    }

    return { success: true, milestoneHit: !!milestoneKey };
  },
});

export const getReferralStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const referrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrerId", (q) => q.eq("referrerId", userId))
      .collect();

    const completed = referrals.filter(
      (r) => r.status === "completed" || r.status === "milestone_rewarded"
    );
    const totalStardust = completed.reduce((sum, r) => sum + r.rewardAmount, 0);
    const nextMilestone = ([5, 10, 25] as const).find((t) => completed.length < t) ?? null;

    return {
      total: referrals.length,
      completed: completed.length,
      pending: referrals.length - completed.length,
      stardustEarned: totalStardust,
      nextMilestone: nextMilestone as 5 | 10 | 25 | null,
      nextMilestoneReward: nextMilestone ? MILESTONE_TIERS[nextMilestone] : null,
      nextMilestoneName: nextMilestone ? MILESTONE_NAMES[nextMilestone] : null,
    };
  },
});

export const listMyReferrals = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return {
        referrals: [],
        stats: { total: 0, pending: 0, completed: 0, stardustEarned: 0 },
      };

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
      if (ref.status === "completed" || ref.status === "milestone_rewarded") {
        completed++;
        stardustEarned += ref.rewardAmount;
      }
      results.push({
        referralId: ref._id,
        status: ref.status,
        rewardAmount: ref.rewardAmount,
        milestoneTier: ref.milestoneTier ?? null,
        createdAt: ref.createdAt,
        referee: referee
          ? { _id: referee._id, username: referee.username, image: referee.image }
          : null,
      });
    }

    results.sort((a, b) => b.createdAt - a.createdAt);

    return {
      referrals: results,
      stats: { total: referrals.length, pending, completed, stardustEarned },
    };
  },
});