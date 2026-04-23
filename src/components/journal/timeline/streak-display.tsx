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
            <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl border border-border/30",
                className
            )}
            style={{ background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)" }}
            >
                <div className="h-5 w-5 rounded-full bg-white/5 animate-pulse" />
                <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
            </div>
        );
    }

    const hasStreak = streak.currentStreak > 0;

    return (
        <div
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors duration-300",
                hasStreak
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-border/30 bg-white/[0.02]",
                className
            )}
            style={!hasStreak ? { background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)" } : undefined}
        >
            <span className={cn("text-lg", hasStreak && "animate-pulse")}>
                {hasStreak ? "🔥" : "💫"}
            </span>
            <div className="flex flex-col">
                <span className="text-sm font-serif font-medium leading-none">
                    {streak.currentStreak}
                </span>
                <span className="text-[10px] font-sans uppercase tracking-[0.12em] text-white/35 leading-none mt-0.5">
                    day streak
                </span>
            </div>
            {streak.longestStreak > 0 && (
                <div className="ml-auto text-right">
                    <span className="text-[10px] font-sans uppercase tracking-[0.1em] text-white/25">
                        Best: {streak.longestStreak}
                    </span>
                </div>
            )}
        </div>
    );
}