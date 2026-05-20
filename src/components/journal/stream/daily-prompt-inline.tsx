"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DailyPromptInlineProps {
    /** Called when user clicks "Use this" to fill the textarea with the prompt */
    onUsePrompt?: (promptText: string) => void;
    className?: string;
}

/**
 * DailyPromptInline — shows today's journal prompt as a subtle banner
 * above the QuickCapture textarea. Clicking "Use this" fills the textarea.
 * Dismissible per day.
 */
export function DailyPromptInline({
    onUsePrompt,
    className,
}: DailyPromptInlineProps) {
    const prompt = useQuery(api.journal.prompts.getDailyPrompt);
    const [dismissed, setDismissed] = React.useState(false);

    // Check localStorage for today's dismissal
    const today = new Date().toISOString().split("T")[0];
    const DISMISS_KEY = `journal_prompt_dismissed_${today}`;

    React.useEffect(() => {
        const stored = localStorage.getItem(DISMISS_KEY);
        if (stored === "true") {
            setDismissed(true);
        }
    }, [DISMISS_KEY]);

    function handleDismiss() {
        setDismissed(true);
        localStorage.setItem(DISMISS_KEY, "true");
    }

    if (!prompt || dismissed) return null;

    return (
        <div
            className={cn(
                "relative flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-500/10 bg-amber-500/[0.04]",
                className
            )}
        >
            <button
                type="button"
                onClick={handleDismiss}
                className="absolute top-2 right-2 text-white/20 hover:text-white/50 transition-colors"
            >
                <X className="h-3 w-3" />
            </button>

            <span className="text-sm mt-0.5 shrink-0">✦</span>

            <div className="min-w-0 flex-1">
                <p className="text-[9px] font-sans uppercase tracking-[0.2em] text-amber-400/40 mb-0.5">
                    Today&apos;s reflection
                </p>
                <p className="text-sm font-serif text-white/55 leading-relaxed">
                    &ldquo;{prompt.text}&rdquo;
                </p>
                {onUsePrompt && (
                    <button
                        type="button"
                        onClick={() => onUsePrompt(prompt.text)}
                        className="mt-1.5 text-[10px] font-sans uppercase tracking-[0.12em] text-amber-400/50 hover:text-amber-400/80 transition-colors"
                    >
                        Write about this ↵
                    </button>
                )}
            </div>

            {prompt.moonPhase && (
                <span className="text-[10px] text-white/20 shrink-0 mt-0.5">
                    🌙 {prompt.moonPhase}
                </span>
            )}
        </div>
    );
}