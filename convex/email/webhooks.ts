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
 */
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// ─── Validate email address format ─────────────────────────────────────────

export const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ─── Unsubscribe by email (from email link click) ───────────────────────────

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
