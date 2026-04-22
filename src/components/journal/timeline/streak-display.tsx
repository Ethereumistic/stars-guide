"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

interface StreakDisplayProps {
    className?: string;
}

export function StreakDisplay({ className }: StreakDisplayProps) {
    const streak = useQuery(api.journal.streaks.getStreak);

    if (!streak) {
        return (
            <div className={cn("flex items-center gap-3 px-3 py-2 rounded-xl border border-white/5 bg-white/[0.02]", className)}>
                <div className="h-5 w-5 rounded-full bg-white/5 animate-pulse" />
                <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
            </div>
        );
    }

    const hasStreak = streak.currentStreak > 0;

    return (
        <div
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors",
                hasStreak
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-white/5 bg-white/[0.02]",
                className
            )}
        >
            <span className={cn("text-xl", hasStreak && "animate-pulse")}>
                {hasStreak ? "🔥" : "💫"}
            </span>
            <div className="flex flex-col">
                <span className="text-sm font-semibold leading-none">
                    {streak.currentStreak}
                </span>
                <span className="text-[10px] text-white/40 leading-none mt-0.5">
                    day streak
                </span>
            </div>
            {streak.longestStreak > 0 && (
                <div className="ml-auto text-right">
                    <span className="text-xs text-white/40">
                        Best: {streak.longestStreak}
                    </span>
                </div>
            )}
        </div>
    );
}