/**
 * cosmicWeather.ts — Convex functions for computing, storing, and
 * serving daily astronomical snapshots (Cosmic Weather).
 *
 * Internal functions are called by the cron job and the AI generation
 * action. The public query + mutation are used by the admin dashboard.
 */
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { query, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { computeSnapshot, getMoonPhaseFrame } from "./lib/astronomyEngine";
import { requireAdmin } from "./lib/adminGuard";

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL FUNCTIONS (used by cron + AI generation action)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * getForDate — Fetch the cosmic weather snapshot for a specific date.
 * Returns null if not yet computed.
 */
export const getForDate = internalQuery({
    args: { date: v.string() },
    handler: async (ctx, { date }) => {
        return await ctx.db
            .query("cosmicWeather")
            .withIndex("by_date", (q) => q.eq("date", date))
            .unique();
    },
});

/**
 * upsertSnapshot — Write the computed snapshot to DB.
 * Idempotent: if a record for the date already exists, it gets patched.
 */
export const upsertSnapshot = internalMutation({
    args: {
        date: v.string(),
        planetPositions: v.array(v.object({
            planet: v.string(),
            sign: v.string(),
            degreeInSign: v.number(),
            isRetrograde: v.boolean(),
        })),
        moonPhase: v.object({
            name: v.string(),
            illuminationPercent: v.number(),
        }),
        activeAspects: v.array(v.object({
            planet1: v.string(),
            planet2: v.string(),
            aspect: v.string(),
            orbDegrees: v.number(),
        })),
        generatedAt: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("cosmicWeather")
            .withIndex("by_date", (q) => q.eq("date", args.date))
            .unique();
        if (existing) {
            await ctx.db.patch(existing._id, args);
        } else {
            await ctx.db.insert("cosmicWeather", args);
        }
    },
});

/**
 * computeAndStore — Compute the astronomical snapshot and persist it.
 * Safe to call multiple times (idempotent via upsert).
 */
export const computeAndStore = internalAction({
    args: { date: v.string() },
    handler: async (ctx, { date }) => {
        const snapshot = computeSnapshot(date);
        await ctx.runMutation(internal.cosmicWeather.upsertSnapshot, {
            date,
            ...snapshot,
            generatedAt: Date.now(),
        });
    },
});

/**
 * dailyCosmicWeatherJob — Date-aware wrapper for the cron.
 * Convex crons can't pass dynamic args, so this computes the current
 * UTC date and then calls computeAndStore.
 */
export const dailyCosmicWeatherJob = internalAction({
    args: {},
    handler: async (ctx) => {
        const today = new Date().toISOString().split("T")[0];
        await ctx.runAction(internal.cosmicWeather.computeAndStore, { date: today });
    },
});

/**
 * storeFeltLanguage — Internal mutation to persist felt language on a cosmic weather record.
 */
export const storeFeltLanguage = internalMutation({
    args: {
        date: v.string(),
        feltLanguage: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("cosmicWeather")
            .withIndex("by_date", (q) => q.eq("date", args.date))
            .unique();
        if (existing) {
            await ctx.db.patch(existing._id, {
                feltLanguage: args.feltLanguage,
                feltLanguageGeneratedAt: Date.now(),
            });
        }
    },
});

/**
 * generateFeltLanguage — Translates raw cosmic weather into felt emotional language.
 * Called by cron after cosmic weather is computed.
 * Idempotent: skips if feltLanguage already exists (unless forced).
 */
export const generateFeltLanguage = internalAction({
    args: {
        date: v.string(),
        force: v.optional(v.boolean()),
    },
    handler: async (ctx, { date, force }) => {
        // Fetch the snapshot
        const snapshot = await ctx.runQuery(internal.cosmicWeather.getForDate, { date });
        if (!snapshot) {
            console.warn(`No cosmic weather found for ${date}, skipping felt language generation.`);
            return;
        }

        // Skip if already generated (unless forced)
        if (snapshot.feltLanguage && !force) {
            console.log(`Felt language already exists for ${date}, skipping.`);
            return;
        }

        // Resolve provider from oracle_settings (fallback to OpenRouter)
        const providersRaw = (await ctx.runQuery(internal.aiQueries.getOracleProvidersConfig, {})) ?? undefined;
        const { parseProvidersConfig, resolveProvider, callLLMEndpoint } = await import("./lib/llmProvider");
        const providers = parseProvidersConfig(providersRaw);
        const provider = resolveProvider(providers);

        const apiKey = process.env[provider.apiKeyEnvVar];
        if (!apiKey && provider.type !== "ollama") {
            console.error(`API key ${provider.apiKeyEnvVar} not set, cannot generate felt language.`);
            return;
        }

        // Build the translation prompt
        const moonFrame = getMoonPhaseFrame(snapshot.moonPhase.name);

        const retrogrades = snapshot.planetPositions.filter((p) => p.isRetrograde);
        const retroLine = retrogrades.length > 0
            ? retrogrades.map((p) => p.planet).join(", ")
            : "none";

        const aspectsLine = snapshot.activeAspects.length > 0
            ? snapshot.activeAspects
                .map((a) => `${a.planet1} ${a.aspect} ${a.planet2} (orb: ${a.orbDegrees}°)`)
                .join("; ")
            : "No exact aspects today.";

        try {
            const { content } = await callLLMEndpoint({
                provider,
                model: "google/gemini-2.5-flash-lite",
                messages: [
                    {
                        role: "system",
                        content: `You are an astrology translator. Your job is to convert raw astronomical data 
into emotionally resonant felt language for horoscope writers.
Rules:
- Never name a planet directly
- Never name a sign directly  
- Write 4-6 sentences of felt human experience
- Focus on collective mood: what energy is in the air
- No prediction, no advice — only description of the energetic climate
- No mention of degrees, orbs, or technical terms
Output only the paragraph, no preamble.`,
                    },
                    {
                        role: "user",
                        content: `Translate this astronomical snapshot to felt language:

Moon: ${snapshot.moonPhase.name}, ${snapshot.moonPhase.illuminationPercent}% illuminated
Active Aspects: ${aspectsLine}
Retrogrades: ${retroLine}
Moon Phase Frame: ${moonFrame}`,
                    },
                ],
                temperature: 0.4,
                maxTokens: 300,
                title: "Stars.Guide Felt Language",
            });

            await ctx.runMutation(internal.cosmicWeather.storeFeltLanguage, {
                date,
                feltLanguage: content.trim(),
            });
            console.log(`Felt language generated for ${date} via ${provider.name}`);
        } catch (err) {
            console.error(`Failed to generate felt language for ${date}:`, err);
        }
    },
});

/**
 * dailyFeltLanguageJob — Cron wrapper that generates felt language for today.
 */
export const dailyFeltLanguageJob = internalAction({
    args: {},
    handler: async (ctx) => {
        const today = new Date().toISOString().split("T")[0];
        await ctx.runAction(internal.cosmicWeather.generateFeltLanguage, {
            date: today,
            force: false,
        });
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC FUNCTIONS (used by journal and other user-facing features)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * getForPublicDate — Fetch cosmic weather for a specific date.
 * No admin guard required. Used by journal astro context display.
 */
export const getForPublicDate = query({
    args: { date: v.string() },
    handler: async (ctx, { date }) => {
        return await ctx.db
            .query("cosmicWeather")
            .withIndex("by_date", (q) => q.eq("date", date))
            .unique();
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN-FACING FUNCTIONS (used by the dashboard UI)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * getCosmicWeatherForAdmin — Fetch today's cosmic weather for the admin
 * dashboard card. Returns null if not yet computed.
 */
export const getCosmicWeatherForAdmin = query({
    args: { date: v.string() },
    handler: async (ctx, { date }) => {
        await requireAdmin(ctx);
        return await ctx.db
            .query("cosmicWeather")
            .withIndex("by_date", (q) => q.eq("date", date))
            .unique();
    },
});

/**
 * recomputeCosmicWeather — Admin "Recompute" button.
 * Schedules the computeAndStore action for the given date.
 */
export const recomputeCosmicWeather = action({
    args: { date: v.string() },
    handler: async (ctx, { date }) => {
        await ctx.runAction(internal.cosmicWeather.computeAndStore, { date });
    },
});

/**
 * generateFeltLanguageAction — Admin "Generate Felt Language" button.
 * Translates cosmic weather into felt language on demand.
 */
export const generateFeltLanguageAction = action({
    args: {
        date: v.string(),
        force: v.optional(v.boolean()),
    },
    handler: async (ctx, { date, force }) => {
        const userId = await ctx.runQuery(internal.aiQueries.validateAdmin, {});
        if (!userId) throw new Error("UNAUTHORIZED: Admin access required");

        await ctx.runAction(internal.cosmicWeather.generateFeltLanguage, {
            date,
            force: force ?? false,
        });
    },
});
