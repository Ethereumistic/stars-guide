"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { MOOD_ZONES, ENTRY_TYPE_META, INTENSITY_LABELS, type MoodZone } from "@/lib/journal/constants";
import { MoodTrendChart } from "@/components/journal/stats/mood-trend-chart";
import { EntryFrequencyChart } from "@/components/journal/stats/entry-frequency-chart";
import { AstroCorrelation } from "@/components/journal/stats/astro-correlation";
import { StreakDisplay } from "@/components/journal/timeline/streak-display";
import { Loader2, BarChart3 } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function JournalStatsPage() {
    const stats = useQuery(api.journal.stats.getStats, {});

    if (!stats) {
        return (
            <div>
                <div className="mb-6">
                    <h1 className="text-2xl font-serif font-bold text-white/90">Stats</h1>
                    <p className="mt-1 text-sm text-white/40">Mood trends, emotion patterns, and astro correlations</p>
                </div>
                <div className="flex justify-center py-20">
                    <Loader2 className="h-5 w-5 animate-spin text-white/30" />
                </div>
            </div>
        );
    }

    if (stats.totalEntries === 0) {
        return (
            <div>
                <div className="mb-6">
                    <h1 className="text-2xl font-serif font-bold text-white/90">Stats</h1>
                    <p className="mt-1 text-sm text-white/40">Mood trends, emotion patterns, and astro correlations</p>
                </div>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <BarChart3 className="h-10 w-10 text-white/20 mb-4" />
                    <h3 className="text-lg font-serif font-semibold text-white/60">Not enough data yet</h3>
                    <p className="text-sm text-white/30 mt-1 max-w-xs">
                        Journal for a few days to unlock your first insights — mood trends, emotion patterns, and astrology correlations.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-serif font-bold text-white/90">Stats</h1>
                <p className="mt-1 text-sm text-white/40">Mood trends, emotion patterns, and astro correlations</p>
            </div>

            <div className="space-y-6">
                {/* Overview stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">Total Entries</p>
                        <p className="text-2xl font-semibold text-white/80 mt-1">{stats.totalEntries}</p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">Current Streak</p>
                        <p className="text-2xl font-semibold text-white/80 mt-1">{stats.streakData?.currentStreak ?? 0}🔥</p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">Longest Streak</p>
                        <p className="text-2xl font-semibold text-white/80 mt-1">{stats.streakData?.longestStreak ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">Date Range</p>
                        <p className="text-sm font-medium text-white/60 mt-1">
                            {stats.dateRange.start} → {stats.dateRange.end}
                        </p>
                    </div>
                </div>

                {/* Mood Trend */}
                {stats.moodTrend.length > 0 && (
                    <Card className="border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle className="text-base">Mood Trend</CardTitle>
                            <CardDescription>Valence and arousal over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MoodTrendChart data={stats.moodTrend} />
                        </CardContent>
                    </Card>
                )}

                {/* Entry Type Distribution */}
                <Card className="border-border/50 bg-card/50">
                    <CardHeader>
                        <CardTitle className="text-base">Entry Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(stats.entryTypeDistribution).map(([type, count]: [string, any]) => {
                                const meta = ENTRY_TYPE_META[type as keyof typeof ENTRY_TYPE_META];
                                const maxCount = Math.max(...Object.values(stats.entryTypeDistribution) as number[]);
                                return (
                                    <div key={type} className="flex items-center gap-3">
                                        <span className="text-sm w-20 text-white/40">{meta?.icon} {meta?.label ?? type}</span>
                                        <div className="flex-1 h-6 rounded-full bg-white/5 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-galactic/30 transition-all"
                                                style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-white/60 w-8 text-right">{String(count)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Emotions */}
                {stats.topEmotions.length > 0 && (
                    <Card className="border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle className="text-base">Top Emotions</CardTitle>
                            <CardDescription>Your most frequent emotions and their intensity</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {stats.topEmotions.map((emotion: any) => (
                                    <div key={emotion.key} className="flex items-center gap-3">
                                        <span className="text-sm text-white/60 w-24 capitalize">{emotion.key}</span>
                                        <div className="flex-1 h-4 rounded-full bg-white/5 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-emerald-500/20 transition-all"
                                                style={{ width: `${(emotion.count / stats.topEmotions[0].count) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-white/40 w-16 text-right">
                                            {emotion.count}× · {INTENSITY_LABELS[Math.round(emotion.avgIntensity) as 1 | 2 | 3] ?? "moderate"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Entry Frequency */}
                <Card className="border-border/50 bg-card/50">
                    <CardHeader>
                        <CardTitle className="text-base">Entry Frequency</CardTitle>
                        <CardDescription>Entries per week</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <EntryFrequencyChart data={stats.entryFrequency.weekly} />
                    </CardContent>
                </Card>

                {/* Astro Correlations */}
                {stats.astroCorrelations.length > 0 && (
                    <Card className="border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle className="text-base">Astro Correlations</CardTitle>
                            <CardDescription>Patterns between your moods and celestial events</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AstroCorrelation insights={stats.astroCorrelations} />
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}