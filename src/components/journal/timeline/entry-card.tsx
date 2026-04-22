"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MOOD_ZONES, ENTRY_TYPE_META, type MoodZone } from "@/lib/journal/constants";
import { EmotionBadges } from "../detail/emotion-badges";

interface EntryCardProps {
    entry: any;
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

function getMoonIcon(phaseName?: string): string {
    if (!phaseName) return "🌙";
    for (const [key, icon] of Object.entries(MOON_PHASE_ICONS)) {
        if (phaseName.toLowerCase().includes(key.toLowerCase())) return icon;
    }
    return "🌙";
}

function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

export function EntryCard({ entry, onClick, className }: EntryCardProps) {
    const typeMeta = ENTRY_TYPE_META[entry.entryType as keyof typeof ENTRY_TYPE_META];
    const moodZone = entry.moodZone as MoodZone | undefined;
    const zoneInfo = moodZone ? MOOD_ZONES.find((z) => z.key === moodZone) : null;

    // Content preview
    const contentPreview = entry.content
        ? entry.content.length > 120
            ? entry.content.slice(0, 120) + "..."
            : entry.content
        : null;

    // Title: use title field, or content preview, or entry type label
    const displayTitle = entry.title || contentPreview || typeMeta?.label || "Entry";

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "group w-full text-left rounded-xl border bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04] hover:border-white/10",
                zoneInfo ? `border-${zoneInfo.color.split("#")[1] ?? "white"}/10` : "border-white/5",
                className
            )}
            style={{
                borderLeftColor: zoneInfo?.color,
                borderLeftWidth: "3px",
            }}
        >
            <div className="flex items-start gap-3">
                {/* Mood zone dot */}
                <div className="flex flex-col items-center gap-1 mt-0.5">
                    <div
                        className={cn("h-2 w-2 rounded-full")}
                        style={{ backgroundColor: zoneInfo?.color ?? "transparent" }}
                    />
                    <span className="text-[10px] opacity-60">{typeMeta?.icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Title/preview */}
                    <div className="text-sm font-medium text-white/80 leading-snug line-clamp-2">
                        {displayTitle}
                    </div>

                    {/* Secondary preview for titled entries */}
                    {entry.title && contentPreview && (
                        <div className="text-xs text-white/40 line-clamp-1">
                            {contentPreview}
                        </div>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Astro badge */}
                        {entry.astroContext?.moonPhase && (
                            <span className="text-[10px] text-white/30">
                                {getMoonIcon(entry.astroContext.moonPhase)}{" "}
                                {entry.astroContext.moonSign &&
                                    `${entry.astroContext.moonSign}`}
                            </span>
                        )}

                        {/* Emotion chips (top 2) */}
                        {entry.emotions && entry.emotions.length > 0 && (
                            <EmotionBadges
                                emotions={entry.emotions}
                                max={2}
                                size="xs"
                            />
                        )}

                        {/* Tags (first 2) */}
                        {entry.tags && entry.tags.length > 0 && (
                            <span className="text-[10px] text-galactic/50">
                                {entry.tags.slice(0, 2).map((t: string) => `#${t}`).join(" ")}
                                {entry.tags.length > 2 && ` +${entry.tags.length - 2}`}
                            </span>
                        )}

                        {/* Voice badge */}
                        {entry.voiceTranscript && (
                            <span className="text-[10px]">🎙️</span>
                        )}

                        {/* Location */}
                        {entry.location?.displayName && (
                            <span className="text-[10px] text-white/30">
                                📍 {entry.location.displayName}
                            </span>
                        )}

                        {/* Pin */}
                        {entry.isPinned && (
                            <span className="text-[10px]">📌</span>
                        )}

                        {/* Time */}
                        <span className="ml-auto text-[10px] text-white/25">
                            {formatRelativeTime(entry.createdAt)}
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
}