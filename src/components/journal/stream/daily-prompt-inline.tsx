"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getDailyPrompts, TOPIC_COLORS, type JournalPrompt } from "@/lib/journal/daily-prompts";

interface DailyPromptInlineProps {
    /** Called when user clicks "Write about this" to fill the textarea */
    onUsePrompt?: (promptText: string) => void;
    className?: string;
}

/**
 * DailyPromptInline — shows 3 rotating daily prompts as cards
 * above the QuickCapture textarea. Each card is tappable and fills
 * the textarea with the prompt text.
 */
export function DailyPromptInline({ onUsePrompt, className }: DailyPromptInlineProps) {
    const [dismissed, setDismissed] = React.useState(false);

    const prompts = getDailyPrompts(new Date());

    // Dismissal key: changes each day so dismissed state resets daily
    const today = new Date().toISOString().split("T")[0];
    const DISMISS_KEY = `journal_prompts_dismissed_${today}`;

    React.useEffect(() => {
        if (localStorage.getItem(DISMISS_KEY) === "true") {
            setDismissed(true);
        }
    }, [DISMISS_KEY]);

    function handleDismiss() {
        setDismissed(true);
        localStorage.setItem(DISMISS_KEY, "true");
    }

    if (dismissed) return null;

    return (
        <div className={cn("space-y-2", className)}>
            {/* Section label */}
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-sans uppercase tracking-[0.2em] text-amber-400/30">
                    Today&apos;s prompts
                </span>
                <button
                    type="button"
                    onClick={handleDismiss}
                    className="text-white/20 hover:text-white/40 transition-colors text-[10px] font-sans uppercase tracking-[0.1em]"
                >
                    Dismiss
                </button>
            </div>

            {/* 3-column grid (desktop) / horizontal scroll (mobile) */}
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 scrollbar-hide">
                {prompts.map((prompt, i) => (
                    <PromptCard
                        key={`${prompt.topic}-${i}`}
                        prompt={prompt}
                        onUsePrompt={onUsePrompt}
                    />
                ))}
            </div>
        </div>
    );
}

/** Single prompt card */
function PromptCard({
    prompt,
    onUsePrompt,
}: {
    prompt: JournalPrompt;
    onUsePrompt?: (text: string) => void;
}) {
    const accentColor = TOPIC_COLORS[prompt.topic];

    return (
        <div
            className={cn(
                // Layout
                "group relative flex flex-col gap-2 shrink-0 w-48 snap-start rounded-xl border border-white/[0.06] bg-white/[0.025] p-4",
                // Left accent bar
                `border-l-2 ${accentColor}`,
                // Hover state
                "hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-150"
            )}
        >
            {/* Topic icon */}
            <span className="text-base leading-none">{prompt.icon}</span>

            {/* Prompt text — max 2 lines, truncate */}
            <p
                className="text-[13px] font-serif text-white/65 leading-snug line-clamp-2"
                title={prompt.text}
            >
                {prompt.text}
            </p>

            {/* Write about this button */}
            {onUsePrompt && (
                <button
                    type="button"
                    onClick={() => onUsePrompt(prompt.text)}
                    className="mt-auto text-[10px] font-sans uppercase tracking-[0.12em] text-amber-400/40 hover:text-amber-400/80 transition-colors text-left"
                >
                    Write about this
                </button>
            )}
        </div>
    );
}
