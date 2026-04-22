"use client";

import { TimelineView } from "@/components/journal/timeline/timeline-view";

export default function JournalPage() {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-serif font-bold text-white/90">
                    Journal
                </h1>
                <p className="mt-1 text-sm text-white/40">
                    Your reflections, moods, and cosmic context
                </p>
            </div>

            <TimelineView />
        </div>
    );
}