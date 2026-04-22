"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MOOD_AXES, MOOD_ZONES, deriveMoodZone, type MoodZone } from "@/lib/journal/constants";

interface MoodPadProps {
    value?: { valence: number; arousal: number } | null;
    onChange?: (value: { valence: number; arousal: number } | null) => void;
    compact?: boolean;
    readOnly?: boolean;
    className?: string;
}

export function MoodPad({
    value,
    onChange,
    compact = false,
    readOnly = false,
    className,
}: MoodPadProps) {
    const padRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(
        value ?? { valence: 0, arousal: 0 }
    );

    // Sync external value
    React.useEffect(() => {
        if (value !== undefined && value !== null) {
            setInternalValue(value);
        }
    }, [value]);

    const currentZone: MoodZone = deriveMoodZone(
        internalValue.valence,
        internalValue.arousal
    );

    const zoneInfo = MOOD_ZONES.find((z) => z.key === currentZone);

    function getValueFromEvent(e: React.MouseEvent | React.TouchEvent): {
        valence: number;
        arousal: number;
    } | null {
        if (!padRef.current) return null;

        const rect = padRef.current.getBoundingClientRect();
        let clientX: number;
        let clientY: number;

        if ("touches" in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        // Normalize to 0-1
        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

        // Map to valence (-2 to 2) and arousal (2 to -2, inverted Y)
        const valence = MOOD_AXES.valence.min + x * (MOOD_AXES.valence.max - MOOD_AXES.valence.min);
        const arousal = MOOD_AXES.arousal.max - y * (MOOD_AXES.arousal.max - MOOD_AXES.arousal.min);

        // Round to 1 decimal
        return {
            valence: Math.round(valence * 10) / 10,
            arousal: Math.round(arousal * 10) / 10,
        };
    }

    function handleStart(e: React.MouseEvent | React.TouchEvent) {
        if (readOnly) return;
        e.preventDefault();
        setIsDragging(true);

        const newValue = getValueFromEvent(e);
        if (newValue) {
            setInternalValue(newValue);
            onChange?.(newValue);
        }
    }

    function handleMove(e: React.MouseEvent | React.TouchEvent) {
        if (!isDragging || readOnly) return;
        e.preventDefault();

        const newValue = getValueFromEvent(e);
        if (newValue) {
            setInternalValue(newValue);
            onChange?.(newValue);
        }
    }

    function handleEnd() {
        setIsDragging(false);
    }

    // Position the marker (0-100%)
    const markerX =
        ((internalValue.valence - MOOD_AXES.valence.min) /
            (MOOD_AXES.valence.max - MOOD_AXES.valence.min)) *
        100;
    const markerY =
        ((MOOD_AXES.arousal.max - internalValue.arousal) /
            (MOOD_AXES.arousal.max - MOOD_AXES.arousal.min)) *
        100;

    const size = compact ? "h-48 w-48" : "h-64 w-64 md:h-72 md:w-72";

    return (
        <div className={cn("flex flex-col items-center gap-2", className)}>
            {/* Zone label */}
            <div className="flex items-center gap-1.5 text-sm font-medium">
                <span className="text-lg">{zoneInfo?.emoji}</span>
                <span style={{ color: zoneInfo?.color }}>{zoneInfo?.label}</span>
            </div>

            {/* 2D Pad */}
            <div
                ref={padRef}
                className={cn(
                    "relative rounded-2xl border border-white/10 overflow-hidden select-none touch-none",
                    size,
                    readOnly ? "cursor-default" : "cursor-crosshair"
                )}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
            >
                {/* Quadrant backgrounds */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                    {/* Top-left: Tense (low valence, high arousal) */}
                    <div className="bg-orange-500/8 border-r border-b border-white/5" />
                    {/* Top-right: Excited (high valence, high arousal) */}
                    <div className="bg-emerald-500/8 border-b border-white/5" />
                    {/* Bottom-left: Low (low valence, low arousal) */}
                    <div className="bg-red-500/8 border-r border-white/5" />
                    {/* Bottom-right: Content (high valence, low arousal) */}
                    <div className="bg-green-500/8" />
                </div>

                {/* Axis labels */}
                <div className="absolute top-1.5 right-2 text-[10px] text-white/30 font-medium">
                    +
                </div>
                <div className="absolute bottom-1.5 right-2 text-[10px] text-white/30 font-medium">
                    −
                </div>
                <div className="absolute left-2 top-1.5 text-[10px] text-white/30 font-medium">
                    −
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/25 font-medium writing-mode-vertical" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
                    arousal
                </div>
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] text-white/25 font-medium">
                    valence →
                </div>

                {/* Crosshair center lines */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5" />

                {/* Draggable marker */}
                <div
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-75"
                    style={{
                        left: `${markerX}%`,
                        top: `${markerY}%`,
                    }}
                >
                    <div
                        className={cn(
                            "rounded-full border-2 border-white/80 bg-white/20",
                            "shadow-[0_0_12px_2px_rgba(255,255,255,0.15)]",
                            compact ? "h-5 w-5" : "h-6 w-6",
                            isDragging && "scale-125"
                        )}
                        style={{
                            borderColor: zoneInfo?.color,
                            boxShadow: `0 0 12px 2px ${zoneInfo?.color}40`,
                        }}
                    />
                </div>
            </div>

            {/* Axis labels compact */}
            <div className="flex w-full justify-between text-[10px] text-white/30 px-1">
                <span>😢 Negative</span>
                <span>😊 Positive</span>
            </div>

            {/* Clear button */}
            {!readOnly && value && (
                <button
                    onClick={() => {
                        setInternalValue({ valence: 0, arousal: 0 });
                        onChange?.(null);
                    }}
                    className="text-xs text-white/40 hover:text-white/60 transition-colors"
                >
                    Clear mood
                </button>
            )}
        </div>
    );
}