/**
 * entries.ts — Journal entry CRUD: create, read, update, delete.
 *
 * Every entry automatically has astro context attached at creation.
 * Streak is updated automatically on creation.
 */
import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";
import { deriveMoodZone, JOURNAL_LIMITS } from "../../src/lib/journal/constants";

/**
 * Helper: compute word count from text content.
 */
function wordCount(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Helper: get today's date as YYYY-MM-DD.
 */
function todayDate(): string {
    return new Date().toISOString().split("T")[0];
}

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════

export const createEntry = mutation({
    args: {
        // Content
        title: v.optional(v.string()),
        content: v.string(),

        // Entry type
        entryType: v.union(
            v.literal("freeform"),
            v.literal("checkin"),
            v.literal("dream"),
            v.literal("gratitude"),
        ),

        // Mood (2D)
        mood: v.optional(v.object({
            valence: v.number(),
            arousal: v.number(),
        })),

        // Emotions
        emotions: v.optional(v.array(v.object({
            key: v.string(),
            intensity: v.union(v.literal(1), v.literal(2), v.literal(3)),
        }))),

        // Energy & context
        energyLevel: v.optional(v.number()),
        timeOfDay: v.optional(v.union(
            v.literal("morning"),
            v.literal("midday"),
            v.literal("evening"),
            v.literal("night"),
        )),

        // Voice
        voiceTranscript: v.optional(v.string()),

        // Photo
        photoId: v.optional(v.id("_storage")),
        photoCaption: v.optional(v.string()),

        // Location
        location: v.optional(v.object({
            lat: v.number(),
            long: v.number(),
            city: v.optional(v.string()),
            country: v.optional(v.string()),
            displayName: v.optional(v.string()),
        })),

        // Organization
        tags: v.optional(v.array(v.string())),

        // Dream-specific
        dreamData: v.optional(v.object({
            isLucid: v.optional(v.boolean()),
            isRecurring: v.optional(v.boolean()),
            dreamSigns: v.optional(v.array(v.string())),
            emotionalTone: v.optional(v.string()),
        })),

        // Gratitude-specific
        gratitudeItems: v.optional(v.array(v.string())),

        // Oracle link
        oracleSessionId: v.optional(v.id("oracle_sessions")),
        oracleInspired: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const entryDate = todayDate();
        const now = Date.now();

        // ── Validate per entry type ─────────────────────────────────
        if (args.entryType === "freeform") {
            if (!args.content.trim()) {
                throw new Error("Freeform entries require content");
            }
        }
        if (args.entryType === "checkin") {
            // Content can be empty for check-ins, but mood is recommended
            // (not strictly required — a user might want a tag-only check-in)
        }
        if (args.entryType === "dream") {
            if (!args.content.trim()) {
                throw new Error("Dream entries require content");
            }
        }
        if (args.entryType === "gratitude") {
            if (!args.gratitudeItems || args.gratitudeItems.length === 0) {
                throw new Error("Gratitude entries require at least one gratitude item");
            }
            if (args.gratitudeItems.length > JOURNAL_LIMITS.MAX_GRATITUDE_ITEMS) {
                throw new Error(`Maximum ${JOURNAL_LIMITS.MAX_GRATITUDE_ITEMS} gratitude items`);
            }
        }

        // ── Validate shared fields ─────────────────────────────────
        if (args.content.length > JOURNAL_LIMITS.MAX_CONTENT_LENGTH) {
            throw new Error(`Content exceeds ${JOURNAL_LIMITS.MAX_CONTENT_LENGTH} characters`);
        }
        if (args.title && args.title.length > JOURNAL_LIMITS.MAX_TITLE_LENGTH) {
            throw new Error(`Title exceeds ${JOURNAL_LIMITS.MAX_TITLE_LENGTH} characters`);
        }
        if (args.tags && args.tags.length > JOURNAL_LIMITS.MAX_TAGS_PER_ENTRY) {
            throw new Error(`Maximum ${JOURNAL_LIMITS.MAX_TAGS_PER_ENTRY} tags`);
        }
        if (args.emotions && args.emotions.length > JOURNAL_LIMITS.MAX_EMOTIONS_PER_ENTRY) {
            throw new Error(`Maximum ${JOURNAL_LIMITS.MAX_EMOTIONS_PER_ENTRY} emotions`);
        }

        // ── Daily entry limit check ─────────────────────────────────
        const todayEntries = await ctx.db
            .query("journal_entries")
            .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("entryDate", entryDate))
            .collect();

        if (todayEntries.length >= JOURNAL_LIMITS.MAX_ENTRIES_PER_DAY) {
            throw new Error("You've reached your daily entry limit");
        }

        // ── Derive mood zone from valence/arousal ──────────────────
        let moodZone: string | undefined;
        if (args.mood) {
            moodZone = deriveMoodZone(args.mood.valence, args.mood.arousal);
        }

        // ── Build astro context ────────────────────────────────────
        let astroContext: any = undefined;
        try {
            // Use ctx.runQuery to fetch cosmic weather internally
            const cosmicWeather = await ctx.runQuery(
                internal.cosmicWeather.getForDate,
                { date: entryDate }
            );

            if (cosmicWeather) {
                astroContext = {
                    moonPhase: cosmicWeather.moonPhase.name,
                };

                const moonPos = cosmicWeather.planetPositions.find(
                    (p: any) => p.planet === "Moon"
                );
                const sunPos = cosmicWeather.planetPositions.find(
                    (p: any) => p.planet === "Sun"
                );

                if (moonPos) astroContext.moonSign = moonPos.sign;
                if (sunPos) astroContext.sunSign = sunPos.sign;

                const retrogrades = cosmicWeather.planetPositions
                    .filter((p: any) => p.isRetrograde)
                    .map((p: any) => p.planet);

                if (retrogrades.length > 0) {
                    astroContext.retrogradePlanets = retrogrades;
                }

                // Active transits (sign-level aspects with natal chart)
                const user = await ctx.db.get(userId);
                if (user?.birthData?.chart) {
                    const SIGN_ORDER = [
                        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
                    ];

                    function signAspectType(signA: string, signB: string): string | null {
                        const idxA = SIGN_ORDER.indexOf(signA);
                        const idxB = SIGN_ORDER.indexOf(signB);
                        if (idxA === -1 || idxB === -1) return null;
                        const diff = ((idxB - idxA + 12) % 12);
                        if (diff === 0) return "conjunction";
                        if (diff === 6) return "opposition";
                        if (diff === 3 || diff === 9) return "square";
                        if (diff === 4 || diff === 8) return "trine";
                        return null;
                    }

                    const activeTransits: any[] = [];
                    for (const transitingPlanet of cosmicWeather.planetPositions) {
                        if (transitingPlanet.planet === "Sun" || transitingPlanet.planet === "Moon") continue;
                        for (const natalPlanet of user.birthData.chart.planets) {
                            const aspect = signAspectType(transitingPlanet.sign, natalPlanet.signId);
                            if (aspect && (aspect === "conjunction" || aspect === "opposition" || aspect === "square")) {
                                activeTransits.push({
                                    planet: transitingPlanet.planet,
                                    sign: transitingPlanet.sign,
                                    aspect,
                                    house: natalPlanet.houseId,
                                });
                            }
                        }
                    }
                    if (activeTransits.length > 0) {
                        astroContext.activeTransits = activeTransits.slice(0, 10);
                    }
                }
            }
        } catch (e) {
            // Astro context is non-blocking — if it fails, entry is still created
            console.error("Astro context assembly failed (non-blocking):", e);
            astroContext = undefined;
        }

        // ── Compute word count ─────────────────────────────────────
        const wc = wordCount(args.content);

        // ── Insert entry ───────────────────────────────────────────
        const entryId = await ctx.db.insert("journal_entries", {
            userId,
            title: args.title,
            content: args.content,
            entryType: args.entryType,
            mood: args.mood,
            moodZone: moodZone as any,
            emotions: args.emotions,
            energyLevel: args.energyLevel,
            timeOfDay: args.timeOfDay,
            astroContext,
            voiceTranscript: args.voiceTranscript,
            photoId: args.photoId,
            photoCaption: args.photoCaption,
            location: args.location,
            tags: args.tags,
            isPinned: false,
            dreamData: args.dreamData,
            gratitudeItems: args.gratitudeItems,
            oracleSessionId: args.oracleSessionId,
            oracleInspired: args.oracleInspired,
            wordCount: wc,
            createdAt: now,
            updatedAt: now,
            entryDate,
        });

        // ── Update streak ──────────────────────────────────────────
        try {
            await ctx.runMutation(internal.journal.streaks.updateStreak, {
                userId,
                entryDate,
            });
        } catch (e) {
            console.error("Streak update failed (non-blocking):", e);
        }

        return entryId;
    },
});

// ═══════════════════════════════════════════════════════════════
// READ
// ═══════════════════════════════════════════════════════════════

/**
 * getUserEntries — Paginated query, newest first.
 */
export const getUserEntries = query({
    args: {
        cursor: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { cursor, limit = 20 }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return { entries: [], continueCursor: null };

        const result = await ctx.db
            .query("journal_entries")
            .withIndex("by_user_created", (q) => q.eq("userId", userId))
            .order("desc")
            .paginate({ cursor: cursor ?? null, numItems: limit });

        return {
            entries: result.page,
            continueCursor: result.continueCursor,
            isDone: result.isDone,
        };
    },
});

/**
 * getUserEntriesByDate — Filter entries by date or date range.
 * Uses by_user_date index to scan entries for a user.
 */
export const getUserEntriesByDate = query({
    args: {
        startDate: v.string(), // "YYYY-MM-DD"
        endDate: v.string(),   // "YYYY-MM-DD"
    },
    handler: async (ctx, { startDate, endDate }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        // Query entries for this user, then filter by date range
        const entries = await ctx.db
            .query("journal_entries")
            .withIndex("by_user_date", (q) => q.eq("userId", userId))
            .order("desc")
            .collect();

        return entries.filter(
            (entry) => entry.entryDate >= startDate && entry.entryDate <= endDate
        );
    },
});

/**
 * getEntry — Single entry by ID, ownership-verified.
 */
export const getEntry = query({
    args: { entryId: v.id("journal_entries") },
    handler: async (ctx, { entryId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const entry = await ctx.db.get(entryId);
        if (!entry || entry.userId !== userId) return null;

        return entry;
    },
});

/**
 * getPinnedEntries — Return pinned entries for the user.
 */
export const getPinnedEntries = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        return await ctx.db
            .query("journal_entries")
            .withIndex("by_user_pinned", (q) => q.eq("userId", userId).eq("isPinned", true))
            .order("desc")
            .collect();
    },
});

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════

export const updateEntry = mutation({
    args: {
        entryId: v.id("journal_entries"),
        title: v.optional(v.string()),
        content: v.optional(v.string()),
        mood: v.optional(v.object({
            valence: v.number(),
            arousal: v.number(),
        })),
        emotions: v.optional(v.array(v.object({
            key: v.string(),
            intensity: v.union(v.literal(1), v.literal(2), v.literal(3)),
        }))),
        energyLevel: v.optional(v.number()),
        timeOfDay: v.optional(v.union(
            v.literal("morning"),
            v.literal("midday"),
            v.literal("evening"),
            v.literal("night"),
        )),
        tags: v.optional(v.array(v.string())),
        isPinned: v.optional(v.boolean()),
        dreamData: v.optional(v.object({
            isLucid: v.optional(v.boolean()),
            isRecurring: v.optional(v.boolean()),
            dreamSigns: v.optional(v.array(v.string())),
            emotionalTone: v.optional(v.string()),
        })),
        gratitudeItems: v.optional(v.array(v.string())),
        location: v.optional(v.object({
            lat: v.number(),
            long: v.number(),
            city: v.optional(v.string()),
            country: v.optional(v.string()),
            displayName: v.optional(v.string()),
        })),
        photoId: v.optional(v.id("_storage")),
        photoCaption: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const entry = await ctx.db.get(args.entryId);
        if (!entry || entry.userId !== userId) {
            throw new Error("Entry not found");
        }

        const updates: any = { updatedAt: Date.now() };

        // Only update fields that are explicitly provided
        if (args.title !== undefined) updates.title = args.title;
        if (args.content !== undefined) {
            updates.content = args.content;
            updates.wordCount = wordCount(args.content);
        }
        if (args.mood !== undefined) {
            updates.mood = args.mood;
            updates.moodZone = deriveMoodZone(args.mood.valence, args.mood.arousal);
        }
        if (args.emotions !== undefined) updates.emotions = args.emotions;
        if (args.energyLevel !== undefined) updates.energyLevel = args.energyLevel;
        if (args.timeOfDay !== undefined) updates.timeOfDay = args.timeOfDay;
        if (args.tags !== undefined) updates.tags = args.tags;
        if (args.isPinned !== undefined) updates.isPinned = args.isPinned;
        if (args.dreamData !== undefined) updates.dreamData = args.dreamData;
        if (args.gratitudeItems !== undefined) updates.gratitudeItems = args.gratitudeItems;
        if (args.location !== undefined) updates.location = args.location;
        if (args.photoId !== undefined) updates.photoId = args.photoId;
        if (args.photoCaption !== undefined) updates.photoCaption = args.photoCaption;

        await ctx.db.patch(args.entryId, updates);
        return args.entryId;
    },
});

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════

export const deleteEntry = mutation({
    args: { entryId: v.id("journal_entries") },
    handler: async (ctx, { entryId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const entry = await ctx.db.get(entryId);
        if (!entry || entry.userId !== userId) {
            throw new Error("Entry not found");
        }

        // Delete stored photo if present
        if (entry.photoId) {
            try {
                await ctx.storage.delete(entry.photoId);
            } catch (e) {
                console.error("Failed to delete photo from storage:", e);
            }
        }

        await ctx.db.delete(entryId);
        return true;
    },
});