"use client";

import { TimelineView } from "@/components/journal/timeline/timeline-view";
import { DailyPromptCard } from "@/components/journal/prompt/daily-prompt-card";
import { GiScrollUnfurled } from "react-icons/gi";

export default function JournalPage() {
    return (
        <div>
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <GiScrollUnfurled className="h-4 w-4 text-galactic/60" />
                    <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-galactic/50">
                        Your Cosmic Diary
                    </span>
                </div>
                <h1 className="text-2xl font-serif font-bold text-white/90 tracking-wide">
                    Journal
                </h1>
                <p className="mt-1 text-sm text-white/35 font-sans">
                    Reflections, moods, and cosmic context
                </p>
            </div>

            {/* Daily prompt */}
            <DailyPromptCard className="mb-4" />

            <TimelineView />
        </div>
    );
}