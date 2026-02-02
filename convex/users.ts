import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const current = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null) {
            return null;
        }
        return await ctx.db.get(userId);
    },
});

export const updateBirthData = mutation({
    args: {
        date: v.string(),
        time: v.string(),
        location: v.object({
            lat: v.number(),
            long: v.number(),
            city: v.string(),
            country: v.string(),
            countryCode: v.optional(v.string()),
        }),
        sunSign: v.string(),
        moonSign: v.string(),
        risingSign: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null) {
            throw new Error("Not authenticated");
        }

        await ctx.db.patch(userId, {
            birthData: {
                date: args.date,
                time: args.time,
                location: args.location,
                sunSign: args.sunSign,
                moonSign: args.moonSign,
                risingSign: args.risingSign,
            },
        });
    },
});

export const updateProfile = mutation({
    args: {
        name: v.optional(v.string()),
        phone: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null) {
            throw new Error("Not authenticated");
        }

        const updates: Record<string, string | undefined> = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.phone !== undefined) updates.phone = args.phone;

        if (Object.keys(updates).length > 0) {
            await ctx.db.patch(userId, updates);
        }
    },
});

export const updatePreferences = mutation({
    args: {
        notifications: v.optional(v.boolean()),
        publicChart: v.optional(v.boolean()),
        dailySparkTime: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        const currentPrefs = user.preferences || {
            dailySparkTime: "07:00",
            notifications: true
        };

        await ctx.db.patch(userId, {
            preferences: {
                ...currentPrefs,
                ...(args.notifications !== undefined && { notifications: args.notifications }),
                ...(args.dailySparkTime !== undefined && { dailySparkTime: args.dailySparkTime }),
            },
        });
    },
});
