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
            v.literal("popular"),
            v.literal("premium")
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
            v.literal("admin"),
            v.literal("moderator")
        ),

        // User Settings (Privacy & Notifications)
        settings: v.optional(v.object({
            publicChart: v.number(), // 0=Private, 1=Friends Only, 2=Public (default 2)
            notifications: v.boolean(),
        })),

        // [MIGRATION] featureFlags is deprecated — replaced by settings.
        // Kept as optional(v.any()) here temporarily so existing docs pass schema validation.
        // After running migrateSettings, this field can be removed entirely.
        featureFlags: v.optional(v.any()),

        // User Preferences
        preferences: v.optional(v.object({
            dailySparkTime: v.string(), // "07:00"
            theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
            // [MIGRATION] notifications is being moved to settings.
            // Kept as optional here temporarily so existing docs pass schema validation.
            // After running migrateSettings, this field can be removed entirely.
            notifications: v.optional(v.boolean()),
        })),

        // --- The "Static Core" (Astronomical Data) ---
        // Essential for RAG. Loaded instantly with the user.
        birthData: v.optional(v.object({
            date: v.string(), // ISO 8601
            time: v.string(), // "14:30"
            timezone: v.optional(v.string()),
            utcTimestamp: v.optional(v.string()),
            houseSystem: v.optional(v.literal("whole_sign")),
            location: v.object({
                lat: v.number(),
                long: v.number(),
                city: v.string(),
                country: v.string(),
                countryCode: v.optional(v.string()),
                displayName: v.optional(v.string()),
            }),
            placements: v.array(v.object({
                body: v.string(),
                sign: v.string(),
                house: v.number(),
            })),
            chart: v.optional(v.object({
                ascendant: v.union(
                    v.object({
                        longitude: v.number(),
                        signId: v.string(),
                    }),
                    v.null(),
                ),
                planets: v.array(v.object({
                    id: v.string(),
                    signId: v.string(),
                    houseId: v.number(),
                    longitude: v.number(),
                    retrograde: v.boolean(),
                    dignity: v.union(
                        v.literal("domicile"),
                        v.literal("exaltation"),
                        v.literal("detriment"),
                        v.literal("fall"),
                        v.literal("peregrine"),
                        v.null(),
                    ),
                })),
                houses: v.array(v.object({
                    id: v.number(),
                    signId: v.string(),
                    longitude: v.number(),
                })),
                aspects: v.array(v.object({
                    planet1: v.string(),
                    planet2: v.string(),
                    type: v.union(
                        v.literal("conjunction"),
                        v.literal("sextile"),
                        v.literal("square"),
                        v.literal("trine"),
                        v.literal("opposition"),
                    ),
                    angle: v.number(),
                    orb: v.number(),
                })),
            })),
        })),

    })
        .index("by_email", ["email"])
        .index("by_username", ["username"])
        .index("by_subscription_status", ["subscriptionStatus"]) // Vital for Daily Cron Jobs
        .index("by_phone", ["phone"])
        .index("by_tier", ["tier"])
        .index("by_role", ["role"]),

    // 3.5 FRIENDSHIPS (Symmetric bidirectional friend relationships)
    friendships: defineTable({
        requesterId: v.id("users"),
        addresseeId: v.id("users"),
        status: v.union(
            v.literal("pending"),
            v.literal("accepted"),
            v.literal("declined"),
        ),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_requester", ["requesterId"])
        .index("by_addressee", ["addresseeId"])
        .index("by_requester_addressee", ["requesterId", "addresseeId"]),

    // 3.6 NOTIFICATIONS (Shared by referrals, friends & admin broadcasts)
    notifications: defineTable({
        userId: v.id("users"),           // Recipient
        type: v.union(
            v.literal("referral_completed"),
            v.literal("friend_request"),
            v.literal("friend_accepted"),
            v.literal("admin_broadcast"),
        ),
        fromUserId: v.optional(v.id("users")),  // Optional for system broadcasts
        referralId: v.optional(v.id("referrals")),
        friendshipId: v.optional(v.id("friendships")),
        scheduledNotificationId: v.optional(v.id("scheduledNotifications")), // Link back to campaign for analytics
        message: v.optional(v.string()),
        read: v.boolean(),
        createdAt: v.number(),
    })
        .index("by_user_read", ["userId", "read"])
        .index("by_user_created", ["userId", "createdAt"])
        .index("by_campaign", ["scheduledNotificationId"]),

    // 4. RATE LIMITS (Preventing endpoint exhaustion)
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

    // РІвЂќР‚РІвЂќР‚РІвЂќР‚ DAILY HOROSCOPE ENGINE РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚

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

    // 7. HOROSCOPES (Generated Content РІР‚вЂќ the product)
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

    // 9. COSMIC WEATHER (Astronomical Data РІР‚вЂќ computed daily)
    cosmicWeather: defineTable({
        date: v.string(),                  // "YYYY-MM-DD" UTC РІР‚вЂќ primary lookup key
        planetPositions: v.array(
            v.object({
                planet: v.string(),            // e.g. "Mars"
                sign: v.string(),              // e.g. "Gemini"
                degreeInSign: v.number(),      // 0РІР‚вЂњ29.99
                isRetrograde: v.boolean(),     // true if planet is retrograde
            })
        ),
        moonPhase: v.object({
            name: v.string(),                // e.g. "Waxing Gibbous"
            illuminationPercent: v.number(), // 0РІР‚вЂњ100
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

    // 10. HOOKS (Hook Archetype Library РІР‚вЂќ DB-driven, zero deploy updates)
    hooks: defineTable({
        name: v.string(),                    // e.g. "The Mirror Hook"
        description: v.string(),             // One-sentence description
        examples: v.array(v.string()),       // 2РІР‚вЂњ5 example lines
        isActive: v.boolean(),
        moonPhaseMapping: v.optional(v.string()),  // e.g. "full_moon", "waxing", "new_moon", "waning"
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index("by_active", ["isActive"]),

    // РІвЂќР‚РІвЂќР‚РІвЂќР‚ ORACLE AI ASTROLOGY GUIDE РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚

    // 11. ORACLE FEATURE INJECTIONS (Per-feature prompt blocks)
    oracle_feature_injections: defineTable({
        featureKey: v.string(),
        contextText: v.string(),
        isActive: v.boolean(),
        version: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_feature", ["featureKey"]),

    // 12. ORACLE SETTINGS (Key-value config: soul prompt, models, limits, etc.)
    oracle_settings: defineTable({
        key: v.string(),
        value: v.string(),                   // Always stored as string РІР‚вЂќ parsed at app layer
        valueType: v.union(
            v.literal("string"),
            v.literal("number"),
            v.literal("boolean"),
            v.literal("json"),
        ),
        label: v.string(),                   // Human-readable label for admin
        description: v.optional(v.string()),
        group: v.string(),                   // "model", "quota", "content", "safety", "operational"
        updatedAt: v.number(),
        updatedBy: v.optional(v.id("users")),
    })
        .index("by_key", ["key"])
        .index("by_group", ["group"]),

    // 13. ORACLE QUOTA USAGE (Server-authoritative question tracking)
    oracle_quota_usage: defineTable({
        userId: v.id("users"),
        // For roles with rolling 24h reset:
        dailyCount: v.number(),              // Questions used in current 24h window
        dailyWindowStart: v.number(),        // Timestamp when current window started (ms)
        // For free tier (lifetime cap):
        lifetimeCount: v.number(),           // Total questions ever asked (never decremented)
        // Metadata
        lastQuestionAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_user", ["userId"]),

    // 14. ORACLE SESSIONS (User conversation sessions)
    oracle_sessions: defineTable({
        userId: v.id("users"),
        title: v.string(),                   // Initial placeholder from truncated question; replaced by AI-generated title parsed from Oracle response
        titleGenerated: v.optional(v.boolean()), // Set true after AI title generation, prevents re-trigger
        featureKey: v.optional(v.string()),
        status: v.union(
            v.literal("active"),              // Oracle answered, conversation ongoing
            v.literal("completed"),           // Session ended
        ),
        messageCount: v.number(),
        // Which model was used for the primary Oracle response
        primaryModelUsed: v.optional(v.string()),
        // Was fallback triggered?
        usedFallback: v.optional(v.boolean()),
        birthChartDepth: v.optional(v.union(v.literal("core"), v.literal("full"))),
        starType: v.optional(v.union(v.literal("beveled"), v.literal("cursed"))), // Two pin tiers: cursed > beveled
        createdAt: v.number(),
        updatedAt: v.number(),
        lastMessageAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_user_updated", ["userId", "updatedAt"]),
    // ═══════════════════════════════════════════════════════════════════════════
    // JOURNAL MVP v1 — Emotional Self-Reflection + Oracle Context
    // ═══════════════════════════════════════════════════════════════════════════

    // 16. JOURNAL ENTRIES
    journal_entries: defineTable({
        userId: v.id("users"),

        // --- Content ---
        title: v.optional(v.string()),
        content: v.string(),                          // Main entry body (plain text / light markdown)

        // --- Entry Type ---
        entryType: v.union(
            v.literal("freeform"),                   // User writes freely
            v.literal("checkin"),                    // Quick mood + optional emotions
            v.literal("dream"),                      // Dream journal entry
            v.literal("gratitude"),                  // Gratitude-specific entry
        ),

        // --- Mood (2D Circumplex) ---
        mood: v.optional(v.object({
            valence: v.number(),                     // -2 to +2 (negative ←→ positive)
            arousal: v.number(),                     // -2 to +2 (calm ←→ activated)
        })),
        moodZone: v.optional(v.union(                // Derived label for display/filtering
            v.literal("excited"),                    // high valence, high arousal
            v.literal("content"),                    // high valence, low arousal
            v.literal("tense"),                      // low valence, high arousal
            v.literal("low"),                        // low valence, low arousal
        )),

        // --- Emotions (clustered + intensity) ---
        emotions: v.optional(v.array(v.object({
            key: v.string(),                          // e.g. "anxious", "grateful"
            intensity: v.union(                       // mild / moderate / strong
                v.literal(1),
                v.literal(2),
                v.literal(3),
            ),
        }))),

        // --- Energy & Context ---
        energyLevel: v.optional(v.number()),          // 1-5 physical energy (separate from arousal)
        timeOfDay: v.optional(v.union(                // Contextual time marker
            v.literal("morning"),
            v.literal("midday"),
            v.literal("evening"),
            v.literal("night"),
        )),

        // --- Astrological Context (auto-attached at creation) ---
        astroContext: v.optional(v.object({
            moonPhase: v.string(),                   // "Waxing Gibbous" etc.
            moonSign: v.optional(v.string()),
            sunSign: v.optional(v.string()),
            retrogradePlanets: v.optional(v.array(v.string())),
            activeTransits: v.optional(v.array(v.object({
                planet: v.string(),
                sign: v.string(),
                aspect: v.optional(v.string()),
                house: v.optional(v.number()),
            }))),
        })),

        // --- Voice ---
        voiceTranscript: v.optional(v.string()),     // Raw STT transcript (Web Speech API)

        // --- Photo (single lightweight image) ---
        photoId: v.optional(v.id("_storage")),
        photoCaption: v.optional(v.string()),

        // --- Location ---
        location: v.optional(v.object({
            lat: v.number(),
            long: v.number(),
            city: v.optional(v.string()),
            country: v.optional(v.string()),
            displayName: v.optional(v.string()),     // "Prague, CZ" or user-typed override
        })),

        // --- Organization ---
        tags: v.optional(v.array(v.string())),
        isPinned: v.optional(v.boolean()),

        // --- Dream-Specific ---
        dreamData: v.optional(v.object({
            isLucid: v.optional(v.boolean()),
            isRecurring: v.optional(v.boolean()),
            dreamSigns: v.optional(v.array(v.string())),     // Recurring symbols
            emotionalTone: v.optional(v.string()),            // "eerie", "joyful", "confusing"
        })),

        // --- Gratitude-Specific ---
        gratitudeItems: v.optional(v.array(v.string())),     // What the user is grateful for (3-5 items)

        // --- Oracle Link ---
        oracleSessionId: v.optional(v.id("oracle_sessions")),
        oracleInspired: v.optional(v.boolean()),             // Was this entry suggested by Oracle?

        // --- Metadata ---
        wordCount: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
        entryDate: v.string(),                                // "YYYY-MM-DD"
    })
        .index("by_user_date", ["userId", "entryDate"])
        .index("by_user_created", ["userId", "createdAt"])
        .index("by_user_type", ["userId", "entryType"])
        .index("by_user_pinned", ["userId", "isPinned"])
        .index("by_user_mood_zone", ["userId", "moodZone"])
        .index("by_oracle_session", ["oracleSessionId"])
        .searchIndex("search_content", {
            searchField: "content",
            filterFields: ["userId", "entryType", "moodZone", "entryDate"],
        }),

    // 17. JOURNAL STREAKS
    journal_streaks: defineTable({
        userId: v.id("users"),
        currentStreak: v.number(),
        longestStreak: v.number(),
        lastEntryDate: v.string(),                    // "YYYY-MM-DD"
        totalEntries: v.number(),
        updatedAt: v.number(),
    })
        .index("by_user", ["userId"]),

    // 18. JOURNAL CONSENT (Oracle Access)
    journal_consent: defineTable({
        userId: v.id("users"),
        oracleCanReadJournal: v.boolean(),
        consentGivenAt: v.optional(v.number()),
        consentRevokedAt: v.optional(v.number()),
        consentVersion: v.string(),                   // "1.0"

        // Granular permissions
        includeEntryContent: v.boolean(),            // Can Oracle read full entry text?
        includeMoodData: v.boolean(),                // Can Oracle read mood/emotion data?
        includeDreamData: v.boolean(),               // Can Oracle read dream entries?
        lookbackDays: v.number(),                     // How many days back Oracle can see (30, 90, 365, 9999)

        updatedAt: v.number(),
    })
        .index("by_user", ["userId"]),

    // 19. JOURNAL PROMPT BANK (Algorithmic Daily Prompts)
    journal_prompt_bank: defineTable({
        category: v.union(
            v.literal("daily"),
            v.literal("moon"),
            v.literal("retrograde"),
            v.literal("seasonal"),
            v.literal("gratitude"),
            v.literal("dream"),
            v.literal("relationship"),
            v.literal("career"),
        ),
        moonPhase: v.optional(v.string()),             // Only shown during this moon phase (e.g. "Full Moon")
        text: v.string(),                               // The prompt text
        astrologyLevel: v.union(
            v.literal("none"),                          // No astrology context needed
            v.literal("light"),                         // References moon phase
            v.literal("medium"),                        // References current transits
            v.literal("deep"),                          // References natal chart specifics
        ),
        isActive: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_category", ["category"])
        .index("by_moon_phase", ["moonPhase"])
        .index("by_active", ["isActive"]),

    // 20. JOURNAL SETTINGS (Admin Configuration)
    journal_settings: defineTable({
        key: v.string(),
        value: v.string(),                             // Always stored as string — parsed at app layer
        valueType: v.union(
            v.literal("string"),
            v.literal("number"),
            v.literal("boolean"),
            v.literal("json"),
        ),
        label: v.string(),
        description: v.optional(v.string()),
        group: v.string(),                             // "limits", "features", "oracle_integration"
        updatedAt: v.number(),
        updatedBy: v.optional(v.id("users")),
    })
        .index("by_key", ["key"])
        .index("by_group", ["group"]),

    // 15. ORACLE MESSAGES (Individual messages in a session)
    oracle_messages: defineTable({
        sessionId: v.id("oracle_sessions"),
        role: v.union(
            v.literal("user"),
            v.literal("assistant"),           // Oracle's response
        ),
        content: v.string(),
        // LLM metadata (only on assistant messages)
        modelUsed: v.optional(v.string()),
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        fallbackTierUsed: v.optional(v.union(
            v.literal("A"),
            v.literal("B"),
            v.literal("C"),
            v.literal("D"),                   // D = hardcoded fallback
        )),
        // Snapshot of the system prompt hash used for this response (observability)
        systemPromptHash: v.optional(v.string()),
        // Journal prompt suggested by Oracle (if the model outputs JOURNAL_PROMPT: ...)
        journalPrompt: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_session", ["sessionId"])
        .index("by_session_created", ["sessionId", "createdAt"]),

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN NOTIFICATIONS — Broadcast & Scheduled Campaign System
    // ═══════════════════════════════════════════════════════════════════════════

    // 21. SCHEDULED NOTIFICATIONS (Admin notification campaigns)
    scheduledNotifications: defineTable({
        // ─── Content ───
        title: v.string(),                    // Admin-facing campaign name
        message: v.string(),                  // The notification text shown to users
        type: v.literal("admin_broadcast"),   // Always this value

        // ─── Targeting ───
        targetAudience: v.union(
            v.literal("all"),
            v.literal("tier"),
            v.literal("role"),
            v.literal("subscriptionStatus"),
        ),
        targetFilter: v.optional(v.string()), // e.g. "free", "premium", "user", "active"

        // ─── Scheduling ───
        status: v.union(
            v.literal("draft"),
            v.literal("scheduled"),
            v.literal("sending"),
            v.literal("sent"),
            v.literal("cancelled"),
        ),
        scheduledAt: v.number(),             // When to deliver (timestamp ms)

        // ─── Analytics ───
        sentCount: v.optional(v.number()),
        readCount: v.optional(v.number()),

        // ─── Metadata ───
        createdBy: v.id("users"),
        createdAt: v.number(),
        sentAt: v.optional(v.number()),
    })
        .index("by_status", ["status"])
        .index("by_status_scheduledAt", ["status", "scheduledAt"])
        .index("by_createdBy", ["createdBy"]),

    // ═══════════════════════════════════════════════════════════════════════════
    // USERNAME MODERATION — Banned Patterns (DB-driven, zero-deploy updates)
    // ═══════════════════════════════════════════════════════════════════════════

    // 22. BANNED USERNAME PATTERNS (Regex-based content moderation)
    bannedPatterns: defineTable({
        pattern: v.string(),              // Regex pattern string, e.g. "n[i1]gg[e3a@4]"
        description: v.optional(v.string()), // Admin note, e.g. "N-word variants"
        createdBy: v.id("users"),
        createdAt: v.number(),
        updatedAt: v.number(),
    }),
});








