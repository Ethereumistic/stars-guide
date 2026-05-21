"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MOOD_ZONES, deriveMoodZone, type MoodZone } from "@/lib/journal/constants";

interface MoodBarProps {
    valence: number | null;
    energy: number | null;
    onValenceChange: (v: number | null) => void;
    onEnergyChange: (v: number | null) => void;
    className?: string;
}

export function MoodBar({
    valence,
    energy,
    onValenceChange,
    onEnergyChange,
    className,
}: MoodBarProps) {
    // Derive mood zone from current values
    const moodZone: MoodZone | null =
        valence !== null && energy !== null
            ? deriveMoodZone(valence, energy)
            : null;
    const zoneInfo = moodZone
        ? MOOD_ZONES.find((z) => z.key === moodZone)
        : null;

    return (
        <div className={cn("space-y-2", className)}>
            {/* Zone label */}
            {moodZone && zoneInfo && (
                <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="text-base">{zoneInfo.emoji}</span>
                    <span
                        className="text-sm font-serif"
                        style={{ color: zoneInfo.color }}
                    >
                        {zoneInfo.label}
                    </span>
                </div>
            )}

            {/* Valence slider */}
            <div className="flex items-center gap-2.5 md:gap-2">
                <span className="text-lg md:text-sm shrink-0 select-none">😢</span>
                <div className="relative flex-1 min-h-[44px] flex items-center">
                    <SliderTrack
                        value={valence}
                        min={-2}
                        max={2}
                        step={0.5}
                        zoneColor={zoneInfo?.color}
                        onChange={(v) => onValenceChange(v)}
                    />
                </div>
                <span className="text-lg md:text-sm shrink-0 select-none">😊</span>
            </div>

            {/* Energy slider */}
            <div className="flex items-center gap-2.5 md:gap-2">
                <span className="text-lg md:text-sm shrink-0 select-none">☁️</span>
                <div className="relative flex-1 min-h-[44px] flex items-center">
                    <SliderTrack
                        value={energy}
                        min={-2}
                        max={2}
                        step={0.5}
                        zoneColor={zoneInfo?.color}
                        onChange={(v) => onEnergyChange(v)}
                    />
                </div>
                <span className="text-lg md:text-sm shrink-0 select-none">🔥</span>
            </div>

            {/* Clear button */}
            {(valence !== null || energy !== null) && (
                <button
                    type="button"
                    onClick={() => {
                        onValenceChange(null);
                        onEnergyChange(null);
                    }}
                    className="block mx-auto text-[10px] font-sans uppercase tracking-[0.1em] text-[var(--journal-muted)] hover:text-[var(--journal-accent)] transition-colors"
                >
                    Clear mood
                </button>
            )}
        </div>
    );
}

/** Internal slider track with draggable thumb — mobile-optimized touch targets */
function SliderTrack({
    value,
    min,
    max,
    step,
    zoneColor,
    onChange,
}: {
    value: number | null;
    min: number;
    max: number;
    step: number;
    zoneColor?: string;
    onChange: (v: number | null) => void;
}) {
    const trackRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [isAnimating, setIsAnimating] = React.useState(false);
    const prevValueRef = React.useRef(value);

    // Trigger haptic-like scale animation on value change
    React.useEffect(() => {
        if (prevValueRef.current !== value && value !== null) {
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), 150);
            prevValueRef.current = value;
            return () => clearTimeout(timer);
        }
        prevValueRef.current = value;
    }, [value]);

    // Convert value to percentage
    const percent =
        value !== null
            ? ((value - min) / (max - min)) * 100
            : undefined;

    function getValueFromPosition(clientX: number): number | null {
        if (!trackRef.current) return value ?? 0;
        const rect = trackRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const raw = min + ratio * (max - min);
        // Snap to step
        const stepped = Math.round(raw / step) * step;
        return Math.round(stepped * 10) / 10;
    }

    function handlePointerDown(e: React.PointerEvent) {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setIsDragging(true);
        const newValue = getValueFromPosition(e.clientX);
        if (newValue !== null) onChange(newValue);
    }

    function handlePointerMove(e: React.PointerEvent) {
        if (!isDragging) return;
        const newValue = getValueFromPosition(e.clientX);
        if (newValue !== null) onChange(newValue);
    }

    function handlePointerUp(e: React.PointerEvent) {
        setIsDragging(false);
    }

    const color = zoneColor ?? "var(--journal-accent)";
    const hasValue = value !== null;

    return (
        <div
            ref={trackRef}
            className="w-full min-h-[44px] flex items-center cursor-pointer touch-none select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {/* Track background — wider for mobile touch */}
            <div className="relative w-full h-2.5 rounded-full bg-white/[0.06]">
                {/* Gradient fill based on mood zone — transitions from center outward */}
                {hasValue && percent !== undefined && (
                    <>
                        {/* Positive side (right of center) */}
                        {percent >= 50 && (
                            <div
                                className="absolute top-0 bottom-0 right-1/2 rounded-l-full transition-all duration-300"
                                style={{
                                    width: `${percent - 50}%`,
                                    background: `linear-gradient(to right, ${color}30, ${color}90)`,
                                }}
                            />
                        )}
                        {/* Negative side (left of center) */}
                        {percent < 50 && (
                            <div
                                className="absolute top-0 bottom-0 left-1/2 rounded-r-full transition-all duration-300"
                                style={{
                                    width: `${50 - percent}%`,
                                    background: `linear-gradient(to left, ${color}30, ${color}90)`,
                                }}
                            />
                        )}
                    </>
                )}

                {/* Center marker */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/10 rounded-full" />

                {/* Thumb — 28px for mobile touch friendliness */}
                {hasValue && percent !== undefined ? (
                    <div
                        className={cn(
                            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full border-2 transition-all duration-150",
                            isAnimating && "journal-tap-animate"
                        )}
                        style={{
                            left: `${percent}%`,
                            borderColor: color,
                            backgroundColor: "var(--journal-bg, #0f1628)",
                            boxShadow: `0 0 10px 3px ${color}50`,
                            transform: `translate(-50%, -50%)${isDragging ? " scale(1.2)" : ""}`,
                        }}
                    />
                ) : (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/15 border border-white/10" />
                )}
            </div>
        </div>
    );
}