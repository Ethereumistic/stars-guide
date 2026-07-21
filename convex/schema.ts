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
            v.literal("moderator"),
            v.literal("banned"),     // Cannot sign in, data preserved for audit
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

        // ─── Email Deliverability State ───
        emailStatus: v.optional(v.union(
            v.literal("active"),       // Receiving emails normally
            v.literal("bounced"),      // Hard bounce detected — stop sending
            v.literal("complained"),   // Marked spam — stop sending
            v.literal("unsubscribed"), // User opted out of marketing emails
            v.literal("blocked"),       // Admin manually blocked
        )),

        // ─── Engagement / Lifecycle State ───
        engagementStatus: v.optional(v.union(
            v.literal("new"),       // 0–7 days since signup
            v.literal("active"),    // Engaged within last 14 days
            v.literal("dormant"),   // No activity for 14–60 days
            v.literal("churned"),   // No activity for >60 days
        )),

        // ─── Activity Tracking ───
        lastActiveAt: v.optional(v.number()),   // Unix ms — updated on meaningful activity
        lastLoginAt: v.optional(v.number()),    // Unix ms — updated on every auth session

        // ─── Soft Delete ───
        deletedAt: v.optional(v.number()),      // Unix ms — set on account deletion request

        // User Preferences
        preferences: v.optional(v.object({
            dailySparkTime: v.string(), // "07:00"
            theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
            // [MIGRATION] notifications is being moved to settings.
            // Kept as optional here temporarily so existing docs pass schema validation.
            // After running migrateSettings, this field can be removed entirely.
            notifications: v.optional(v.boolean()),
        })),

        // --- Human-facing Birth Chart Report ---
        // This generated reading is a product artifact for the user. Oracle
        // context is translated directly from birthData and never reads this.
        birthChartReport: v.optional(v.object({
            status: v.union(
                v.literal("pending"),
                v.literal("generating"),
                v.literal("completed"),
                v.literal("failed"),
            ),
            markdown: v.optional(v.string()),
            structured: v.optional(v.any()),
            profilingAnswers: v.optional(v.object({
                // v1 legacy fields kept for existing generated/user documents.
                centralQuestion: v.optional(v.string()),
                publicPersona: v.optional(v.string()),
                innerExperience: v.optional(v.string()),
                // v2 structured questionnaire fields.
                currentSeason: v.optional(v.array(v.string())),
                reportFocus: v.optional(v.array(v.string())),
                growthPattern: v.optional(v.array(v.string())),
                tonePreference: v.optional(v.string()),
                preferredName: v.optional(v.string()),
                pronouns: v.optional(v.string()),
                customContext: v.optional(v.string()),
            })),
            onboardingStep: v.optional(v.union(
                v.literal("centralQuestion"),
                v.literal("publicPersona"),
                v.literal("innerExperience"),
                v.literal("pronouns"),
                v.literal("questionnaire"),
                v.literal("queued"),
            )),
            generatedAt: v.optional(v.number()),
            oracleSessionId: v.optional(v.id("oracle_sessions")),
            generationProviderId: v.optional(v.string()),
            generationModel: v.optional(v.string()),
            generationTier: v.optional(v.string()),
            promptTokens: v.optional(v.number()),
            completionTokens: v.optional(v.number()),
            errorMessage: v.optional(v.string()),
            version: v.optional(v.number()),
            sourceChartFingerprint: v.optional(v.string()),
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
        .index("by_role", ["role"])
        .index("by_email_status", ["emailStatus"])
        .index("by_engagement_status", ["engagementStatus"])
        .index("by_last_active", ["lastActiveAt"]),

    // 3.4 BIRTH CHART REPORT JOBS (Async durable report generation)
    birth_chart_report_jobs: defineTable({
        userId: v.id("users"),
        status: v.union(
            v.literal("queued"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("failed"),
        ),
        priority: v.number(),
        attempts: v.number(),
        maxAttempts: v.number(),
        error: v.optional(v.string()),
        startedAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
    })
        .index("by_user", ["userId"])
        .index("by_status", ["status"]),

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
            v.literal("pending"),            // Clicked link, signed up, but hasn't finished birth data
            v.literal("completed"),          // Finished birth data, Stardust awarded
            v.literal("milestone_rewarded")   // Hit a milestone tier bonus
        ),
        rewardAmount: v.number(),    // e.g. 1
        milestoneTier: v.optional(v.number()), // 5, 10, 25 — which milestone tier was hit
        utmSource: v.optional(v.string()),
        utmMedium: v.optional(v.string()),
        createdAt: v.number(),
        completedAt: v.optional(v.number()),
    }).index("by_refereeId", ["refereeId"])
        .index("by_referrerId", ["referrerId"])
        .index("by_referrerId_status", ["referrerId", "status"])
        .index("by_referrerId_created", ["referrerId", "createdAt"]),

    // SHARE EVENTS (Tracking social shares for funnel analysis)
    share_events: defineTable({
        userId: v.optional(v.id("users")),
        shareType: v.string(),     // "birth_chart" | "horoscope" | "compatibility" | "journal"
        platform: v.string(),       // "twitter" | "whatsapp" | "instagram" | "imessage" | "copy"
        utmSource: v.optional(v.string()),
        createdAt: v.number(),
    }).index("by_createdAt", ["createdAt"])
        .index("by_shareType", ["shareType"])
        .index("by_platform", ["platform"]),

    // 4. RATE LIMITS (Preventing endpoint exhaustion)
    rateLimits: defineTable({
        userId: v.id("users"),
        action: v.string(), // e.g. "check_username"
        count: v.number(),
        resetAt: v.number(), // timestamp for when the limit resets
    }).index("by_userId_action", ["userId", "action"]),

    //DAILY HOROSCOPE ENGINE

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
        // v4: Freshness window
        validFrom: v.optional(v.string()),   // "YYYY-MM-DD" — start of relevance window
        validUntil: v.optional(v.string()),  // "YYYY-MM-DD" — end of relevance window
        // v4: Emotional register detection
        emotionalRegister: v.optional(v.string()),   // detected or manually set, e.g. "anxious,restless"
    }).index("by_createdAt", ["createdAt"]),

    // 7. HOROSCOPES (Generated Content the product)
    horoscopes: defineTable({
        zeitgeistId: v.id("zeitgeists"),
        sign: v.string(),             // One of the 12 canonical sign names
        targetDate: v.string(),       // ISO "YYYY-MM-DD" (UTC-normalized)
        content: v.string(),
        status: v.union(v.literal("draft"), v.literal("published"), v.literal("failed")),
        generatedBy: v.optional(v.id("generationJobs")),
        // v4: Edit reason capture
        editReason: v.optional(v.string()),   // "too_vague" | "wrong_tone" | "hook_missed" | "off_zeitgeist" | "too_long" | "too_short" | "other"
        editCount: v.optional(v.number()),    // Number of times this horoscope was edited post-generation
    }).index("by_sign_and_date", ["sign", "targetDate"])
        .index("by_status", ["status"])
        .index("by_date", ["targetDate"]),

    // ═══════════════════════════════════════════════════════════════════════════
    // DAILY HOROSCOPE ENGINE REBUILD — v2 (astronomy-engine powered)
    // ═══════════════════════════════════════════════════════════════════════════

    // 7b. DAILY ASTROLOGY CONTEXT (computed daily from astronomy-engine)
    daily_astrology_context: defineTable({
        date: v.string(),                             // "YYYY-MM-DD" UTC primary key

        // Moon
        moonPhase: v.object({
            name: v.string(),                        // e.g. "Waxing Gibbous"
            illumination: v.number(),                 // 0–100
            emoji: v.string(),                        // e.g. "🌒"
        }),

        // Planet positions
        planetPositions: v.array(v.object({
            planet: v.string(),                      // e.g. "Mars"
            sign: v.string(),                        // e.g. "Gemini"
            degree: v.number(),                      // 0–29.99
            retrograde: v.boolean(),
        })),

        // Active aspects
        activeAspects: v.array(v.object({
            planetA: v.string(),                     // e.g. "Mars"
            planetB: v.string(),                     // e.g. "Pluto"
            aspectType: v.string(),                  // "conjunction" | "opposition" | "trine" | "square" | "sextile"
            orb: v.number(),                         // degrees, how tight
            influence: v.string(),                   // e.g. "challenging" | "harmonious" | "dynamic"
        })),

        // Retrograde context
        retrogradeContext: v.object({
            current: v.array(v.string()),             // planets currently retrograde, e.g. ["Mercury"]
            upcoming: v.array(v.string()),            // planets about to turn retrograde (next 120d)
            recentDirect: v.array(v.string()),        // planets that recently turned direct (last 14d)
        }),

        // Rich per-planet retrograde detail (progress position, phase, window dates)
        retrogradePlanets: v.optional(v.array(v.object({
            planet: v.string(),
            status: v.union(v.literal("active"), v.literal("upcoming"), v.literal("recently_direct"), v.literal("clear")),
            startDate: v.string(),                    // ISO date
            endDate: v.string(),                      // ISO date
            totalDays: v.number(),
            daysElapsed: v.number(),
            daysRemaining: v.number(),
            progressPercent: v.number(),              // 0–100
            phase: v.union(v.literal("entering"), v.literal("deepening"), v.literal("peak"), v.literal("exiting"), v.literal("approaching"), v.literal("aftermath"), v.literal("clear")),
        }))),

        // Computed themes
        dominantThemes: v.array(v.string()),          // e.g. ["transformation", "communication", "restructuring"]
        energySignature: v.string(),                  // e.g. "intense, clarifying, grounding"

        // Optional enrichment fields (populated by computeDailyContext)
        voidOfCourseMoon: v.optional(v.object({
            isVoid: v.boolean(),
            windowStart: v.optional(v.string()),
            windowEnd: v.optional(v.string()),
            inSign: v.optional(v.string()),
            untilSign: v.optional(v.string()),
        })),
        moonNextIngress: v.optional(v.object({
            timestamp: v.string(),
            fromSign: v.string(),
            toSign: v.string(),
        })),
        dominantElement: v.optional(v.string()),      // "fire" | "earth" | "air" | "water"
        stelliumSign: v.optional(v.string()),         // sign with 3+ planets, if any
        aspectSummary: v.optional(v.array(v.string())), // e.g. ["dynamic_tension", "harmonic_flow"]

        generatedAt: v.number(),                      // Date.now() audit timestamp
    }).index("by_date", ["date"]),

    // 7c. DAILY HOROSCOPES (sign-specific AI-generated daily text)
    daily_horoscopes: defineTable({
        date: v.string(),                             // "YYYY-MM-DD" UTC
        sign: v.string(),                             // e.g. "Aries" — one of the 12 canonical signs
        status: v.union(
            v.literal("pending"),
            v.literal("generated"),
            v.literal("failed"),
            v.literal("overridden"),                  // admin manually replaced the content
        ),

        // Generation metadata
        generatedAt: v.optional(v.number()),          // Date.now() when content was successfully generated
        generationDurationMs: v.optional(v.number()), // How long the generation took

        // Content fields (v2.0: hook + bodyText + mantra + dailyPillars)
        // Stored as v.any() to support both v1 and v2 format during transition
        // v2.0 structure: { hook, bodyText, mantra, dailyPillars: { vibe, powerMove, blindSpot, luckySpark } }
        // v1 structure (legacy): { insight, energy, navigate, mantra?, cosmicDetails }
        content: v.any(),

        // Provenance
        contextSnapshotId: v.optional(v.id("daily_astrology_context")),
        modelUsed: v.optional(v.string()),             // e.g. "x-ai/grok-4.1-fast"
        promptVersion: v.optional(v.string()),        // e.g. "1.0" — tracks which prompt template was used
        errors: v.optional(v.array(v.string())),      // error messages if generation failed
    })
        .index("by_date_sign", ["date", "sign"])
        .index("by_date", ["date"]),

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
        providerId: v.optional(v.string()),           // v4: Which oracle provider to route through
    }).index("by_status", ["status"])
        .index("by_admin", ["adminUserId"]),

    // 8b. RETROGRADE WINDOWS (Cached retrograde window data)
    retrogradeWindows: defineTable({
        planet: v.string(),                     // e.g. "Mercury"
        windowType: v.union(
            v.literal("current"),                // Active retrograde window
            v.literal("next"),                   // Next upcoming window
        ),
        startDate: v.string(),                  // ISO date string
        endDate: v.string(),                    // ISO date string
        totalDays: v.number(),
        computedForDate: v.string(),            // The date this cache was computed for (YYYY-MM-DD)
        expiresAt: v.number(),                  // Timestamp when cache should be refreshed
        generatedAt: v.number(),
    })
        .index("by_planet_computedForDate", ["planet", "computedForDate"])
        .index("by_computedForDate", ["computedForDate"])
        .index("by_expiresAt", ["expiresAt"]),

    // 9. COSMIC WEATHER (Astronomical Data computed daily)
    cosmicWeather: defineTable({
        date: v.string(),                  // "YYYY-MM-DD" UTC primary lookup key
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
        feltLanguage: v.optional(v.string()),   // Pre-translated emotional prose
        feltLanguageGeneratedAt: v.optional(v.number()),
    }).index("by_date", ["date"]),

    // 10. HOOKS (Hook Archetype Library DB-driven, zero deploy updates)
    hooks: defineTable({
        name: v.string(),                    // e.g. "The Mirror Hook"
        description: v.string(),             // One-sentence description
        examples: v.array(v.string()),       // 2–5 example lines
        isActive: v.boolean(),
        moonPhaseMapping: v.optional(v.string()),  // e.g. "full_moon", "waxing", "new_moon", "waning"
        // v4: Emotion-register matching
        emotionalRegisters: v.array(v.string()),     // ["anxious", "restless"] etc. — empty = matches any
        source: v.string(),                          // "curated" | "ai_proposed" | "admin_written"
        approvedAt: v.optional(v.number()),          // null = pending approval (for ai_proposed)
        usageCount: v.number(),                      // Incremented each time hook is used in generation
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index("by_active", ["isActive"])
        .index("by_active_and_source", ["isActive", "source"]),

    // 10b. CONTEXT SLOTS (Split master context — independently versioned prompt sections)
    contextSlots: defineTable({
        slotKey: v.string(),               // "identity" | "output_rules" | "sign_voices" | "format_schema"
        label: v.string(),                 // Human-readable: "AI Identity & Persona", etc.
        content: v.string(),               // The prompt text for this slot
        order: v.number(),                 // Assembly order (lower = earlier in prompt)
        isEnabled: v.boolean(),            // Soft disable without deleting
        // Versioning
        version: v.number(),               // Increments on each save
        previousContent: v.optional(v.string()), // One level of undo
        updatedAt: v.number(),
        updatedBy: v.id("users"),
    }).index("by_slotKey", ["slotKey"])
        .index("by_order", ["order"]),

    //ORACLE AI ASTROLOGY GUIDE

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
        value: v.string(),                   // Always stored as string parsed at app layer
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

    // 12b. AI GATEWAY (Feature-agnostic provider/model infrastructure)
    ai_providers: defineTable({
        providerId: v.string(),
        name: v.string(),
        type: v.union(
            v.literal("openrouter"),
            v.literal("ollama"),
            v.literal("openai_compatible"),
        ),
        baseUrl: v.string(),
        apiKeyEnvVar: v.string(),
        maxConcurrent: v.optional(v.number()),
        enabled: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
        updatedBy: v.optional(v.id("users")),
    })
        .index("by_provider_id", ["providerId"])
        .index("by_enabled", ["enabled"]),

    ai_feature_profiles: defineTable({
        featureKey: v.string(),
        label: v.string(),
        enabled: v.boolean(),
        mode: v.union(
            v.literal("chat"),
            v.literal("json"),
            v.literal("stream"),
            v.literal("embedding"),
            v.literal("image"),
        ),
        chainJson: v.string(),
        temperature: v.number(),
        topP: v.optional(v.number()),
        maxTokens: v.number(),
        timeoutMs: v.number(),
        thinkingMode: v.union(
            v.literal("auto"),
            v.literal("disabled"),
            v.literal("low"),
            v.literal("medium"),
            v.literal("high"),
        ),
        retries: v.number(),
        safetyProfile: v.optional(v.union(
            v.literal("oracle"),
            v.literal("content_generation"),
            v.literal("none"),
        )),
        quotaScope: v.optional(v.union(
            v.literal("oracle_user"),
            v.literal("admin_ops"),
            v.literal("none"),
        )),
        allowUserModelSelection: v.optional(v.boolean()),
        createdAt: v.number(),
        updatedAt: v.number(),
        updatedBy: v.optional(v.id("users")),
    })
        .index("by_feature_key", ["featureKey"])
        .index("by_enabled", ["enabled"]),

    ai_user_model_options: defineTable({
        featureKey: v.string(),
        optionKey: v.string(),
        label: v.string(),
        description: v.optional(v.string()),
        badge: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
        enabled: v.boolean(),
        showWhenLocked: v.boolean(),
        allowedTiers: v.array(v.union(
            v.literal("free"),
            v.literal("popular"),
            v.literal("premium"),
        )),
        defaultForTiers: v.array(v.union(
            v.literal("free"),
            v.literal("popular"),
            v.literal("premium"),
        )),
        chain: v.array(v.object({
            providerId: v.string(),
            model: v.string(),
        })),
        allowedReasoningEfforts: v.array(v.union(
            v.literal("auto"),
            v.literal("disabled"),
            v.literal("low"),
            v.literal("medium"),
            v.literal("high"),
        )),
        defaultReasoningEffort: v.union(
            v.literal("auto"),
            v.literal("disabled"),
            v.literal("low"),
            v.literal("medium"),
            v.literal("high"),
        ),
        usageHint: v.optional(v.string()),
        sortOrder: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
        updatedBy: v.optional(v.id("users")),
    })
        .index("by_feature_option", ["featureKey", "optionKey"])
        .index("by_feature_enabled", ["featureKey", "enabled"])
        .index("by_feature_order", ["featureKey", "sortOrder"]),

    ai_gateway_events: defineTable({
        featureKey: v.string(),
        mode: v.string(),
        providerId: v.optional(v.string()),
        model: v.optional(v.string()),
        tier: v.optional(v.string()),
        status: v.union(
            v.literal("success"),
            v.literal("failure"),
            v.literal("blocked"),
        ),
        errorType: v.optional(v.string()),
        errorMessage: v.optional(v.string()),
        durationMs: v.optional(v.number()),
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        costMicro: v.optional(v.number()),
        routeKey: v.optional(v.string()),
        requestedThinkingMode: v.optional(v.string()),
        effectiveUserTier: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_feature_created", ["featureKey", "createdAt"])
        .index("by_provider_created", ["providerId", "createdAt"])
        .index("by_status_created", ["status", "createdAt"]),

    ai_provider_health: defineTable({
        providerId: v.string(),
        model: v.string(),
        featureKey: v.string(),
        status: v.union(
            v.literal("healthy"),
            v.literal("degraded"),
            v.literal("cooldown"),
        ),
        successCount: v.number(),
        failureCount: v.number(),
        consecutiveFailures: v.number(),
        lastSuccessAt: v.optional(v.number()),
        lastFailureAt: v.optional(v.number()),
        cooldownUntil: v.optional(v.number()),
        lastErrorType: v.optional(v.string()),
        lastErrorMessage: v.optional(v.string()),
        updatedAt: v.number(),
    })
        .index("by_provider_model_feature", ["providerId", "model", "featureKey"])
        .index("by_feature_status", ["featureKey", "status"])
        .index("by_cooldown", ["cooldownUntil"]),

    // 13. ORACLE QUOTA USAGE (Cost-based quota tracking — microdollars)
    oracle_quota_usage: defineTable({
        userId: v.id("users"),
        // Metadata
        lastQuestionAt: v.number(),
        updatedAt: v.number(),
        // V2 cost-based fields
        burstCost: v.optional(v.float64()),
        burstWindowStart: v.optional(v.float64()),
        weeklyCost: v.optional(v.float64()),
        weeklyWindowStart: v.optional(v.float64()),
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
        modelOptionKey: v.optional(v.string()),
        modelRouteFallbackReason: v.optional(v.string()),
        reasoningEffort: v.optional(v.union(
            v.literal("auto"),
            v.literal("disabled"),
            v.literal("low"),
            v.literal("medium"),
            v.literal("high"),
        )),
        birthChartDepth: v.optional(v.union(v.literal("core"), v.literal("full"))),
        starType: v.optional(v.union(v.literal("beveled"), v.literal("cursed"))), // Two pin tiers: cursed > beveled
        synastryPayload: v.optional(v.object({
          chartB: v.any(), // StoredBirthData shape
          source: v.union(v.literal("friend"), v.literal("custom")),
          friendUserId: v.optional(v.id("users")),
          relationship: v.string(),
          relationshipCategory: v.optional(v.string()),
          chartBName: v.string(),
        })),
        createdAt: v.number(),
        updatedAt: v.number(),
        lastMessageAt: v.number(),
        isSimulation: v.optional(v.boolean()),
        simulationRunId: v.optional(v.string()),
        simulationExpiresAt: v.optional(v.number()),
    })
        .index("by_user", ["userId"])
        .index("by_user_updated", ["userId", "updatedAt"])
        .index("by_simulation_run", ["simulationRunId"]),
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
        requestedModelOptionKey: v.optional(v.string()),
        requestedReasoningEffort: v.optional(v.union(
            v.literal("auto"),
            v.literal("disabled"),
            v.literal("low"),
            v.literal("medium"),
            v.literal("high"),
        )),
        // Snapshot of the system prompt hash used for this response (observability)
        systemPromptHash: v.optional(v.string()),
        // Journal prompt suggested by Oracle (if the model outputs JOURNAL_PROMPT: ...)
        journalPrompt: v.optional(v.string()),
        // Debug timing metrics (only on assistant messages, only for admin observability)
        timingPromptBuildMs: v.optional(v.number()),
        timingRequestQueueMs: v.optional(v.number()),
        timingTtftMs: v.optional(v.number()),
        timingInitialDecodeMs: v.optional(v.number()),
        timingTotalMs: v.optional(v.number()),
        debugModelUsed: v.optional(v.string()),
        // Audio generation (e.g. binaural beats, AI music)
        audioData: v.optional(v.string()), // DEPRECATED: old base64 inline — too large for Convex doc limits
        audioStorageId: v.optional(v.id("_storage")), // Convex file storage — preferred for synth audio
        audioUrl: v.optional(v.string()), // Playback URL for generated audio (binaural beats, etc.)
        // Deterministic binaural beat params (generated server-side, not by LLM)
        binauralParams: v.optional(v.any()), // BinauralBeatParams & { rationale?: BinauralRationale }
        // User feedback on assistant messages
        rating: v.optional(v.union(v.literal("positive"), v.literal("negative"))),
        // Validated to the three allowed values by oracle/feedback mutations.
        outcome: v.optional(v.string()),
        watchReviewAt: v.optional(v.number()),
        // V2: Cost tracking (micro USD)
        costUsdMicro: v.optional(v.number()),
        createdAt: v.number(),
        isSimulation: v.optional(v.boolean()),
        simulationRunId: v.optional(v.string()),
    })
        .index("by_session", ["sessionId"])
        .index("by_session_created", ["sessionId", "createdAt"])
        .searchIndex("search_content", {
            searchField: "content",
            filterFields: ["role"],
        }),

    oracle_turn_traces: defineTable({
        sessionId: v.id("oracle_sessions"),
        messageId: v.id("oracle_messages"),
        userId: v.id("users"),
        version: v.string(),
        payload: v.string(),
        isSimulation: v.optional(v.boolean()),
        simulationRunId: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_session", ["sessionId", "createdAt"])
        .index("by_message", ["messageId"])
        .index("by_simulation_run", ["simulationRunId"]),


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

    // 23b. HOROSCOPE RATINGS (User thumbs-up/down feedback)
    horoscope_ratings: defineTable({
        userId: v.id("users"),
        sign: v.string(),              // e.g. "Aries"
        date: v.string(),              // "YYYY-MM-DD"
        rating: v.union(
            v.literal("positive"),
            v.literal("negative"),
        ),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_user_sign_date", ["userId", "sign", "date"])
        .index("by_sign_date", ["sign", "date"]),

    // 20. UTM EVENTS (First-touch attribution for marketing channels)
    // Captures utm_source/medium/campaign/term/content from inbound URLs.
    // Also stores referring_domain + landing_page for non-UTM traffic analysis.
    // Privacy: no PII. sessionId is anonymous.
    utm_events: defineTable({
        visitorId: v.string(),              // Anonymous session / device fingerprint
        utmSource: v.optional(v.string()),
        utmMedium: v.optional(v.string()),
        utmCampaign: v.optional(v.string()),
        utmTerm: v.optional(v.string()),
        utmContent: v.optional(v.string()),
        referringDomain: v.optional(v.string()),
        landingPage: v.string(),             // First page visited
        userId: v.optional(v.id("users")),  // Filled in on signup
        createdAt: v.number(),
    })
        .index("by_visitor_id", ["visitorId"])
        .index("by_user_id", ["userId"])
        .index("by_created_at", ["createdAt"])
        .index("by_utm_campaign", ["utmCampaign"]),

    // 21. USER ACTIVITY (DAU/MAU computation — daily active user snapshots)
    // A row is written once per user per day they are active.
    // Enables DAU/MAU ratio, streak tracking, and churn analysis.
    // Privacy: no PII beyond userId and date.
    user_activity: defineTable({
        userId: v.id("users"),
        date: v.string(),                   // "YYYY-MM-DD" UTC
        sessionsCount: v.number(),         // Number of distinct sessions that day
        totalSessionDurationMs: v.number(), // Sum of all session lengths
        pageViews: v.number(),             // Total pages visited
        featuresUsed: v.array(v.string()),  // Distinct feature keys used
    })
        .index("by_user_date", ["userId", "date"])
        .index("by_date", ["date"])
        .index("by_user", ["userId"]),

    // 22. FEATURE EVENTS (Funnel / conversion tracking for key user actions)
    // Records every named event (signup, first_oracle, first_journal, upgrade, etc.)
    // with per-event metadata for funnel analysis.
    // Privacy: no PII. userId is nullable for anonymous pre-auth events.
    feature_events: defineTable({
        userId: v.optional(v.id("users")),
        eventName: v.string(),              // e.g. "signup_completed", "oracle_first"
        eventDate: v.string(),             // "YYYY-MM-DD" UTC
        timestamp: v.number(),             // Unix ms
        sessionId: v.string(),
        // Per-event key-value metadata (e.g. { channel: "google", plan: "free" })
        metadata: v.optional(v.record(v.string(), v.string())),
        // Attribution chain (first-touch UTM)
        utmEventId: v.optional(v.id("utm_events")),
        // Conversion funnel position (signup | activation | engagement | revenue)
        funnelStage: v.optional(v.union(
            v.literal("signup"),
            v.literal("activation"),
            v.literal("engagement"),
            v.literal("revenue"),
        )),
    })
        .index("by_user_event", ["userId", "eventName"])
        .index("by_event_date", ["eventName", "eventDate"])
        .index("by_date", ["eventDate"])
        .index("by_timestamp", ["timestamp"])
        .index("by_utm_event", ["utmEventId"]),

    // 23. DELETION REQUESTS (GDPR/CCPA compliance audit log — NO PII)
    deletionRequests: defineTable({
        requestId: v.string(),             // UUID, not linked to user identity
        requestedAt: v.number(),           // Unix timestamp
        completedAt: v.optional(v.number()),
        status: v.union(
            v.literal("pending"),
            v.literal("completed"),
            v.literal("failed"),
            v.literal("rejected"),         // If legal reasons require refusal
        ),
        rejectionReason: v.optional(v.string()), // Only if status = rejected
        // NO email, name, userId, or any PII in this table
    }),

    // ═══════════════════════════════════════════════════════════════════════════
    // EMAIL MARKETING — MailCow SMTP + React Email Infrastructure
    // ═══════════════════════════════════════════════════════════════════════════

    // 24. EMAIL LEADS — Opt-in subscribers captured via growth widgets
    emailLeads: defineTable({
        email: v.string(),
        status: v.union(
            v.literal("pending"),    // double-opt-in pending
            v.literal("active"),    // confirmed subscriber
            v.literal("unsubscribed"),
            v.literal("bounced"),
        ),
        source: v.union(
            v.literal("exit_intent_popup"),
            v.literal("blog_signup"),
            v.literal("social_cta"),
            v.literal("onboarding"),
        ),
        sign: v.optional(v.string()),
        userId: v.optional(v.id("users")),
        optInAt: v.number(),
        confirmedAt: v.optional(v.number()),
        unsubscribedAt: v.optional(v.number()),
    })
        .index("by_email", ["email"])
        .index("by_status", ["status"])
        .index("by_userId", ["userId"]),

    // 25. EMAIL PREFERENCES — Per-user email settings
    emailPreferences: defineTable({
        userId: v.id("users"),
        subscribed: v.boolean(),
        frequency: v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("monthly"),
            v.literal("none"),
        ),
        types: v.array(v.union(
            v.literal("welcome"),
            v.literal("daily_horoscope"),
            v.literal("weekly_cosmic"),
            v.literal("monthly_roundup"),
            v.literal("reengagement"),
        )),
        createdAt: v.number(),
        updatedAt: v.number(),

        // ─── Expanded Fields ───
        unsubscribedAt: v.optional(v.number()),      // When user opted out
        unsubscribeReason: v.optional(v.string()),   // Optional free-text reason
        disabledTypes: v.optional(v.array(v.union(   // Granular type opt-outs
            v.literal("welcome"),
            v.literal("daily_horoscope"),
            v.literal("weekly_cosmic"),
            v.literal("monthly_roundup"),
            v.literal("reengagement"),
            v.literal("admin_broadcast"),
        ))),
    })
        .index("by_userId", ["userId"]),

    // 26. EMAIL SEGMENTS — Pre-computed audience slices
    emailSegments: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        criteria: v.object({
            tier: v.optional(v.union(v.literal("free"), v.literal("popular"), v.literal("premium"))),
            engagement: v.optional(v.union(v.literal("new"), v.literal("active"), v.literal("dormant"), v.literal("churned"))),
            daysInactive: v.optional(v.number()),
            sign: v.optional(v.string()),
            hasEmailPref: v.optional(v.boolean()),
            emailStatus: v.optional(v.union(v.literal("active"), v.literal("bounced"), v.literal("unsubscribed"))),
        }),
        count: v.number(),
        updatedAt: v.number(),
    }),

    // 27. EMAIL CAMPAIGNS — Email campaign definitions
    emailCampaigns: defineTable({
        name: v.string(),
        type: v.union(
            v.literal("welcome_series"),
            v.literal("daily_horoscope"),
            v.literal("weekly_cosmic"),
            v.literal("monthly_roundup"),
            v.literal("reengagement"),
            v.literal("one_off"),
        ),
        status: v.union(
            v.literal("draft"),
            v.literal("scheduled"),
            v.literal("active"),
            v.literal("sending"),
            v.literal("paused"),
            v.literal("completed"),
        ),
        subject: v.string(),
        templateId: v.string(),
        segment: v.string(),
        schedule: v.object({
            offsetDays: v.optional(v.number()),
            hourUTC: v.optional(v.number()),
            minuteUTC: v.optional(v.number()),
            dayOfWeek: v.optional(v.number()),
        }),
        createdBy: v.id("users"),
        createdAt: v.number(),
        updatedAt: v.number(),

        // ─── Expanded Content Fields ───
        htmlContent: v.optional(v.string()),           // For custom HTML campaigns
        reactEmailTemplate: v.optional(v.string()),   // Template name: "WelcomeEmail" | "ReengagementEmail" | etc.
        campaignData: v.optional(v.string()),           // JSON string of template props

        // ─── Targeting ───
        targetType: v.optional(v.union(
            v.literal("all_users"),
            v.literal("by_tier"),
            v.literal("by_engagement"),
            v.literal("by_email_status"),
            v.literal("by_segment"),
            v.literal("specific_emails"),
        )),
        targetFilter: v.optional(v.string()),          // Tier value, engagement value, segment name, etc.
        targetEmails: v.optional(v.array(v.string())), // For specific_emails mode

        // ─── Delivery Stats ───
        sentCount: v.optional(v.number()),
        readCount: v.optional(v.number()),
        deliveredCount: v.optional(v.number()),
        bouncedCount: v.optional(v.number()),
        failedCount: v.optional(v.number()),
        openedCount: v.optional(v.number()),
        clickedCount: v.optional(v.number()),

        // ─── Metadata ───
        sentBy: v.optional(v.id("users")),              // Admin who triggered send
    })
        .index("by_type", ["type"])
        .index("by_status_created", ["status", "createdAt"]),

    // 28. EMAIL DELIVERIES — Per-email delivery tracking
    emailDeliveries: defineTable({
        campaignId: v.optional(v.id("emailCampaigns")),
        leadId: v.optional(v.id("emailLeads")),
        userId: v.optional(v.id("users")),
        email: v.string(),
        messageId: v.optional(v.string()),
        status: v.union(
            v.literal("queued"),
            v.literal("sent"),
            v.literal("delivered"),
            v.literal("opened"),
            v.literal("clicked"),
            v.literal("bounced"),
            v.literal("complained"),
            v.literal("unsubscribed"),
            v.literal("failed"),
        ),
        sentAt: v.optional(v.number()),
        deliveredAt: v.optional(v.number()),
        openedAt: v.optional(v.number()),
        clickedAt: v.optional(v.number()),
        bouncedAt: v.optional(v.number()),
        unsubscribedAt: v.optional(v.number()),

        // ─── Expanded Fields ───
        subject: v.optional(v.string()),               // What was the email subject?
        htmlPreview: v.optional(v.string()),           // Truncated HTML snippet for admin preview
        channel: v.optional(v.union(                  // Which SMTP identity was used
            v.literal("transactional"),
            v.literal("marketing"),
        )),
        errorMessage: v.optional(v.string()),          // SMTP error text on failure
        errorCode: v.optional(v.string()),            // e.g. "EAUTH", "ECONNREFUSED"
    })
        .index("by_campaign", ["campaignId"])
        .index("by_user", ["userId"])
        .index("by_lead", ["leadId"])
        .index("by_messageId", ["messageId"])
        .index("by_status", ["status"])
        .index("by_channel", ["channel"])
        .index("by_email_status", ["email", "status"]),

});








