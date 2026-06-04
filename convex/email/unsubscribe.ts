/**
 * unsubscribe.ts — Unsubscribe queries and mutations (non-Node runtime).
 *
 * The HMAC token logic lives in unsubscribeActions.ts (use node)
 * because it requires the Node.js crypto module. This file contains
 * the DB-facing queries and mutations that run in the default Convex runtime.
 */
import { query, mutation, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Public Query: Get my email preferences ────────────────────────────────

/**
 * Returns the authenticated user's email preferences and emailStatus.
 * If no emailPreferences row exists yet, returns defaults.
 */
export const getMyEmailPreferences = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db.get(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const prefs = await ctx.db
            .query("emailPreferences")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        return {
            emailStatus: (user as any).emailStatus ?? "active",
            preferences: prefs
                ? {
                      _id: prefs._id,
                      subscribed: prefs.subscribed,
                      frequency: prefs.frequency,
                      types: prefs.types,
                      disabledTypes: prefs.disabledTypes ?? [],
                      unsubscribedAt: prefs.unsubscribedAt,
                      unsubscribeReason: prefs.unsubscribeReason,
                  }
                : {
                      subscribed: true,
                      frequency: "daily" as const,
                      types: [
                          "welcome",
                          "daily_horoscope",
                          "weekly_cosmic",
                          "monthly_roundup",
                          "reengagement",
                      ],
                      disabledTypes: [],
                      unsubscribedAt: undefined,
                      unsubscribeReason: undefined,
                  },
        };
    },
});

// ─── Public Mutation: Update my email preferences ──────────────────────────

/**
 * Authenticated mutation to update email preferences.
 * - When unsubscribing (subscribed=false), sets users.emailStatus = "unsubscribed"
 * - When resubscribing (subscribed=true), sets users.emailStatus = "active"
 * - Upserts the emailPreferences row
 */
export const updateMyEmailPreferences = mutation({
    args: {
        subscribed: v.optional(v.boolean()),
        frequency: v.optional(
            v.union(
                v.literal("daily"),
                v.literal("weekly"),
                v.literal("monthly"),
                v.literal("none"),
            ),
        ),
        disabledTypes: v.optional(
            v.array(
                v.union(
                    v.literal("welcome"),
                    v.literal("daily_horoscope"),
                    v.literal("weekly_cosmic"),
                    v.literal("monthly_roundup"),
                    v.literal("reengagement"),
                    v.literal("admin_broadcast"),
                ),
            ),
        ),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db.get(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const existing = await ctx.db
            .query("emailPreferences")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        const now = Date.now();

        // Determine new subscription state
        const subscribed = args.subscribed ?? existing?.subscribed ?? true;

        // If explicitly unsubscribing, force frequency to "none"
        const frequency = !subscribed
            ? "none"
            : args.frequency ?? existing?.frequency ?? "daily";

        // ── Update users.emailStatus based on subscription state ──────────
        if (args.subscribed === false) {
            await ctx.db.patch(userId, {
                emailStatus: "unsubscribed",
            });
        } else if (args.subscribed === true) {
            await ctx.db.patch(userId, {
                emailStatus: "active",
            });
        }

        // ── Upsert emailPreferences ───────────────────────────────────────
        if (existing) {
            await ctx.db.patch(existing._id, {
                ...(args.subscribed !== undefined && { subscribed }),
                ...(args.frequency !== undefined && { frequency }),
                ...(args.disabledTypes !== undefined && { disabledTypes: args.disabledTypes }),
                ...(args.subscribed === false && {
                    unsubscribedAt: now,
                }),
                ...(args.subscribed === true && {
                    unsubscribedAt: undefined as any,
                    unsubscribeReason: undefined as any,
                }),
                updatedAt: now,
            });
        } else {
            await ctx.db.insert("emailPreferences", {
                userId,
                subscribed,
                frequency,
                types: [
                    "welcome",
                    "daily_horoscope",
                    "weekly_cosmic",
                    "monthly_roundup",
                    "reengagement",
                ],
                ...(args.subscribed === false && { unsubscribedAt: now }),
                ...(args.disabledTypes && { disabledTypes: args.disabledTypes }),
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

// ─── Public Mutation: Resubscribe toggle ────────────────────────────────────

/**
 * Authenticated mutation to toggle subscription on/off.
 * Convenience wrapper — sets subscribed = true/false and corresponding emailStatus.
 */
export const resubscribe = mutation({
    args: {
        subscribe: v.boolean(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db.get(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const now = Date.now();

        // ── Update users.emailStatus ───────────────────────────────────────
        await ctx.db.patch(userId, {
            emailStatus: args.subscribe ? "active" : "unsubscribed",
        });

        // ── Upsert emailPreferences ─────────────────────────────────────────
        const existing = await ctx.db
            .query("emailPreferences")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                subscribed: args.subscribe,
                frequency: args.subscribe
                    ? existing.frequency === "none" ? "daily" : existing.frequency
                    : "none",
                ...(args.subscribe
                    ? {
                          unsubscribedAt: undefined as any,
                          unsubscribeReason: undefined as any,
                      }
                    : {
                          unsubscribedAt: now,
                      }),
                updatedAt: now,
            });
        } else {
            await ctx.db.insert("emailPreferences", {
                userId,
                subscribed: args.subscribe,
                frequency: args.subscribe ? "daily" : "none",
                types: [
                    "welcome",
                    "daily_horoscope",
                    "weekly_cosmic",
                    "monthly_roundup",
                    "reengagement",
                ],
                ...(args.subscribe ? {} : { unsubscribedAt: now }),
                createdAt: now,
                updatedAt: now,
            });
        }

        return { success: true, subscribed: args.subscribe };
    },
});

// ─── Internal Query: Find user by email ────────────────────────────────────

export const findUserByEmail = internalQuery({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();
    },
});

// ─── Internal Query: Find lead by email ────────────────────────────────────

export const findLeadByEmail = internalQuery({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("emailLeads")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();
    },
});

// ─── Internal Mutation: Mark user unsubscribed ──────────────────────────────

export const markUserUnsubscribed = internalMutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            emailStatus: "unsubscribed",
        });
    },
});

// ─── Internal Mutation: Mark lead unsubscribed ─────────────────────────────

export const markLeadUnsubscribed = internalMutation({
    args: { leadId: v.id("emailLeads") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.leadId, {
            status: "unsubscribed",
            unsubscribedAt: Date.now(),
        });
    },
});

// ─── Internal Mutation: Set email preferences to unsubscribed ──────────────

export const setEmailPreferencesUnsubscribed = internalMutation({
    args: {
        userId: v.id("users"),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("emailPreferences")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                subscribed: false,
                frequency: "none",
                unsubscribedAt: now,
                ...(args.reason ? { unsubscribeReason: args.reason } : {}),
                updatedAt: now,
            });
        } else {
            await ctx.db.insert("emailPreferences", {
                userId: args.userId,
                subscribed: false,
                frequency: "none",
                types: [
                    "welcome",
                    "daily_horoscope",
                    "weekly_cosmic",
                    "monthly_roundup",
                    "reengagement",
                ],
                unsubscribedAt: now,
                ...(args.reason ? { unsubscribeReason: args.reason } : {}),
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});