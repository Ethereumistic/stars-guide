import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { isReservedUsername } from "../src/lib/reserved-usernames";
import { requireAdmin } from "./lib/adminGuard";

// ═══════════════════════════════════════════════════════════════════════════════
// USERNAME VALIDATION PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════
//
// Raw Input
//      │
//      ▼
//  ① Normalize       ── lowercase, strip spaces/specials
//      │
//      ▼
//  ② Format Check    ── invalid chars / length? ──► REJECT (invalid_format)
//      │
//      ▼
//  ③ Route Conflict   ── hardcoded reserved list ──► REJECT (reserved)
//      │
//      ▼
//  ④ Pattern Check    ── DB regex patterns ──► REJECT (banned)
//      │
//      ▼
//  ⑤ [extensible: similarity / Levenshtein — future slot]
//      │
//      ▼
//  ⑥ Uniqueness      ── existing user? ──► REJECT (taken)
//      │
//      ▼
//     ✅ AVAILABLE

export type UsernameCheckResult = {
    available: boolean;
    /** Machine-readable reason — null when available */
    reason: null | "invalid_format" | "reserved" | "banned" | "taken";
    /** Human-readable message for the UI */
    message: string | null;
};

/**
 * Normalize a raw username input: lowercase, strip spaces & illegal chars.
 */
function normalize(raw: string): string {
    return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

// ─── Pipeline steps ──────────────────────────────────────────────────────────

function checkFormat(username: string): UsernameCheckResult | null {
    if (username.length === 0 || username.length > 15) {
        return {
            available: false,
            reason: "invalid_format",
            message: "Use 1-15 letters, numbers, and underscores.",
        };
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
        return {
            available: false,
            reason: "invalid_format",
            message: "Use 1-15 letters, numbers, and underscores.",
        };
    }
    return null;
}

function checkReserved(username: string): UsernameCheckResult | null {
    if (isReservedUsername(username)) {
        return {
            available: false,
            reason: "reserved",
            message: "This username is reserved.",
        };
    }
    return null;
}

function checkPatterns(
    username: string,
    patterns: { pattern: string }[]
): UsernameCheckResult | null {
    for (const p of patterns) {
        try {
            const regex = new RegExp(p.pattern, "i");
            if (regex.test(username)) {
                return {
                    available: false,
                    reason: "banned",
                    message: "This username contains prohibited content.",
                };
            }
        } catch {
            // Bad regex — skip it, never block registration on a broken pattern
            continue;
        }
    }
    return null;
}

/**
 * Run the full validation pipeline.
 * Shared by both `checkUsernameAvailability` and `updateUsername`.
 */
export async function validateUsername(
    ctx: any,
    rawUsername: string,
    existingUserId: any | null
): Promise<UsernameCheckResult> {
    const normalized = normalize(rawUsername);

    // ② Format
    const formatResult = checkFormat(normalized);
    if (formatResult) return formatResult;

    // ③ Route conflicts
    const reservedResult = checkReserved(normalized);
    if (reservedResult) return reservedResult;

    // ④ DB pattern check (all patterns block — no severity toggle)
    const patterns = await ctx.db.query("bannedPatterns").collect();
    const patternResult = checkPatterns(normalized, patterns);
    if (patternResult) return patternResult;

    // ⑤ [future: similarity check — Levenshtein, etc.]

    // ⑥ Uniqueness
    const existing = await ctx.db
        .query("users")
        .withIndex("by_username", (q: any) => q.eq("username", normalized))
        .first();

    if (existing && (!existingUserId || existing._id !== existingUserId)) {
        return {
            available: false,
            reason: "taken",
            message: "This username is already taken.",
        };
    }

    return { available: true, reason: null, message: null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const checkUsernameAvailability = mutation({
    args: { username: v.string() },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return { available: false, reason: "invalid_format" as const, message: "Sign in required." };
        }

        // Rate limiting
        const MAX_CHECKS = 10;
        const WINDOW_MS = 5 * 60 * 1000;
        const now = Date.now();

        const limit = await ctx.db
            .query("rateLimits")
            .withIndex("by_userId_action", (q) =>
                q.eq("userId", userId).eq("action", "check_username")
            )
            .first();

        if (limit) {
            if (now > limit.resetAt) {
                await ctx.db.patch(limit._id, { count: 1, resetAt: now + WINDOW_MS });
            } else if (limit.count >= MAX_CHECKS) {
                throw new Error("RATE_LIMITED");
            } else {
                await ctx.db.patch(limit._id, { count: limit.count + 1 });
            }
        } else {
            await ctx.db.insert("rateLimits", {
                userId,
                action: "check_username",
                count: 1,
                resetAt: now + WINDOW_MS,
            });
        }

        const result = await validateUsername(ctx, args.username, userId);
        return result;
    },
});

export const updateUsername = mutation({
    args: { username: v.string() },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        // Cooldown check
        const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
        if (user.lastUsernameChangeAt && Date.now() - user.lastUsernameChangeAt < COOLDOWN_MS) {
            throw new Error("You can only change your username once every 30 days.");
        }

        // Shared pipeline
        const result = await validateUsername(ctx, args.username, userId);
        if (!result.available) {
            throw new Error(result.message || "Username not available.");
        }

        const normalized = normalize(args.username);
        await ctx.db.patch(userId, {
            username: normalized,
            lastUsernameChangeAt: Date.now(),
        });

        return { success: true, username: normalized };
    },
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: PATTERN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const addBannedPattern = mutation({
    args: {
        pattern: v.string(),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { userId: adminId } = await requireAdmin(ctx);

        // Validate it's a compilable regex
        try {
            new RegExp(args.pattern, "i");
        } catch {
            throw new Error("Invalid regex pattern.");
        }

        const now = Date.now();
        await ctx.db.insert("bannedPatterns", {
            pattern: args.pattern,
            description: args.description,
            createdBy: adminId,
            createdAt: now,
            updatedAt: now,
        });

        return { success: true };
    },
});

export const removeBannedPattern = mutation({
    args: { patternId: v.id("bannedPatterns") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        await ctx.db.delete(args.patternId);
        return { success: true };
    },
});

export const listBannedPatterns = query({
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await ctx.db.query("bannedPatterns").collect();
    },
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEED: Initial banned patterns
//
// KEY DESIGN DECISION: Patterns use broad character classes that include BOTH
// the real letter AND the leet-speak replacement.  For example:
//
//   n[i1]gg[e3a@4]r?   ← catches "nigger" (e), "n1gger" (1), "nigga" (a), etc.
//
// We do NOT use \b word boundaries because usernames are short and often
// composed with numbers/underscores appended (e.g. "nigger_123").  The whole
// username IS the word — substring matching is correct.
// ═══════════════════════════════════════════════════════════════════════════════

export const seedBannedPatterns = mutation({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);

        const existing = await ctx.db.query("bannedPatterns").collect();
        if (existing.length > 0) {
            return { seeded: false, reason: "Patterns already exist" };
        }

        const now = Date.now();
        const adminUser = await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", "admin"))
            .first();
        const creatorId = adminUser?._id ?? (await ctx.db.query("users").first())?._id;
        if (!creatorId) {
            return { seeded: false, reason: "No admin user found" };
        }

                // + quantifiers catch repeated-letter bypasses (e.g. "niiigger", "fuuck").
        // Character classes include BOTH the real letter AND leet replacements.
        // No \b word boundaries - usernames ARE the word, substring matching is correct.
                // + quantifiers catch repeated-letter bypasses (e.g. "niiigger", "fuuck").
        // Character classes include BOTH the real letter AND leet replacements.
        // No \b word boundaries - usernames ARE the word, substring matching is correct.
        const patterns: Array<{ pattern: string; description: string }> = [
            // -- Racial slurs --
            { pattern: "n[i1]+gg[e3a@4]+r?",   description: "N-word" },
            { pattern: "n[i1]+gg",              description: "N-word short" },
            { pattern: "k[i1]+k[e3]+s?",      description: "K-word" },
            { pattern: "sp[i1]+cs?",            description: "Spic" },
            { pattern: "ch[i1]+nks?",           description: "Chink" },
            { pattern: "g[o0]+ks?",             description: "Gook" },
            { pattern: "w[e3]+tb[a@4]+cks?",   description: "Wetback" },
            { pattern: "j[a@4]+ps?",            description: "Jap" },

            // -- Hateful / identity-based --
            { pattern: "f[a@4]+gg[o0]+ts?",    description: "F-word" },
            { pattern: "f[a@4]+gs?",            description: "F-word short" },
            { pattern: "tr[a@4]+nn[i1y]?s?",   description: "Anti-trans slur" },
            { pattern: "n[a@4]+z[i1]+s?",      description: "Nazi" },
            { pattern: "kkk",                   description: "Ku Klux Klan" },
            { pattern: "h[i1]+tl[e3]+r",        description: "Hitler" },

            // -- Violent --
            { pattern: "r[a@4]+p[e3]+s?",      description: "Rape" },
            { pattern: "murd[e3]+r",            description: "Murder" },
            { pattern: "p[e3]+d[o0]+s?",       description: "Pedophile" },
            { pattern: "t[e3]+rr[o0]+r[i1]+st", description: "Terrorist" },

            // -- Sexual explicit --
            { pattern: "c[u@]+nts?",            description: "C-word" },
            { pattern: "p[o0]+rn",              description: "Porn" },

            // -- Profanity --
            { pattern: "f[u@4]+ck",            description: "F-word" },
            { pattern: "sh[i1]+ts?",            description: "Shit" },
            { pattern: "a[s$]+h[o0]+l[e3]+",   description: "Asshole" },
            { pattern: "b[i1]+tch",             description: "Bitch" },
        ];

        for (const p of patterns) {
            await ctx.db.insert("bannedPatterns", {
                pattern: p.pattern,
                description: p.description,
                createdBy: creatorId,
                createdAt: now,
                updatedAt: now,
            });
        }

        return { seeded: true, count: patterns.length };
    },
});