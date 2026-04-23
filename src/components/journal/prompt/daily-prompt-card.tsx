"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { GiScrollUnfurled } from "react-icons/gi";

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
        <div className={cn("group relative block", className)}>
            <div className="relative overflow-hidden rounded-xl border border-border/30 bg-transparent transition-all duration-500 group-hover:scale-[1.02]">
                {/* Gradient background */}
                <div
                    className="absolute inset-0 rounded-xl"
                    style={{
                        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
                    }}
                />

                {/* Galactic gradient overlay */}
                <div className="absolute inset-0 opacity-10 transition-opacity duration-500 group-hover:opacity-20" style={{ background: "linear-gradient(135deg, transparent 0%, var(--galactic) 100%)" }} />

                {/* Scroll watermark */}
                <div className="absolute inset-y-0 right-0 w-1/3 pointer-events-none overflow-hidden">
                    <GiScrollUnfurled
                        className="absolute top-1/2 right-[-10%] -translate-y-1/2 h-full w-auto opacity-[0.04] scale-125 transition-all duration-700 group-hover:opacity-[0.08] group-hover:scale-100 group-hover:right-[10%]"
                        style={{
                            color: "var(--galactic)",
                            filter: "drop-shadow(0 0 10px var(--galactic))",
                        }}
                    />
                </div>

                {/* Radial glow */}
                <div className="absolute -right-8 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full opacity-0 transition-opacity duration-500 blur-2xl group-hover:opacity-25 bg-galactic" />

                {/* Content */}
                <div className="relative z-10 p-5">
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 text-white/25 hover:text-white/60 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-galactic/20 bg-galactic/10 text-galactic/70 mt-0.5">
                            <GiScrollUnfurled className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-sans uppercase tracking-[0.2em] text-galactic/50 mb-1.5">
                                Today&apos;s Reflection
                            </p>
                            <p className="text-sm font-serif text-white/75 leading-relaxed">
                                {prompt.text}
                            </p>
                            {prompt.moonPhase && (
                                <p className="text-[10px] text-white/25 mt-2 font-sans">
                                    🌙 {prompt.moonPhase}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}