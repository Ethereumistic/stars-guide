import { query } from "../_generated/server";
import { v } from "convex/values";
import { startOfDay, parseISO, differenceInDays } from "date-fns";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Daily horoscope queries — public-facing, no admin guard.
 *
 * Both queries ONLY return horoscopes with status 'generated' or 'overridden'.
 * Pending and failed entries are never exposed to the frontend.
 */

/** All 12 zodiac signs in canonical order */
export const ALL_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

// ─── Paywall helper ─────────────────────────────────────────────────────────

type Tier = "free" | "popular" | "premium";

/** Per-tier access window, in absolute days from today. */
const TIER_WINDOW_DAYS: Record<Tier, number> = {
  free: 0,    // today only
  popular: 1, // ±1 day (yesterday, today, tomorrow)
  premium: 7, // ±7 days
};

function daysFromToday(dateStr: string): number {
  const today = startOfDay(new Date());
  const target = startOfDay(parseISO(dateStr));
  return differenceInDays(target, today);
}

/**
 * Determines whether the given date is accessible to the given tier.
 *
 *   free     → today only
 *   popular  → ±1 day  (yesterday, today, tomorrow)
 *   premium  → ±7 days
 */
function isDateAccessible(userTier: Tier, dateStr: string): boolean {
  return Math.abs(daysFromToday(dateStr)) <= TIER_WINDOW_DAYS[userTier];
}

/**
 * Picks the **minimum upgrade tier** that would actually unlock this date.
 *
 * Critically, this is driven by the distance from today — NOT by the user's
 * current tier. A free user looking at "day after tomorrow" needs `premium`
 * (Oracle), not `popular` (Cosmic Flow), because Cosmic Flow only covers ±1.
 *
 * Returns `null` only when no tier could unlock the date (out of ±7 range).
 */
function requiredTierForDate(dateStr: string): "popular" | "premium" | null {
  const distance = Math.abs(daysFromToday(dateStr));
  if (distance <= TIER_WINDOW_DAYS.popular) return "popular";
  if (distance <= TIER_WINDOW_DAYS.premium) return "premium";
  return null;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * getPublished — Returns the published horoscope for a given sign and date.
 *
 * Reads from daily_horoscopes (new system) with paywall logic.
 * Frontend should handle null with a graceful fallback message.
 *
 * This replaces the old convex/horoscopes.ts getPublished query.
 * Kept at api.horoscopes.queries.getPublished for the new module structure.
 */
export const getPublished = query({
  args: {
    sign: v.string(),
    date: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    const userTier: Tier = (user?.tier as Tier) ?? "free";

    const horoscope = await ctx.db
      .query("daily_horoscopes")
      .withIndex("by_date_sign", (q) =>
        q.eq("date", args.date).eq("sign", args.sign)
      )
      .first();

    // Only expose generated or overridden content
    if (!horoscope || !["generated", "overridden"].includes(horoscope.status)) {
      return null;
    }

    // Enforce paywall
    if (!isDateAccessible(userTier, args.date)) {
      return {
        isPaywalled: true,
        requiredTier: requiredTierForDate(args.date) ?? "premium",
        date: args.date,
        sign: args.sign,
      };
    }

    return { isPaywalled: false, ...horoscope };
  },
});

/**
 * getTodayForSign — Returns today's daily horoscope for the given sign.
 *
 * Uses the by_date_sign index: date = today, sign = args.sign.
 * Only returns 'generated' or 'overridden' entries.
 * Returns null if no horoscope exists yet for today + sign.
 *
 * Paywall: free → today only; popular → ±1 day; premium → ±7 days.
 */
export const getTodayForSign = query({
  args: { sign: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    const userTier: Tier = (user?.tier as Tier) ?? "free";

    const today = startOfDay(new Date());
    const todayStr = today.toISOString().slice(0, 10);

    const horoscope = await ctx.db
      .query("daily_horoscopes")
      .withIndex("by_date_sign", (q) =>
        q.eq("date", todayStr).eq("sign", args.sign)
      )
      .first();

    // Only expose generated or overridden content
    if (!horoscope || !["generated", "overridden"].includes(horoscope.status)) {
      return null;
    }

    // Enforce paywall
    if (!isDateAccessible(userTier, todayStr)) {
      return {
        isPaywalled: true,
        requiredTier: requiredTierForDate(todayStr) ?? "premium",
        date: todayStr,
        sign: args.sign,
      };
    }

    return { isPaywalled: false, ...horoscope };
  },
});

/**
 * getAllSignsForDate — Returns all 12 horoscopes for a given date.
 *
 * Uses the by_date index to collect every entry for the target date.
 * Filters to only 'generated' or 'overridden' status.
 * Returns an array; each entry may be paywalled based on the user's tier.
 *
 * Missing signs (not yet generated) are omitted from the array —
 * callers should handle a shorter array gracefully.
 *
 * Paywall logic applies per-horoscope using the same tier rules.
 */
export const getAllSignsForDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    const userTier: Tier = (user?.tier as Tier) ?? "free";

    const allForDate = await ctx.db
      .query("daily_horoscopes")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    // Only expose generated or overridden content
    const visible = allForDate.filter((h) =>
      ["generated", "overridden"].includes(h.status)
    );

    return visible.map((h) => {
      if (!isDateAccessible(userTier, args.date)) {
        return {
          isPaywalled: true,
          requiredTier: requiredTierForDate(args.date) ?? "premium",
          date: h.date,
          sign: h.sign,
          // strip content when paywalled
          content: undefined,
        };
      }
      return { isPaywalled: false, ...h };
    });
  },
});