"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MOOD_ZONES, type MoodZone } from "@/lib/journal/constants";

interface MoodTrendDataPoint {
    date: string;
    avgValence: number | null;
    avgArousal: number | null;
    dominantZone: string | null;
}

interface MoodTrendChartProps {
    data: MoodTrendDataPoint[];
    className?: string;
}

/**
 * CSS-only mood trend visualization.
 * Shows valence (green/red) and arousal (blue) bars per day.
 */
export function MoodTrendChart({ data, className }: MoodTrendChartProps) {
    // Filter to days with actual data points
    const pointsWithData = data.filter(
        (d) => d.avgValence !== null || d.avgArousal !== null,
    );

    if (pointsWithData.length === 0) {
        return <p className="text-xs text-white/30">No mood data to display</p>;
    }

    return (
        <div className={cn("space-y-3", className)}>
            {/* Valence trend */}
            <div>
                <p className="text-[10px] text-white/30 mb-2">Valence (negative ←→ positive)</p>
                <div className="flex items-end gap-[2px] h-16">
                    {pointsWithData.map((point, i) => {
                        const valence = point.avgValence ?? 0;
                        // Map valence from -2..2 to bar height
                        const absHeight = Math.abs(valence) / 2;
                        const height = Math.max(absHeight * 100, 4);
                        const isPositive = valence >= 0;

                        return (
                            <div
                                key={point.date}
                                className="flex-1 flex flex-col items-center justify-end h-full"
                                title={`${point.date}: valence ${valence.toFixed(1)}`}
                            >
                                <div
                                    className="w-full rounded-t-sm"
                                    style={{
                                        height: `${height}%`,
                                        backgroundColor: isPositive
                                            ? `rgba(34, 197, 94, ${0.3 + absHeight * 0.4})`
                                            : `rgba(239, 68, 68, ${0.3 + absHeight * 0.4})`,
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Arousal trend */}
            <div>
                <p className="text-[10px] text-white/30 mb-2">Arousal (calm ←→ activated)</p>
                <div className="flex items-end gap-[2px] h-16">
                    {pointsWithData.map((point, i) => {
                        const arousal = point.avgArousal ?? 0;
                        const absHeight = Math.abs(arousal) / 2;
                        const height = Math.max(absHeight * 100, 4);
                        const isHigh = arousal >= 0;

                        return (
                            <div
                                key={point.date}
                                className="flex-1 flex flex-col items-center justify-end h-full"
                                title={`${point.date}: arousal ${arousal.toFixed(1)}`}
                            >
                                <div
                                    className="w-full rounded-t-sm"
                                    style={{
                                        height: `${height}%`,
                                        backgroundColor: `rgba(96, 165, 250, ${0.3 + absHeight * 0.4})`,
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Mood zone indicators along the bottom */}
            <div className="flex gap-[2px] pt-2">
                {pointsWithData.map((point) => {
                    const zone = point.dominantZone as MoodZone | null;
                    const zoneInfo = zone ? MOOD_ZONES.find((z) => z.key === zone) : null;

                    return (
                        <div
                            key={point.date}
                            className="flex-1 h-1.5 rounded-full"
                            style={{
                                backgroundColor: zoneInfo?.color ?? "rgba(255,255,255,0.05)",
                            }}
                            title={`${point.date}: ${zoneInfo?.label ?? "no data"}`}
                        />
                    );
                })}
            </div>

            {/* Date labels */}
            <div className="flex justify-between text-[9px] text-white/20">
                <span>{pointsWithData[0]?.date?.slice(5)}</span>
                <span>{pointsWithData[pointsWithData.length - 1]?.date?.slice(5)}</span>
            </div>
        </div>
    );
}