"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type EmotionEntry, type TimeOfDay, ENERGY_LEVELS, TIME_OF_DAY } from "@/lib/journal/constants";

// ── Types ─────────────────────────────────────────────────────────────
export interface PostSaveData {
    /** Convex entry ID returned from createEntry */
    entryId: string;
    /** Auto-detected or user-selected tags */
    tags: string[];
    /** Energy level (1–5) if selected */
    energyLevel: number | null;
    /** Time of day when entry was saved */
    timeOfDay: TimeOfDay;
    /** First ~120 chars of the entry content, for Oracle context */
    contentPreview: string;
    /** Emotions selected */
    emotions: EmotionEntry[];
}

interface PostSaveActionsProps {
    data: PostSaveData;
    /** Navigate to Oracle with entry context */
    onAskOracle: (entryId: string, contentPreview: string) => void;
    /** Called when the actions should be dismissed (timeout or user typing) */
    onDismiss: () => void;
    className?: string;
}

// ── Component ─────────────────────────────────────────────────────────
export function PostSaveActions({ data, onAskOracle, onDismiss, className }: PostSaveActionsProps) {
    const [visible, setVisible] = React.useState(true);
    const [fading, setFading] = React.useState(false);
    const dismissTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const fadeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-fade after 5 seconds total (3s visible, then 0.5s CSS fade, then 1.5s grace)
    React.useEffect(() => {
        dismissTimerRef.current = setTimeout(() => {
            setFading(true);
            // After fade animation finishes, remove from DOM
            fadeTimerRef.current = setTimeout(() => {
                setVisible(false);
                onDismiss();
            }, 500);
        }, 4500); // 4.5s visible, then 0.5s fade

        return () => {
            if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
            if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
        };
    }, [onDismiss]);

    if (!visible) return null;

    const energyLabel = data.energyLevel
        ? ENERGY_LEVELS.find((e) => e.value === data.energyLevel)?.label
        : null;

    const timeOfDayMeta = TIME_OF_DAY.find((t) => t.key === data.timeOfDay);

    return (
        <div
            className={cn(
                "journal-theme space-y-3 transition-opacity duration-500 ease-out",
                fading ? "opacity-0" : "opacity-100",
                className,
            )}
        >
            {/* ── Enrichment badges ────────────────────────────── */}
            {(data.tags.length > 0 || data.emotions.length > 0 || data.energyLevel || data.timeOfDay) && (
                <div className="flex flex-wrap items-center gap-1.5">
                    {/* Tags */}
                    {data.tags.map((tag) => (
                        <span
                            key={tag}
                            className="inline-flex items-center rounded-full border border-[var(--journal-accent)]/30 bg-[var(--journal-accent)]/10 px-2 py-0.5 text-[10px] font-sans uppercase tracking-wider text-[var(--journal-muted)]"
                        >
                            #{tag}
                        </span>
                    ))}

                    {/* Emotions */}
                    {data.emotions.map((em) => {
                        const label = em.key.charAt(0).toUpperCase() + em.key.slice(1);
                        return (
                            <span
                                key={em.key}
                                className="inline-flex items-center rounded-full border border-[var(--journal-accent)]/30 bg-[var(--journal-accent)]/10 px-2 py-0.5 text-[10px] font-sans tracking-wider text-[var(--journal-muted)]"
                            >
                                {label}
                                {em.intensity > 1 && (
                                    <span className="ml-0.5 text-[8px] opacity-60">
                                        {"*".repeat(em.intensity - 1)}
                                    </span>
                                )}
                            </span>
                        );
                    })}

                    {/* Energy level */}
                    {data.energyLevel && energyLabel && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--journal-accent)]/30 bg-[var(--journal-accent)]/10 px-2 py-0.5 text-[10px] font-sans tracking-wider text-[var(--journal-muted)]">
                            {ENERGY_LEVELS.find((e) => e.value === data.energyLevel)?.icon} {energyLabel}
                        </span>
                    )}

                    {/* Time of day */}
                    {timeOfDayMeta && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--journal-accent)]/30 bg-[var(--journal-accent)]/10 px-2 py-0.5 text-[10px] font-sans tracking-wider text-[var(--journal-muted)]">
                            {timeOfDayMeta.icon} {timeOfDayMeta.label}
                        </span>
                    )}
                </div>
            )}

            {/* ── Ask Oracle button ────────────────────────────── */}
            <button
                onClick={() => {
                    onAskOracle(data.entryId, data.contentPreview);
                    // Dismiss immediately on click
                    setVisible(false);
                    onDismiss();
                }}
                className={cn(
                    "group flex items-center gap-2 text-sm font-serif tracking-wide",
                    "text-[var(--journal-accent)] hover:text-[var(--journal-accent2)]",
                    "transition-colors duration-300",
                )}
                style={{
                    fontFamily: '"Crimson Pro", ui-serif, Georgia, serif',
                }}
            >
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                    ✦
                </span>
                <span>Ask Oracle about this</span>
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
                    →
                </span>
            </button>
        </div>
    );
}