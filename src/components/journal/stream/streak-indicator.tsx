"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

interface StreakIndicatorProps {
    className?: string;
}

/**
 * StreakIndicator — compact 7-day dots showing streak status.
 * Replaces the larger StreakDisplay for use in the stream page.
 */
export function StreakIndicator({ className }: StreakIndicatorProps) {
    const streak = useQuery(api.journal.streaks.getStreak);

    if (!streak) {
        // Skeleton
        return (
            <div
                className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border/30",
                    className
                )}
            >
                <div className="flex gap-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-2.5 w-2.5 rounded-full bg-white/5 animate-pulse"
                        />
                    ))}
                </div>
            </div>
        );
    }

    const hasStreak = streak.currentStreak > 0;

    // Generate 7-day dot indicators
    // We show 7 dots, the rightmost being today
    const dots = Array.from({ length: 7 }).map((_, i) => {
        // The last dot is today, second-to-last is yesterday, etc.
        const daysAgo = 6 - i;
        return {
            active: daysAgo < streak.currentStreak,
            daysAgo,
        };
    });

    return (
        <div
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors duration-300",
                hasStreak
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-border/30 bg-white/[0.02]",
                className
            )}
        >
            <span className={cn("text-lg", hasStreak && "animate-pulse")}>
                {hasStreak ? "🔥" : "💫"}
            </span>

            <div className="flex gap-1">
                {dots.map((dot, i) => (
                    <div
                        key={i}
                        className={cn(
                            "h-2.5 w-2.5 rounded-full transition-all duration-300",
                            dot.active
                                ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]"
                                : "bg-white/10"
                        )}
                        title={
                            dot.daysAgo === 0
                                ? "Today"
                                : dot.daysAgo === 1
                                  ? "Yesterday"
                                  : `${dot.daysAgo} days ago`
                        }
                    />
                ))}
            </div>

            <div className="flex flex-col">
                <span className="text-sm font-serif font-medium leading-none">
                    {streak.currentStreak}
                </span>
                <span className="text-[9px] font-sans uppercase tracking-[0.1em] text-white/30 leading-none mt-0.5">
                    day streak
                </span>
            </div>

            {streak.longestStreak > 0 && (
                <div className="ml-auto text-right">
                    <span className="text-[9px] font-sans uppercase tracking-[0.1em] text-white/20">
                        Best: {streak.longestStreak}
                    </span>
                </div>
            )}
        </div>
    );
}