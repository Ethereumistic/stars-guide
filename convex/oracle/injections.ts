import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";

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

export const getFeatureInjection = query({
    args: { featureKey: v.string() },
    handler: async (ctx, { featureKey }) => {
        return await ctx.db
            .query("oracle_feature_injections")
            .withIndex("by_feature", (q) => q.eq("featureKey", featureKey))
            .first();
    },
});

export const listAllCategoryContexts = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        const contexts = await ctx.db.query("oracle_category_contexts").collect();

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

export const listAllFeatureInjections = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await ctx.db.query("oracle_feature_injections").collect();
    },
});

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

export const saveFeatureInjection = mutation({
    args: {
        featureKey: v.string(),
        contextText: v.string(),
    },
    handler: async (ctx, { featureKey, contextText }) => {
        const { userId } = await requireAdmin(ctx);
        const now = Date.now();

        const existing = await ctx.db
            .query("oracle_feature_injections")
            .withIndex("by_feature", (q) => q.eq("featureKey", featureKey))
            .first();

        if (existing) {
            await ctx.db.insert("oracle_prompt_versions", {
                entityType: "feature_injection",
                entityId: existing._id as string,
                content: existing.contextText,
                version: existing.version + 1,
                savedBy: userId,
                savedAt: now,
            });

            await ctx.db.patch(existing._id, {
                contextText,
                version: existing.version + 1,
                isActive: true,
                updatedAt: now,
            });
        } else {
            await ctx.db.insert("oracle_feature_injections", {
                featureKey,
                contextText,
                isActive: true,
                version: 1,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

export const getVersionHistory = query({
    args: {
        entityType: v.union(
            v.literal("soul_prompt"),
            v.literal("soul_doc"),
            v.literal("category_context"),
            v.literal("scenario_injection"),
            v.literal("feature_injection"),
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
