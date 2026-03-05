import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";

// ─── PUBLIC QUERIES ───────────────────────────────────────────────────────

export const getCategoryContext = query({
    args: { categoryId: v.id("oracle_categories") },
    handler: async (ctx, { categoryId }) => {
        return await ctx.db
            .query("oracle_category_contexts")
            .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
            .first();
    },
});

export const getScenarioInjection = query({
    args: { templateId: v.id("oracle_templates") },
    handler: async (ctx, { templateId }) => {
        return await ctx.db
            .query("oracle_scenario_injections")
            .withIndex("by_template", (q) => q.eq("templateId", templateId))
            .first();
    },
});

// ─── ADMIN QUERIES ────────────────────────────────────────────────────────

export const listAllCategoryContexts = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        const contexts = await ctx.db.query("oracle_category_contexts").collect();

        // Attach category info
        return await Promise.all(
            contexts.map(async (c) => {
                const category = await ctx.db.get(c.categoryId);
                return {
                    ...c,
                    categoryName: category?.name ?? "Unknown",
                    categoryIcon: category?.icon ?? "",
                };
            })
        );
    },
});

export const listAllScenarioInjections = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        const injections = await ctx.db.query("oracle_scenario_injections").collect();

        return await Promise.all(
            injections.map(async (inj) => {
                const template = await ctx.db.get(inj.templateId);
                const category = template?.categoryId
                    ? await ctx.db.get(template.categoryId)
                    : null;
                return {
                    ...inj,
                    templateText: template?.questionText ?? "Unknown",
                    categoryName: category?.name ?? "Unknown",
                };
            })
        );
    },
});

// ─── ADMIN MUTATIONS ──────────────────────────────────────────────────────

export const saveCategoryContext = mutation({
    args: {
        categoryId: v.id("oracle_categories"),
        contextText: v.string(),
    },
    handler: async (ctx, { categoryId, contextText }) => {
        const { userId } = await requireAdmin(ctx);
        const now = Date.now();

        const existing = await ctx.db
            .query("oracle_category_contexts")
            .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
            .first();

        if (existing) {
            // Save version before overwriting
            await ctx.db.insert("oracle_prompt_versions", {
                entityType: "category_context",
                entityId: existing._id as string,
                content: existing.contextText,
                version: existing.version + 1,
                savedBy: userId,
                savedAt: now,
            });

            await ctx.db.patch(existing._id, {
                contextText,
                version: existing.version + 1,
                updatedAt: now,
            });
        } else {
            await ctx.db.insert("oracle_category_contexts", {
                categoryId,
                contextText,
                isActive: true,
                version: 1,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

export const saveScenarioInjection = mutation({
    args: {
        templateId: v.id("oracle_templates"),
        toneModifier: v.string(),
        psychologicalFrame: v.string(),
        avoid: v.string(),
        emphasize: v.string(),
        openingAcknowledgmentGuide: v.string(),
        rawInjectionText: v.optional(v.string()),
        useRawText: v.boolean(),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireAdmin(ctx);
        const now = Date.now();

        const existing = await ctx.db
            .query("oracle_scenario_injections")
            .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
            .first();

        if (existing) {
            // Save version before overwriting
            const versionContent = existing.useRawText
                ? existing.rawInjectionText ?? ""
                : JSON.stringify({
                    toneModifier: existing.toneModifier,
                    psychologicalFrame: existing.psychologicalFrame,
                    avoid: existing.avoid,
                    emphasize: existing.emphasize,
                    openingAcknowledgmentGuide: existing.openingAcknowledgmentGuide,
                });

            await ctx.db.insert("oracle_prompt_versions", {
                entityType: "scenario_injection",
                entityId: existing._id as string,
                content: versionContent,
                version: existing.version + 1,
                savedBy: userId,
                savedAt: now,
            });

            await ctx.db.patch(existing._id, {
                ...args,
                version: existing.version + 1,
                isActive: true,
                updatedAt: now,
            });
        } else {
            await ctx.db.insert("oracle_scenario_injections", {
                ...args,
                isActive: true,
                version: 1,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

// ─── VERSION HISTORY ──────────────────────────────────────────────────────

export const getVersionHistory = query({
    args: {
        entityType: v.union(
            v.literal("soul_prompt"),
            v.literal("category_context"),
            v.literal("scenario_injection"),
        ),
        entityId: v.string(),
    },
    handler: async (ctx, { entityType, entityId }) => {
        await requireAdmin(ctx);
        return await ctx.db
            .query("oracle_prompt_versions")
            .withIndex("by_entity", (q) =>
                q.eq("entityType", entityType).eq("entityId", entityId)
            )
            .order("desc")
            .collect();
    },
});
