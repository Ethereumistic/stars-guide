"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { type MoodZone, MOOD_ZONES, ENTRY_TYPE_META, type EntryType } from "@/lib/journal/constants";

export interface SidebarEntryItem {
    _id: string;
    title: string;
    entryType: EntryType;
    moodZone: MoodZone | null;
    moodEmoji: string | null;
    typeIcon: string;
    entryDate: string;
    createdAt: number;
    contentPreview: string | null;
}

export function useJournalSidebarEntries() {
    const result = useQuery(api.journal.entries.getUserEntries, {
        limit: 25,
    });

    const entries: SidebarEntryItem[] | undefined = result?.entries?.map((e: any) => {
        const moodZone = e.moodZone as MoodZone | undefined;
        const zoneInfo = moodZone ? MOOD_ZONES.find((z) => z.key === moodZone) : null;
        const typeMeta = ENTRY_TYPE_META[e.entryType as EntryType];

        const contentPreview = e.content
            ? e.content.length > 60
                ? e.content.slice(0, 60) + "..."
                : e.content
            : null;

        return {
            _id: e._id,
            title: e.title || contentPreview || typeMeta?.label || "Entry",
            entryType: e.entryType,
            moodZone: moodZone ?? null,
            moodEmoji: zoneInfo?.emoji ?? null,
            typeIcon: typeMeta?.icon ?? "📝",
            entryDate: e.entryDate,
            createdAt: e.createdAt,
            contentPreview,
        };
    });

    return {
        entries,
        isLoading: result === undefined,
    };
}
