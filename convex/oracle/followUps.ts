import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";

// ─── PUBLIC QUERIES ───────────────────────────────────────────────────────

export const getFollowUpsByTemplate = query({
    args: { templateId: v.id("oracle_templates") },
    handler: async (ctx, { templateId }) => {
        const followUps = await ctx.db
            .query("oracle_follow_ups")
            .withIndex("by_template_active", (q) =>
                q.eq("templateId", templateId).eq("isActive", true)
            )
            .collect()
            .then((fus) => fus.sort((a, b) => a.displayOrder - b.displayOrder));

        // Attach options to each follow-up
        const withOptions = await Promise.all(
            followUps.map(async (fu) => {
                const options = await ctx.db
                    .query("oracle_follow_up_options")
                    .withIndex("by_follow_up", (q) => q.eq("followUpId", fu._id))
                    .collect()
                    .then((opts) =>
                        opts
                            .filter((o) => o.isActive)
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                    );
                return { ...fu, options };
            })
        );

        return withOptions;
    },
});

// ─── ADMIN QUERIES ────────────────────────────────────────────────────────

export const listAllByTemplate = query({
    args: { templateId: v.id("oracle_templates") },
    handler: async (ctx, { templateId }) => {
        await requireAdmin(ctx);
        const followUps = await ctx.db
            .query("oracle_follow_ups")
            .withIndex("by_template", (q) => q.eq("templateId", templateId))
            .collect()
            .then((fus) => fus.sort((a, b) => a.displayOrder - b.displayOrder));

        const withOptions = await Promise.all(
            followUps.map(async (fu) => {
                const options = await ctx.db
                    .query("oracle_follow_up_options")
                    .withIndex("by_follow_up", (q) => q.eq("followUpId", fu._id))
                    .collect()
                    .then((opts) => opts.sort((a, b) => a.displayOrder - b.displayOrder));
                return { ...fu, options };
            })
        );

        return withOptions;
    },
});

// ─── ADMIN MUTATIONS ──────────────────────────────────────────────────────

export const createFollowUp = mutation({
    args: {
        templateId: v.id("oracle_templates"),
        questionText: v.string(),
        questionType: v.union(
            v.literal("single_select"),
            v.literal("multi_select"),
            v.literal("free_text"),
            v.literal("date"),
            v.literal("sign_picker"),
            v.literal("conditional"),
        ),
        contextLabel: v.string(),
        displayOrder: v.number(),
        isRequired: v.boolean(),
        placeholder: v.optional(v.string()),
        conditionalOnFollowUpId: v.optional(v.id("oracle_follow_ups")),
        conditionalOnValue: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const now = Date.now();

        // Enforce max 3 follow-ups per template
        const existingCount = await ctx.db
            .query("oracle_follow_ups")
            .withIndex("by_template_active", (q) =>
                q.eq("templateId", args.templateId).eq("isActive", true)
            )
            .collect()
            .then((fus) => fus.length);

        // Read max from settings
        const maxSetting = await ctx.db
            .query("oracle_settings")
            .withIndex("by_key", (q) => q.eq("key", "max_follow_ups_per_template"))
            .first();
        const max = maxSetting ? parseInt(maxSetting.value) : 3;

        if (existingCount >= max) {
            throw new Error(`Maximum ${max} follow-ups per template. Deactivate one first.`);
        }

        return await ctx.db.insert("oracle_follow_ups", {
            ...args,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        });
    },
});

export const updateFollowUp = mutation({
    args: {
        id: v.id("oracle_follow_ups"),
        questionText: v.optional(v.string()),
        questionType: v.optional(v.union(
            v.literal("single_select"),
            v.literal("multi_select"),
            v.literal("free_text"),
            v.literal("date"),
            v.literal("sign_picker"),
            v.literal("conditional"),
        )),
        contextLabel: v.optional(v.string()),
        displayOrder: v.optional(v.number()),
        isRequired: v.optional(v.boolean()),
        placeholder: v.optional(v.string()),
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

// ─── FOLLOW-UP OPTIONS ────────────────────────────────────────────────────

export const createOption = mutation({
    args: {
        followUpId: v.id("oracle_follow_ups"),
        label: v.string(),
        value: v.string(),
        displayOrder: v.number(),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        return await ctx.db.insert("oracle_follow_up_options", {
            ...args,
            isActive: true,
        });
    },
});

export const updateOption = mutation({
    args: {
        id: v.id("oracle_follow_up_options"),
        label: v.optional(v.string()),
        value: v.optional(v.string()),
        displayOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { id, ...updates }) => {
        await requireAdmin(ctx);

        const filtered = Object.fromEntries(
            Object.entries(updates).filter(([, v]) => v !== undefined)
        );

        await ctx.db.patch(id, filtered);
    },
});

export const deleteOption = mutation({
    args: { id: v.id("oracle_follow_up_options") },
    handler: async (ctx, { id }) => {
        await requireAdmin(ctx);
        await ctx.db.delete(id);
    },
});
