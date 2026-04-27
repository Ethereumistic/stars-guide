/**
 * admin.ts — Admin notification campaign management functions.
 *
 * Every function requires admin role via requireAdmin guard.
 */
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";
import { internal } from "../_generated/api";

// ─── QUERIES ──────────────────────────────────────────────────────────────

export const listCampaigns = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);

        return await ctx.db
            .query("scheduledNotifications")
            .order("desc")
            .take(50);
    },
});

export const getCampaign = query({
    args: { campaignId: v.id("scheduledNotifications") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        return await ctx.db.get(args.campaignId);
    },
});

export const getCampaignAnalytics = query({
    args: { campaignId: v.id("scheduledNotifications") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return null;

        // Count read notifications for this campaign on-demand
        const campaignNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_campaign", (q) =>
                q.eq("scheduledNotificationId", args.campaignId)
            )
            .collect();

        const readCount = campaignNotifications.filter((n) => n.read).length;

        return {
            sentCount: campaign.sentCount ?? 0,
            readCount,
            totalDelivered: campaignNotifications.length,
        };
    },
});

export const getCampaignStats = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);

        const all = await ctx.db
            .query("scheduledNotifications")
            .collect();

        return {
            total: all.length,
            draft: all.filter((c) => c.status === "draft").length,
            scheduled: all.filter((c) => c.status === "scheduled").length,
            sent: all.filter((c) => c.status === "sent").length,
            cancelled: all.filter((c) => c.status === "cancelled").length,
        };
    },
});

// ─── MUTATIONS ────────────────────────────────────────────────────────────

export const createCampaign = mutation({
    args: {
        title: v.string(),
        message: v.string(),
        targetAudience: v.union(
            v.literal("all"),
            v.literal("tier"),
            v.literal("role"),
            v.literal("subscriptionStatus"),
        ),
        targetFilter: v.optional(v.string()),
        scheduledAt: v.number(),
        sendImmediately: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireAdmin(ctx);

        // Validate
        if (!args.title.trim()) throw new Error("Title is required");
        if (!args.message.trim()) throw new Error("Message is required");
        if (args.message.length > 500) throw new Error("Message must be under 500 characters");

        // If targeting a specific audience, ensure filter is provided
        if (args.targetAudience !== "all" && !args.targetFilter) {
            throw new Error(`Target filter is required for audience type "${args.targetAudience}"`);
        }

        const now = Date.now();
        const scheduledAt = args.sendImmediately ? now : args.scheduledAt;
        const status = args.sendImmediately ? "scheduled" : "draft";

        const campaignId = await ctx.db.insert("scheduledNotifications", {
            title: args.title.trim(),
            message: args.message.trim(),
            type: "admin_broadcast",
            targetAudience: args.targetAudience,
            targetFilter: args.targetFilter,
            status,
            scheduledAt,
            createdBy: userId,
            createdAt: now,
        });

        // If send immediately, trigger delivery via scheduler
        if (args.sendImmediately) {
            await ctx.scheduler.runAfter(0, internal.notifications.delivery.deliverCampaign, {
                campaignId,
            });
        }

        return campaignId;
    },
});

export const updateCampaign = mutation({
    args: {
        campaignId: v.id("scheduledNotifications"),
        title: v.optional(v.string()),
        message: v.optional(v.string()),
        targetAudience: v.optional(v.union(
            v.literal("all"),
            v.literal("tier"),
            v.literal("role"),
            v.literal("subscriptionStatus"),
        )),
        targetFilter: v.optional(v.string()),
        scheduledAt: v.optional(v.number()),
        status: v.optional(v.union(
            v.literal("draft"),
            v.literal("scheduled"),
        )),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Only allow editing draft or scheduled campaigns
        if (campaign.status !== "draft" && campaign.status !== "scheduled") {
            throw new Error("Can only edit draft or scheduled campaigns");
        }

        const updates: Record<string, any> = {};
        if (args.title !== undefined) {
            if (!args.title.trim()) throw new Error("Title cannot be empty");
            updates.title = args.title.trim();
        }
        if (args.message !== undefined) {
            if (!args.message.trim()) throw new Error("Message cannot be empty");
            if (args.message.length > 500) throw new Error("Message must be under 500 characters");
            updates.message = args.message.trim();
        }
        if (args.targetAudience !== undefined) updates.targetAudience = args.targetAudience;
        if (args.targetFilter !== undefined) updates.targetFilter = args.targetFilter;
        if (args.scheduledAt !== undefined) updates.scheduledAt = args.scheduledAt;
        if (args.status !== undefined) updates.status = args.status;

        await ctx.db.patch(args.campaignId, updates);
    },
});

export const cancelCampaign = mutation({
    args: { campaignId: v.id("scheduledNotifications") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        if (campaign.status !== "scheduled") {
            throw new Error("Can only cancel scheduled campaigns");
        }

        await ctx.db.patch(args.campaignId, { status: "cancelled" });
    },
});

export const deleteCampaign = mutation({
    args: { campaignId: v.id("scheduledNotifications") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        if (campaign.status !== "draft" && campaign.status !== "cancelled") {
            throw new Error("Can only delete draft or cancelled campaigns");
        }

        await ctx.db.delete(args.campaignId);
    },
});

export const sendCampaignNow = mutation({
    args: { campaignId: v.id("scheduledNotifications") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        if (campaign.status !== "draft" && campaign.status !== "scheduled") {
            throw new Error("Can only send draft or scheduled campaigns");
        }

        // Set to scheduled with immediate timestamp, then trigger delivery
        await ctx.db.patch(args.campaignId, {
            status: "scheduled",
            scheduledAt: Date.now(),
        });

        // Schedule the delivery
        await ctx.scheduler.runAfter(0, internal.notifications.delivery.deliverCampaign, {
            campaignId: args.campaignId,
        });
    },
});
