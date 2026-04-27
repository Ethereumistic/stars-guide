/**
 * queries.ts — User-facing notification queries and mutations.
 *
 * Moved from convex/notifications.ts to allow the notifications/ directory
 * to also hold admin and delivery modules.
 */
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        return await ctx.db
            .query("notifications")
            .withIndex("by_user_created", (q) => q.eq("userId", userId))
            .order("desc")
            .take(50);
    },
});

export const unreadCount = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return 0;

        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_user_read", (q) => q.eq("userId", userId).eq("read", false))
            .collect();

        return unread.length;
    },
});

export const markRead = mutation({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const notification = await ctx.db.get(args.notificationId);
        if (!notification || notification.userId !== userId) {
            throw new Error("Notification not found");
        }

        await ctx.db.patch(args.notificationId, { read: true });
    },
});

export const markAllRead = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_user_read", (q) => q.eq("userId", userId).eq("read", false))
            .collect();

        for (const n of unread) {
            await ctx.db.patch(n._id, { read: true });
        }
    },
});

export const dismissNotification = mutation({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const notification = await ctx.db.get(args.notificationId);
        if (!notification || notification.userId !== userId) {
            throw new Error("Notification not found");
        }

        await ctx.db.delete(args.notificationId);
    },
});
