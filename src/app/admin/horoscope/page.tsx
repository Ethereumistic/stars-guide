"use client";

import { useQuery } from "convex/react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Sparkles, Globe, FileText, ClipboardCheck, Clock, CheckCircle,
    XCircle, AlertTriangle, Sun, Moon, Orbit, RefreshCw, Telescope
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const statusConfig = {
    running: { label: "Running", variant: "default" as const, icon: Clock, color: "text-blue-400" },
    completed: { label: "Completed", variant: "secondary" as const, icon: CheckCircle, color: "text-emerald-400" },
    partial: { label: "Partial", variant: "outline" as const, icon: AlertTriangle, color: "text-amber-400" },
    failed: { label: "Failed", variant: "destructive" as const, icon: XCircle, color: "text-red-400" },
    cancelled: { label: "Cancelled", variant: "outline" as const, icon: XCircle, color: "text-gray-400" },
};

// Get today's date in UTC (YYYY-MM-DD)
function getTodayUTC(): string {
    return new Date().toISOString().split("T")[0];
}

export default function HoroscopeOverviewPage() {
    const recentJobs = useQuery(api.admin.getRecentJobs);
    const todayUTC = getTodayUTC();
    const cosmicWeather = useQuery(api.cosmicWeather.getCosmicWeatherForAdmin, { date: todayUTC });
    const recomputeAction = useAction(api.cosmicWeather.recomputeCosmicWeather);
    const [isRecomputing, setIsRecomputing] = useState(false);

    const handleRecompute = async () => {
        setIsRecomputing(true);
        try {
            await recomputeAction({ date: todayUTC });
        } catch (err) {
            console.error("Failed to recompute cosmic weather:", err);
        } finally {
            setIsRecomputing(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-serif font-bold tracking-tight">
                    Horoscope Engine
                </h1>
                <p className="text-muted-foreground mt-1">
                    Generate, review, and publish daily horoscopes across all 12 signs.
                </p>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Link href="/admin/horoscope/context">
                    <Card className="group cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Context Editor</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardHeader>
                        <CardContent>
                            <CardDescription>Edit the master astrology prompt</CardDescription>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/horoscope/zeitgeist">
                    <Card className="group cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Zeitgeist Engine</CardTitle>
                            <Globe className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardHeader>
                        <CardContent>
                            <CardDescription>Define the current world vibe</CardDescription>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/horoscope/generator">
                    <Card className="group cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Generation Desk</CardTitle>
                            <Sparkles className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardHeader>
                        <CardContent>
                            <CardDescription>Run AI horoscope generation</CardDescription>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/horoscope/review">
                    <Card className="group cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Review & Publish</CardTitle>
                            <ClipboardCheck className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardHeader>
                        <CardContent>
                            <CardDescription>Approve and publish horoscopes</CardDescription>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Cosmic Weather Card */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Telescope className="h-5 w-5 text-indigo-400" />
                        Today&apos;s Cosmic Weather
                        <span className="text-sm font-normal text-muted-foreground">({todayUTC})</span>
                    </h2>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRecompute}
                        disabled={isRecomputing}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isRecomputing ? "animate-spin" : ""}`} />
                        {isRecomputing ? "Computing..." : "Recompute"}
                    </Button>
                </div>

                {cosmicWeather === undefined ? (
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                        <CardContent className="flex items-center gap-2 py-6 text-muted-foreground">
                            <Clock className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Loading cosmic weather...</span>
                        </CardContent>
                    </Card>
                ) : cosmicWeather === null ? (
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                        <CardContent className="flex flex-col items-center justify-center py-8">
                            <Orbit className="h-8 w-8 text-muted-foreground mb-3" />
                            <p className="text-muted-foreground text-sm">No cosmic weather computed yet for today.</p>
                            <p className="text-muted-foreground text-xs mt-1">
                                Click &quot;Recompute&quot; to generate, or it will be computed automatically at 00:05 UTC.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-3">
                        {/* Planet Positions */}
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm md:col-span-2">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Sun className="h-4 w-4 text-amber-400" />
                                    Planet Positions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-2">
                                    {cosmicWeather.planetPositions.map((p) => (
                                        <div
                                            key={p.planet}
                                            className="flex items-center gap-1.5 text-xs"
                                        >
                                            <span className="font-medium text-foreground">{p.planet}</span>
                                            <span className="text-muted-foreground">
                                                in {p.sign} ({p.degreeInSign}°)
                                            </span>
                                            {p.isRetrograde && (
                                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-red-400 border-red-400/30">
                                                    ℞
                                                </Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Moon Phase */}
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Moon className="h-4 w-4 text-blue-300" />
                                    Moon Phase
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center py-2">
                                <p className="text-lg font-medium">{cosmicWeather.moonPhase.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {cosmicWeather.moonPhase.illuminationPercent}% illuminated
                                </p>
                            </CardContent>
                        </Card>

                        {/* Active Aspects */}
                        {cosmicWeather.activeAspects.length > 0 && (
                            <Card className="border-border/50 bg-card/50 backdrop-blur-sm md:col-span-3">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Orbit className="h-4 w-4 text-purple-400" />
                                        Active Aspects ({cosmicWeather.activeAspects.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {cosmicWeather.activeAspects.map((a, idx) => (
                                            <Badge
                                                key={idx}
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                {a.planet1} {a.aspect} {a.planet2}
                                                <span className="text-muted-foreground ml-1">(orb: {a.orbDegrees}°)</span>
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>

            {/* Recent Jobs */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Recent Generation Jobs</h2>
                {recentJobs === undefined ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading...</span>
                    </div>
                ) : recentJobs.length === 0 ? (
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Sparkles className="h-8 w-8 text-muted-foreground mb-3" />
                            <p className="text-muted-foreground text-sm">No generation jobs yet.</p>
                            <p className="text-muted-foreground text-xs mt-1">
                                Head to the <Link href="/admin/horoscope/generator" className="text-primary underline">Generation Desk</Link> to start.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {recentJobs.map((job) => {
                            const config = statusConfig[job.status];
                            const StatusIcon = config.icon;
                            return (
                                <Card key={job._id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                                    <CardContent className="flex items-center justify-between py-4">
                                        <div className="flex items-center gap-3">
                                            <StatusIcon className={`h-5 w-5 ${config.color}`} />
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {job.targetSigns.length} signs × {job.targetDates.length} days
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {job.modelId} · {new Date(job.startedAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right text-xs text-muted-foreground">
                                                <span className="text-emerald-400">{job.progress.completed}</span>
                                                {" / "}
                                                <span>{job.progress.total}</span>
                                                {job.progress.failed > 0 && (
                                                    <span className="text-red-400 ml-2">
                                                        ({job.progress.failed} failed)
                                                    </span>
                                                )}
                                            </div>
                                            <Badge variant={config.variant}>{config.label}</Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
