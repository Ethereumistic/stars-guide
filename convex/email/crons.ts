/**
 * crons.ts — Email sending cron job actions.
 *
 * Pattern: internalQuery/internalMutation for DB access, called from internalAction
 * via ctx.runQuery/ctx.runMutation using `internal.email.crons.<fn>` references.
 *
 * The actual SMTP send crosses into the Node.js runtime via:
 *   ctx.runAction(internal.email.sender.sendEmail, { ... })
 *
 * Registered as Convex cron jobs via convex/crons.ts.
 */
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { render } from "@react-email/render";
import React from "react";
import { WelcomeEmail } from "../../emails/WelcomeEmail";
import { DailyHoroscopeEmail } from "../../emails/DailyHoroscopeEmail";
import { WeeklyCosmicEmail } from "../../emails/WeeklyCosmicEmail";
import { ReengagementEmail } from "../../emails/ReengagementEmail";

const { internal } = require("../_generated/api") as any;

// ─── Internal Queries ─────────────────────────────────────────────────────────

/** Get all users with email who have a given frequency preference */
export const getUsersByFrequency = internalQuery({
    args: { frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")) },
    handler: async (ctx, args) => {
        const prefs = await ctx.db
            .query("emailPreferences")
            .filter((q) =>
                q.and(
                    q.eq(q.field("subscribed"), true),
                    q.eq(q.field("frequency"), args.frequency)
                )
            )
            .collect();

        const userIds = new Set(prefs.map((p) => p.userId));

        const users = await ctx.db
            .query("users")
            .filter((q) => q.neq(q.field("email"), undefined))
            .collect();

        return users.filter((u) => u.email && userIds.has(u._id));
    },
});

/** Get all active email leads */
export const getActiveLeads = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("emailLeads")
            .filter((q) => q.eq(q.field("status"), "active"))
            .collect();
    },
});

/** Get recent email delivery for a user (deduplication check) */
export const getRecentDeliveryForUser = internalQuery({
    args: {
        userId: v.id("users"),
        sinceMs: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("emailDeliveries")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.gte(q.field("sentAt"), args.sinceMs))
            .first();
    },
});

/** Get email preferences for a specific user */
export const getEmailPrefsForUser = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("emailPreferences")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();
    },
});

/** Get daily horoscope for sign + date */
export const getHoroscopeForSignDate = internalQuery({
    args: { sign: v.string(), date: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("daily_horoscopes")
            .filter((q) =>
                q.and(
                    q.eq(q.field("sign"), args.sign),
                    q.eq(q.field("date"), args.date)
                )
            )
            .first();
    },
});

/** Get latest cosmic weather entry */
export const getLatestCosmicWeather = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("cosmicWeather").order("desc").first();
    },
});

/** Get all users (for re-engagement) */
export const getAllUsersWithEmail = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("users")
            .filter((q) => q.neq(q.field("email"), undefined))
            .collect();
    },
});

/** Get email delivery count for a lead */
export const getDeliveryCountForLead = internalQuery({
    args: { leadId: v.id("emailLeads") },
    handler: async (ctx, args) => {
        const deliveries = await ctx.db
            .query("emailDeliveries")
            .filter((q) => q.eq(q.field("leadId"), args.leadId))
            .collect();
        return deliveries.length;
    },
});

/** Get all email segments */
export const getAllSegments = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("emailSegments").collect();
    },
});

/** Get users by subscription tier */
export const getUsersByTier = internalQuery({
    args: { tier: v.union(v.literal("free"), v.literal("popular"), v.literal("premium")) },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("tier"), args.tier))
            .collect();
    },
});

// ─── Internal Mutations ───────────────────────────────────────────────────────

/** Record an email delivery in emailDeliveries table */
export const recordDelivery = internalMutation({
    args: {
        campaignId: v.optional(v.id("emailCampaigns")),
        leadId: v.optional(v.id("emailLeads")),
        userId: v.optional(v.id("users")),
        email: v.string(),
        messageId: v.optional(v.string()),
        status: v.union(v.literal("sent"), v.literal("queued"), v.literal("bounced"), v.literal("complained"), v.literal("failed")),
        sentAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("emailDeliveries", {
            campaignId: args.campaignId,
            leadId: args.leadId,
            userId: args.userId,
            email: args.email,
            messageId: args.messageId,
            status: args.status,
            sentAt: args.sentAt,
        });
    },
});

/** Update email segment count */
export const updateSegmentCount = internalMutation({
    args: { segmentId: v.id("emailSegments"), count: v.number() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.segmentId, {
            count: args.count,
            updatedAt: Date.now(),
        });
    },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSunSign(placements: { body: string; sign: string }[]): string {
    return placements.find((p) => p.body === "Sun")?.sign ?? "Aries";
}

/**
 * Helper: send email via the Node.js runtime action.
 * Wraps ctx.runAction(internal.email.sender.sendEmail, ...) with error handling.
 * Returns the messageId or undefined on failure.
 */
async function sendViaSmtp(
    ctx: any,
    opts: { to: string; subject: string; html: string; channel: "transactional" | "marketing" },
): Promise<string | undefined> {
    try {
        const result = await ctx.runAction(internal.email.sender.sendEmail, {
            to: opts.to,
            subject: opts.subject,
            html: opts.html,
            channel: opts.channel,
        });
        return result.messageId;
    } catch (err) {
        console.error(`[SMTP] Failed to send to ${opts.to}:`, err);
        return undefined;
    }
}

// ─── Cron Actions ─────────────────────────────────────────────────────────────

// ── Daily Horoscope Emails (06:00 UTC) ────────────────────────────────────────

export const sendDailyHoroscopeEmails = internalAction({
    args: {},
    handler: async (ctx) => {
        const today = new Date().toISOString().split("T")[0];

        const users = await ctx.runQuery(
            internal.email.crons.getUsersByFrequency,
            { frequency: "daily" },
        );

        console.log(`[sendDailyHoroscopeEmails] Processing ${users.length} daily recipients for ${today}`);

        for (const user of users) {
            if (!user.email || !user.birthData?.placements) continue;

            // Respect emailStatus and engagement
            const emailStatus = (user as any).emailStatus ?? "active";
            if (emailStatus === "bounced" || emailStatus === "complained" || emailStatus === "blocked" || emailStatus === "unsubscribed") continue;
            if ((user as any).role === "banned" || (user as any).deletedAt) continue;
            if ((user as any).engagementStatus === "churned") continue;

            // Check email preferences for disabled types
            const prefs = await ctx.runQuery(internal.email.crons.getEmailPrefsForUser, {
                userId: user._id,
            });
            if (prefs?.disabledTypes?.includes("daily_horoscope")) continue;

            const sign = getSunSign(user.birthData.placements);

            const horoscope = await ctx.runQuery(
                internal.email.crons.getHoroscopeForSignDate,
                { sign, date: today },
            );

            if (!horoscope) {
                console.warn(`[sendDailyHoroscopeEmails] No horoscope for ${sign} on ${today}`);
                continue;
            }

            const unsubToken = await ctx.runAction(internal.email.unsubscribeActions.generateUnsubToken, {
                email: user.email,
                type: "daily_horoscope",
            });

            const html = await render(
                React.createElement(DailyHoroscopeEmail, {
                    sign,
                    horoscope: horoscope.content ?? "",
                    mood: (horoscope as any).mood ?? "Contemplative",
                    luckyNumber: Math.floor(Math.random() * 99) + 1,
                    element: (horoscope as any).element ?? "Fire",
                    date: today,
                    unsubToken,
                }),
            );

            const messageId = await sendViaSmtp(ctx, {
                to: user.email,
                subject: `✨ Your daily horoscope for ${sign}`,
                html,
                channel: "marketing",
            });

            await ctx.runMutation(internal.email.crons.recordDelivery, {
                userId: user._id,
                email: user.email,
                messageId: messageId,
                status: messageId ? "sent" : "failed",
                sentAt: messageId ? Date.now() : undefined,
            });
        }

        console.log(`[sendDailyHoroscopeEmails] Done — ${users.length} recipients processed`);
    },
});

// ── Welcome Series Processor (07:00 UTC) ─────────────────────────────────────

const WELCOME_SEQUENCE = [
    { days: 0, emailNum: 1 },
    { days: 2, emailNum: 2 },
    { days: 5, emailNum: 3 },
    { days: 8, emailNum: 4 },
    { days: 14, emailNum: 5 },
];

export const sendWelcomeEmails = internalAction({
    args: {},
    handler: async (ctx) => {
        const leads = await ctx.runQuery(internal.email.crons.getActiveLeads, {});

        console.log(`[sendWelcomeEmails] Processing ${leads.length} active leads`);

        for (const lead of leads) {
            if (!lead.optInAt) continue;

            const leadEmail = (lead as any).email;
            if (!leadEmail) continue;

            // Skip unsubscribed or bounced leads
            const leadStatus = (lead as any).status;
            if (leadStatus === "unsubscribed" || leadStatus === "bounced") continue;

            const daysSinceSignup = Math.floor(
                (Date.now() - lead.optInAt) / (1000 * 60 * 60 * 24),
            );

            const sequenceEntry = WELCOME_SEQUENCE.find((s) => s.days === daysSinceSignup);
            if (!sequenceEntry) continue;

            const deliveryCount = await ctx.runQuery(
                internal.email.crons.getDeliveryCountForLead,
                { leadId: lead._id },
            );

            if (deliveryCount >= sequenceEntry.emailNum) continue;

            const sign = (lead as any).sign ?? "Aries";
            const unsubToken = await ctx.runAction(internal.email.unsubscribeActions.generateUnsubToken, {
                email: leadEmail,
                type: "welcome",
            });

            const html = await render(
                React.createElement(WelcomeEmail, { sign, unsubToken }),
            );

            const messageId = await sendViaSmtp(ctx, {
                to: leadEmail,
                subject: `Welcome to stars.guide — ${sign}`,
                html,
                channel: "transactional",
            });

            if (messageId) {
                await ctx.runMutation(internal.email.crons.recordDelivery, {
                    leadId: lead._id,
                    email: leadEmail,
                    messageId: messageId,
                    status: "sent",
                    sentAt: Date.now(),
                });
            } else {
                // Record failed delivery (was missing before)
                await ctx.runMutation(internal.email.crons.recordDelivery, {
                    leadId: lead._id,
                    email: leadEmail,
                    status: "failed",
                    sentAt: Date.now(),
                });
            }
        }

        console.log(`[sendWelcomeEmails] Done`);
    },
});

// ── Weekly Cosmic Digest (Saturday 09:00 UTC) ──────────────────────────────

export const sendWeeklyCosmicEmails = internalAction({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.runQuery(
            internal.email.crons.getUsersByFrequency,
            { frequency: "weekly" },
        );

        const cosmic = await ctx.runQuery(internal.email.crons.getLatestCosmicWeather, {});

        if (!cosmic) {
            console.warn("[sendWeeklyCosmicEmails] No cosmic weather data available");
            return;
        }

        console.log(`[sendWeeklyCosmicEmails] Processing ${users.length} weekly recipients`);

        const weekOf = new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });

        const highlights = (cosmic as any).highlights ?? [
            { planet: "Sun", sign: "Aries", description: "A new cycle begins." },
            { planet: "Venus", sign: "Gemini", description: "Communication flows easily." },
        ];

        for (const user of users) {
            if (!user.email) continue;

            // Respect emailStatus and engagement
            const emailStatus = (user as any).emailStatus ?? "active";
            if (emailStatus === "bounced" || emailStatus === "complained" || emailStatus === "blocked" || emailStatus === "unsubscribed") continue;
            if ((user as any).role === "banned" || (user as any).deletedAt) continue;
            if ((user as any).engagementStatus === "churned") continue;

            // Check email preferences for disabled types
            const prefs = await ctx.runQuery(internal.email.crons.getEmailPrefsForUser, {
                userId: user._id,
            });
            if (prefs?.disabledTypes?.includes("weekly_cosmic")) continue;

            const sign = user.birthData?.placements
                ? getSunSign(user.birthData.placements)
                : "Aries";

            const unsubToken = await ctx.runAction(internal.email.unsubscribeActions.generateUnsubToken, {
                email: user.email,
                type: "weekly_cosmic",
            });

            const html = await render(
                React.createElement(WeeklyCosmicEmail, {
                    weekOf,
                    highlights,
                    overallTheme: (cosmic as any).feltLanguage ?? "The stars are aligning.",
                    recommendedFocus: `Focus on ${sign.toLowerCase()}-related areas this week.`,
                    unsubToken,
                }),
            );

            const messageId = await sendViaSmtp(ctx, {
                to: user.email,
                subject: "🌌 Your weekly cosmic weather",
                html,
                channel: "marketing",
            });

            // Record delivery
            if (messageId) {
                await ctx.runMutation(internal.email.crons.recordDelivery, {
                    userId: user._id,
                    email: user.email,
                    messageId,
                    status: "sent",
                    sentAt: Date.now(),
                });
            } else {
                await ctx.runMutation(internal.email.crons.recordDelivery, {
                    userId: user._id,
                    email: user.email,
                    status: "failed",
                    sentAt: Date.now(),
                });
            }
        }

        console.log(`[sendWeeklyCosmicEmails] Done`);
    },
});

// ── Re-engagement Emails v2 (daily 10:00 UTC) ──────────────────────────────
// Uses engagementStatus === "dormant" instead of _creationTime
// Respects emailStatus, emailPreferences, and deduplication

export const sendReengagementEmails = internalAction({
    args: {},
    handler: async (ctx) => {
        const allUsers = await ctx.runQuery(internal.email.crons.getAllUsersWithEmail, {});
        const now = Date.now();
        const sevenDaysAgoMs = now - 7 * 24 * 60 * 60 * 1000;

        // Dormant = engagementStatus === "dormant" with active email
        const dormantUsers = allUsers.filter(
            (u: any) =>
                u.email &&
                u.engagementStatus === "dormant" &&
                (u.emailStatus === "active" || !u.emailStatus) &&
                u.role !== "banned" &&
                !u.deletedAt,
        );

        console.log(`[sendReengagementEmails] Processing ${dormantUsers.length} dormant users`);

        for (const user of dormantUsers) {
            if (!user.email) continue;

            // Deduplication: skip if sent re-engagement in last 7 days
            const recentDelivery = await ctx.runQuery(internal.email.crons.getRecentDeliveryForUser, {
                userId: user._id,
                sinceMs: sevenDaysAgoMs,
            });
            if (recentDelivery) continue;

            // Check email preferences
            const prefs = await ctx.runQuery(internal.email.crons.getEmailPrefsForUser, {
                userId: user._id,
            });
            if (prefs && (!prefs.subscribed || prefs.frequency === "none")) continue;
            if (prefs?.disabledTypes?.includes("reengagement")) continue;

            const sign = user.birthData?.placements
                ? getSunSign(user.birthData.placements)
                : "Aries";

            const unsubToken = await ctx.runAction(internal.email.unsubscribeActions.generateUnsubToken, {
                email: user.email,
                type: "reengagement",
            });

            const html = await render(
                React.createElement(ReengagementEmail, {
                    sign,
                    daysAway: Math.floor(
                        (now - user._creationTime) / (1000 * 60 * 60 * 24),
                    ),
                    unsubToken,
                }),
            );

            const messageId = await sendViaSmtp(ctx, {
                to: user.email,
                subject: "✨ The stars are calling you back",
                html,
                channel: "marketing",
            });

            await ctx.runMutation(internal.email.crons.recordDelivery, {
                userId: user._id,
                email: user.email,
                messageId: messageId ?? undefined,
                status: messageId ? "sent" : "failed",
                sentAt: Date.now(),
            });
        }

        console.log(`[sendReengagementEmails] Done`);
    },
});

// ── Refresh Email Segments (daily 00:30 UTC) ─────────────────────────────────

export const refreshEmailSegments = internalAction({
    args: {},
    handler: async (ctx) => {
        const segments = await ctx.runQuery(internal.email.crons.getAllSegments, {});

        console.log(`[refreshEmailSegments] Refreshing ${segments.length} segments`);

        for (const segment of segments) {
            const criteria = (segment as any).criteria ?? {};

            // Get all users with email for counting
            const allUsersWithEmail = await ctx.runQuery(internal.email.crons.getAllUsersWithEmail, {});
            const activeUsers = allUsersWithEmail.filter((u: any) => !u.deletedAt && u.role !== "banned");

            let filtered = activeUsers;

            // Apply engagement filter (expanded to include new/churned)
            if (criteria.engagement) {
                filtered = filtered.filter((u: any) => u.engagementStatus === criteria.engagement);
            }
            // Apply email status filter (new)
            if (criteria.emailStatus) {
                filtered = filtered.filter((u: any) =>
                    (u.emailStatus ?? "active") === criteria.emailStatus
                );
            }
            // Apply tier filter
            if (criteria.tier) {
                filtered = filtered.filter((u: any) => u.tier === criteria.tier);
            }
            // Apply days inactive filter
            if (criteria.daysInactive) {
                const cutoff = Date.now() - criteria.daysInactive * 24 * 60 * 60 * 1000;
                filtered = filtered.filter((u: any) => (u.lastActiveAt ?? u._creationTime) < cutoff);
            }

            await ctx.runMutation(internal.email.crons.updateSegmentCount, {
                segmentId: segment._id,
                count: filtered.length,
            });
        }

        console.log(`[refreshEmailSegments] Done — ${segments.length} segments refreshed`);
    },
});
