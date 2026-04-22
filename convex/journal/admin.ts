/**
 * admin.ts — Admin queries for journal overview stats.
 */
import { query } from "../_generated/server";
import { requireAdmin } from "../lib/adminGuard";

export const getJournalAdminStats = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);

        // Get all journal entries
        const allEntries = await ctx.db.query("journal_entries").collect();
        const allStreaks = await ctx.db.query("journal_streaks").collect();
        const allConsents = await ctx.db.query("journal_consent").collect();

        // Total entries
        const totalEntries = allEntries.length;

        // Active journalers (unique users with >= 1 entry)
        const uniqueUsers = new Set(allEntries.map((e) => e.userId));
        const totalActiveJournalers = uniqueUsers.size;

        // Average entries per user
        const avgEntriesPerUser = totalActiveJournalers > 0
            ? Math.round((totalEntries / totalActiveJournalers) * 10) / 10
            : 0;

        // Entry type distribution
        const entryTypeDistribution: Record<string, number> = {};
        for (const entry of allEntries) {
            entryTypeDistribution[entry.entryType] = (entryTypeDistribution[entry.entryType] ?? 0) + 1;
        }

        // Streak stats
        const avgStreak = allStreaks.length > 0
            ? Math.round(allStreaks.reduce((sum, s) => sum + s.currentStreak, 0) / allStreaks.length * 10) / 10
            : 0;
        const highestStreak = allStreaks.reduce((max, s) => Math.max(max, s.longestStreak), 0);

        // Consent stats
        const consentEnabled = allConsents.filter((c) => c.oracleCanReadJournal).length;
        const includeEntryContent = allConsents.filter((c) => c.includeEntryContent).length;
        const includeMoodData = allConsents.filter((c) => c.includeMoodData).length;
        const includeDreamData = allConsents.filter((c) => c.includeDreamData).length;
        const avgLookbackDays = allConsents.length > 0
            ? Math.round(allConsents.reduce((sum, c) => sum + c.lookbackDays, 0) / allConsents.length)
            : 0;

        return {
            totalEntries,
            totalActiveJournalers,
            avgEntriesPerUser,
            entryTypeDistribution,
            streakStats: {
                avgStreak,
                highestStreak,
                totalUsers: allStreaks.length,
            },
            consentStats: {
                totalRecords: allConsents.length,
                consentEnabled,
                includeEntryContent,
                includeMoodData,
                includeDreamData,
                avgLookbackDays,
            },
        };
    },
});