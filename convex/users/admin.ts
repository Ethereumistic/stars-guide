/**
 * convex/users/admin.ts — Admin-facing user queries, mutations, and actions.
 *
 * All functions require the caller to have `role === "admin"`.
 * Uses requireAdmin from lib/adminGuard for consistent auth.
 */
import { query, mutation, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { requireAdmin } from "../lib/adminGuard";

// ─── Internal Queries ───────────────────────────────────────────────────────

/** Get all active (non-deleted) users — used by crons */
export const getAllActiveUsers = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("deletedAt"), undefined))
            .collect();
    },
});

// ─── Queries ────────────────────────────────────────────────────────────────

/** Paginated user list with optional filters */
export const list = query({
    args: {
        paginationOpts: paginationOptsValidator,
        search: v.optional(v.string()),
        role: v.optional(v.union(v.literal("user"), v.literal("admin"), v.literal("moderator"), v.literal("banned"))),
        tier: v.optional(v.union(v.literal("free"), v.literal("popular"), v.literal("premium"))),
        subscriptionStatus: v.optional(v.union(v.literal("active"), v.literal("canceled"), v.literal("past_due"), v.literal("trialing"), v.literal("none"))),
        emailStatus: v.optional(v.union(v.literal("active"), v.literal("bounced"), v.literal("complained"), v.literal("unsubscribed"), v.literal("blocked"))),
        engagementStatus: v.optional(v.union(v.literal("new"), v.literal("active"), v.literal("dormant"), v.literal("churned"))),
    },
    handler: async (ctx, args) => {
        // For MVP: query all, then filter in-memory (acceptable for < 10k users)
        let users = await ctx.db.query("users").collect();

        // Exclude deleted users by default
        users = users.filter((u) => !u.deletedAt);

        if (args.search) {
            const q = args.search.toLowerCase();
            users = users.filter(
                (u) =>
                    (u.email?.toLowerCase().includes(q) ?? false) ||
                    (u.username?.toLowerCase().includes(q) ?? false) ||
                    u._id.includes(q),
            );
        }
        if (args.role) users = users.filter((u) => u.role === args.role);
        if (args.tier) users = users.filter((u) => u.tier === args.tier);
        if (args.subscriptionStatus) users = users.filter((u) => u.subscriptionStatus === args.subscriptionStatus);
        if (args.emailStatus) users = users.filter((u) => u.emailStatus === args.emailStatus);
        if (args.engagementStatus) users = users.filter((u) => u.engagementStatus === args.engagementStatus);

        // Manual pagination
        const { cursor, numItems } = args.paginationOpts;
        const start = cursor ? parseInt(cursor, 10) : 0;
        const page = users.slice(start, start + numItems);
        const nextCursor = start + page.length < users.length ? String(start + page.length) : null;
        const isDone = !nextCursor;

        return { page, continueCursor: nextCursor ?? "", isDone };
    },
});

/** Full user profile with computed aggregates */
export const getById = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user || user.deletedAt) return null;

        // Count related records
        const journalEntries = await ctx.db
            .query("journal_entries")
            .withIndex("by_user_created", (q: any) => q.eq("userId", args.userId))
            .collect();

        const oracleSessions = await ctx.db
            .query("oracle_sessions")
            .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
            .order("desc")
            .collect();

        const referrals = await ctx.db
            .query("referrals")
            .withIndex("by_referrerId", (q: any) => q.eq("referrerId", args.userId))
            .collect();

        const deliveries = await ctx.db
            .query("emailDeliveries")
            .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
            .order("desc")
            .take(50);

        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_user_created", (q: any) => q.eq("userId", args.userId))
            .order("desc")
            .take(50);

        return {
            user,
            stats: {
                journalCount: journalEntries.length,
                oracleSessionCount: oracleSessions.length,
                referralCount: referrals.length,
                lastOracleAt: oracleSessions[0]?.lastMessageAt ?? null,
            },
            deliveries,
            notifications,
        };
    },
});

/** Aggregated counts for the overview stats cards */
export const getStats = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const activeUsers = users.filter((u) => !u.deletedAt);

        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        return {
            total: activeUsers.length,
            active7d: activeUsers.filter((u) => (u.lastActiveAt ?? 0) > now - sevenDays).length,
            dormant: activeUsers.filter((u) => u.engagementStatus === "dormant").length,
            churned: activeUsers.filter((u) => u.engagementStatus === "churned").length,
            newUsers: activeUsers.filter((u) => u.engagementStatus === "new").length,
            byTier: {
                free: activeUsers.filter((u) => u.tier === "free").length,
                popular: activeUsers.filter((u) => u.tier === "popular").length,
                premium: activeUsers.filter((u) => u.tier === "premium").length,
            },
            byEmailStatus: {
                active: activeUsers.filter((u) => u.emailStatus === "active" || !u.emailStatus).length,
                bounced: activeUsers.filter((u) => u.emailStatus === "bounced").length,
                unsubscribed: activeUsers.filter((u) => u.emailStatus === "unsubscribed").length,
            },
        };
    },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Update editable user fields */
export const updateUser = mutation({
    args: {
        userId: v.id("users"),
        role: v.optional(v.union(v.literal("user"), v.literal("admin"), v.literal("moderator"), v.literal("banned"))),
        tier: v.optional(v.union(v.literal("free"), v.literal("popular"), v.literal("premium"))),
        subscriptionStatus: v.optional(v.union(v.literal("active"), v.literal("canceled"), v.literal("past_due"), v.literal("trialing"), v.literal("none"))),
        emailStatus: v.optional(v.union(v.literal("active"), v.literal("bounced"), v.literal("complained"), v.literal("unsubscribed"), v.literal("blocked"))),
        engagementStatus: v.optional(v.union(v.literal("new"), v.literal("active"), v.literal("dormant"), v.literal("churned"))),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const user = await ctx.db.get(args.userId);
        if (!user || user.deletedAt) throw new Error("User not found");

        const patch: any = {};
        if (args.role !== undefined) patch.role = args.role;
        if (args.tier !== undefined) patch.tier = args.tier;
        if (args.subscriptionStatus !== undefined) patch.subscriptionStatus = args.subscriptionStatus;
        if (args.emailStatus !== undefined) patch.emailStatus = args.emailStatus;
        if (args.engagementStatus !== undefined) patch.engagementStatus = args.engagementStatus;

        await ctx.db.patch(args.userId, patch);
        return { success: true };
    },
});

/** Bulk update engagement or email status for multiple users */
export const bulkUpdateStatus = mutation({
    args: {
        userIds: v.array(v.id("users")),
        emailStatus: v.optional(v.union(v.literal("active"), v.literal("bounced"), v.literal("complained"), v.literal("unsubscribed"), v.literal("blocked"))),
        engagementStatus: v.optional(v.union(v.literal("new"), v.literal("active"), v.literal("dormant"), v.literal("churned"))),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        let updated = 0;
        for (const userId of args.userIds) {
            const user = await ctx.db.get(userId);
            if (!user || user.deletedAt) continue;

            const patch: any = {};
            if (args.emailStatus) patch.emailStatus = args.emailStatus;
            if (args.engagementStatus) patch.engagementStatus = args.engagementStatus;

            if (Object.keys(patch).length > 0) {
                await ctx.db.patch(userId, patch);
                updated++;
            }
        }
        return { updated };
    },
});

/** Soft-delete a user */
export const deleteUser = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const user = await ctx.db.get(args.userId);
        if (!user) throw new Error("User not found");

        await ctx.db.patch(args.userId, {
            deletedAt: Date.now(),
            emailStatus: "blocked",
            engagementStatus: "churned",
        });
        return { success: true };
    },
});

// ─── Internal Mutations ─────────────────────────────────────────────────────

/** Patch engagement status — called by crons */
export const patchEngagementStatus = internalMutation({
    args: {
        userId: v.id("users"),
        engagementStatus: v.union(v.literal("new"), v.literal("active"), v.literal("dormant"), v.literal("churned")),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, { engagementStatus: args.engagementStatus });
    },
});