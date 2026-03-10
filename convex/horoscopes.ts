import { query } from "./_generated/server";
import { v } from "convex/values";
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Public horoscope queries — No admin guard needed.
 * These are used by the public-facing frontend.
 * Only published content is ever returned.
 */

// ─── Single Day Query ─────────────────────────────────────────────────────

/**
 * getPublished — Returns the published horoscope for a given sign and date.
 * Returns null if not found or not published.
 * Frontend should handle null with a graceful fallback message.
 */
export const getPublished = query({
    args: {
        sign: v.string(),
        date: v.string(), // "YYYY-MM-DD"
    },
    handler: async (ctx, args) => {
        // 1. Fetch the user's tier
        const userId = await getAuthUserId(ctx);
        const user = userId ? await ctx.db.get(userId) : null;
        const userTier = user?.tier || "free";

        // 2. Fetch the requested horoscope
        const horoscope = await ctx.db
            .query("horoscopes")
            .withIndex("by_sign_and_date", (q) =>
                q.eq("sign", args.sign).eq("targetDate", args.date)
            )
            .first();

        // Only return published content — never expose drafts
        if (!horoscope || horoscope.status !== "published") return null;

        // 3. Calculate Date Difference
        // Note: new Date() here fetches the server's current time.
        const today = startOfDay(new Date());
        const targetDate = startOfDay(parseISO(args.date));
        const diff = differenceInDays(targetDate, today);

        // 4. Enforce Paywall Rules
        let isAllowed = false;

        if (userTier === "premium") {
            // Give premium privileges
            isAllowed = diff <= 7; // All past, up to 7 days future
        } else if (userTier === "popular") {
            isAllowed = diff >= -1 && diff <= 1; // Yesterday, Today, Tomorrow
        } else {
            isAllowed = diff === 0; // Free: Today only
        }

        // 5. Return Data or Paywall State
        if (!isAllowed) {
            return {
                isPaywalled: true,
                requiredTier: diff < -1 || diff > 1 ? "premium" : "popular",
                date: args.date,
                sign: args.sign
            };
        }

        return {
            isPaywalled: false,
            ...horoscope
        };
    },
});

// ─── Weekly Feed Query ────────────────────────────────────────────────────

/**
 * getWeekPublished — Returns published horoscopes for a sign across multiple dates.
 * Used for the weekly view.
 */
export const getWeekPublished = query({
    args: {
        sign: v.string(),
        dates: v.array(v.string()), // Array of "YYYY-MM-DD"
    },
    handler: async (ctx, args) => {
        const results = [];
        for (const date of args.dates) {
            const h = await ctx.db
                .query("horoscopes")
                .withIndex("by_sign_and_date", (q) =>
                    q.eq("sign", args.sign).eq("targetDate", date)
                )
                .first();
            if (h && h.status === "published") results.push(h);
        }
        return results;
    },
});

// ─── Daily Overview Query ─────────────────────────────────────────────────

/**
 * getAllSignsForDate — Returns all 12 published horoscopes for a single date.
 * Used for the "Today's Horoscopes" page.
 */
export const getAllSignsForDate = query({
    args: {
        date: v.string(), // "YYYY-MM-DD"
    },
    handler: async (ctx, args) => {
        const allForDate = await ctx.db
            .query("horoscopes")
            .withIndex("by_date", (q) => q.eq("targetDate", args.date))
            .collect();

        // Only return published horoscopes
        return allForDate.filter((h) => h.status === "published");
    },
});
