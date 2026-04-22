"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MOOD_ZONES, type MoodZone } from "@/lib/journal/constants";

interface DayCellProps {
    date: number | null;
    fullDate: string | null;
    isCurrentMonth: boolean;
    isToday: boolean;
    entries: any[];
    onClick?: () => void;
    className?: string;
}

const MOON_PHASE_ICONS: Record<string, string> = {
    "New Moon": "🌑",
    "Waxing Crescent": "🌒",
    "First Quarter": "🌓",
    "Waxing Gibbous": "🌔",
    "Full Moon": "🌕",
    "Waning Gibbous": "🌖",
    "Last Quarter": "🌗",
    "Waning Crescent": "🌘",
};

function getMoonIcon(phaseName?: string): string | null {
    if (!phaseName) return null;
    for (const [key, icon] of Object.entries(MOON_PHASE_ICONS)) {
        if (phaseName.toLowerCase().includes(key.toLowerCase())) return icon;
    }
    return null;
}

function getMoodZoneColor(zone: string): string {
    return MOOD_ZONES.find((z) => z.key === zone)?.color ?? "transparent";
}

export function DayCell({
    date,
    fullDate,
    isCurrentMonth,
    isToday,
    entries,
    onClick,
    className,
}: DayCellProps) {
    const hasEntries = entries.length > 0;

    // Extract mood zones from entries
    const moodDots = entries
        .filter((e) => e.moodZone)
        .map((e) => e.moodZone as MoodZone)
        .slice(0, 4); // Max 4 dots per day cell

    // Check any entry has retrograde data
    const hasRetrograde = entries.some(
        (e) => e.astroContext?.retrogradePlanets?.length > 0,
    );

    // Moon phase from first entry (all entries on same day share it)
    const moonPhase = entries[0]?.astroContext?.moonPhase;
    const moonIcon = getMoonIcon(moonPhase);

    return (
        <button
            type="button"
            onClick={hasEntries ? onClick : undefined}
            disabled={!hasEntries}
            className={cn(
                "relative flex flex-col items-center justify-start p-1.5 min-h-[72px] transition-colors",
                isCurrentMonth ? "bg-white/[0.01]" : "bg-transparent",
                isCurrentMonth ? "text-white/60" : "text-white/20",
                isToday && "bg-galactic/5",
                hasEntries && "cursor-pointer hover:bg-white/[0.04]",
                !hasEntries && "cursor-default",
                className,
            )}
        >
            {/* Date number */}
            <span
                className={cn(
                    "text-xs font-medium leading-none mt-0.5",
                    isToday && "text-galactic",
                )}
            >
                {date}
            </span>

            {/* Mood dots */}
            {moodDots.length > 0 && (
                <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                    {moodDots.map((zone, i) => (
                        <div
                            key={`${zone}-${i}`}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: getMoodZoneColor(zone) }}
                        />
                    ))}
                </div>
            )}

            {/* Moon phase icon (small, corner) */}
            {moonIcon && isCurrentMonth && (
                <span className="absolute bottom-1 right-1 text-[8px] opacity-50">
                    {moonIcon}
                </span>
            )}

            {/* Retrograde indicator */}
            {hasRetrograde && isCurrentMonth && (
                <span className="absolute top-0.5 right-1 text-[7px] opacity-40">
                    ℞
                </span>
            )}
        </button>
    );
}