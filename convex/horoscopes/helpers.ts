/**
 * convex/horoscopes/helpers.ts — Internal helpers used by admin actions.
 *
 * Split into its own file to avoid circular type inference issues
 * when admin.ts references internal.horoscopes.admin.* from within itself.
 */
import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * _checkAdmin — Internal query that actions call via ctx.runQuery
 * to verify the current user is an admin.
 */
export const _checkAdmin = internalQuery({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("UNAUTHORIZED: Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user || user.role !== "admin") {
            throw new Error("FORBIDDEN: Admin access required");
        }
        return { isAdmin: true, userId };
    },
});

/**
 * _resetHoroscopeStatus — Internal mutation to reset a horoscope record
 * back to pending status.
 */
export const _resetHoroscopeStatus = internalMutation({
    args: {
        horoscopeId: v.id("daily_horoscopes"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.horoscopeId, {
            status: "pending",
        });
    },
});