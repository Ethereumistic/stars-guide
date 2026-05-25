/**
 * resend.ts — Resend API client for email delivery.
 * All email sending goes through this module.
 */
import { resend, FROM_EMAIL } from "./lib";

export type EmailStatus =
    | "queued"
    | "sent"
    | "delivered"
    | "opened"
    | "clicked"
    | "bounced"
    | "complained"
    | "unsubscribed";

export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    resendMessageId?: string;
    campaignId?: string;
    leadId?: string;
    userId?: string;
    email?: string;
}

/**
 * Send a single email via Resend.
 * Returns the Resend message ID for tracking.
 */
export async function sendEmail(options: SendEmailOptions) {
    const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
    });

    if (result.error) {
        throw new Error(`Resend error: ${result.error.message}`);
    }

    return result.data;
}