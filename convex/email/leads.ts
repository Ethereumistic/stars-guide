/**
 * leads.ts — Capture and manage email leads from growth widgets.
 */
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const captureLead = mutation({
    args: {
        email: v.string(),
        source: v.union(
            v.literal("exit_intent_popup"),
            v.literal("blog_signup"),
            v.literal("social_cta"),
            v.literal("onboarding"),
        ),
        sign: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(args.email)) {
            throw new Error("Invalid email address");
        }

        // Check for existing lead
        const existing = await ctx.db
            .query("emailLeads")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (existing) {
            // Reactivate if previously unsubscribed
            if (existing.status === "unsubscribed") {
                await ctx.db.patch(existing._id, {
                    status: "active",
                    unsubscribedAt: undefined as any,
                    confirmedAt: Date.now(),
                });
                return existing._id;
            }
            // Already exists and active — no duplicate
            return existing._id;
        }

        // Get current user ID if authenticated
        const userId = await getAuthUserId(ctx);

        return await ctx.db.insert("emailLeads", {
            email: args.email,
            source: args.source,
            sign: args.sign,
            userId: userId ?? undefined,
            status: "active",
            optInAt: Date.now(),
            confirmedAt: Date.now(),
        });
    },
});

export const confirmLead = mutation({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const lead = await ctx.db
            .query("emailLeads")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (lead && lead.status === "pending") {
            await ctx.db.patch(lead._id, {
                status: "active",
                confirmedAt: Date.now(),
            });
        }
    },
});

export const unsubscribeLead = mutation({
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

export const getLeadByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("emailLeads")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();
    },
});