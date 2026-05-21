"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { StreakDisplay } from "@/components/journal/timeline/streak-display";
import { MoodTrendChart } from "@/components/journal/stats/mood-trend-chart";
import { EntryFrequencyChart } from "@/components/journal/stats/entry-frequency-chart";
import { AstroCorrelation } from "@/components/journal/stats/astro-correlation";
import { GiScrollUnfurled } from "react-icons/gi";

interface InsightsTabProps {
    className?: string;
}

/**
 * InsightsTab — combines streak display, mood trends, entry frequency,
 * and astro correlations into the journal's "Insights" tab.
 */
export function InsightsTab({ className }: InsightsTabProps) {
    // Fetch stats data from Convex (args are optional, pass empty object)
    const stats = useQuery(api.journal.stats.getStats, {});

    // Build mood trend data from stats
    const moodTrendData = React.useMemo(() => {
        if (!stats?.moodTrend) return [];
        return stats.moodTrend;
    }, [stats?.moodTrend]);

    // Build entry frequency data — chart expects weekly array
    const frequencyData = React.useMemo(() => {
        if (!stats?.entryFrequency) return [];
        // entryFrequency is { daily, weekly, monthly } — chart expects weekly
        const ef = stats.entryFrequency as { daily: unknown[]; weekly: { week: string; count: number }[]; monthly: unknown[] };
        return ef.weekly ?? [];
    }, [stats?.entryFrequency]);

    // Build astro insights from stats — field is astroCorrelations
    const astroInsights = React.useMemo(() => {
        if (!stats?.astroCorrelations) return [];
        return stats.astroCorrelations;
    }, [stats?.astroCorrelations]);

    return (
        <div className={cn("space-y-8", className)}>
            {/* Streak */}
            <section>
                <h3 className="text-sm font-sans uppercase tracking-[0.15em] text-white/40 mb-3">
                    Streak
                </h3>
                <StreakDisplay />
            </section>

            {/* Mood Trends */}
            <section>
                <h3 className="text-sm font-sans uppercase tracking-[0.15em] text-white/40 mb-3">
                    Mood Trend
                </h3>
                {moodTrendData.length > 0 ? (
                    <MoodTrendChart data={moodTrendData} />
                ) : (
                    <EmptyState message="Start writing to see your mood patterns" />
                )}
            </section>

            {/* Entry Frequency */}
            <section>
                <h3 className="text-sm font-sans uppercase tracking-[0.15em] text-white/40 mb-3">
                    Journal Frequency
                </h3>
                {frequencyData.length > 0 ? (
                    <EntryFrequencyChart data={frequencyData} />
                ) : (
                    <EmptyState message="Your writing frequency will appear here" />
                )}
            </section>

            {/* Astro Correlations */}
            <section>
                <h3 className="text-sm font-sans uppercase tracking-[0.15em] text-white/40 mb-3">
                    Cosmic Correlations
                </h3>
                {astroInsights.length > 0 ? (
                    <AstroCorrelation insights={astroInsights} />
                ) : (
                    <EmptyState message="Insights about how the stars affect your mood" />
                )}
            </section>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
            <GiScrollUnfurled className="h-8 w-8 text-white/10 mb-3" />
            <p className="text-xs font-sans text-white/25">{message}</p>
        </div>
    );
}