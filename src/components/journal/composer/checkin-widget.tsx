"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MoodPad } from "./mood-pad";
import { EmotionSelector } from "./emotion-selector";
import type { EmotionEntry } from "@/lib/journal/constants";

interface CheckinWidgetProps {
    mood: { valence: number; arousal: number } | null;
    onMoodChange: (mood: { valence: number; arousal: number } | null) => void;
    emotions: EmotionEntry[];
    onEmotionsChange: (emotions: EmotionEntry[]) => void;
    content: string;
    onContentChange: (content: string) => void;
    className?: string;
}

export function CheckinWidget({
    mood,
    onMoodChange,
    emotions,
    onEmotionsChange,
    content,
    onContentChange,
    className,
}: CheckinWidgetProps) {
    return (
        <div className={cn("space-y-5", className)}>
            {/* Mood Pad — centered and prominent */}
            <MoodPad value={mood} onChange={onMoodChange} />

            {/* Emotion Selector */}
            <EmotionSelector value={emotions} onChange={onEmotionsChange} />

            {/* Optional note */}
            <input
                type="text"
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="Anything else? (optional)"
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm font-sans text-white/70 placeholder:text-white/20 outline-none focus:border-galactic/25 transition-colors"
                style={{
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
                }}
            />
        </div>
    );
}