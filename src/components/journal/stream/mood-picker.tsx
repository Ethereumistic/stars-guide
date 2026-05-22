"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type MoodZone } from "@/lib/journal/constants";

interface MoodOption {
    zone: MoodZone;
    emoji: string;
    label: string;
    color: string;
    /** Valence/arousal midpoints for DB compatibility */
    valence: number;
    arousal: number;
}

const MOOD_OPTIONS: MoodOption[] = [
    { zone: "excited", emoji: "🤩", label: "Amazing",   color: "#10b981", valence: 1.5,  arousal: 1.5  },
    { zone: "content", emoji: "😊", label: "Good",      color: "#22c55e", valence: 1.0,  arousal: -0.5 },
    { zone: "content", emoji: "😐", label: "Okay",      color: "#94a3b8", valence: 0.1,  arousal: -0.1 }, // subtle neutral zone
    { zone: "tense",   emoji: "😔", label: "Low",       color: "#f97316", valence: -1.0, arousal: 0.5  },
    { zone: "low",     emoji: "😢", label: "Rough",     color: "#ef4444", valence: -1.5, arousal: -1.0 },
];

// "Okay" index for tracking
const NEUTRAL_INDEX = 2;

interface MoodPickerProps {
    /** Currently selected mood zone (null = not set) */
    value: MoodZone | null;
    onChange: (zone: MoodZone | null, valence: number | null, arousal: number | null) => void;
    className?: string;
}

export function MoodPicker({ value, onChange, className }: MoodPickerProps) {
    const [tapped, setTapped] = React.useState<string | null>(null);

    function handleSelect(option: MoodOption, index: number) {
        setTapped(option.label);
        setTimeout(() => setTapped(null), 200);

        // Tap the currently selected option to deselect (toggle off)
        const isAlreadySelected =
            value === option.zone &&
            // Avoid accidental deselect when two options share the same zone
            // (Amazing and Okay both map to excited/content — differentiate by index)
            MOOD_OPTIONS.findIndex((o) => o.zone === value) === index;

        if (isAlreadySelected) {
            onChange(null, null, null);
        } else {
            onChange(option.zone, option.valence, option.arousal);
        }
    }

    function isSelected(option: MoodOption, index: number): boolean {
        if (value === null) return false;
        return value === option.zone && MOOD_OPTIONS.findIndex((o) => o.zone === value) === index;
    }

    return (
        <div className={cn("space-y-2", className)}>
            <label className="text-xs font-serif text-[var(--journal-muted)]">
                How are you feeling?
            </label>
            <div className="flex items-center justify-between gap-1 md:gap-2">
                {MOOD_OPTIONS.map((option, idx) => {
                    const selected = isSelected(option, idx);
                    const isTapped = tapped === option.label;
                    const color = idx === NEUTRAL_INDEX ? "#64748b" : option.color;

                    return (
                        <button
                            key={option.label}
                            type="button"
                            onClick={() => handleSelect(option, idx)}
                            className={cn(
                                "flex flex-col items-center gap-1 rounded-xl border px-2 py-2 md:px-3 transition-all duration-200",
                                "min-h-[52px] flex-1",
                                // Haptic-like scale on tap
                                isTapped && "scale-95",
                                selected
                                    ? "border-current/30 bg-current/10"
                                    : "border-[var(--journal-border)] bg-white/[0.02] hover:bg-white/[0.06]",
                            )}
                            style={
                                selected
                                    ? {
                                          borderColor: `${color}40`,
                                          backgroundColor: `${color}15`,
                                          color: color,
                                      }
                                    : {}
                            }
                            title={option.label}
                        >
                            <span
                                className={cn(
                                    "text-xl leading-none transition-transform duration-150",
                                    isTapped && "scale-125",
                                )}
                            >
                                {option.emoji}
                            </span>
                            <span
                                className={cn(
                                    "text-[9px] font-sans uppercase tracking-[0.1em] transition-colors duration-200",
                                    selected ? "font-semibold" : "text-[var(--journal-muted)]",
                                )}
                                style={selected ? { color } : {}}
                            >
                                {option.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
