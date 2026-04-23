"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MOOD_ZONES, ENTRY_TYPE_META, type MoodZone } from "@/lib/journal/constants";
import { EmotionBadges } from "../detail/emotion-badges";
import { GiScrollUnfurled } from "react-icons/gi";

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

    // Glow color from mood zone or fallback
    const glowColor = zoneInfo?.color ?? "var(--galactic)";

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
            className={cn("group relative block w-full text-left", className)}
        >
            {/* Card surface */}
            <div className="relative overflow-hidden rounded-xl border border-border/30 bg-transparent transition-all duration-500 group-hover:scale-[1.03] min-h-[100px]">
                {/* Subtle gradient background */}
                <div
                    className="absolute inset-0 rounded-xl"
                    style={{
                        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
                    }}
                />

                {/* Mood zone gradient overlay — visible on hover */}
                <div
                    className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-20"
                    style={{
                        background: `linear-gradient(135deg, transparent 0%, ${glowColor}40 100%)`,
                    }}
                />

                {/* Radial glow effect */}
                <div
                    className="absolute -right-8 top-1/2 -translate-y-1/2 h-20 w-20 rounded-full opacity-0 transition-opacity duration-500 blur-2xl group-hover:opacity-30"
                    style={{ backgroundColor: glowColor }}
                />

                {/* Scroll watermark */}
                <div className="absolute inset-y-0 right-0 w-1/3 pointer-events-none overflow-hidden">
                    <GiScrollUnfurled
                        className="absolute top-1/2 right-[-10%] -translate-y-1/2 h-full w-auto opacity-[0.04] scale-125 transition-all duration-700 group-hover:opacity-[0.08] group-hover:scale-100 group-hover:right-[10%]"
                        style={{
                            color: glowColor,
                            filter: `drop-shadow(0 0 10px ${glowColor})`,
                        }}
                    />
                </div>

                {/* Left accent line */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ backgroundColor: glowColor }}
                />

                {/* Content */}
                <div className="relative z-10 flex items-center justify-between gap-3 p-5 h-full">
                    {/* Left section: Text & Details */}
                    <div className="flex flex-col min-w-0 max-w-[70%] space-y-1.5">
                        {/* Micro label: entry type + time */}
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-sans uppercase tracking-[0.2em] opacity-80" style={{ color: glowColor }}>
                                {typeMeta?.icon} {typeMeta?.label}
                            </span>
                            <span className="text-[9px] font-sans uppercase tracking-[0.2em] text-white/25">
                                {formatRelativeTime(entry.createdAt)}
                            </span>
                        </div>

                        {/* Title / preview */}
                        <h3
                            className="text-base font-serif tracking-wide text-white/80 transition-colors duration-300 group-hover:text-white line-clamp-2 leading-snug"
                            style={{
                                textShadow: `0 0 5px ${glowColor}20`,
                            }}
                        >
                            {displayTitle}
                        </h3>

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

                            {/* Tags */}
                            {entry.tags && entry.tags.length > 0 && (
                                <span className="text-[10px] opacity-50" style={{ color: glowColor }}>
                                    {entry.tags.slice(0, 2).map((t: string) => `#${t}`).join(" ")}
                                    {entry.tags.length > 2 && ` +${entry.tags.length - 2}`}
                                </span>
                            )}

                            {/* Voice badge */}
                            {entry.voiceTranscript && (
                                <span className="text-[10px]">🎙️</span>
                            )}

                            {/* Pin */}
                            {entry.isPinned && (
                                <span className="text-[10px]">📌</span>
                            )}
                        </div>
                    </div>

                    {/* Right section: Mood zone dot + secondary content */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                        {zoneInfo ? (
                            <>
                                <span className="text-lg">{zoneInfo.emoji}</span>
                                <span className="text-[9px] font-sans uppercase tracking-[0.12em]" style={{ color: glowColor, opacity: 0.7 }}>
                                    {zoneInfo.label}
                                </span>
                            </>
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] opacity-40">
                                <span className="text-base">{typeMeta?.icon}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hover shadow glow */}
            <div
                className="absolute inset-0 -z-10 rounded-xl opacity-0 transition-opacity duration-500 blur-xl group-hover:opacity-15"
                style={{ backgroundColor: glowColor }}
            />
        </button>
    );
}