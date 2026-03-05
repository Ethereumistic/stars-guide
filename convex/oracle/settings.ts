import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";

// ─── PUBLIC QUERY ─────────────────────────────────────────────────────────

export const getSetting = query({
    args: { key: v.string() },
    handler: async (ctx, { key }) => {
        return await ctx.db
            .query("oracle_settings")
            .withIndex("by_key", (q) => q.eq("key", key))
            .first();
    },
});

export const getSettingsByGroup = query({
    args: { group: v.string() },
    handler: async (ctx, { group }) => {
        return await ctx.db
            .query("oracle_settings")
            .withIndex("by_group", (q) => q.eq("group", group))
            .collect();
    },
});

// ─── ADMIN QUERIES ────────────────────────────────────────────────────────

export const listAllSettings = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await ctx.db.query("oracle_settings").collect();
    },
});

// ─── ADMIN MUTATIONS ──────────────────────────────────────────────────────

export const upsertSetting = mutation({
    args: {
        key: v.string(),
        value: v.string(),
        valueType: v.union(
            v.literal("string"),
            v.literal("number"),
            v.literal("boolean"),
            v.literal("json"),
        ),
        label: v.string(),
        description: v.optional(v.string()),
        group: v.string(),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireAdmin(ctx);

        // Validate value matches declared type
        if (args.valueType === "number" && isNaN(Number(args.value))) {
            throw new Error(`Value "${args.value}" is not a valid number`);
        }
        if (args.valueType === "boolean" && !["true", "false"].includes(args.value)) {
            throw new Error(`Value "${args.value}" must be "true" or "false"`);
        }
        if (args.valueType === "json") {
            try {
                JSON.parse(args.value);
            } catch {
                throw new Error(`Value is not valid JSON`);
            }
        }

        const existing = await ctx.db
            .query("oracle_settings")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                value: args.value,
                valueType: args.valueType,
                label: args.label,
                description: args.description,
                group: args.group,
                updatedAt: Date.now(),
                updatedBy: userId,
            });
            return existing._id;
        }

        return await ctx.db.insert("oracle_settings", {
            ...args,
            updatedAt: Date.now(),
            updatedBy: userId,
        });
    },
});

// ─── SOUL PROMPT SPECIFIC ─────────────────────────────────────────────────

export const saveSoulPrompt = mutation({
    args: { content: v.string() },
    handler: async (ctx, { content }) => {
        const { userId } = await requireAdmin(ctx);
        const now = Date.now();

        // Get current soul prompt setting
        const existing = await ctx.db
            .query("oracle_settings")
            .withIndex("by_key", (q) => q.eq("key", "soul_prompt"))
            .first();

        if (existing) {
            // Save old version before overwriting
            const versions = await ctx.db
                .query("oracle_prompt_versions")
                .withIndex("by_entity", (q) =>
                    q.eq("entityType", "soul_prompt").eq("entityId", "soul_prompt")
                )
                .collect();
            const nextVersion = versions.length + 1;

            await ctx.db.insert("oracle_prompt_versions", {
                entityType: "soul_prompt",
                entityId: "soul_prompt",
                content: existing.value,
                version: nextVersion,
                savedBy: userId,
                savedAt: now,
            });

            // Update current
            await ctx.db.patch(existing._id, {
                value: content,
                updatedAt: now,
                updatedBy: userId,
            });
        } else {
            await ctx.db.insert("oracle_settings", {
                key: "soul_prompt",
                value: content,
                valueType: "string",
                label: "Oracle Soul Prompt",
                description: "The core personality and behavioral rules for Oracle",
                group: "content",
                updatedAt: now,
                updatedBy: userId,
            });
        }
    },
});
