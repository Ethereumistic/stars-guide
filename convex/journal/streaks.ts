/**
 * streaks.ts — Journal streak tracking.
 *
 * Streaks are updated automatically when a new entry is created.
 * Logic:
 *   - If lastEntryDate === today → no change (already counted)
 *   - If lastEntryDate === yesterday → currentStreak += 1
 *   - If lastEntryDate < yesterday → currentStreak = 1 (streak broken)
 *   - longestStreak = max(longestStreak, currentStreak)
 *   - totalEntries += 1
 *   - lastEntryDate = today
 */
import { mutation, query, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * updateStreak — Called internally by createEntry.
 * Updates the streak record for a user after a new entry is created.
 */
export const updateStreak = internalMutation({
    args: {
        userId: v.id("users"),
        entryDate: v.string(), // "YYYY-MM-DD"
    },
    handler: async (ctx, { userId, entryDate }) => {
        const existing = await ctx.db
            .query("journal_streaks")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        const now = Date.now();

        if (!existing) {
            // First entry ever
            await ctx.db.insert("journal_streaks", {
                userId,
                currentStreak: 1,
                longestStreak: 1,
                lastEntryDate: entryDate,
                totalEntries: 1,
                updatedAt: now,
            });
            return;
        }

        // Already counted today
        if (existing.lastEntryDate === entryDate) {
            await ctx.db.patch(existing._id, {
                totalEntries: existing.totalEntries + 1,
                updatedAt: now,
            });
            return;
        }

        // Check if yesterday
        const lastDate = new Date(existing.lastEntryDate);
        const today = new Date(entryDate);
        const diffDays = Math.round(
            (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        let newCurrentStreak: number;
        if (diffDays === 1) {
            // Consecutive day
            newCurrentStreak = existing.currentStreak + 1;
        } else {
            // Streak broken
            newCurrentStreak = 1;
        }

        await ctx.db.patch(existing._id, {
            currentStreak: newCurrentStreak,
            longestStreak: Math.max(existing.longestStreak, newCurrentStreak),
            lastEntryDate: entryDate,
            totalEntries: existing.totalEntries + 1,
            updatedAt: now,
        });
    },
});

/**
 * getStreak — Return streak data for the authenticated user.
 * Returns defaults (all zeros) if no record exists yet.
 */
export const getStreak = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return {
                currentStreak: 0,
                longestStreak: 0,
                lastEntryDate: "",
                totalEntries: 0,
            };
        }

        const existing = await ctx.db
            .query("journal_streaks")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (!existing) {
            return {
                currentStreak: 0,
                longestStreak: 0,
                lastEntryDate: "",
                totalEntries: 0,
            };
        }

        // Check if streak is still alive (last entry was today or yesterday)
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        const streakAlive = existing.lastEntryDate === today || existing.lastEntryDate === yesterday;

        return {
            currentStreak: streakAlive ? existing.currentStreak : 0,
            longestStreak: existing.longestStreak,
            lastEntryDate: existing.lastEntryDate,
            totalEntries: existing.totalEntries,
        };
    },
});