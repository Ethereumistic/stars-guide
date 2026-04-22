"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { JOURNAL_LIMITS, DREAM_EMOTIONAL_TONES, type EmotionEntry } from "@/lib/journal/constants";
import { MoodPad } from "./mood-pad";
import { EmotionSelector } from "./emotion-selector";

interface DreamEditorProps {
    content: string;
    onContentChange: (content: string) => void;
    dreamData: {
        isLucid?: boolean;
        isRecurring?: boolean;
        dreamSigns?: string[];
        emotionalTone?: string;
    };
    onDreamDataChange: (data: DreamEditorProps["dreamData"]) => void;
    mood: { valence: number; arousal: number } | null;
    onMoodChange: (mood: { valence: number; arousal: number } | null) => void;
    emotions: EmotionEntry[];
    onEmotionsChange: (emotions: EmotionEntry[]) => void;
    className?: string;
}

export function DreamEditor({
    content,
    onContentChange,
    dreamData,
    onDreamDataChange,
    mood,
    onMoodChange,
    emotions,
    onEmotionsChange,
    className,
}: DreamEditorProps) {
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
        <div className={cn("space-y-5", className)}>
            {/* Dream description */}
            <textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="Describe your dream..."
                autoFocus
                maxLength={JOURNAL_LIMITS.MAX_CONTENT_LENGTH}
                className="w-full min-h-[180px] bg-transparent text-sm text-white/80 placeholder:text-white/25 outline-none border-none resize-y leading-relaxed"
            />

            {/* Dream properties */}
            <div className="space-y-3">
                {/* Toggles */}
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() =>
                            onDreamDataChange({
                                ...dreamData,
                                isLucid: !dreamData.isLucid,
                            })
                        }
                        className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                            dreamData.isLucid
                                ? "border-galactic/40 bg-galactic/15 text-white"
                                : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10"
                        )}
                    >
                        🌟 Lucid Dream
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            onDreamDataChange({
                                ...dreamData,
                                isRecurring: !dreamData.isRecurring,
                            })
                        }
                        className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                            dreamData.isRecurring
                                ? "border-galactic/40 bg-galactic/15 text-white"
                                : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10"
                        )}
                    >
                        🔄 Recurring Dream
                    </button>
                </div>

                {/* Dream signs */}
                <div className="space-y-1.5">
                    <label className="text-xs text-white/50 font-medium">Dream Signs</label>
                    <div className="flex flex-wrap gap-1.5">
                        {(dreamData.dreamSigns ?? []).map((sign) => (
                            <span
                                key={sign}
                                className="inline-flex items-center gap-1 rounded-full border border-galactic/30 bg-galactic/10 px-2 py-0.5 text-xs text-galactic"
                            >
                                {sign}
                                <button
                                    type="button"
                                    onClick={() => removeDreamSign(sign)}
                                    className="text-galactic/50 hover:text-galactic"
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
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDreamSign())}
                            placeholder="Add a dream sign..."
                            className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 placeholder:text-white/30 outline-none"
                        />
                        <button
                            type="button"
                            onClick={addDreamSign}
                            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/40 hover:bg-white/10"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Emotional tone */}
                <div className="space-y-1.5">
                    <label className="text-xs text-white/50 font-medium">Emotional Tone</label>
                    <div className="flex flex-wrap gap-1.5">
                        {DREAM_EMOTIONAL_TONES.map((tone) => (
                            <button
                                key={tone}
                                type="button"
                                onClick={() =>
                                    onDreamDataChange({
                                        ...dreamData,
                                        emotionalTone: dreamData.emotionalTone === tone ? undefined : tone,
                                    })
                                }
                                className={cn(
                                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-all capitalize",
                                    dreamData.emotionalTone === tone
                                        ? "border-galactic/40 bg-galactic/15 text-white"
                                        : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10"
                                )}
                            >
                                {tone}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mood — how the dream made the user feel */}
            <div className="space-y-1">
                <label className="text-xs text-white/50 font-medium">How did this dream make you feel?</label>
                <MoodPad value={mood} onChange={onMoodChange} compact />
                <EmotionSelector value={emotions} onChange={onEmotionsChange} />
            </div>
        </div>
    );
}