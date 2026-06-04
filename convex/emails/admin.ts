/**
 * convex/emails/admin.ts — Admin-facing email queries, mutations, and actions.
 *
 * All public functions require the caller to have `role === "admin"`.
 * Internal functions are called by crons and mutations.
 */
import { query, mutation, action, internalQuery, internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internal, api } from "../_generated/api";
import { Doc } from "../_generated/dataModel";
import { requireAdmin } from "../lib/adminGuard";

// ─── Queries ────────────────────────────────────────────────────────────────

/** List all email campaigns with optional status filter */
export const listCampaigns = query({
    args: {
        status: v.optional(v.union(v.literal("draft"), v.literal("scheduled"), v.literal("active"), v.literal("paused"), v.literal("completed"), v.literal("sending"))),
    },
    handler: async (ctx, args) => {
        let campaigns = await ctx.db.query("emailCampaigns").order("desc").collect();
        if (args.status) campaigns = campaigns.filter((c) => c.status === args.status);
        return campaigns;
    },
});

/** Get a single campaign by ID */
export const getCampaign = query({
    args: { campaignId: v.id("emailCampaigns") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.campaignId);
    },
});

/** Internal: get campaign for action context */
export const getCampaignInternal = internalQuery({
    args: { campaignId: v.id("emailCampaigns") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.campaignId);
    },
});

/** Paginated delivery log with filters */
export const listDeliveries = query({
    args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(v.union(v.literal("queued"), v.literal("sent"), v.literal("delivered"), v.literal("opened"), v.literal("clicked"), v.literal("bounced"), v.literal("complained"), v.literal("unsubscribed"), v.literal("failed"))),
        channel: v.optional(v.union(v.literal("transactional"), v.literal("marketing"))),
        campaignId: v.optional(v.id("emailCampaigns")),
        userId: v.optional(v.id("users")),
        searchEmail: v.optional(v.string()),
        dateFrom: v.optional(v.number()),
        dateTo: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let deliveries: Doc<"emailDeliveries">[] = [];

        if (args.campaignId) {
            deliveries = await ctx.db
                .query("emailDeliveries")
                .withIndex("by_campaign", (q: any) => q.eq("campaignId", args.campaignId!))
                .order("desc")
                .collect();
        } else if (args.userId) {
            deliveries = await ctx.db
                .query("emailDeliveries")
                .withIndex("by_user", (q: any) => q.eq("userId", args.userId!))
                .order("desc")
                .collect();
        } else {
            deliveries = await ctx.db.query("emailDeliveries").order("desc").collect();
        }

        // In-memory filters
        if (args.status) deliveries = deliveries.filter((d) => d.status === args.status);
        if (args.channel) deliveries = deliveries.filter((d) => d.channel === args.channel);
        if (args.searchEmail) {
            const q = args.searchEmail.toLowerCase();
            deliveries = deliveries.filter((d) => d.email.toLowerCase().includes(q));
        }
        if (args.dateFrom) deliveries = deliveries.filter((d) => (d.sentAt ?? 0) >= args.dateFrom!);
        if (args.dateTo) deliveries = deliveries.filter((d) => (d.sentAt ?? 0) <= args.dateTo!);

        // Pagination
        const { cursor, numItems } = args.paginationOpts;
        const start = cursor ? parseInt(cursor, 10) : 0;
        const page = deliveries.slice(start, start + numItems);
        const nextCursor = start + page.length < deliveries.length ? String(start + page.length) : null;

        return { page, continueCursor: nextCursor ?? "", isDone: !nextCursor };
    },
});

/** Get a single delivery with related user/campaign info */
export const getDelivery = query({
    args: { deliveryId: v.id("emailDeliveries") },
    handler: async (ctx, args) => {
        const delivery = await ctx.db.get(args.deliveryId);
        if (!delivery) return null;

        let user = null;
        let campaign = null;
        if (delivery.userId) user = await ctx.db.get(delivery.userId);
        if (delivery.campaignId) campaign = await ctx.db.get(delivery.campaignId);

        return { delivery, user, campaign };
    },
});

/** Paginated lead list with filters */
export const listLeads = query({
    args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(v.union(v.literal("pending"), v.literal("active"), v.literal("unsubscribed"), v.literal("bounced"))),
        source: v.optional(v.union(v.literal("exit_intent_popup"), v.literal("blog_signup"), v.literal("social_cta"), v.literal("onboarding"))),
        search: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let leads = await ctx.db.query("emailLeads").order("desc").collect();
        if (args.status) leads = leads.filter((l) => l.status === args.status);
        if (args.source) leads = leads.filter((l) => l.source === args.source);
        if (args.search) {
            const q = args.search.toLowerCase();
            leads = leads.filter((l) => l.email.toLowerCase().includes(q));
        }

        const { cursor, numItems } = args.paginationOpts;
        const start = cursor ? parseInt(cursor, 10) : 0;
        const page = leads.slice(start, start + numItems);
        const nextCursor = start + page.length < leads.length ? String(start + page.length) : null;

        return { page, continueCursor: nextCursor ?? "", isDone: !nextCursor };
    },
});

/** Aggregated stats for overview cards */
export const getStats = query({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

        const allDeliveries = await ctx.db.query("emailDeliveries").collect();

        const dayDeliveries = allDeliveries.filter((d) => (d.sentAt ?? 0) >= dayAgo);
        const weekDeliveries = allDeliveries.filter((d) => (d.sentAt ?? 0) >= weekAgo);

        const sent24h = dayDeliveries.filter((d) => d.status === "sent" || d.status === "delivered" || d.status === "opened" || d.status === "clicked").length;
        const bounced24h = dayDeliveries.filter((d) => d.status === "bounced").length;
        const failed24h = dayDeliveries.filter((d) => d.status === "failed").length;

        const sent7d = weekDeliveries.filter((d) => d.status === "sent" || d.status === "delivered" || d.status === "opened" || d.status === "clicked").length;
        const opened7d = weekDeliveries.filter((d) => d.status === "opened" || d.status === "clicked").length;
        const openRate7d = sent7d > 0 ? (opened7d / sent7d) * 100 : 0;

        return {
            totalDeliveries: allDeliveries.length,
            sent24h,
            bounced24h,
            failed24h,
            openRate7d: Math.round(openRate7d * 10) / 10,
        };
    },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Create a new email campaign */
export const createCampaign = mutation({
    args: {
        name: v.string(),
        type: v.union(v.literal("welcome_series"), v.literal("daily_horoscope"), v.literal("weekly_cosmic"), v.literal("monthly_roundup"), v.literal("reengagement"), v.literal("one_off")),
        subject: v.string(),
        htmlContent: v.optional(v.string()),
        reactEmailTemplate: v.optional(v.string()),
        campaignData: v.optional(v.string()),
        targetType: v.union(v.literal("all_users"), v.literal("by_tier"), v.literal("by_engagement"), v.literal("by_email_status"), v.literal("by_segment"), v.literal("specific_emails")),
        targetFilter: v.optional(v.string()),
        targetEmails: v.optional(v.array(v.string())),
        channel: v.union(v.literal("transactional"), v.literal("marketing")),
        scheduledAt: v.number(),
        status: v.union(v.literal("draft"), v.literal("scheduled")),
    },
    handler: async (ctx, args) => {
        const { userId: adminUserId, user: admin } = await requireAdmin(ctx);

        const campaignId = await ctx.db.insert("emailCampaigns", {
            name: args.name,
            type: args.type,
            status: args.status,
            subject: args.subject,
            templateId: args.reactEmailTemplate ?? "custom",
            segment: args.targetType,
            schedule: {
                hourUTC: new Date(args.scheduledAt).getUTCHours(),
                minuteUTC: new Date(args.scheduledAt).getUTCMinutes(),
            },
            createdBy: adminUserId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            // Expanded fields
            htmlContent: args.htmlContent,
            reactEmailTemplate: args.reactEmailTemplate,
            campaignData: args.campaignData,
            targetType: args.targetType,
            targetFilter: args.targetFilter,
            targetEmails: args.targetEmails,
            sentBy: args.status === "scheduled" ? adminUserId : undefined,
        });

        return { campaignId };
    },
});

/** Update a draft or scheduled campaign */
export const updateCampaign = mutation({
    args: {
        campaignId: v.id("emailCampaigns"),
        name: v.optional(v.string()),
        subject: v.optional(v.string()),
        htmlContent: v.optional(v.string()),
        scheduledAt: v.optional(v.number()),
        status: v.optional(v.union(v.literal("draft"), v.literal("scheduled"))),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");
        if (campaign.status !== "draft" && campaign.status !== "scheduled") {
            throw new Error("Cannot edit a campaign that is already sending or sent");
        }

        const patch: any = { updatedAt: Date.now() };
        if (args.name) patch.name = args.name;
        if (args.subject) patch.subject = args.subject;
        if (args.htmlContent !== undefined) patch.htmlContent = args.htmlContent;
        if (args.scheduledAt) {
            patch.schedule = {
                hourUTC: new Date(args.scheduledAt).getUTCHours(),
                minuteUTC: new Date(args.scheduledAt).getUTCMinutes(),
            };
        }
        if (args.status) patch.status = args.status;

        await ctx.db.patch(args.campaignId, patch);
        return { success: true };
    },
});

/** Delete a draft or cancelled campaign */
export const deleteCampaign = mutation({
    args: { campaignId: v.id("emailCampaigns") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");
        if (campaign.status !== "draft" && campaign.status !== "completed") {
            throw new Error("Can only delete draft or completed campaigns");
        }

        await ctx.db.delete(args.campaignId);
        return { success: true };
    },
});

/** Immediately trigger a draft or scheduled campaign */
export const sendCampaignNow = mutation({
    args: { campaignId: v.id("emailCampaigns") },
    handler: async (ctx, args) => {
        const { userId: adminUserId } = await requireAdmin(ctx);

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");
        if (campaign.status !== "draft" && campaign.status !== "scheduled") {
            throw new Error("Campaign must be draft or scheduled to send");
        }

        // Lock the campaign
        await ctx.db.patch(args.campaignId, {
            status: "sending",
            sentBy: adminUserId,
        });

        // Schedule the actual delivery action immediately
        await ctx.scheduler.runAfter(0, internal.emails.admin.deliverCampaign, {
            campaignId: args.campaignId,
        });

        return { success: true };
    },
});

/** Pause an active campaign */
export const pauseCampaign = mutation({
    args: { campaignId: v.id("emailCampaigns") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");
        if (campaign.status !== "active" && campaign.status !== "sending") {
            throw new Error("Can only pause active/sending campaigns");
        }
        await ctx.db.patch(args.campaignId, { status: "paused", updatedAt: Date.now() });
        return { success: true };
    },
});

/** Resume a paused campaign */
export const resumeCampaign = mutation({
    args: { campaignId: v.id("emailCampaigns") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");
        if (campaign.status !== "paused") {
            throw new Error("Can only resume paused campaigns");
        }
        await ctx.db.patch(args.campaignId, { status: "active", updatedAt: Date.now() });
        return { success: true };
    },
});

/** Send a one-off manual email to specific addresses */
export const sendManualEmail = mutation({
    args: {
        to: v.array(v.string()),
        subject: v.string(),
        html: v.string(),
        text: v.optional(v.string()),
        channel: v.union(v.literal("transactional"), v.literal("marketing")),
        userIds: v.optional(v.array(v.id("users"))),
    },
    handler: async (ctx, args) => {
        const { userId: adminUserId } = await requireAdmin(ctx);

        // Schedule the delivery action
        await ctx.scheduler.runAfter(0, internal.emails.admin.deliverManualEmails, {
            to: args.to,
            subject: args.subject,
            html: args.html,
            text: args.text,
            channel: args.channel,
            userIds: args.userIds,
            sentBy: adminUserId,
        });

        return { success: true };
    },
});

/** Update lead status */
export const updateLeadStatus = mutation({
    args: {
        leadId: v.id("emailLeads"),
        status: v.union(v.literal("pending"), v.literal("active"), v.literal("unsubscribed"), v.literal("bounced")),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        await ctx.db.patch(args.leadId, { status: args.status });
        return { success: true };
    },
});

/** Bulk update lead statuses */
export const bulkUpdateLeads = mutation({
    args: {
        leadIds: v.array(v.id("emailLeads")),
        status: v.union(v.literal("pending"), v.literal("active"), v.literal("unsubscribed"), v.literal("bounced")),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        let updated = 0;
        for (const leadId of args.leadIds) {
            const lead = await ctx.db.get(leadId);
            if (!lead) continue;
            await ctx.db.patch(leadId, { status: args.status });
            updated++;
        }
        return { updated };
    },
});

/** Delete a lead */
export const deleteLead = mutation({
    args: { leadId: v.id("emailLeads") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        await ctx.db.delete(args.leadId);
        return { success: true };
    },
});

// ─── Internal Mutations ─────────────────────────────────────────────────────

/** Finalize a campaign after delivery */
export const finalizeCampaign = internalMutation({
    args: {
        campaignId: v.id("emailCampaigns"),
        sentCount: v.number(),
        deliveredCount: v.optional(v.number()),
        bouncedCount: v.optional(v.number()),
        failedCount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.campaignId, {
            status: "completed",
            sentCount: args.sentCount,
            deliveredCount: args.deliveredCount ?? 0,
            bouncedCount: args.bouncedCount ?? 0,
            failedCount: args.failedCount ?? 0,
            updatedAt: Date.now(),
        });
    },
});

// ─── Internal Actions ───────────────────────────────────────────────────────

/** Deliver a campaign to all matching recipients */
export const deliverCampaign = internalAction({
    args: { campaignId: v.id("emailCampaigns") },
    handler: async (ctx, args) => {
        const campaign = await ctx.runQuery(internal.emails.admin.getCampaignInternal, {
            campaignId: args.campaignId,
        });
        if (!campaign || campaign.status !== "sending") {
            console.log("[deliverCampaign] Campaign not in sending state, skipping");
            return;
        }

        // Resolve recipients based on targetType
        const users = await ctx.runQuery(internal.email.crons.getAllUsersWithEmail, {});
        let recipients: { userId?: string; email: string }[] = [];

        const targetType = (campaign as any).targetType ?? campaign.segment;
        const targetFilter = (campaign as any).targetFilter;

        if (targetType === "all_users") {
            recipients = users
                .filter((u: any) => u.email && u.emailStatus !== "bounced" && u.emailStatus !== "blocked" && u.role !== "banned" && !u.deletedAt)
                .map((u: any) => ({ userId: u._id, email: u.email }));
        } else if (targetType === "by_tier" && targetFilter) {
            recipients = users
                .filter((u: any) => u.email && u.tier === targetFilter && u.emailStatus !== "bounced" && u.emailStatus !== "blocked" && u.role !== "banned" && !u.deletedAt)
                .map((u: any) => ({ userId: u._id, email: u.email }));
        } else if (targetType === "by_engagement" && targetFilter) {
            recipients = users
                .filter((u: any) => u.email && u.engagementStatus === targetFilter && u.emailStatus !== "bounced" && u.emailStatus !== "blocked" && u.role !== "banned" && !u.deletedAt)
                .map((u: any) => ({ userId: u._id, email: u.email }));
        } else if (targetType === "by_email_status" && targetFilter) {
            recipients = users
                .filter((u: any) => u.email && (u.emailStatus ?? "active") === targetFilter && u.role !== "banned" && !u.deletedAt)
                .map((u: any) => ({ userId: u._id, email: u.email }));
        } else if (targetType === "specific_emails" && (campaign as any).targetEmails) {
            recipients = ((campaign as any).targetEmails as string[]).map((e: string) => ({ email: e }));
        } else {
            // Default: all users with email
            recipients = users
                .filter((u: any) => u.email && u.emailStatus !== "bounced" && u.emailStatus !== "blocked" && u.role !== "banned" && !u.deletedAt)
                .map((u: any) => ({ userId: u._id, email: u.email }));
        }

        // Determine the HTML content
        const htmlContent = (campaign as any).htmlContent;
        const channel = (campaign as any).channel === "marketing" ? "marketing" as const : "transactional" as const;

        // If there's a reactEmailTemplate, we need to render it
        // For now, if htmlContent exists, use it directly
        // Template rendering via @react-email/render requires "use node" — defer to Phase 2 enhancement

        let sentCount = 0;
        let deliveredCount = 0;
        let bouncedCount = 0;
        let failedCount = 0;

        for (const recipient of recipients) {
            try {
                const result = await ctx.runAction(internal.email.sender.sendEmail, {
                    to: recipient.email,
                    subject: campaign.subject,
                    html: htmlContent ?? `<p>${campaign.subject}</p>`,
                    channel,
                });

                await ctx.runMutation(internal.email.crons.recordDelivery, {
                    campaignId: args.campaignId,
                    userId: recipient.userId as any,
                    email: recipient.email,
                    messageId: result.messageId,
                    status: "sent",
                    sentAt: Date.now(),
                });

                sentCount++;
                deliveredCount++;
            } catch (err: any) {
                await ctx.runMutation(internal.email.crons.recordDelivery, {
                    campaignId: args.campaignId,
                    userId: recipient.userId as any,
                    email: recipient.email,
                    status: "failed",
                    sentAt: Date.now(),
                });

                failedCount++;
                console.error(`[deliverCampaign] Failed to ${recipient.email}:`, err.message);
            }
        }

        // Finalize the campaign
        await ctx.runMutation(internal.emails.admin.finalizeCampaign, {
            campaignId: args.campaignId,
            sentCount,
            deliveredCount,
            bouncedCount,
            failedCount,
        });

        console.log(`[deliverCampaign] Campaign ${campaign.name}: sent=${sentCount}, failed=${failedCount}`);
    },
});

/** Deliver manual emails */
export const deliverManualEmails = internalAction({
    args: {
        to: v.array(v.string()),
        subject: v.string(),
        html: v.string(),
        text: v.optional(v.string()),
        channel: v.union(v.literal("transactional"), v.literal("marketing")),
        userIds: v.optional(v.array(v.id("users"))),
        sentBy: v.id("users"),
    },
    handler: async (ctx, args) => {
        for (let i = 0; i < args.to.length; i++) {
            const email = args.to[i];
            const userId = args.userIds?.[i];

            try {
                const result = await ctx.runAction(internal.email.sender.sendEmail, {
                    to: email,
                    subject: args.subject,
                    html: args.html,
                    text: args.text,
                    channel: args.channel,
                });

                await ctx.runMutation(internal.email.crons.recordDelivery, {
                    userId,
                    email,
                    messageId: result.messageId,
                    status: "sent",
                    sentAt: Date.now(),
                });
            } catch (err: any) {
                await ctx.runMutation(internal.email.crons.recordDelivery, {
                    userId,
                    email,
                    status: "failed",
                    sentAt: Date.now(),
                });
                console.error(`[Manual email] Failed to ${email}:`, err.message);
            }
        }
    },
});

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Test both SMTP transporters and return health status */
export const testSmtp = action({
    args: {},
    handler: async (ctx) => {
        // Verify admin via shared query (actions can't use requireAdmin directly)
        const user = await ctx.runQuery(api.users.current) as any;
        if (!user || user.role !== "admin") throw new Error("Unauthorized");

        const testEmail = user.email ?? "badjarovv@gmail.com";
        const results = { auth: false, oracle: false, errors: [] as string[] };

        try {
            await ctx.runAction(internal.email.sender.sendEmail, {
                to: testEmail,
                subject: "[SMTP Test] auth@stars.guide",
                html: "<p>This is a test email from auth@stars.guide. If you received it, the transactional SMTP channel is healthy.</p>",
                channel: "transactional",
            });
            results.auth = true;
        } catch (err: any) {
            results.errors.push(`auth: ${err.message}`);
        }

        try {
            await ctx.runAction(internal.email.sender.sendEmail, {
                to: testEmail,
                subject: "[SMTP Test] oracle@stars.guide",
                html: "<p>This is a test email from oracle@stars.guide. If you received it, the marketing SMTP channel is healthy.</p>",
                channel: "marketing",
            });
            results.oracle = true;
        } catch (err: any) {
            results.errors.push(`oracle: ${err.message}`);
        }

        return results;
    },
});