/**
 * webhooks.ts — Email webhook handlers & helpers.
 *
 * Resend webhooks have been removed (we use MailCow SMTP now).
 * MailCow doesn't provide real-time webhooks, so delivery tracking
 * (opened, clicked, bounced) is handled by:
 *   1. The `status: "sent"` we record when the SMTP send succeeds.
 *   2. Future: IMAP-based bounce parsing or MailCow log polling.
 *
 * This file keeps the unsubscribe-by-email mutation (used by email
 * link clicks) and the validateEmail helper.
 *
 * NOTE: The primary unsubscribe flow is now handled by
 * convex/email/unsubscribe.ts (HMAC token-based). The mutation here
 * is a fallback for legacy `?email=` links and for programmatic use.
 */
import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// ─── Validate email address format ─────────────────────────────────────────

export const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ─── Unsubscribe by email (legacy / fallback) ──────────────────────────────
// For the primary flow, use email.unsubscribe.oneClickUnsubscribeAction
// with an HMAC token. This mutation is kept as a fallback for programmatic
// unsubscribes (e.g., from admin actions or bounce processing).

export const unsubscribeByEmail = internalMutation({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        // 1. Update email lead
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

        // 2. Update user emailStatus
        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q: any) => q.eq("email", args.email))
            .first();

        if (user && (user as any).emailStatus !== "unsubscribed") {
            await ctx.db.patch(user._id, {
                emailStatus: "unsubscribed",
            });
        }

        // 3. Update email preferences
        if (user) {
            const prefs = await ctx.db
                .query("emailPreferences")
                .withIndex("by_userId", (q) => q.eq("userId", user._id))
                .first();

            if (prefs) {
                await ctx.db.patch(prefs._id, {
                    subscribed: false,
                    frequency: "none",
                    unsubscribedAt: Date.now(),
                    updatedAt: Date.now(),
                });
            } else {
                await ctx.db.insert("emailPreferences", {
                    userId: user._id,
                    subscribed: false,
                    frequency: "none",
                    types: ["welcome", "daily_horoscope", "weekly_cosmic", "monthly_roundup", "reengagement"],
                    unsubscribedAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            }
        }
    },
});