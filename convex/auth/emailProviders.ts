/**
 * emailProviders.ts — Convex Auth email providers for verification & password reset.
 *
 * Uses the `Email` helper from `@convex-dev/auth/providers/Email` to create
 * provider configs that send OTP codes via our MailCow SMTP infrastructure.
 *
 * The `sendVerificationRequest` callback receives `ctx` as its second argument
 * at runtime (the types don't reflect this yet — see `@ts-expect-error` in
 * Convex Auth's signIn.js). We use `ctx.runAction()` to call our "use node"
 * SMTP sender, crossing the runtime boundary.
 */
import { Email } from "@convex-dev/auth/providers/Email";
import { generateRandomString } from "@oslojs/crypto/random";
import { makeFunctionReference } from "convex/server";

const sendEmailRef = makeFunctionReference<"action">("email/sender:sendEmail");

// ─── Shared ───────────────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const DIGITS = "0123456789";

function generateOTP(): string {
    const random: { read: (bytes: Uint8Array) => void } = {
        read(bytes: Uint8Array) {
            crypto.getRandomValues(bytes);
        },
    };
    return generateRandomString(random, DIGITS, OTP_LENGTH);
}

function otpEmailHtml(code: string, purpose: "verification" | "reset"): string {
    const title = purpose === "verification" ? "Verify Your Email" : "Reset Your Password";
    const description =
        purpose === "verification"
            ? "Use this code to verify your email address and activate your Stars Guide account."
            : "Use this code to set a new password for your Stars Guide account.";

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a12;font-family:system-ui,-apple-system,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a12;min-height:100vh;">
        <tr>
            <td align="center" style="padding:40px 20px;">
                <table width="440" cellpadding="0" cellspacing="0" style="max-width:440px;">
                    <!-- Logo / Brand -->
                    <tr>
                        <td align="center" style="padding-bottom:32px;">
                            <h1 style="margin:0;color:#c9a87c;font-family:Georgia,serif;font-size:28px;letter-spacing:0.05em;">✦ STARS.GUIDE</h1>
                        </td>
                    </tr>
                    <!-- Card -->
                    <tr>
                        <td style="background:#13131f;border:1px solid rgba(201,168,124,0.15);border-radius:12px;padding:40px 32px;">
                            <h2 style="margin:0 0 8px;color:#e8e0d4;font-family:Georgia,serif;font-size:22px;text-align:center;">${title}</h2>
                            <p style="margin:0 0 28px;color:#8a8494;font-size:14px;text-align:center;line-height:1.6;">${description}</p>
                            <!-- OTP Code -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding:20px 0;">
                                        <div style="font-family:'Courier New',monospace;font-size:36px;letter-spacing:8px;color:#c9a87c;font-weight:700;">${code}</div>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:24px 0 0;color:#6b6578;font-size:12px;text-align:center;line-height:1.5;">
                                This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top:24px;">
                            <p style="margin:0;color:#4a4556;font-size:11px;">Stars Guide &mdash; Mapping the heavens, one soul at a time.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

// ─── Email Verification Provider ──────────────────────────────────────────────

export const verifyEmailProvider = Email({
    id: "stars-verify",
    maxAge: 60 * 15, // 15 minutes
    async generateVerificationToken() {
        return generateOTP();
    },
    async sendVerificationRequest(
        params: { identifier: string; token: string; url?: string; expires?: Date },
        // Convex Auth passes `ctx` as 2nd arg at runtime — see `@ts-expect-error` in signIn.js
        ctx?: any,
    ) {
        if (!ctx?.runAction) throw new Error("Auth email: Convex ctx not available");
        await ctx.runAction(sendEmailRef, {
            to: params.identifier,
            subject: "Verify your Stars Guide account",
            html: otpEmailHtml(params.token, "verification"),
            text: `Your verification code is: ${params.token}. It expires in 15 minutes.`,
            channel: "transactional",
        });
    },
});

// ─── Password Reset Provider ──────────────────────────────────────────────────

export const resetEmailProvider = Email({
    id: "stars-reset",
    maxAge: 60 * 15, // 15 minutes
    async generateVerificationToken() {
        return generateOTP();
    },
    async sendVerificationRequest(
        params: { identifier: string; token: string; url?: string; expires?: Date },
        // Convex Auth passes `ctx` as 2nd arg at runtime — see `@ts-expect-error` in signIn.js
        ctx?: any,
    ) {
        if (!ctx?.runAction) throw new Error("Auth email: Convex ctx not available");
        await ctx.runAction(sendEmailRef, {
            to: params.identifier,
            subject: "Reset your Stars Guide password",
            html: otpEmailHtml(params.token, "reset"),
            text: `Your password reset code is: ${params.token}. It expires in 15 minutes.`,
            channel: "transactional",
        });
    },
});
