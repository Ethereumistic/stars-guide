"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminJournalPage() {
    const stats = useQuery(api.journal.admin.getJournalAdminStats);

    if (!stats) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold">Journal Admin</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Overview of journaling activity, consent stats, and system health.
                    </p>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link href="/admin/journal/settings">Settings →</Link>
                </Button>
            </div>

            {/* Overview cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-border/50 bg-card/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Total Entries</CardDescription>
                        <CardTitle className="text-2xl">{stats.totalEntries}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="border-border/50 bg-card/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Active Journalers</CardDescription>
                        <CardTitle className="text-2xl">{stats.totalActiveJournalers}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="border-border/50 bg-card/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Avg Entries / User</CardDescription>
                        <CardTitle className="text-2xl">{stats.avgEntriesPerUser}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Entry Type Distribution */}
            <Card className="border-border/50 bg-card/50">
                <CardHeader>
                    <CardTitle className="text-base">Entry Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {Object.entries(stats.entryTypeDistribution).map(([type, count]: [string, number]) => (
                            <div key={type} className="flex items-center justify-between">
                                <span className="text-sm capitalize">{type}</span>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 rounded-full bg-galactic/30" style={{ width: `${Math.min(count * 10, 200)}px` }} />
                                    <span className="text-sm text-muted-foreground">{String(count)}</span>
                                </div>
                            </div>
                        ))}
                        {Object.keys(stats.entryTypeDistribution).length === 0 && (
                            <p className="text-sm text-muted-foreground">No entries yet</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Streak Stats */}
            <Card className="border-border/50 bg-card/50">
                <CardHeader>
                    <CardTitle className="text-base">Streak Stats</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <p className="text-xs text-muted-foreground">Average Streak</p>
                            <p className="text-xl font-semibold">{stats.streakStats.avgStreak} days</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Longest Streak</p>
                            <p className="text-xl font-semibold">{stats.streakStats.highestStreak} days</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Users with Streaks</p>
                            <p className="text-xl font-semibold">{stats.streakStats.totalUsers}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Consent Stats */}
            <Card className="border-border/50 bg-card/50">
                <CardHeader>
                    <CardTitle className="text-base">Oracle Consent (Read-Only)</CardTitle>
                    <CardDescription>Aggregate consent stats — no individual user data shown.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <p className="text-xs text-muted-foreground">Total Consent Records</p>
                            <p className="text-xl font-semibold">{stats.consentStats.totalRecords}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Consent Enabled</p>
                            <p className="text-xl font-semibold">{stats.consentStats.consentEnabled}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Include Entry Content</p>
                            <p className="text-xl font-semibold">{stats.consentStats.includeEntryContent}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Include Mood Data</p>
                            <p className="text-xl font-semibold">{stats.consentStats.includeMoodData}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Include Dream Data</p>
                            <p className="text-xl font-semibold">{stats.consentStats.includeDreamData}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Avg Lookback Days</p>
                            <p className="text-xl font-semibold">{stats.consentStats.avgLookbackDays}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}