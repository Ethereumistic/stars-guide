"use node";
/**
 * unsubscribeActions.ts — Node.js actions for unsubscribe token operations.
 *
 * Uses "use node" because HMAC-SHA256 requires Node.js crypto module.
 * Must NOT be imported from a non-"use node" file — call via ctx.runAction().
 *
 * The oneClickUnsubscribe action is public (called from the frontend /unsubscribe page).
 * The generateUnsubToken action is internal (called from cron jobs and template renderer).
 */
import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import * as crypto from "crypto";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
    return process.env.UNSUB_SECRET ?? "stars-guide-unsub-secret-dev-fallback";
}

function toBase64Url(buf: Buffer): string {
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): string {
    let padded = str.replace(/-/g, "+").replace(/_/g, "/");
    while (padded.length % 4) padded += "=";
    return padded;
}

// ─── Public Action: One-Click Unsubscribe ──────────────────────────────────
// Called from the frontend /unsubscribe page. Delegates to the internal action.
// We expose this as a public action so the frontend can call it via useAction().

export const verifyAndUnsubscribe = action({
    args: {
        token: v.string(),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<any> => {
        const result: any = await ctx.runAction(internal.email.unsubscribeActions.oneClickUnsubscribeAction, {
            token: args.token,
            reason: args.reason,
        });
        return result;
    },
});

// ─── Internal Action: One-Click Unsubscribe ────────────────────────────────
// Verifies HMAC token and marks user unsubscribed across all three tables.
// No authentication required — the token IS the auth (CAN-SPAM compliant).

export const oneClickUnsubscribeAction = internalAction({
    args: {
        token: v.string(),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // ── Decode and verify the token ────────────────────────────────────
        let decoded: string;
        try {
            decoded = Buffer.from(fromBase64Url(args.token), "base64").toString("utf-8");
        } catch {
            throw new Error("Invalid token: unable to decode");
        }

        const parts = decoded.split("|");
        if (parts.length !== 4) {
            throw new Error("Invalid token: wrong number of segments");
        }

        const [email, type, timestampStr, hmac] = parts;
        const timestamp = Number(timestampStr);

        // ── Check expiry ────────────────────────────────────────────────────
        if (Number.isNaN(timestamp) || Date.now() - timestamp > TOKEN_EXPIRY_MS) {
            throw new Error("Token expired");
        }

        // ── Verify HMAC ────────────────────────────────────────────────────
        const message = `${email}|${type}|${timestampStr}`;
        const expectedHmac = crypto
            .createHmac("sha256", getSecret())
            .update(message)
            .digest("hex");

        if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
            throw new Error("Invalid token: HMAC verification failed");
        }

        // ── Mark unsubscribed across all three tables ──────────────────────

        // 1. users.emailStatus
        const user: any = await ctx.runQuery(internal.email.unsubscribe.findUserByEmail, {
            email,
        });

        if (user) {
            await ctx.runMutation(internal.email.unsubscribe.markUserUnsubscribed, {
                userId: user._id,
            });
        }

        // 2. emailPreferences
        if (user) {
            await ctx.runMutation(internal.email.unsubscribe.setEmailPreferencesUnsubscribed, {
                userId: user._id,
                reason: args.reason ?? `one_click:${type}`,
            });
        }

        // 3. emailLeads
        const lead: any = await ctx.runQuery(internal.email.unsubscribe.findLeadByEmail, {
            email,
        });

        if (lead) {
            await ctx.runMutation(internal.email.unsubscribe.markLeadUnsubscribed, {
                leadId: lead._id,
            });
        }

        return {
            success: true,
            email,
            type,
            userUnsubscribed: !!user,
            leadUnsubscribed: !!lead,
        };
    },
});

// ─── Action: Generate Unsubscribe Token ──────────────────────────────────────
// Generates an HMAC-signed token for embedding in email links.
// Token = base64url(`${email}|${type}|${timestamp}|${hmac}`)

export const generateUnsubToken = internalAction({
    args: {
        email: v.string(),
        type: v.string(),
    },
    handler: async (_ctx, args) => {
        const timestamp = Date.now();
        const message = `${args.email}|${args.type}|${timestamp}`;

        const hmac = crypto
            .createHmac("sha256", getSecret())
            .update(message)
            .digest("hex");

        const token = `${args.email}|${args.type}|${timestamp}|${hmac}`;
        return toBase64Url(Buffer.from(token, "utf-8"));
    },
});