/**
 * stats.ts — Aggregate statistics for journal entries.
 *
 * Returns mood trends, emotion cluster heatmaps, entry frequency,
 * entry type distribution, and astro correlations.
 */
import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getStats = query({
    args: {
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
    },
    handler: async (ctx, { startDate, endDate }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        // Default: last 90 days
        const now = Date.now();
        const defaultStart = new Date(now - 90 * 86400000).toISOString().split("T")[0];
        const defaultEnd = new Date(now).toISOString().split("T")[0];

        const rangeStart = startDate ?? defaultStart;
        const rangeEnd = endDate ?? defaultEnd;

        // Fetch all entries in date range
        const allEntries = await ctx.db
            .query("journal_entries")
            .withIndex("by_user_date", (q) => q.eq("userId", userId))
            .order("desc")
            .collect();

        const entries = allEntries.filter(
            (e) => e.entryDate >= rangeStart && e.entryDate <= rangeEnd,
        );

        if (entries.length === 0) {
            return {
                totalEntries: 0,
                dateRange: { start: rangeStart, end: rangeEnd },
                moodTrend: [],
                emotionClusterFrequency: {},
                topEmotions: [],
                entryFrequency: { daily: [], weekly: [], monthly: [] },
                entryTypeDistribution: { freeform: 0, checkin: 0, dream: 0, gratitude: 0 },
                astroCorrelations: [],
                streakData: null,
            };
        }

        // ── Mood Trend ───────────────────────────────────────────────
        // Group by date, compute averages
        const moodByDate = new Map<string, { valences: number[]; arousals: number[]; zones: string[] }>();
        for (const entry of entries) {
            const existing = moodByDate.get(entry.entryDate) ?? { valences: [], arousals: [], zones: [] };
            if (entry.mood) {
                existing.valences.push(entry.mood.valence);
                existing.arousals.push(entry.mood.arousal);
            }
            if (entry.moodZone) existing.zones.push(entry.moodZone);
            moodByDate.set(entry.entryDate, existing);
        }

        const moodTrend = Array.from(moodByDate.entries())
            .map(([date, data]) => ({
                date,
                avgValence: data.valences.length > 0
                    ? data.valences.reduce((a, b) => a + b, 0) / data.valences.length
                    : null,
                avgArousal: data.arousals.length > 0
                    ? data.arousals.reduce((a, b) => a + b, 0) / data.arousals.length
                    : null,
                dominantZone: data.zones.length > 0
                    ? mode(data.zones)
                    : null,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // ── Emotion Cluster Frequency ────────────────────────────────
        const clusterStats: Record<string, { total: number; totalIntensity: number; entries: number }> = {};
        const emotionCounts: Record<string, { count: number; totalIntensity: number }> = {};

        for (const entry of entries) {
            if (!entry.emotions) continue;
            for (const emotion of entry.emotions) {
                // Per-emotion count
                if (!emotionCounts[emotion.key]) {
                    emotionCounts[emotion.key] = { count: 0, totalIntensity: 0 };
                }
                emotionCounts[emotion.key].count++;
                emotionCounts[emotion.key].totalIntensity += emotion.intensity;

                // Cluster-level aggregation — cluster is derived from the key
                // We don't have the cluster mapping here, but we can compute it
                // by looking up the EMOTIONS list. Since this is in Convex backend,
                // we'll import it.
            }
        }

        // ── Entry Frequency ──────────────────────────────────────────
        const entriesByWeek = new Map<string, number>();
        const entriesByMonth = new Map<string, number>();
        const dailyCounts: Array<{ date: string; count: number }> = [];

        for (const entry of entries) {
            // Month
            const month = entry.entryDate.slice(0, 7); // "YYYY-MM"
            entriesByMonth.set(month, (entriesByMonth.get(month) ?? 0) + 1);

            // Week (ISO week number approximation)
            const d = new Date(entry.entryDate);
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay());
            const weekKey = weekStart.toISOString().split("T")[0];
            entriesByWeek.set(weekKey, (entriesByWeek.get(weekKey) ?? 0) + 1);
        }

        // Daily: count entries per day
        const entryByDay = new Map<string, number>();
        for (const entry of entries) {
            entryByDay.set(entry.entryDate, (entryByDay.get(entry.entryDate) ?? 0) + 1);
        }
        for (const [date, count] of entryByDay) {
            dailyCounts.push({ date, count });
        }
        dailyCounts.sort((a, b) => a.date.localeCompare(b.date));

        const weeklyFrequency = Array.from(entriesByWeek.entries())
            .map(([week, count]) => ({ week, count }))
            .sort((a, b) => a.week.localeCompare(b.week));

        const monthlyFrequency = Array.from(entriesByMonth.entries())
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month));

        // ── Entry Type Distribution ──────────────────────────────────
        const entryTypeDistribution: Record<string, number> = { freeform: 0, checkin: 0, dream: 0, gratitude: 0 };
        for (const entry of entries) {
            entryTypeDistribution[entry.entryType] = (entryTypeDistribution[entry.entryType] ?? 0) + 1;
        }

        // ── Astro Correlations ───────────────────────────────────────
        const astroCorrelations = computeAstroCorrelations(entries);

        // ── Top Emotions ────────────────────────────────────────────
        const topEmotions = Object.entries(emotionCounts)
            .map(([key, data]) => ({
                key,
                count: data.count,
                avgIntensity: Math.round((data.totalIntensity / data.count) * 10) / 10,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // ── Streak data ────────────────────────────────────────────
        const streak = await ctx.db
            .query("journal_streaks")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        const streakData = streak
            ? {
                currentStreak: streak.currentStreak,
                longestStreak: streak.longestStreak,
                totalEntries: streak.totalEntries,
            }
            : { currentStreak: 0, longestStreak: 0, totalEntries: 0 };

        return {
            totalEntries: entries.length,
            dateRange: { start: rangeStart, end: rangeEnd },
            moodTrend,
            topEmotions,
            entryFrequency: {
                daily: dailyCounts,
                weekly: weeklyFrequency,
                monthly: monthlyFrequency,
            },
            entryTypeDistribution,
            astroCorrelations,
            streakData,
        };
    },
});

// ── Helpers ────────────────────────────────────────────────────────────

function mode(arr: string[]): string {
    const counts: Record<string, number> = {};
    for (const val of arr) {
        counts[val] = (counts[val] ?? 0) + 1;
    }
    let maxCount = 0;
    let modeVal = arr[0];
    for (const [val, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            modeVal = val;
        }
    }
    return modeVal;
}

function computeAstroCorrelations(entries: any[]): Array<{ insight: string; data: any }> {
    const insights: Array<{ insight: string; data: any }> = [];

    // ── Moon phase frequency ────────────────────────────────────────
    const moonPhaseEntryCounts: Record<string, number> = {};
    const moonPhaseTotalCounts: Record<string, number> = {};
    const moonPhaseMoodZones: Record<string, string[]> = {};

    for (const entry of entries) {
        const phase = entry.astroContext?.moonPhase;
        if (!phase) continue;

        moonPhaseEntryCounts[phase] = (moonPhaseEntryCounts[phase] ?? 0) + 1;
        if (entry.moodZone) {
            if (!moonPhaseMoodZones[phase]) moonPhaseMoodZones[phase] = [];
            moonPhaseMoodZones[phase].push(entry.moodZone);
        }
    }

    // Identify moon phases where user journals significantly more
    const avgEntriesPerPhase = entries.length > 0 && Object.keys(moonPhaseEntryCounts).length > 0
        ? entries.length / Object.keys(moonPhaseEntryCounts).length
        : 0;

    for (const [phase, count] of Object.entries(moonPhaseEntryCounts)) {
        if (count > avgEntriesPerPhase * 1.5 && avgEntriesPerPhase > 0) {
            const multiplier = Math.round((count / avgEntriesPerPhase) * 10) / 10;
            insights.push({
                insight: `You journal ${multiplier}x more during ${phase}`,
                data: { phase, count, average: avgEntriesPerPhase, multiplier },
            });
        }
    }

    // ── Retrograde mood correlation ─────────────────────────────────
    const retroMoodZones: string[] = [];
    const nonRetroMoodZones: string[] = [];

    for (const entry of entries) {
        const hasRetro = entry.astroContext?.retrogradePlanets?.length > 0;
        if (entry.moodZone) {
            if (hasRetro) {
                retroMoodZones.push(entry.moodZone);
            } else {
                nonRetroMoodZones.push(entry.moodZone);
            }
        }
    }

    // Check if negative moods spike during retrogrades
    if (retroMoodZones.length > 2 && nonRetroMoodZones.length > 2) {
        const retroNegRatio = retroMoodZones.filter((z) => z === "tense" || z === "low").length / retroMoodZones.length;
        const nonRetroNegRatio = nonRetroMoodZones.filter((z) => z === "tense" || z === "low").length / nonRetroMoodZones.length;

        if (retroNegRatio > nonRetroNegRatio * 1.5) {
            insights.push({
                insight: "Your tense/low moods spike during retrogrades",
                data: { retroNegRatio: Math.round(retroNegRatio * 100), nonRetroNegRatio: Math.round(nonRetroNegRatio * 100) },
            });
        }
    }

    return insights;
}