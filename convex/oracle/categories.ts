import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";

// ─── PUBLIC QUERIES ───────────────────────────────────────────────────────

export const listActiveCategories = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("oracle_categories")
            .withIndex("by_active", (q) => q.eq("isActive", true))
            .collect()
            .then((cats) => cats.sort((a, b) => a.displayOrder - b.displayOrder));
    },
});

export const getBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, { slug }) => {
        return await ctx.db
            .query("oracle_categories")
            .withIndex("by_slug", (q) => q.eq("slug", slug))
            .first();
    },
});

// ─── ADMIN QUERIES ────────────────────────────────────────────────────────

export const listAll = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await ctx.db
            .query("oracle_categories")
            .collect()
            .then((cats) => cats.sort((a, b) => a.displayOrder - b.displayOrder));
    },
});

// ─── ADMIN MUTATIONS ──────────────────────────────────────────────────────

export const create = mutation({
    args: {
        name: v.string(),
        slug: v.string(),
        icon: v.string(),
        description: v.string(),
        displayOrder: v.number(),
        color: v.string(),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const now = Date.now();

        // Validate slug uniqueness
        const existing = await ctx.db
            .query("oracle_categories")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();
        if (existing) throw new Error(`Category with slug "${args.slug}" already exists`);

        return await ctx.db.insert("oracle_categories", {
            ...args,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        });
    },
});

export const update = mutation({
    args: {
        id: v.id("oracle_categories"),
        name: v.optional(v.string()),
        slug: v.optional(v.string()),
        icon: v.optional(v.string()),
        description: v.optional(v.string()),
        displayOrder: v.optional(v.number()),
        color: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { id, ...updates }) => {
        await requireAdmin(ctx);

        // Validate slug uniqueness if changing
        if (updates.slug) {
            const existing = await ctx.db
                .query("oracle_categories")
                .withIndex("by_slug", (q) => q.eq("slug", updates.slug!))
                .first();
            if (existing && existing._id !== id) {
                throw new Error(`Category with slug "${updates.slug}" already exists`);
            }
        }

        const filtered = Object.fromEntries(
            Object.entries(updates).filter(([, v]) => v !== undefined)
        );

        await ctx.db.patch(id, {
            ...filtered,
            updatedAt: Date.now(),
        });
    },
});

export const updateDisplayOrders = mutation({
    args: {
        orders: v.array(v.object({
            id: v.id("oracle_categories"),
            displayOrder: v.number(),
        })),
    },
    handler: async (ctx, { orders }) => {
        await requireAdmin(ctx);
        for (const { id, displayOrder } of orders) {
            await ctx.db.patch(id, { displayOrder, updatedAt: Date.now() });
        }
    },
});
