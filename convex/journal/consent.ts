/**
 * consent.ts — Oracle journal consent management.
 *
 * Phase 4: Consent flow for Oracle to read journal entries.
 */
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { CONSENT_VERSION } from "../../src/lib/journal/constants";

export const getConsent = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        return await ctx.db
            .query("journal_consent")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();
    },
});

export const grantConsent = mutation({
    args: {
        includeEntryContent: v.optional(v.boolean()),
        includeMoodData: v.optional(v.boolean()),
        includeDreamData: v.optional(v.boolean()),
        lookbackDays: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const existing = await ctx.db
            .query("journal_consent")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                oracleCanReadJournal: true,
                consentGivenAt: now,
                consentRevokedAt: undefined,
                consentVersion: CONSENT_VERSION,
                includeEntryContent: args.includeEntryContent ?? true,
                includeMoodData: args.includeMoodData ?? true,
                includeDreamData: args.includeDreamData ?? true,
                lookbackDays: args.lookbackDays ?? 90,
                updatedAt: now,
            });
            return existing._id;
        }

        return await ctx.db.insert("journal_consent", {
            userId,
            oracleCanReadJournal: true,
            consentGivenAt: now,
            consentRevokedAt: undefined,
            consentVersion: CONSENT_VERSION,
            includeEntryContent: args.includeEntryContent ?? true,
            includeMoodData: args.includeMoodData ?? true,
            includeDreamData: args.includeDreamData ?? true,
            lookbackDays: args.lookbackDays ?? 90,
            updatedAt: now,
        });
    },
});

export const revokeConsent = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const existing = await ctx.db
            .query("journal_consent")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (!existing) return;

        await ctx.db.patch(existing._id, {
            oracleCanReadJournal: false,
            consentRevokedAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

export const updateConsentGranularity = mutation({
    args: {
        includeEntryContent: v.optional(v.boolean()),
        includeMoodData: v.optional(v.boolean()),
        includeDreamData: v.optional(v.boolean()),
        lookbackDays: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const existing = await ctx.db
            .query("journal_consent")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (!existing) throw new Error("No consent record found");
        if (!existing.oracleCanReadJournal) throw new Error("Consent not granted");

        const updates: any = { updatedAt: Date.now() };
        if (args.includeEntryContent !== undefined) updates.includeEntryContent = args.includeEntryContent;
        if (args.includeMoodData !== undefined) updates.includeMoodData = args.includeMoodData;
        if (args.includeDreamData !== undefined) updates.includeDreamData = args.includeDreamData;
        if (args.lookbackDays !== undefined) updates.lookbackDays = args.lookbackDays;

        await ctx.db.patch(existing._id, updates);
    },
});