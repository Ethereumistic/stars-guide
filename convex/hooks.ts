/**
 * hooks.ts — Convex functions for managing hook archetypes.
 *
 * Hook archetypes (Mirror, Permission, Gentle Provocation, Observation)
 * are the opening patterns for horoscope copy. They are DB-driven so new
 * archetypes can be added via the Hook Manager admin page with zero deploys.
 *
 * Internal functions are called by the AI generation action.
 * Public queries/mutations are used by the admin Hook Manager UI.
 */
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/adminGuard";

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL FUNCTIONS (used by the AI generation pipeline)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * listActiveInternal — Fetch all active hooks. Used by the generation action
 * to build the hook injection block.
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
 * getAssignedHook — Determines which hook archetype to use for a generation.
 *
 * Priority:
 * 1. If hookId is provided (manual admin selection), use that hook directly
 * 2. Otherwise, auto-match by moonPhaseCategory (e.g. "full_moon" → Observation Hook)
 * 3. Fallback: return the first active hook
 */
export const getAssignedHook = internalQuery({
    args: {
        hookId: v.optional(v.id("hooks")),
        moonPhaseCategory: v.optional(v.string()), // "new_moon" | "waxing" | "full_moon" | "waning"
    },
    handler: async (ctx, args) => {
        // 1. Manual selection
        if (args.hookId) {
            const hook = await ctx.db.get(args.hookId);
            if (hook && hook.isActive) return hook;
        }

        // 2. Auto-match by moon phase
        if (args.moonPhaseCategory) {
            const allActive = await ctx.db
                .query("hooks")
                .withIndex("by_active", (q) => q.eq("isActive", true))
                .collect();

            const matched = allActive.find(
                (h) => h.moonPhaseMapping === args.moonPhaseCategory
            );
            if (matched) return matched;

            // 3. Fallback: first active hook
            if (allActive.length > 0) return allActive[0];
        }

        // Ultimate fallback: any active hook
        return await ctx.db
            .query("hooks")
            .withIndex("by_active", (q) => q.eq("isActive", true))
            .first();
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
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        return await ctx.db.insert("hooks", {
            name: args.name,
            description: args.description,
            examples: args.examples,
            isActive: args.isActive,
            moonPhaseMapping: args.moonPhaseMapping,
            createdAt: Date.now(),
            updatedAt: Date.now(),
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
 */
export const seed = mutation({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);

        // Check if hooks already exist
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
