"use node";
/**
 * lib.ts — SMTP transport via MailCow (Node.js runtime).
 *
 * This file MUST have "use node" because nodemailer requires Node.js builtins
 * (net, stream, crypto). It should ONLY be imported from other "use node" files.
 *
 * Two sender identities:
 *   auth@stars.guide   — transactional (welcome, verification, password reset)
 *   oracle@stars.guide — marketing    (horoscopes, cosmic weather, re-engagement)
 *
 * Required Convex environment variables:
 *   SMTP_HOST        — e.g. email.echoray.io
 *   SMTP_PORT        — 587 (STARTTLS) or 465 (TLS)
 *   SMTP_USER_AUTH   — auth@stars.guide
 *   SMTP_PASS_AUTH   — app password for auth mailbox
 *   SMTP_USER_ORACLE — oracle@stars.guide
 *   SMTP_PASS_ORACLE — app password for oracle mailbox
 */
import nodemailer from "nodemailer";

// ─── Environment ──────────────────────────────────────────────────────────────

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? "587");

const SMTP_USER_AUTH = process.env.SMTP_USER_AUTH ?? "";
const SMTP_PASS_AUTH = process.env.SMTP_PASS_AUTH ?? "";

const SMTP_USER_ORACLE = process.env.SMTP_USER_ORACLE ?? "";
const SMTP_PASS_ORACLE = process.env.SMTP_PASS_ORACLE ?? "";

// ─── Sender Addresses ─────────────────────────────────────────────────────────

export const FROM_AUTH = "stars.guide <auth@stars.guide>";
export const FROM_ORACLE = "stars.guide Oracle <oracle@stars.guide>";

// ─── Transporters (lazy, pooled) ──────────────────────────────────────────────

let _authTransporter: nodemailer.Transporter | null = null;
let _oracleTransporter: nodemailer.Transporter | null = null;

function createTransporter(user: string, pass: string): nodemailer.Transporter {
    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465, // true for port 465, false for STARTTLS (587)
        auth: { user, pass },
        pool: true,        // reuse connections
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 14,     // ~14 msgs/sec — stays well under MailCow defaults
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 30_000,
    });
}

/**
 * Get the transactional-email transporter (auth@stars.guide).
 * Lazily created on first call, then pooled.
 */
export function getAuthTransporter(): nodemailer.Transporter {
    if (!_authTransporter) {
        if (!SMTP_HOST || !SMTP_USER_AUTH || !SMTP_PASS_AUTH) {
            throw new Error(
                "SMTP not configured. Set SMTP_HOST, SMTP_USER_AUTH, SMTP_PASS_AUTH env vars.",
            );
        }
        _authTransporter = createTransporter(SMTP_USER_AUTH, SMTP_PASS_AUTH);
    }
    return _authTransporter;
}

/**
 * Get the marketing-email transporter (oracle@stars.guide).
 * Lazily created on first call, then pooled.
 */
export function getOracleTransporter(): nodemailer.Transporter {
    if (!_oracleTransporter) {
        if (!SMTP_HOST || !SMTP_USER_ORACLE || !SMTP_PASS_ORACLE) {
            throw new Error(
                "SMTP not configured. Set SMTP_HOST, SMTP_USER_ORACLE, SMTP_PASS_ORACLE env vars.",
            );
        }
        _oracleTransporter = createTransporter(SMTP_USER_ORACLE, SMTP_PASS_ORACLE);
    }
    return _oracleTransporter;
}
