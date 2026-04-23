"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { EntryCard } from "./entry-card";
import { DateSeparator } from "./date-separator";
import { StreakDisplay } from "./streak-display";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GiScrollUnfurled } from "react-icons/gi";

interface TimelineViewProps {
    className?: string;
}

export function TimelineView({ className }: TimelineViewProps) {
    const router = useRouter();
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

    return (
        <div className={cn("space-y-4", className)}>
            {/* Streak */}
            <StreakDisplay />

            {/* Entries */}
            {groupedEntries.length === 0 && result !== undefined && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-galactic/20 bg-galactic/10 mb-4">
                        <GiScrollUnfurled className="h-7 w-7 text-galactic/50" />
                    </div>
                    <h3 className="text-lg font-serif font-semibold text-white/60">
                        Your story starts here
                    </h3>
                    <p className="text-sm text-white/30 mt-1 max-w-xs font-sans">
                        Tap the button below to begin your first journal entry
                    </p>
                    <Button
                        variant="galactic"
                        size="sm"
                        onClick={() => router.push("/journal/new")}
                        className="mt-4 gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        New Entry
                    </Button>
                </div>
            )}

            {groupedEntries.map(({ date, entries: dateEntries }) => (
                <div key={date} className="space-y-2">
                    <DateSeparator date={date} />
                    <div className="space-y-2">
                        {dateEntries.map((entry: any) => (
                            <EntryCard
                                key={entry._id}
                                entry={entry}
                                onClick={() =>
                                    router.push(`/journal/${entry._id}`)
                                }
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

            {/* Load More */}
            {!isDone && continueCursor && (
                <div className="flex justify-center pt-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCursor(continueCursor)}
                        className="text-white/35 hover:text-white/60"
                    >
                        Load more
                    </Button>
                </div>
            )}
        </div>
    );
}