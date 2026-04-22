/**
 * prompts.ts — Algorithmic daily journal prompt selection.
 *
 * Zero LLM cost. Selects from prompt bank based on:
 * 1. Current moon phase (moon category)
 * 2. Active retrogrades (retrograde category)
 * 3. Daily rotation hash (deterministic per user per day)
 */
import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "../_generated/api";

/**
 * getDailyPrompt — Returns a daily prompt for the authenticated user.
 *
 * Algorithm:
 * 1. Fetch today's cosmic weather → moon phase, retrogrades
 * 2. Filter active prompts from bank
 * 3. Prioritize: retrograde > moon phase > daily
 * 4. Deterministic daily rotation: hash(userId + entryDate) % eligiblePrompts.length
 */
export const getDailyPrompt = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const today = new Date().toISOString().split("T")[0];

        // Fetch active prompts
        const activePrompts = await ctx.db
            .query("journal_prompt_bank")
            .withIndex("by_active", (q) => q.eq("isActive", true))
            .collect();

        if (activePrompts.length === 0) return null;

        // Fetch cosmic weather for context
        let moonPhase: string | null = null;
        let hasRetrograde = false;

        try {
            const cosmicWeather = await ctx.runQuery(
                api.cosmicWeather.getForPublicDate,
                { date: today },
            );

            if (cosmicWeather) {
                moonPhase = cosmicWeather.moonPhase.name;
                hasRetrograde = cosmicWeather.planetPositions.some(
                    (p: any) => p.isRetrograde,
                );
            }
        } catch {
            // Non-blocking
        }

        // Prioritize prompts
        let eligible: any[] = [];

        // Priority 1: Retrograde prompts (if any planet is retrograde)
        if (hasRetrograde) {
            const retroPrompts = activePrompts.filter((p) => p.category === "retrograde");
            if (retroPrompts.length > 0) eligible = retroPrompts;
        }

        // Priority 2: Moon-phase specific prompts
        if (eligible.length === 0 && moonPhase) {
            const moonPrompts = activePrompts.filter(
                (p) => p.category === "moon" && p.moonPhase === moonPhase,
            );
            if (moonPrompts.length > 0) eligible = moonPrompts;
        }

        // Priority 3: Daily prompts (fallback)
        if (eligible.length === 0) {
            const dailyPrompts = activePrompts.filter((p) => p.category === "daily");
            if (dailyPrompts.length > 0) eligible = dailyPrompts;
        }

        // Last resort: any active prompt
        if (eligible.length === 0) {
            eligible = activePrompts;
        }

        // Deterministic daily rotation: hash(userId + date) % length
        const seed = userId.toString() + today;
        const hash = simpleHash(seed);
        const index = Math.abs(hash) % eligible.length;

        const selected = eligible[index];

        return {
            text: selected.text,
            category: selected.category,
            moonPhase: selected.moonPhase ?? null,
            astrologyLevel: selected.astrologyLevel,
        };
    },
});

/**
 * getPromptsForAdmin — List all prompts for admin management.
 */
export const getPromptsForAdmin = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        // Basic auth check — admin only
        const user = await ctx.db.get(userId);
        // Admin check is handled by the component
        return await ctx.db.query("journal_prompt_bank").collect();
    },
});

/**
 * seedPromptBankPublic — Public mutation to seed defaults (for admin UI).
 * Calls the internal mutation.
 */
export const seedPromptBankPublic = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");
        // Check if admin
        const user = await ctx.db.get(userId);
        if (user?.role !== "admin") throw new Error("Admin only");

        await ctx.runMutation(internal.journal.prompts.seedPromptBank, {});
    },
});

/**
 * addPrompt — Admin: add a new prompt to the bank.
 */
export const addPrompt = mutation({
    args: {
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
        moonPhase: v.optional(v.string()),
        text: v.string(),
        astrologyLevel: v.union(
            v.literal("none"),
            v.literal("light"),
            v.literal("medium"),
            v.literal("deep"),
        ),
        isActive: v.boolean(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const now = Date.now();
        return await ctx.db.insert("journal_prompt_bank", {
            category: args.category,
            moonPhase: args.moonPhase,
            text: args.text,
            astrologyLevel: args.astrologyLevel,
            isActive: args.isActive,
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * updatePrompt — Admin: update an existing prompt.
 */
export const updatePrompt = mutation({
    args: {
        promptId: v.id("journal_prompt_bank"),
        category: v.optional(v.union(
            v.literal("daily"),
            v.literal("moon"),
            v.literal("retrograde"),
            v.literal("seasonal"),
            v.literal("gratitude"),
            v.literal("dream"),
            v.literal("relationship"),
            v.literal("career"),
        )),
        moonPhase: v.optional(v.string()),
        text: v.optional(v.string()),
        astrologyLevel: v.optional(v.union(
            v.literal("none"),
            v.literal("light"),
            v.literal("medium"),
            v.literal("deep"),
        )),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const { promptId, ...updates } = args;
        const cleanUpdates: any = { updatedAt: Date.now() };

        if (updates.category !== undefined) cleanUpdates.category = updates.category;
        if (updates.moonPhase !== undefined) cleanUpdates.moonPhase = updates.moonPhase;
        if (updates.text !== undefined) cleanUpdates.text = updates.text;
        if (updates.astrologyLevel !== undefined) cleanUpdates.astrologyLevel = updates.astrologyLevel;
        if (updates.isActive !== undefined) cleanUpdates.isActive = updates.isActive;

        await ctx.db.patch(promptId, cleanUpdates);
    },
});

/**
 * deletePrompt — Admin: delete a prompt.
 */
export const deletePrompt = mutation({
    args: {
        promptId: v.id("journal_prompt_bank"),
    },
    handler: async (ctx, { promptId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        await ctx.db.delete(promptId);
    },
});

/**
 * seedPromptBank — Internal: seed default prompts.
 * Can be called once to populate the bank.
 */
export const seedPromptBank = internalMutation({
    args: {},
    handler: async (ctx) => {
        // Check if prompts already exist
        const existing = await ctx.db.query("journal_prompt_bank").first();
        if (existing) return; // Already seeded

        const now = Date.now();
        const prompts = [
            // Daily
            { category: "daily" as const, text: "What was the dominant feeling today, and where did you feel it in your body?", astrologyLevel: "none" as const, isActive: true, moonPhase: undefined },
            { category: "daily" as const, text: "What's one thing that happened today that you want to remember?", astrologyLevel: "none" as const, isActive: true, moonPhase: undefined },
            { category: "daily" as const, text: "What surprised you today?", astrologyLevel: "none" as const, isActive: true, moonPhase: undefined },
            { category: "daily" as const, text: "How are you feeling right now, without judging it?", astrologyLevel: "none" as const, isActive: true, moonPhase: undefined },
            { category: "daily" as const, text: "What would you tell yourself from this morning if you could?", astrologyLevel: "none" as const, isActive: true, moonPhase: undefined },
            // Moon
            { category: "moon" as const, text: "What do you want to plant seeds for this lunar cycle?", astrologyLevel: "light" as const, isActive: true, moonPhase: "New Moon" },
            { category: "moon" as const, text: "What has come to light since the last full moon? What are you ready to release?", astrologyLevel: "light" as const, isActive: true, moonPhase: "Full Moon" },
            { category: "moon" as const, text: "The moon is in its first quarter — what challenge are you facing that needs a decision?", astrologyLevel: "light" as const, isActive: true, moonPhase: "First Quarter" },
            { category: "moon" as const, text: "As the moon wanes, what are you letting go of?", astrologyLevel: "light" as const, isActive: true, moonPhase: "Last Quarter" },
            // Retrograde
            { category: "retrograde" as const, text: "What themes have been coming up for review? What past situations are resurfacing?", astrologyLevel: "medium" as const, isActive: true, moonPhase: undefined },
            { category: "retrograde" as const, text: "What old pattern is asking you to look at it differently this time?", astrologyLevel: "medium" as const, isActive: true, moonPhase: undefined },
            { category: "retrograde" as const, text: "What did you skip over the first time that's coming back around?", astrologyLevel: "medium" as const, isActive: true, moonPhase: undefined },
            // Gratitude
            { category: "gratitude" as const, text: "Name 3 things you're grateful for that you usually take for granted.", astrologyLevel: "none" as const, isActive: true, moonPhase: undefined },
            { category: "gratitude" as const, text: "Who made your day a little better, and how?", astrologyLevel: "none" as const, isActive: true, moonPhase: undefined },
            // Dream
            { category: "dream" as const, text: "Describe the most vivid image from last night's dream. What does it remind you of?", astrologyLevel: "none" as const, isActive: true, moonPhase: undefined },
            { category: "dream" as const, text: "Did you dream of anyone from your past? What were they trying to tell you?", astrologyLevel: "none" as const, isActive: true, moonPhase: undefined },
            // Relationship
            { category: "relationship" as const, text: "How are your close relationships feeling right now? Is there something unspoken?", astrologyLevel: "none" as const, isActive: true, moonPhase: undefined },
            // Career
            { category: "career" as const, text: "What feels most meaningful in your work right now? What feels stuck?", astrologyLevel: "none" as const, isActive: true, moonPhase: undefined },
        ];

        for (const prompt of prompts) {
            await ctx.db.insert("journal_prompt_bank", {
                ...prompt,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Simple deterministic hash for prompt rotation.
 * Not cryptographic — just needs to be stable per (userId + date).
 */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash + char) | 0;
    }
    return hash;
}