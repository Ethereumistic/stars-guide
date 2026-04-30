/**
 * hooks.ts — Convex functions for managing hook archetypes.
 *
 * v4: Hook selection now uses emotional register matching as primary filter,
 * moon phase as secondary, with weighted random selection (lower usageCount = higher weight).
 *
 * Internal functions are called by the AI generation action.
 * Public queries/mutations are used by the admin Hook Manager UI.
 */
import { query, mutation, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/adminGuard";

const EMOTIONAL_REGISTERS = [
    "anxious", "expansive", "tender", "defiant",
    "restless", "hopeful", "grief", "clarity",
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL FUNCTIONS (used by the AI generation pipeline)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * listActiveInternal — Fetch all active hooks. Used by the generation action.
 */
export const listActiveInternal = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("hooks")
            .withIndex("by_active", (q) => q.eq("isActive", true))
            .collect();
    },
});

/**
 * getAssignedHook — v4: Determines which hook archetype to use for a generation.
 *
 * Selection priority:
 * 1. Manual override (hookId provided) → use directly if active
 * 2. Filter by emotional register (OR logic — any overlap with zeitgeist registers)
 * 3. Within register matches, prefer moon phase alignment
 * 4. Weighted random selection (lower usageCount = higher weight)
 */
export const getAssignedHook = internalQuery({
    args: {
        hookId: v.optional(v.id("hooks")),
        moonPhaseCategory: v.optional(v.string()),
        emotionalRegister: v.optional(v.array(v.string())), // v4: from zeitgeist
    },
    handler: async (ctx, args) => {
        // 1. Manual selection
        if (args.hookId) {
            const hook = await ctx.db.get(args.hookId);
            if (hook && hook.isActive) return hook;
        }

        // 2. Get all active hooks
        const allActive = await ctx.db
            .query("hooks")
            .withIndex("by_active", (q) => q.eq("isActive", true))
            .collect();

        if (allActive.length === 0) return null;

        // 3. Filter by emotional register match (OR logic)
        const registers = args.emotionalRegister ?? [];
        const registerMatches = registers.length > 0
            ? allActive.filter((h) =>
                h.emotionalRegisters.length === 0 ||
                h.emotionalRegisters.some((r) => registers.includes(r))
            )
            : allActive;

        // 4. Within register matches, prefer moon phase alignment
        const moonPhaseCategory = args.moonPhaseCategory;
        const moonMatches = moonPhaseCategory
            ? registerMatches.filter((h) =>
                h.moonPhaseMapping === moonPhaseCategory ||
                h.moonPhaseMapping === "any" ||
                !h.moonPhaseMapping
            )
            : [];

        // 5. Select from best pool, falling back up the chain
        const pool = moonMatches.length > 0 ? moonMatches :
                     registerMatches.length > 0 ? registerMatches :
                     allActive;

        // 6. Weighted random selection (lower usageCount = higher weight)
        return weightedRandomSelect(pool);
    },
});

/**
 * weightedRandomSelect — Selects a hook with weighted probability.
 * Hooks with lower usageCount get higher weight: weight = 1 / (usageCount + 1)
 */
function weightedRandomSelect<T extends { usageCount: number }>(items: T[]): T {
    if (items.length === 1) return items[0];

    const weights = items.map((h) => 1 / (h.usageCount + 1));
    const total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;

    for (let i = 0; i < items.length; i++) {
        rand -= weights[i];
        if (rand <= 0) return items[i];
    }
    return items[items.length - 1];
}

/**
 * incrementHookUsage — Called after a hook is used in generation.
 */
export const incrementHookUsage = internalMutation({
    args: { hookId: v.id("hooks") },
    handler: async (ctx, args) => {
        const hook = await ctx.db.get(args.hookId);
        if (!hook) return;
        await ctx.db.patch(args.hookId, {
            usageCount: hook.usageCount + 1,
        });
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN-FACING FUNCTIONS (used by the Hook Manager UI)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * getAll — Fetch all hooks for the admin Hook Manager page.
 */
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await ctx.db.query("hooks").collect();
    },
});

/**
 * create — Create a new hook archetype.
 */
export const create = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        examples: v.array(v.string()),
        isActive: v.boolean(),
        moonPhaseMapping: v.optional(v.string()),
        emotionalRegisters: v.optional(v.array(v.string())),
        source: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const now = Date.now();
        return await ctx.db.insert("hooks", {
            name: args.name,
            description: args.description,
            examples: args.examples,
            isActive: args.isActive,
            moonPhaseMapping: args.moonPhaseMapping,
            emotionalRegisters: args.emotionalRegisters ?? [],
            source: args.source ?? "admin_written",
            approvedAt: args.isActive ? now : undefined,
            usageCount: 0,
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * update — Update an existing hook archetype.
 */
export const update = mutation({
    args: {
        hookId: v.id("hooks"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        examples: v.optional(v.array(v.string())),
        isActive: v.optional(v.boolean()),
        moonPhaseMapping: v.optional(v.string()),
        emotionalRegisters: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const hook = await ctx.db.get(args.hookId);
        if (!hook) throw new Error("Hook not found");

        const patch: Record<string, unknown> = { updatedAt: Date.now() };
        if (args.name !== undefined) patch.name = args.name;
        if (args.description !== undefined) patch.description = args.description;
        if (args.examples !== undefined) patch.examples = args.examples;
        if (args.isActive !== undefined) patch.isActive = args.isActive;
        if (args.moonPhaseMapping !== undefined) patch.moonPhaseMapping = args.moonPhaseMapping;
        if (args.emotionalRegisters !== undefined) patch.emotionalRegisters = args.emotionalRegisters;

        await ctx.db.patch(args.hookId, patch);
    },
});

/**
 * toggleActive — Toggle a hook's active/inactive state.
 */
export const toggleActive = mutation({
    args: { hookId: v.id("hooks") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const hook = await ctx.db.get(args.hookId);
        if (!hook) throw new Error("Hook not found");

        await ctx.db.patch(args.hookId, {
            isActive: !hook.isActive,
            updatedAt: Date.now(),
        });
    },
});

/**
 * approveHook — Approve an AI-proposed hook for production use.
 */
export const approveHook = mutation({
    args: { hookId: v.id("hooks") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const hook = await ctx.db.get(args.hookId);
        if (!hook) throw new Error("Hook not found");

        await ctx.db.patch(args.hookId, {
            isActive: true,
            approvedAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

/**
 * deleteHook — Permanently remove a hook archetype.
 */
export const deleteHook = mutation({
    args: { hookId: v.id("hooks") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const hook = await ctx.db.get(args.hookId);
        if (!hook) throw new Error("Hook not found");
        await ctx.db.delete(args.hookId);
    },
});

/**
 * seed — Populate the initial 4 hook archetypes on first deploy.
 * Idempotent: skips if hooks already exist.
 * v4: Adds new fields with backwards-compatible defaults.
 */
export const seed = mutation({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);

        const existing = await ctx.db.query("hooks").first();
        if (existing) return { status: "skipped", message: "Hooks already seeded" };

        const now = Date.now();
        const initialHooks = [
            {
                name: "The Mirror Hook",
                description: "Names something the reader is probably already doing or feeling. The reader's reaction should be \"...how did you know?\"",
                examples: [
                    "Still refreshing that one app, hoping the news has changed?",
                    "You've been moving fast lately — but do you actually know where you're going?",
                    "You keep checking on the same thing, even though nothing has changed since last time.",
                ],
                isActive: true,
                moonPhaseMapping: "waxing",
                emotionalRegisters: [],
                source: "curated",
                approvedAt: now,
                usageCount: 0,
                createdAt: now,
                updatedAt: now,
            },
            {
                name: "The Permission Hook",
                description: "Gives the reader explicit permission to feel or do something they've been denying themselves. Deeply validating.",
                examples: [
                    "You're allowed to not have a plan right now.",
                    "Resting isn't falling behind. You know that, right?",
                    "You don't owe anyone an explanation for needing a day off.",
                ],
                isActive: true,
                moonPhaseMapping: "new_moon",
                emotionalRegisters: [],
                source: "curated",
                approvedAt: now,
                usageCount: 0,
                createdAt: now,
                updatedAt: now,
            },
            {
                name: "The Gentle Provocation",
                description: "Challenges a pattern with warmth — not accusation. Creates a moment of self-recognition.",
                examples: [
                    "When did you last do something just because it felt good — not because it was productive?",
                    "You keep waiting for the right moment. What if this is it?",
                    "How long are you going to keep pretending that doesn't bother you?",
                ],
                isActive: true,
                moonPhaseMapping: "waning",
                emotionalRegisters: [],
                source: "curated",
                approvedAt: now,
                usageCount: 0,
                createdAt: now,
                updatedAt: now,
            },
            {
                name: "The Observation Hook",
                description: "Describes the reader's current situation back to them as if the horoscope has been watching. Creates the strongest \"it's reading my life\" response.",
                examples: [
                    "Something shifted for you recently. You might not be able to name it yet, but you feel it.",
                    "You've been carrying something you haven't told anyone about.",
                    "There's a version of this situation you keep replaying in your head, wondering if you got it right.",
                ],
                isActive: true,
                moonPhaseMapping: "full_moon",
                emotionalRegisters: [],
                source: "curated",
                approvedAt: now,
                usageCount: 0,
                createdAt: now,
                updatedAt: now,
            },
        ];

        for (const hook of initialHooks) {
            await ctx.db.insert("hooks", hook);
        }

        return { status: "seeded", message: "4 hook archetypes created" };
    },
});

/**
 * proposeHooksAction — AI-powered hook proposal generator.
 * Generates candidate hooks via OpenRouter and saves them as inactive ai_proposed.
 */
export const proposeHooksAction = internalAction({
    args: {
        emotionalRegisters: v.array(v.string()),
        count: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

        const count = args.count ?? 5;
        const registers = args.emotionalRegisters.join(", ");

        const payload = {
            model: "google/gemini-2.5-flash-lite",
            messages: [
                {
                    role: "system",
                    content: `You are a copywriter for a premium astrology platform.
Write opening hooks for daily horoscopes.
A hook is 1-2 sentences. It is the first thing a reader sees.
Hook types: mirror (names what reader is doing), permission (validates a feeling),
            provocation (gentle challenge), observation (describes their situation).
Rules:
- No astrology jargon
- No mention of planets, signs, or dates
- Universal — must resonate with any nationality
- Present tense
- No questions unless rhetorical
Output ONLY a JSON array of strings.`,
                },
                {
                    role: "user",
                    content: `Generate ${count} hooks for emotional register: [${registers}]`,
                },
            ],
            temperature: 0.8,
            max_tokens: 1000,
            response_format: { type: "json_object" },
        };

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://stars.guide",
                "X-Title": "Stars.Guide Hook Proposer",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`OpenRouter API error ${response.status}: ${errorBody}`);
        }

        const data = await response.json() as any;
        const content = data?.choices?.[0]?.message?.content;
        if (!content) throw new Error("OpenRouter returned empty content");

        // Parse the JSON array
        let hooks: string[];
        try {
            const parsed = JSON.parse(content.replace(/```json\n?|```/g, "").trim());
            hooks = Array.isArray(parsed) ? parsed : parsed.hooks ?? [];
        } catch {
            throw new Error("Failed to parse hook proposals");
        }

        return hooks.slice(0, count);
    },
});
