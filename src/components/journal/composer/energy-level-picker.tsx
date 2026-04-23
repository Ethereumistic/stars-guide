"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ENERGY_LEVELS } from "@/lib/journal/constants";

interface EnergyLevelPickerProps {
    value?: number | null;
    onChange: (level: number | null) => void;
    className?: string;
}

export function EnergyLevelPicker({ value, onChange, className }: EnergyLevelPickerProps) {
    return (
        <div className={cn("space-y-2", className)}>
            <label className="text-sm font-serif text-white/70">Energy Level</label>
            <div className="flex items-center gap-1.5">
                {ENERGY_LEVELS.map(({ value: level, label, icon }) => (
                    <button
                        key={level}
                        type="button"
                        onClick={() => onChange(value === level ? null : level)}
                        className={cn(
                            "flex flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs transition-all duration-300",
                            value === level
                                ? "border-galactic/30 bg-galactic/15 text-white"
                                : "border-white/[0.06] bg-white/[0.02] text-white/35 hover:bg-white/[0.06] hover:text-white/55"
                        )}
                    >
                        <span className="text-base">{icon}</span>
                        <span className="text-[10px] font-sans uppercase tracking-[0.08em] truncate">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}