"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
    MOOD_ZONES,
    ENTRY_TYPE_META,
    type MoodZone,
} from "@/lib/journal/constants";
import { EmotionBadges } from "../detail/emotion-badges";

interface StreamEntryCardProps {
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

/**
 * StreamEntryCard — simplified timeline card as per redesign plan.
 * Compact 2-3 line card with accent bar, zone label, time, and astro context.
 */
export function StreamEntryCard({
    entry,
    onClick,
    className,
}: StreamEntryCardProps) {
    const typeMeta = ENTRY_TYPE_META[entry.entryType as keyof typeof ENTRY_TYPE_META];
    const moodZone = entry.moodZone as MoodZone | undefined;
    const zoneInfo = moodZone ? MOOD_ZONES.find((z) => z.key === moodZone) : null;
    const accentColor = zoneInfo?.color ?? "#5a607a";

    // Content preview — first line truncated
    const contentPreview = entry.content
        ? entry.content.length > 80
            ? entry.content.slice(0, 80) + "…"
            : entry.content
        : null;

    // Title: use title field, or content preview, or entry type label
    const displayTitle = entry.title || contentPreview || typeMeta?.label || "Entry";

    // Format time
    const timeStr = entry.createdAt
        ? formatRelativeTime(entry.createdAt)
        : "";

    // Astro context line
    const astroParts: string[] = [];
    if (entry.astroContext?.moonPhase) {
        astroParts.push(getMoonIcon(entry.astroContext.moonPhase));
        astroParts.push(entry.astroContext.moonPhase);
    }
    if (entry.astroContext?.moonSign) {
        astroParts.push(`Moon in ${entry.astroContext.moonSign}`);
    }

    // Emotion labels (top 2-3)
    const hasEmotions = entry.emotions && entry.emotions.length > 0;
    const hasTags = entry.tags && entry.tags.length > 0;
    const hasPhoto = entry.photoId;
    const hasVoice = entry.voiceTranscript;
    const isPinned = entry.isPinned;

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "group relative block w-full text-left rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]",
                className
            )}
        >
            {/* Left accent bar */}
            <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-opacity duration-300 opacity-60 group-hover:opacity-100"
                style={{ backgroundColor: accentColor }}
            />

            {/* Content area */}
            <div className="relative pl-5 pr-4 py-3.5">
                {/* Pin indicator */}
                {isPinned && (
                    <span className="absolute top-2.5 right-3 text-[10px] opacity-60">
                        📌
                    </span>
                )}

                {/* Line 1: Mood zone + title/content preview */}
                <div className="flex items-baseline gap-2 min-w-0">
                    {zoneInfo && (
                        <span
                            className="text-xs font-serif font-medium shrink-0"
                            style={{ color: zoneInfo.color }}
                        >
                            {zoneInfo.label}
                        </span>
                    )}
                    <span className="text-sm text-white/70 line-clamp-1 leading-snug">
                        {zoneInfo ? "·" : ""}
                    </span>
                    <span className="text-sm text-white/70 line-clamp-1 leading-snug">
                        &ldquo;{displayTitle}&rdquo;
                    </span>
                </div>

                {/* Line 2: Time + astro */}
                <div className="flex items-center gap-1.5 mt-1">
                    {timeStr && (
                        <span className="text-[10px] font-sans text-white/30">
                            {timeStr}
                        </span>
                    )}
                    {astroParts.length > 0 && (
                        <span className="text-[10px] font-sans text-white/25">
                            · {astroParts.join(" ")}
                        </span>
                    )}
                </div>

                {/* Line 3 (optional): Emotions, tags, indicators */}
                {(hasEmotions || hasTags || hasPhoto || hasVoice) && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {hasEmotions && (
                            <EmotionBadges
                                emotions={entry.emotions}
                                max={3}
                                size="xs"
                            />
                        )}
                        {hasTags &&
                            entry.tags.slice(0, 2).map((tag: string) => (
                                <span
                                    key={tag}
                                    className="text-[10px] font-sans text-white/20"
                                >
                                    #{tag}
                                </span>
                            ))}
                        {hasPhoto && (
                            <span className="text-[10px] opacity-40">📷</span>
                        )}
                        {hasVoice && (
                            <span className="text-[10px] opacity-40">🎙️</span>
                        )}
                    </div>
                )}
            </div>
        </button>
    );
}