/**
 * crons.ts — Email sending cron job actions.
 *
 * Pattern: internalQuery/internalMutation for DB access, called from internalAction
 * via ctx.runQuery/ctx.runMutation using `internal.email.crons.<fn>` references.
 *
 * Registered as Convex cron jobs via convex/crons.ts.
 */
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { sendEmail } from "./resend";
import { render } from "@react-email/render";
import React from "react";
import { WelcomeEmail } from "../../emails/WelcomeEmail";
import { DailyHoroscopeEmail } from "../../emails/DailyHoroscopeEmail";
import { WeeklyCosmicEmail } from "../../emails/WeeklyCosmicEmail";
import { ReengagementEmail } from "../../emails/ReengagementEmail";

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

// ─── Internal Mutations ───────────────────────────────────────────────────────

/** Record an email delivery in emailDeliveries table */
export const recordDelivery = internalMutation({
    args: {
        campaignId: v.optional(v.id("emailCampaigns")),
        leadId: v.optional(v.id("emailLeads")),
        userId: v.optional(v.id("users")),
        email: v.string(),
        resendMessageId: v.optional(v.string()),
        status: v.union(v.literal("sent"), v.literal("queued"), v.literal("bounced"), v.literal("complained")),
        sentAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("emailDeliveries", {
            campaignId: args.campaignId,
            leadId: args.leadId,
            userId: args.userId,
            email: args.email,
            resendMessageId: args.resendMessageId,
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

            const sign = getSunSign(user.birthData.placements);

            const horoscope = await ctx.runQuery(
                internal.email.crons.getHoroscopeForSignDate,
                { sign, date: today },
            );

            if (!horoscope) {
                console.warn(`[sendDailyHoroscopeEmails] No horoscope for ${sign} on ${today}`);
                continue;
            }

            const html = render(
                React.createElement(DailyHoroscopeEmail, {
                    sign,
                    horoscope: horoscope.content ?? "",
                    mood: (horoscope as any).mood ?? "Contemplative",
                    luckyNumber: Math.floor(Math.random() * 99) + 1,
                    element: (horoscope as any).element ?? "Fire",
                    date: today,
                }),
            );

            let messageId: string | undefined;
            try {
                const result = await sendEmail({
                    to: user.email,
                    subject: `✨ Your daily horoscope for ${sign}`,
                    html,
                });
                messageId = result?.id;
            } catch (err) {
                console.error(`[sendDailyHoroscopeEmails] Failed to send to ${user.email}:`, err);
            }

            await ctx.runMutation(internal.email.crons.recordDelivery, {
                userId: user._id,
                email: user.email,
                resendMessageId: messageId,
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
            const html = render(React.createElement(WelcomeEmail, { sign }));

            let messageId: string | undefined;
            try {
                const result = await sendEmail({
                    to: leadEmail,
                    subject: `Welcome to stars.guide — ${sign}`,
                    html,
                });
                messageId = result?.id;
            } catch (err) {
                console.error(`[sendWelcomeEmails] Failed to send to ${leadEmail}:`, err);
            }

            if (messageId) {
                await ctx.runMutation(internal.email.crons.recordDelivery, {
                    leadId: lead._id,
                    email: leadEmail,
                    resendMessageId: messageId,
                    status: "sent",
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

            const sign = user.birthData?.placements
                ? getSunSign(user.birthData.placements)
                : "Aries";

            const html = render(
                React.createElement(WeeklyCosmicEmail, {
                    weekOf,
                    highlights,
                    overallTheme: (cosmic as any).feltLanguage ?? "The stars are aligning.",
                    recommendedFocus: `Focus on ${sign.toLowerCase()}-related areas this week.`,
                }),
            );

            try {
                await sendEmail({
                    to: user.email,
                    subject: "🌌 Your weekly cosmic weather",
                    html,
                });
            } catch (err) {
                console.error(`[sendWeeklyCosmicEmails] Failed to send to ${user.email}:`, err);
            }
        }

        console.log(`[sendWeeklyCosmicEmails] Done`);
    },
});

// ── Re-engagement Emails (daily 10:00 UTC) ──────────────────────────────────

export const sendReengagementEmails = internalAction({
    args: {},
    handler: async (ctx) => {
        const allUsers = await ctx.runQuery(internal.email.crons.getAllUsersWithEmail, {});

        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        // Dormant = created over 7 days ago (simple proxy for inactive)
        const dormantUsers = allUsers.filter(
            (u) => u.email && u.createdAt && u.createdAt < sevenDaysAgo,
        );

        console.log(`[sendReengagementEmails] Processing ${dormantUsers.length} dormant users`);

        for (const user of dormantUsers) {
            if (!user.email) continue;

            const sign = user.birthData?.placements
                ? getSunSign(user.birthData.placements)
                : "Aries";

            const html = render(
                React.createElement(ReengagementEmail, {
                    sign,
                    daysAway: Math.floor(
                        (Date.now() - (user.createdAt ?? Date.now())) / (1000 * 60 * 60 * 24),
                    ),
                }),
            );

            try {
                await sendEmail({
                    to: user.email,
                    subject: "✨ The stars are calling you back",
                    html,
                });
            } catch (err) {
                console.error(`[sendReengagementEmails] Failed to send to ${user.email}:`, err);
            }
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

            let count = 0;

            if ((criteria as any).tier) {
                const users = await ctx.db
                    .query("users")
                    .filter((q) => q.eq(q.field("tier"), (criteria as any).tier))
                    .collect();
                count = users.length;
            } else {
                const users = await ctx.runQuery(internal.email.crons.getAllUsersWithEmail, {});
                count = users.length;
            }

            await ctx.runMutation(internal.email.crons.updateSegmentCount, {
                segmentId: segment._id,
                count,
            });
        }

        console.log(`[refreshEmailSegments] Done — ${segments.length} segments refreshed`);
    },
});