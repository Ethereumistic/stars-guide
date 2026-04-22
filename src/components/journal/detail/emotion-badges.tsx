"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { EMOTIONS, INTENSITY_LABELS, type EmotionEntry } from "@/lib/journal/constants";

interface EmotionBadgesProps {
    emotions: EmotionEntry[];
    max?: number;
    size?: "xs" | "sm" | "md";
    className?: string;
}

export function EmotionBadges({
    emotions,
    max,
    size = "sm",
    className,
}: EmotionBadgesProps) {
    const display = max ? emotions.slice(0, max) : emotions;
    const remaining = max ? emotions.length - max : 0;

    function getEmotionDef(key: string) {
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

    const sizeClasses = {
        xs: "text-[10px] px-1.5 py-0",
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-2.5 py-1",
    };

    return (
        <div className={cn("flex flex-wrap gap-1", className)}>
            {display.map((emotion) => {
                const def = getEmotionDef(emotion.key);
                return (
                    <span
                        key={emotion.key}
                        className={cn(
                            "inline-flex items-center gap-0.5 rounded-full border font-medium",
                            polarityColor(def?.polarity ?? "neutral"),
                            sizeClasses[size]
                        )}
                    >
                        {def?.label ?? emotion.key}
                        {/* Intensity dots */}
                        <span className="flex gap-[1px]">
                            {[1, 2, 3].map((level) => (
                                <span
                                    key={level}
                                    className={cn(
                                        "rounded-full",
                                        level <= emotion.intensity
                                            ? "w-1 h-1 bg-current opacity-60"
                                            : "w-0.5 h-0.5 bg-current opacity-20"
                                    )}
                                />
                            ))}
                        </span>
                    </span>
                );
            })}
            {remaining > 0 && (
                <span className="text-[10px] text-white/30 self-center">
                    +{remaining}
                </span>
            )}
        </div>
    );
}