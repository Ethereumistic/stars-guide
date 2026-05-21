"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
    EMOTIONS,
    JOURNAL_LIMITS,
    type EmotionEntry,
    type EmotionDefinition,
} from "@/lib/journal/constants";

// The initial set of 8 most common emotions shown by default
const INITIAL_EMOTION_KEYS = new Set([
    "grateful",
    "peaceful",
    "inspired",
    "anxious",
    "restless",
    "confident",
    "lonely",
    "confused",
]);

const INITIAL_EMOTIONS = EMOTIONS.filter((e) => INITIAL_EMOTION_KEYS.has(e.key));
const REMAINING_EMOTIONS = EMOTIONS.filter((e) => !INITIAL_EMOTION_KEYS.has(e.key));

interface EmotionChipsProps {
    value: EmotionEntry[];
    onChange: (emotions: EmotionEntry[]) => void;
    maxEmotions?: number;
    className?: string;
}

/**
 * EmotionChips replaces EmotionSelector with a quick-tap, tap-to-cycle interface.
 * Tap once → add at intensity 2, tap again → intensity 3, again → intensity 1, again → remove.
 * Max 3 emotions by default.
 */
export function EmotionChips({
    value,
    onChange,
    maxEmotions = 3,
    className,
}: EmotionChipsProps) {
    const [showAll, setShowAll] = React.useState(false);
    const [tappedKey, setTappedKey] = React.useState<string | null>(null);

    const selectedKeys = new Set(value.map((e) => e.key));

    function handleTap(emotion: EmotionDefinition) {
        // Trigger haptic-like scale animation
        setTappedKey(emotion.key);
        setTimeout(() => setTappedKey(null), 150);

        const existing = value.find((e) => e.key === emotion.key);

        if (!existing) {
            // Add with intensity 2 (moderate)
            if (value.length >= maxEmotions) return;
            onChange([...value, { key: emotion.key, intensity: 2 }]);
        } else if (existing.intensity === 2) {
            // Cycle to 3 (strong)
            onChange(
                value.map((e) =>
                    e.key === emotion.key ? { ...e, intensity: 3 } : e
                )
            );
        } else if (existing.intensity === 3) {
            // Cycle to 1 (mild)
            onChange(
                value.map((e) =>
                    e.key === emotion.key ? { ...e, intensity: 1 } : e
                )
            );
        } else {
            // intensity 1 → remove
            onChange(value.filter((e) => e.key !== emotion.key));
        }
    }

    function getIntensity(emotionKey: string): 0 | 1 | 2 | 3 {
        const entry = value.find((e) => e.key === emotionKey);
        return entry ? entry.intensity : 0;
    }

    function renderChip(emotion: EmotionDefinition) {
        const intensity = getIntensity(emotion.key);
        const isSelected = intensity > 0;
        const isTapped = tappedKey === emotion.key;

        // Border thickness / fill intensity indicates level
        const borderClass = isSelected
            ? emotion.polarity === "positive"
                ? "border-emerald-500/40"
                : emotion.polarity === "negative"
                    ? "border-red-500/40"
                    : "border-gray-400/40"
            : "border-[var(--journal-border)]";

        const bgClass = isSelected
            ? emotion.polarity === "positive"
                ? "bg-emerald-500/10"
                : emotion.polarity === "negative"
                    ? "bg-red-500/10"
                    : "bg-gray-500/10"
            : "bg-white/[0.02] hover:bg-white/[0.06]";

        const textClass = isSelected
            ? emotion.polarity === "positive"
                ? "text-emerald-400"
                : emotion.polarity === "negative"
                    ? "text-red-400"
                    : "text-gray-300"
            : "text-[var(--journal-muted)] hover:text-white/55";

        // Intensity dots inside the chip
        const numDots = isSelected ? intensity : 0;

        return (
            <button
                key={emotion.key}
                type="button"
                onClick={() => handleTap(emotion)}
                disabled={!isSelected && value.length >= maxEmotions}
                className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-sans transition-all duration-200 border",
                    "min-h-[44px] min-w-[44px]",
                    // Scale animation on tap
                    isTapped && "journal-tap-animate",
                    borderClass,
                    bgClass,
                    textClass,
                    !isSelected &&
                        value.length >= maxEmotions &&
                        "opacity-40 cursor-not-allowed"
                )}
            >
                <span>{emotion.label}</span>
                {numDots > 0 && (
                    <span className="flex items-center gap-0.5">
                        {Array.from({ length: numDots }).map((_, i) => (
                            <span
                                key={i}
                                className="w-1 h-1 rounded-full bg-current opacity-70"
                            />
                        ))}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center justify-between">
                <label className="text-xs font-serif text-[var(--journal-muted)]">
                    How are you feeling?
                </label>
                <span className="text-[10px] font-sans uppercase tracking-[0.1em] text-[var(--journal-muted)]">
                    {value.length}/{maxEmotions}
                </span>
            </div>

            {/* Initial emotions — mobile-friendly gap */}
            <div className="flex flex-wrap gap-2 md:gap-1.5">
                {INITIAL_EMOTIONS.map(renderChip)}

                {/* Remaining emotions (shown when expanded) */}
                {showAll && REMAINING_EMOTIONS.map(renderChip)}

                {/* More/less toggle — larger and more accessible */}
                <button
                    type="button"
                    onClick={() => setShowAll(!showAll)}
                    className={cn(
                        "inline-flex items-center justify-center rounded-full",
                        "border border-[var(--journal-border)]",
                        "bg-white/[0.02] hover:bg-white/[0.06]",
                        "text-[var(--journal-muted)] hover:text-white/50",
                        "text-xs font-sans",
                        "transition-all duration-200",
                        "min-h-[44px] min-w-[44px] px-4 py-2"
                    )}
                >
                    {showAll ? "less ▴" : "more ▾"}
                </button>
            </div>
        </div>
    );
}