import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
    ...authTables,
    // 1. EXTENDED AUTH TABLE (The "Atomic User")
    users: defineTable({
        // --- Standard Auth Fields (Managed by Convex Auth) ---
        image: v.optional(v.string()), // Avatar URL
        email: v.optional(v.string()),
        emailVerificationTime: v.optional(v.number()),
        phone: v.optional(v.string()),
        phoneVerificationTime: v.optional(v.number()),
        isAnonymous: v.optional(v.boolean()),

        // --- stars.guide Business Logic (Managed by Us) ---

        // Viral Referral System
        username: v.optional(v.string()),
        lastUsernameChangeAt: v.optional(v.number()),
        stardust: v.optional(v.number()),

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
        role: v.union(
            v.literal("user"),
            v.literal("popular"),
            v.literal("premium"),
            v.literal("admin"),
            v.literal("moderator")
        ),

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
                displayName: v.optional(v.string()),
            }),
            // Cached Placements (So we don't recalculate on every render)
            sunSign: v.string(),
            moonSign: v.string(),
            risingSign: v.string(),
        })),

    })
        .index("by_email", ["email"])
        .index("by_username", ["username"])
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

    // 3. REFERRALS (Tracking successful invites and stardust rewards)
    referrals: defineTable({
        referrerId: v.id("users"), // The user who sent the invite
        refereeId: v.id("users"),  // The new user who clicked the link
        status: v.union(
            v.literal("pending"),   // Clicked link, signed up, but hasn't finished birth data
            v.literal("completed")  // Finished birth data, Stardust awarded
        ),
        rewardAmount: v.number(),    // e.g. 1
    }).index("by_refereeId", ["refereeId"])
        .index("by_referrerId", ["referrerId"]),

    // 4. RATE LIMITS (Preventing endpoint exhaustion)
    rateLimits: defineTable({
        userId: v.id("users"),
        action: v.string(), // e.g. "check_username"
        count: v.number(),
        resetAt: v.number(), // timestamp for when the limit resets
    }).index("by_userId_action", ["userId", "action"]),

    // ─── DAILY HOROSCOPE ENGINE ───────────────────────────────────────

    // 5. SYSTEM SETTINGS (Master Prompt Storage)
    systemSettings: defineTable({
        key: v.string(),          // e.g., "master_context"
        content: v.string(),      // Raw markdown of the master prompt
        updatedAt: v.number(),    // Timestamp of last edit
        updatedBy: v.id("users"), // Which admin made the change
    }).index("by_key", ["key"]),

    // 6. ZEITGEISTS (World Vibe Context for Generation)
    zeitgeists: defineTable({
        title: v.string(),
        isManual: v.boolean(),
        archetypes: v.optional(v.array(v.string())),
        summary: v.string(),
        createdBy: v.id("users"),
        createdAt: v.number(),
    }).index("by_createdAt", ["createdAt"]),

    // 7. HOROSCOPES (Generated Content — the product)
    horoscopes: defineTable({
        zeitgeistId: v.id("zeitgeists"),
        sign: v.string(),             // One of the 12 canonical sign names
        targetDate: v.string(),       // ISO "YYYY-MM-DD" (UTC-normalized)
        content: v.string(),
        status: v.union(v.literal("draft"), v.literal("published"), v.literal("failed")),
        generatedBy: v.optional(v.id("generationJobs")),
    }).index("by_sign_and_date", ["sign", "targetDate"])
        .index("by_status", ["status"])
        .index("by_date", ["targetDate"]),

    // 8. GENERATION JOBS (Audit Trail + Progress Tracking)
    generationJobs: defineTable({
        adminUserId: v.id("users"),
        zeitgeistId: v.id("zeitgeists"),
        modelId: v.string(),              // e.g., "x-ai/grok-4.1-fast"
        targetDates: v.array(v.string()),
        targetSigns: v.array(v.string()),
        status: v.union(
            v.literal("running"),
            v.literal("completed"),
            v.literal("partial"),
            v.literal("failed"),
            v.literal("cancelled")
        ),
        progress: v.object({
            completed: v.number(),
            failed: v.number(),
            total: v.number(),
        }),
        errors: v.optional(v.array(v.string())),
        startedAt: v.number(),
        completedAt: v.optional(v.number()),
        // v3: Emotional Translation Layer
        rawZeitgeist: v.optional(v.string()),           // Original admin-typed events
        emotionalZeitgeist: v.optional(v.string()),     // AI-translated emotional state
        hookId: v.optional(v.id("hooks")),              // Assigned hook archetype for this run
    }).index("by_status", ["status"])
        .index("by_admin", ["adminUserId"]),

    // 9. COSMIC WEATHER (Astronomical Data — computed daily)
    cosmicWeather: defineTable({
        date: v.string(),                  // "YYYY-MM-DD" UTC — primary lookup key
        planetPositions: v.array(
            v.object({
                planet: v.string(),            // e.g. "Mars"
                sign: v.string(),              // e.g. "Gemini"
                degreeInSign: v.number(),      // 0–29.99
                isRetrograde: v.boolean(),     // true if planet is retrograde
            })
        ),
        moonPhase: v.object({
            name: v.string(),                // e.g. "Waxing Gibbous"
            illuminationPercent: v.number(), // 0–100
        }),
        activeAspects: v.array(
            v.object({
                planet1: v.string(),           // e.g. "Mars"
                planet2: v.string(),           // e.g. "Pluto"
                aspect: v.string(),            // "conjunction" | "opposition" | "trine" | "square" | "sextile"
                orbDegrees: v.number(),        // how tight the aspect is
            })
        ),
        generatedAt: v.number(),           // Date.now() timestamp for audit
    }).index("by_date", ["date"]),

    // 10. HOOKS (Hook Archetype Library — DB-driven, zero deploy updates)
    hooks: defineTable({
        name: v.string(),                    // e.g. "The Mirror Hook"
        description: v.string(),             // One-sentence description
        examples: v.array(v.string()),       // 2–5 example lines
        isActive: v.boolean(),
        moonPhaseMapping: v.optional(v.string()),  // e.g. "full_moon", "waxing", "new_moon", "waning"
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index("by_active", ["isActive"]),

});
