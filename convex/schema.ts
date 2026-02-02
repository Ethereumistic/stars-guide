import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
    ...authTables,
    // 1. EXTENDED AUTH TABLE (The "Atomic User")
    users: defineTable({
        // --- Standard Auth Fields (Managed by Convex Auth) ---
        name: v.optional(v.string()),
        image: v.optional(v.string()), // Avatar URL
        email: v.optional(v.string()),
        emailVerificationTime: v.optional(v.number()),
        phone: v.optional(v.string()),
        phoneVerificationTime: v.optional(v.number()),
        isAnonymous: v.optional(v.boolean()),

        // --- stars.guide Business Logic (Managed by Us) ---

        // Subscription State
        tier: v.union(
            v.literal("free"),
            v.literal("cosmic"),      // Standard $9.99/mo
            v.literal("astral"),      // Premium $29.99/mo
            v.literal("vip"),   // OTC / Comped
            v.literal("lifetime")  // Early adopter
        ),
        subscriptionStatus: v.union(
            v.literal("active"),
            v.literal("canceled"),
            v.literal("past_due"),
            v.literal("trialing"),
            v.literal("none")
        ),
        subStartedAt: v.optional(v.number()),
        subEndsAt: v.optional(v.number()), // Access valid until this timestamp

        // Identity & Access
        role: v.union(v.literal("user"), v.literal("admin"), v.literal("moderator")),

        // Feature Flags (Smart Rollout)
        featureFlags: v.optional(v.object({
            canAccessOracle: v.optional(v.boolean()), // Gate for heavy AI usage
            isBetaTester: v.optional(v.boolean()),
        })),

        // User Preferences
        preferences: v.optional(v.object({
            dailySparkTime: v.string(), // "07:00"
            notifications: v.boolean(),
            theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
        })),

        // --- The "Static Core" (Astronomical Data) ---
        // Essential for RAG. Loaded instantly with the user.
        birthData: v.optional(v.object({
            date: v.string(), // ISO 8601
            time: v.string(), // "14:30"
            location: v.object({
                lat: v.number(),
                long: v.number(),
                city: v.string(),
                country: v.string(),
                countryCode: v.optional(v.string()),
            }),
            // Cached Placements (So we don't recalculate on every render)
            sunSign: v.string(),
            moonSign: v.string(),
            risingSign: v.string(),
        })),

    })
        .index("by_email", ["email"])
        .index("by_subscription_status", ["subscriptionStatus"]), // Vital for Daily Cron Jobs

    // 2. SUBSCRIPTION HISTORY (Audit Trail)
    subscription_history: defineTable({
        userId: v.id("users"),
        action: v.union(
            v.literal("upgrade"),
            v.literal("downgrade"),
            v.literal("cancel"),
            v.literal("renew"),
            v.literal("payment_failed")
        ),
        fromTier: v.string(),
        toTier: v.string(),
        timestamp: v.number(),
        reason: v.optional(v.string()), // e.g. "User requested", "Insufficient funds"
        metadata: v.optional(v.any()),  // Store Stripe Event ID here
    }).index("by_user_id", ["userId"]),

});
