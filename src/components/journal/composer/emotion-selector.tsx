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
            // Remove
            onChange(value.filter((e) => e.key !== emotion.key));
        } else {
            // Add with default intensity 2
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
                return "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
            case "negative":
                return "bg-red-500/15 border-red-500/30 text-red-300";
            case "neutral":
                return "bg-gray-500/15 border-gray-500/30 text-gray-300";
            default:
                return "bg-white/10 border-white/20 text-white/70";
        }
    }

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/70">Emotions</label>
                <span className="text-xs text-white/40">
                    {value.length}/{maxEmotions}
                </span>
            </div>

            {Object.entries(clusters).map(([cluster, emotions]) => (
                <div key={cluster} className="space-y-2">
                    {/* Cluster header */}
                    <div className="flex items-center gap-1.5 text-xs text-white/40 font-medium uppercase tracking-wider">
                        <span>{CLUSTER_ICONS[cluster]}</span>
                        <span>{CLUSTER_LABELS[cluster]}</span>
                    </div>

                    {/* Emotion chips */}
                    <div className="flex flex-wrap gap-2">
                        {emotions.map((emotion) => {
                            const isSelected = selectedKeys.has(emotion.key);
                            const entry = value.find((e) => e.key === emotion.key);

                            return (
                                <div key={emotion.key} className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => toggleEmotion(emotion)}
                                        className={cn(
                                            "rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                                            isSelected
                                                ? polarityColor(emotion.polarity)
                                                : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
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