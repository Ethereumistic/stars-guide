import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Rate a horoscope — thumbs up or thumbs down.
 *
 * If the user has already rated this horoscope, the rating is updated.
 * If not, a new rating document is created.
 */
export const rate = mutation({
  args: {
    sign: v.string(),
    date: v.string(),
    rating: v.union(v.literal("positive"), v.literal("negative")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be authenticated to rate");

    const now = Date.now();

    // Check for existing rating
    const existing = await ctx.db
      .query("horoscope_ratings")
      .withIndex("by_user_sign_date", (q) =>
        q.eq("userId", userId).eq("sign", args.sign).eq("date", args.date)
      )
      .first();

    if (existing) {
      // If clicking the same rating again, remove it (toggle off)
      if (existing.rating === args.rating) {
        await ctx.db.delete(existing._id);
        return { action: "removed" as const };
      }
      // Otherwise update the rating
      await ctx.db.patch(existing._id, {
        rating: args.rating,
        updatedAt: now,
      });
      return { action: "updated" as const };
    }

    // Create new rating
    await ctx.db.insert("horoscope_ratings", {
      userId,
      sign: args.sign,
      date: args.date,
      rating: args.rating,
      createdAt: now,
      updatedAt: now,
    });

    return { action: "created" as const };
  },
});

/**
 * Get the current user's rating for a specific horoscope.
 * Returns null if not rated.
 */
export const getUserRating = query({
  args: {
    sign: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const rating = await ctx.db
      .query("horoscope_ratings")
      .withIndex("by_user_sign_date", (q) =>
        q.eq("userId", userId).eq("sign", args.sign).eq("date", args.date)
      )
      .first();

    return rating ? { rating: rating.rating, _id: rating._id } : null;
  },
});

/**
 * Get aggregate rating stats for a horoscope (total positive / negative counts).
 */
export const getRatingStats = query({
  args: {
    sign: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const allRatings = await ctx.db
      .query("horoscope_ratings")
      .withIndex("by_sign_date", (q) =>
        q.eq("sign", args.sign).eq("date", args.date)
      )
      .collect();

    const positive = allRatings.filter((r) => r.rating === "positive").length;
    const negative = allRatings.filter((r) => r.rating === "negative").length;

    return { positive, negative, total: allRatings.length };
  },
});