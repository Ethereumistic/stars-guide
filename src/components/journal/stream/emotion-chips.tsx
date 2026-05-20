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

    const selectedKeys = new Set(value.map((e) => e.key));

    function handleTap(emotion: EmotionDefinition) {
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

        // Border thickness / fill intensity indicates level
        const borderClass = isSelected
            ? emotion.polarity === "positive"
                ? "border-emerald-500/40"
                : emotion.polarity === "negative"
                    ? "border-red-500/40"
                    : "border-gray-400/40"
            : "border-white/[0.08]";

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
            : "text-white/35 hover:text-white/55";

        // Intensity dots inside the chip
        const numDots = isSelected ? intensity : 0;

        return (
            <button
                key={emotion.key}
                type="button"
                onClick={() => handleTap(emotion)}
                disabled={!isSelected && value.length >= maxEmotions}
                className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-sans transition-all duration-200 border",
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
                <label className="text-xs font-serif text-white/50">
                    How are you feeling?
                </label>
                <span className="text-[10px] font-sans uppercase tracking-[0.1em] text-white/25">
                    {value.length}/{maxEmotions}
                </span>
            </div>

            {/* Initial emotions */}
            <div className="flex flex-wrap gap-1.5">
                {INITIAL_EMOTIONS.map(renderChip)}

                {/* Remaining emotions (shown when expanded) */}
                {showAll && REMAINING_EMOTIONS.map(renderChip)}

                {/* More/less toggle */}
                <button
                    type="button"
                    onClick={() => setShowAll(!showAll)}
                    className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-sans text-white/30 hover:bg-white/[0.06] hover:text-white/50 transition-all duration-200"
                >
                    {showAll ? "less ▴" : "more ▾"}
                </button>
            </div>
        </div>
    );
}