/**
 * webhooks.ts — Resend webhook handler.
 * Handles bounce, complaint, unsubscribe, delivered, opened, clicked events.
 */
import { httpAction } from "../_generated/server";
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// ─── Webhook endpoint (registered in http.ts) ─────────────────────────────

export const handleResendWebhook = httpAction(async (ctx, request) => {
    const body = await request.json();

    switch (body.type) {
        case "email.delivered":
            if (body.data?.message_id) {
                await updateDeliveryStatus.run(ctx, {
                    resendMessageId: body.data.message_id,
                    status: "delivered",
                    timestamp: Date.now(),
                });
            }
            break;

        case "email.opened":
            if (body.data?.message_id) {
                await updateDeliveryStatus.run(ctx, {
                    resendMessageId: body.data.message_id,
                    status: "opened",
                    timestamp: Date.now(),
                });
            }
            break;

        case "email.clicked":
            if (body.data?.message_id) {
                await updateDeliveryStatus.run(ctx, {
                    resendMessageId: body.data.message_id,
                    status: "clicked",
                    timestamp: Date.now(),
                });
            }
            break;

        case "email.bounced":
            if (body.data?.message_id) {
                await markBounced.run(ctx, {
                    resendMessageId: body.data.message_id,
                    timestamp: Date.now(),
                });
            }
            break;

        case "email.complained":
            if (body.data?.message_id) {
                await markComplained.run(ctx, {
                    resendMessageId: body.data.message_id,
                    timestamp: Date.now(),
                });
            }
            break;

        case "email.unsubscribed":
            if (body.data?.email) {
                await markLeadUnsubscribed.run(ctx, { email: body.data.email });
            }
            break;
    }

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
});

// ─── Internal mutations to update delivery records ────────────────────────

const updateDeliveryStatus = internalMutation({
    args: {
        resendMessageId: v.string(),
        status: v.union(
            v.literal("delivered"),
            v.literal("opened"),
            v.literal("clicked"),
        ),
        timestamp: v.number(),
    },
    handler: async (ctx, args) => {
        const delivery = await ctx.db
            .query("emailDeliveries")
            .withIndex("by_resendMessageId", (q) =>
                q.eq("resendMessageId", args.resendMessageId)
            )
            .first();

        if (!delivery) return;

        const updates: Record<string, number> = { status: args.timestamp };
        if (args.status === "delivered") updates.deliveredAt = args.timestamp;
        if (args.status === "opened") updates.openedAt = args.timestamp;
        if (args.status === "clicked") updates.clickedAt = args.timestamp;

        await ctx.db.patch(delivery._id, { status: args.status as any, ...updates });
    },
});

const markBounced = internalMutation({
    args: { resendMessageId: v.string(), timestamp: v.number() },
    handler: async (ctx, args) => {
        const delivery = await ctx.db
            .query("emailDeliveries")
            .withIndex("by_resendMessageId", (q) =>
                q.eq("resendMessageId", args.resendMessageId)
            )
            .first();

        if (delivery) {
            await ctx.db.patch(delivery._id, {
                status: "bounced",
                bouncedAt: args.timestamp,
            });
        }

        // Mark the lead as bounced if this was a lead delivery
        if (delivery?.leadId) {
            const lead = await ctx.db.get(delivery.leadId);
            if (lead) {
                await ctx.db.patch(lead._id, { status: "bounced" });
            }
        }
    },
});

const markComplained = internalMutation({
    args: { resendMessageId: v.string(), timestamp: v.number() },
    handler: async (ctx, args) => {
        const delivery = await ctx.db
            .query("emailDeliveries")
            .withIndex("by_resendMessageId", (q) =>
                q.eq("resendMessageId", args.resendMessageId)
            )
            .first();

        if (delivery) {
            await ctx.db.patch(delivery._id, { status: "complained" });
        }
    },
});

const markLeadUnsubscribed = internalMutation({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const lead = await ctx.db
            .query("emailLeads")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (lead) {
            await ctx.db.patch(lead._id, {
                status: "unsubscribed",
                unsubscribedAt: Date.now(),
            });
        }
    },
});

// ─── Validate email address format ─────────────────────────────────────────

export const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ─── Unsubcribe by email (from email link click) ───────────────────────────

export const unsubscribeByEmail = internalMutation({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const lead = await ctx.db
            .query("emailLeads")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (lead) {
            await ctx.db.patch(lead._id, {
                status: "unsubscribed",
                unsubscribedAt: Date.now(),
            });
        }
    },
});