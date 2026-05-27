"use node";
/**
 * sender.ts — Email sending via MailCow SMTP (Node.js runtime).
 *
 * Exports an internalAction that sends one email via SMTP.
 * Other Convex functions call this via ctx.runAction() — the standard
 * pattern for crossing from the default Convex runtime into Node.js.
 *
 * MUST NOT be imported from a non-"use node" file.
 */
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import {
    getAuthTransporter,
    getOracleTransporter,
    FROM_AUTH,
    FROM_ORACLE,
} from "./lib";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailChannel = "transactional" | "marketing";

// ─── Action ───────────────────────────────────────────────────────────────────

/**
 * Send a single email via MailCow SMTP.
 *
 * Call from other actions:
 *   const result = await ctx.runAction(internal.email.sender.sendEmail, {
 *     to: "user@example.com",
 *     subject: "Welcome!",
 *     html: "<h1>Hello</h1>",
 *     channel: "transactional",
 *   });
 *
 * Returns { messageId } or throws on SMTP failure.
 */
export const sendEmail = internalAction({
    args: {
        to: v.string(),
        subject: v.string(),
        html: v.string(),
        text: v.optional(v.string()),
        /** Which sender identity to use. Defaults to "transactional". */
        channel: v.optional(v.union(v.literal("transactional"), v.literal("marketing"))),
        /** Custom From header. Overrides the default for the channel. */
        from: v.optional(v.string()),
    },
    returns: v.object({
        messageId: v.string(),
    }),
    handler: async (_ctx, args) => {
        const channel: EmailChannel = args.channel ?? "transactional";

        const transporter =
            channel === "marketing"
                ? getOracleTransporter()
                : getAuthTransporter();

        const from = args.from ?? (channel === "marketing" ? FROM_ORACLE : FROM_AUTH);

        const result: any = await transporter.sendMail({
            from,
            to: args.to,
            subject: args.subject,
            html: args.html,
            text: args.text,
        });

        return {
            messageId: result.messageId as string,
        };
    },
});
