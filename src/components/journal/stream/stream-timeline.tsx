"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { StreamEntryCard } from "./stream-entry-card";
import { Loader2 } from "lucide-react";

interface StreamTimelineProps {
    onEntryClick?: (entryId: string) => void;
    className?: string;
}

/**
 * StreamTimeline — simplified timeline with date group headers and compact entry cards.
 * Replaces the old TimelineView for the stream page.
 */
export function StreamTimeline({
    onEntryClick,
    className,
}: StreamTimelineProps) {
    const [cursor, setCursor] = React.useState<string | null>(null);

    const result = useQuery(api.journal.entries.getUserEntries, {
        cursor: cursor ?? undefined,
        limit: 20,
    });

    const entries = result?.entries ?? [];
    const continueCursor = result?.continueCursor ?? null;
    const isDone = result?.isDone ?? true;

    // Group entries by date
    const groupedEntries = React.useMemo(() => {
        const groups: Array<{ date: string; entries: any[] }> = [];
        let currentDate = "";

        for (const entry of entries) {
            if (entry.entryDate !== currentDate) {
                currentDate = entry.entryDate;
                groups.push({ date: currentDate, entries: [entry] });
            } else {
                groups[groups.length - 1].entries.push(entry);
            }
        }

        return groups;
    }, [entries]);

    // Format date label
    function formatDateLabel(dateStr: string): string {
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000)
            .toISOString()
            .split("T")[0];

        if (dateStr === today) return "Today";
        if (dateStr === yesterday) return "Yesterday";

        return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
        });
    }

    return (
        <div className={cn("space-y-5", className)}>
            {groupedEntries.map(({ date, entries: dateEntries }) => (
                <div key={date} className="space-y-2">
                    <h3 className="text-xs font-sans uppercase tracking-[0.15em] text-white/25 px-1">
                        {formatDateLabel(date)}
                    </h3>
                    <div className="space-y-1.5">
                        {dateEntries.map((entry: any) => (
                            <StreamEntryCard
                                key={entry._id}
                                entry={entry}
                                onClick={() => onEntryClick?.(entry._id)}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {/* Loading */}
            {!result && (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-white/30" />
                </div>
            )}

            {/* Empty state */}
            {result && entries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm font-serif text-white/40">
                        No entries yet. Start writing above.
                    </p>
                </div>
            )}

            {/* Load More */}
            {!isDone && continueCursor && (
                <button
                    type="button"
                    onClick={() => setCursor(continueCursor)}
                    className="block mx-auto text-xs font-sans uppercase tracking-[0.1em] text-white/30 hover:text-white/50 transition-colors"
                >
                    Load more
                </button>
            )}
        </div>
    );
}