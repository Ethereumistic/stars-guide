/**
 * settings.ts — Journal admin settings CRUD.
 * Mirrors the pattern from convex/oracle/settings.ts.
 */
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/adminGuard";

export const listAllSettings = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await ctx.db.query("journal_settings").collect();
    },
});

export const getSetting = query({
    args: { key: v.string() },
    handler: async (ctx, { key }) => {
        await requireAdmin(ctx);
        return await ctx.db
            .query("journal_settings")
            .withIndex("by_key", (q) => q.eq("key", key))
            .first();
    },
});

export const getSettingsByGroup = query({
    args: { group: v.string() },
    handler: async (ctx, { group }) => {
        await requireAdmin(ctx);
        return await ctx.db
            .query("journal_settings")
            .withIndex("by_group", (q) => q.eq("group", group))
            .collect();
    },
});

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

        if (args.valueType === "number" && Number.isNaN(Number(args.value))) {
            throw new Error(`Value "${args.value}" is not a valid number`);
        }

        if (args.valueType === "boolean" && !["true", "false"].includes(args.value)) {
            throw new Error(`Value "${args.value}" must be "true" or "false"`);
        }

        if (args.valueType === "json") {
            try {
                JSON.parse(args.value);
            } catch {
                throw new Error("Value is not valid JSON");
            }
        }

        const existing = await ctx.db
            .query("journal_settings")
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

        return await ctx.db.insert("journal_settings", {
            ...args,
            updatedAt: Date.now(),
            updatedBy: userId,
        });
    },
});