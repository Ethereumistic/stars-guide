"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Sparkles, X } from "lucide-react";

interface DailyPromptCardProps {
    className?: string;
}

/**
 * Displays today's algorithmic journal prompt at the top of the timeline.
 * Dismissible per day (stored in localStorage).
 */
export function DailyPromptCard({ className }: DailyPromptCardProps) {
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
                "relative rounded-xl border border-galactic/20 bg-galactic/5 p-4 transition-all",
                className,
            )}
        >
            <button
                type="button"
                onClick={handleDismiss}
                className="absolute top-2 right-2 text-white/30 hover:text-white/60 transition-colors"
            >
                <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-galactic/60 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="text-xs text-galactic/60 uppercase tracking-wider mb-1">
                        Today's Reflection
                    </p>
                    <p className="text-sm text-white/70 leading-relaxed">
                        {prompt.text}
                    </p>
                    {prompt.moonPhase && (
                        <p className="text-[10px] text-white/30 mt-1.5">
                            🌙 {prompt.moonPhase}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}