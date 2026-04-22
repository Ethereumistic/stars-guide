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
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 placeholder:text-white/30 outline-none focus:border-galactic/30 transition-colors"
            />
        </div>
    );
}