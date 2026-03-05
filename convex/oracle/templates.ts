import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";

// ─── PUBLIC QUERIES ───────────────────────────────────────────────────────

export const listTemplatesByCategory = query({
    args: { categoryId: v.id("oracle_categories") },
    handler: async (ctx, { categoryId }) => {
        return await ctx.db
            .query("oracle_templates")
            .withIndex("by_category_active", (q) =>
                q.eq("categoryId", categoryId).eq("isActive", true)
            )
            .collect()
            .then((tpls) => tpls.sort((a, b) => a.displayOrder - b.displayOrder));
    },
});

export const get = query({
    args: { id: v.id("oracle_templates") },
    handler: async (ctx, { id }) => {
        return await ctx.db.get(id);
    },
});

// ─── ADMIN QUERIES ────────────────────────────────────────────────────────

export const listAll = query({
    args: { categoryId: v.optional(v.id("oracle_categories")) },
    handler: async (ctx, { categoryId }) => {
        await requireAdmin(ctx);
        if (categoryId) {
            return await ctx.db
                .query("oracle_templates")
                .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
                .collect()
                .then((tpls) => tpls.sort((a, b) => a.displayOrder - b.displayOrder));
        }
        return await ctx.db
            .query("oracle_templates")
            .collect()
            .then((tpls) => tpls.sort((a, b) => a.displayOrder - b.displayOrder));
    },
});

// ─── ADMIN MUTATIONS ──────────────────────────────────────────────────────

export const create = mutation({
    args: {
        categoryId: v.id("oracle_categories"),
        questionText: v.string(),
        shortLabel: v.string(),
        requiresThirdParty: v.boolean(),
        displayOrder: v.number(),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const now = Date.now();

        return await ctx.db.insert("oracle_templates", {
            ...args,
            isActive: true,
            isDefault: false,
            createdAt: now,
            updatedAt: now,
        });
    },
});

export const update = mutation({
    args: {
        id: v.id("oracle_templates"),
        questionText: v.optional(v.string()),
        shortLabel: v.optional(v.string()),
        requiresThirdParty: v.optional(v.boolean()),
        displayOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { id, ...updates }) => {
        await requireAdmin(ctx);

        const filtered = Object.fromEntries(
            Object.entries(updates).filter(([, v]) => v !== undefined)
        );

        await ctx.db.patch(id, {
            ...filtered,
            updatedAt: Date.now(),
        });
    },
});
