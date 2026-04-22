"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TIME_OF_DAY, type TimeOfDay } from "@/lib/journal/constants";

interface TimeOfDayPickerProps {
    value?: TimeOfDay | null;
    onChange: (time: TimeOfDay | null) => void;
    className?: string;
}

export function TimeOfDayPicker({ value, onChange, className }: TimeOfDayPickerProps) {
    return (
        <div className={cn("space-y-2", className)}>
            <label className="text-sm font-medium text-white/70">Time of Day</label>
            <div className="flex items-center gap-1">
                {TIME_OF_DAY.map(({ key, label, icon }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onChange(value === key ? null : key as TimeOfDay)}
                        className={cn(
                            "flex flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition-all",
                            value === key
                                ? "border-galactic/40 bg-galactic/15 text-white"
                                : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                        )}
                    >
                        <span className="text-base">{icon}</span>
                        <span>{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}