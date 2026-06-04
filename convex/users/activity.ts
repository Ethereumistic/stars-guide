/**
 * convex/users/activity.ts — User activity tracking.
 *
 * Updates lastActiveAt on meaningful user actions.
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";

/** Track a user activity event — updates lastActiveAt */
export const trackActivity = mutation({
    args: {
        userId: v.id("users"),
        eventType: v.union(
            v.literal("login"),
            v.literal("page_view"),
            v.literal("oracle_session"),
            v.literal("journal_entry"),
            v.literal("horoscope_view"),
        ),
    },
    handler: async (ctx, args) => {
        const patch: Record<string, any> = {
            lastActiveAt: Date.now(),
        };

        if (args.eventType === "login") {
            patch.lastLoginAt = Date.now();
        }

        await ctx.db.patch(args.userId, patch);
    },
});