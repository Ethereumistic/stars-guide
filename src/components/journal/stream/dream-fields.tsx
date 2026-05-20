"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { JOURNAL_LIMITS, DREAM_EMOTIONAL_TONES } from "@/lib/journal/constants";

interface DreamFieldsProps {
    dreamData: {
        isLucid?: boolean;
        isRecurring?: boolean;
        dreamSigns?: string[];
        emotionalTone?: string;
    };
    onDreamDataChange: (data: DreamFieldsProps["dreamData"]) => void;
    className?: string;
}

export function DreamFields({
    dreamData,
    onDreamDataChange,
    className,
}: DreamFieldsProps) {
    const [dreamSignInput, setDreamSignInput] = React.useState("");

    function addDreamSign() {
        const sign = dreamSignInput.trim().toLowerCase();
        if (!sign) return;
        const existing = dreamData.dreamSigns ?? [];
        if (existing.length >= JOURNAL_LIMITS.MAX_DREAM_SIGNS) return;
        if (existing.includes(sign)) return;
        onDreamDataChange({
            ...dreamData,
            dreamSigns: [...existing, sign],
        });
        setDreamSignInput("");
    }

    function removeDreamSign(sign: string) {
        onDreamDataChange({
            ...dreamData,
            dreamSigns: (dreamData.dreamSigns ?? []).filter((s) => s !== sign),
        });
    }

    return (
        <div className={cn("space-y-3", className)}>
            {/* Toggles */}
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() =>
                        onDreamDataChange({ ...dreamData, isLucid: !dreamData.isLucid })
                    }
                    className={cn(
                        "rounded-full border px-3 py-1.5 text-[10px] font-sans uppercase tracking-[0.1em] transition-all duration-300",
                        dreamData.isLucid
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                            : "border-white/[0.06] bg-white/[0.02] text-white/35 hover:bg-white/[0.06] hover:text-white/55"
                    )}
                >
                    🌟 Lucid Dream
                </button>
                <button
                    type="button"
                    onClick={() =>
                        onDreamDataChange({ ...dreamData, isRecurring: !dreamData.isRecurring })
                    }
                    className={cn(
                        "rounded-full border px-3 py-1.5 text-[10px] font-sans uppercase tracking-[0.1em] transition-all duration-300",
                        dreamData.isRecurring
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                            : "border-white/[0.06] bg-white/[0.02] text-white/35 hover:bg-white/[0.06] hover:text-white/55"
                    )}
                >
                    🔄 Recurring
                </button>
            </div>

            {/* Dream signs */}
            <div className="space-y-1.5">
                <label className="text-[10px] font-sans uppercase tracking-[0.15em] text-white/35 font-medium">
                    Dream Signs
                </label>
                <div className="flex flex-wrap gap-1.5">
                    {(dreamData.dreamSigns ?? []).map((sign) => (
                        <span
                            key={sign}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/5 px-2 py-0.5 text-[10px] font-sans uppercase tracking-[0.08em] text-amber-400/80"
                        >
                            {sign}
                            <button
                                type="button"
                                onClick={() => removeDreamSign(sign)}
                                className="text-amber-400/40 hover:text-amber-300 transition-colors"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
                <div className="flex gap-1.5">
                    <input
                        type="text"
                        value={dreamSignInput}
                        onChange={(e) => setDreamSignInput(e.target.value)}
                        onKeyDown={(e) =>
                            e.key === "Enter" && (e.preventDefault(), addDreamSign())
                        }
                        placeholder="Add a dream sign..."
                        className="flex-1 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs font-sans text-white/60 placeholder:text-white/20 outline-none focus:border-white/15 transition-colors"
                    />
                    <button
                        type="button"
                        onClick={addDreamSign}
                        className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs font-sans text-white/35 hover:bg-white/[0.06] hover:text-white/55 transition-colors"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Emotional tone */}
            <div className="space-y-1.5">
                <label className="text-[10px] font-sans uppercase tracking-[0.15em] text-white/35 font-medium">
                    Emotional Tone
                </label>
                <div className="flex flex-wrap gap-1.5">
                    {DREAM_EMOTIONAL_TONES.map((tone) => (
                        <button
                            key={tone}
                            type="button"
                            onClick={() =>
                                onDreamDataChange({
                                    ...dreamData,
                                    emotionalTone:
                                        dreamData.emotionalTone === tone ? undefined : tone,
                                })
                            }
                            className={cn(
                                "rounded-full border px-2.5 py-1 text-[10px] font-sans uppercase tracking-[0.08em] transition-all duration-300 capitalize",
                                dreamData.emotionalTone === tone
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                    : "border-white/[0.06] bg-white/[0.02] text-white/35 hover:bg-white/[0.06] hover:text-white/55"
                            )}
                        >
                            {tone}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}