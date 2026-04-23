"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
    EMOTIONS,
    CLUSTER_LABELS,
    CLUSTER_ICONS,
    JOURNAL_LIMITS,
    INTENSITY_LABELS,
    type EmotionEntry,
    type EmotionDefinition,
} from "@/lib/journal/constants";

interface EmotionSelectorProps {
    value: EmotionEntry[];
    onChange: (emotions: EmotionEntry[]) => void;
    maxEmotions?: number;
    className?: string;
}

export function EmotionSelector({
    value,
    onChange,
    maxEmotions = JOURNAL_LIMITS.MAX_EMOTIONS_PER_ENTRY,
    className,
}: EmotionSelectorProps) {
    const selectedKeys = new Set(value.map((e) => e.key));

    function toggleEmotion(emotion: EmotionDefinition) {
        if (selectedKeys.has(emotion.key)) {
            onChange(value.filter((e) => e.key !== emotion.key));
        } else {
            if (value.length >= maxEmotions) return;
            onChange([...value, { key: emotion.key, intensity: 2 }]);
        }
    }

    function setIntensity(emotionKey: string, intensity: 1 | 2 | 3) {
        onChange(
            value.map((e) => (e.key === emotionKey ? { ...e, intensity } : e))
        );
    }

    // Group emotions by cluster
    const clusters = EMOTIONS.reduce<Record<string, EmotionDefinition[]>>(
        (acc, emotion) => {
            if (!acc[emotion.cluster]) acc[emotion.cluster] = [];
            acc[emotion.cluster].push(emotion);
            return acc;
        },
        {}
    );

    function getEmotionDef(key: string): EmotionDefinition | undefined {
        return EMOTIONS.find((e) => e.key === key);
    }

    function polarityColor(polarity: string): string {
        switch (polarity) {
            case "positive":
                return "text-emerald-400/70 border-emerald-500/20 bg-emerald-500/5";
            case "negative":
                return "text-red-400/70 border-red-500/20 bg-red-500/5";
            default:
                return "text-gray-400/70 border-gray-500/20 bg-gray-500/5";
        }
    }

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between">
                <label className="text-sm font-serif text-white/70">Emotions</label>
                <span className="text-[10px] font-sans uppercase tracking-[0.12em] text-white/25">
                    {value.length}/{maxEmotions}
                </span>
            </div>

            {Object.entries(clusters).map(([cluster, emotions]) => (
                <div key={cluster} className="space-y-2">
                    {/* Cluster header */}
                    <div className="flex items-center gap-1.5 text-[10px] font-sans uppercase tracking-[0.18em] text-white/25">
                        <span>{CLUSTER_ICONS[cluster]}</span>
                        <span>{CLUSTER_LABELS[cluster]}</span>
                    </div>

                    {/* Emotion chips */}
                    <div className="flex flex-wrap gap-1.5">
                        {emotions.map((emotion) => {
                            const isSelected = selectedKeys.has(emotion.key);
                            const entry = value.find((e) => e.key === emotion.key);

                            return (
                                <div key={emotion.key} className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => toggleEmotion(emotion)}
                                        className={cn(
                                            "rounded-full border px-2.5 py-1 text-xs transition-all duration-300",
                                            isSelected
                                                ? polarityColor(emotion.polarity)
                                                : "border-white/[0.06] bg-white/[0.02] text-white/35 hover:bg-white/[0.06] hover:text-white/55"
                                        )}
                                    >
                                        {emotion.label}
                                    </button>

                                    {/* Intensity selector (only when selected) */}
                                    {isSelected && entry && (
                                        <div className="flex items-center gap-0.5">
                                            {[1, 2, 3].map((level) => (
                                                <button
                                                    key={level}
                                                    type="button"
                                                    onClick={() =>
                                                        setIntensity(emotion.key, level as 1 | 2 | 3)
                                                    }
                                                    className={cn(
                                                        "flex items-center justify-center w-4 h-4 rounded-full transition-all",
                                                        level <= entry.intensity
                                                            ? "bg-current opacity-80"
                                                            : "bg-white/10 opacity-40"
                                                    )}
                                                    title={`${emotion.label}: ${INTENSITY_LABELS[level as 1 | 2 | 3]}`}
                                                    style={{
                                                        color:
                                                            emotion.polarity === "positive"
                                                                ? "#10b981"
                                                                : emotion.polarity === "negative"
                                                                    ? "#ef4444"
                                                                    : "#9ca3af",
                                                    }}
                                                >
                                                    <div
                                                        className={cn(
                                                            "rounded-full",
                                                            level <= entry.intensity
                                                                ? "w-1.5 h-1.5"
                                                                : "w-1 h-1"
                                                        )}
                                                        style={{
                                                            backgroundColor: "currentColor",
                                                        }}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}