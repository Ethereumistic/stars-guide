/**
 * delivery.ts — Scheduled notification campaign delivery engine.
 *
 * Shared `deliverCampaign` helper used by both:
 * - The cron job (processScheduledNotifications)
 * - The admin "send now" action via ctx.scheduler.runAfter
 */
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { Doc } from "../_generated/dataModel";

// ─── Shared Delivery Logic (inline in cron) ──────────────────────────────

async function deliverCampaignInline(ctx: any, campaignId: any) {
    const fresh = await ctx.db.get(campaignId);
    if (!fresh || fresh.status !== "scheduled") return;

    // Lock: set status to "sending"
    await ctx.db.patch(campaignId, { status: "sending" });

    // ─── Resolve target users ───
    let targetUsers: Doc<"users">[] = [];
    switch (fresh.targetAudience) {
        case "all":
            targetUsers = await ctx.db.query("users").collect();
            break;
        case "tier":
            targetUsers = await ctx.db
                .query("users")
                .withIndex("by_tier", (q: any) =>
                    q.eq("tier", fresh.targetFilter)
                )
                .collect();
            break;
        case "role":
            targetUsers = await ctx.db
                .query("users")
                .withIndex("by_role", (q: any) =>
                    q.eq("role", fresh.targetFilter)
                )
                .collect();
            break;
        case "subscriptionStatus":
            targetUsers = await ctx.db
                .query("users")
                .withIndex("by_subscription_status", (q: any) =>
                    q.eq("subscriptionStatus", fresh.targetFilter)
                )
                .collect();
            break;
    }

    // ─── Fan-out: create one notification per user ───
    const deliveryTime = Date.now();
    for (const user of targetUsers) {
        await ctx.db.insert("notifications", {
            userId: user._id,
            type: "admin_broadcast",
            fromUserId: undefined,
            message: fresh.message,
            read: false,
            createdAt: deliveryTime,
            scheduledNotificationId: campaignId,
        });
    }

    // ─── Finalize campaign ───
    await ctx.db.patch(campaignId, {
        status: "sent",
        sentCount: targetUsers.length,
        sentAt: deliveryTime,
    });
}

/**
 * Cron entry point: runs every 60 seconds via crons.ts.
 * Picks up all campaigns with status "scheduled" and scheduledAt <= now,
 * then delivers them one by one.
 */
export const processScheduledNotifications = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        // Find all campaigns due for delivery
        const due = await ctx.db
            .query("scheduledNotifications")
            .withIndex("by_status_scheduledAt", (q: any) =>
                q.eq("status", "scheduled").lte("scheduledAt", now)
            )
            .collect();

        // Deliver each campaign sequentially
        for (const campaign of due) {
            await deliverCampaignInline(ctx, campaign._id);
        }
    },
});

/**
 * Standalone delivery function — called by admin.sendCampaignNow
 * via ctx.scheduler.runAfter(0, internal.notifications.delivery.deliverCampaign, { campaignId })
 */
export const deliverCampaign = internalMutation({
    args: { campaignId: v.id("scheduledNotifications") },
    handler: async (ctx, args) => {
        await deliverCampaignInline(ctx, args.campaignId);
    },
});