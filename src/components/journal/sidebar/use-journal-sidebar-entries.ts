"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { usePathname } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { type MoodZone, MOOD_ZONES, ENTRY_TYPE_META, type EntryType } from "@/lib/journal/constants";

export interface SidebarEntryItem {
    _id: string;
    title: string;
    entryType: EntryType;
    moodZone: MoodZone | null;
    moodEmoji: string | null;
    moodColor: string | null;
    typeIcon: string;
    entryDate: string;
    createdAt: number;
    contentPreview: string | null;
    isPinned: boolean;
}

interface DeleteDialogState {
    open: boolean;
    entryId: string | null;
    entryTitle: string;
}

const initialDeleteState: DeleteDialogState = {
    open: false,
    entryId: null,
    entryTitle: "",
};

export function useJournalSidebarEntries() {
    const pathname = usePathname();
    const result = useQuery(api.journal.entries.getUserEntries, { limit: 30 });
    const deleteEntryMutation = useMutation(api.journal.entries.deleteEntry);
    const updateEntryMutation = useMutation(api.journal.entries.updateEntry);

    const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(initialDeleteState);

    const entries: SidebarEntryItem[] | undefined = result?.entries?.map((e: any) => {
        const moodZone = e.moodZone as MoodZone | undefined;
        const zoneInfo = moodZone ? MOOD_ZONES.find((z) => z.key === moodZone) : null;
        const typeMeta = ENTRY_TYPE_META[e.entryType as EntryType];

        const contentPreview = e.content
            ? e.content.length > 55
                ? e.content.slice(0, 55) + "…"
                : e.content
            : null;

        return {
            _id: String(e._id),
            title: e.title || contentPreview || typeMeta?.label || "Entry",
            entryType: e.entryType as EntryType,
            moodZone: moodZone ?? null,
            moodEmoji: zoneInfo?.emoji ?? null,
            moodColor: zoneInfo?.color ?? null,
            typeIcon: typeMeta?.icon ?? "📝",
            entryDate: e.entryDate,
            createdAt: e.createdAt,
            contentPreview,
            isPinned: e.isPinned ?? false,
        };
    });

    // Sort: pinned first, then by createdAt desc
    const sortedEntries = entries?.slice().sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt - a.createdAt;
    });

    const requestDelete = useCallback((entryId: string, entryTitle: string) => {
        setDeleteDialog({ open: true, entryId, entryTitle });
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!deleteDialog.entryId) return;
        await deleteEntryMutation({ entryId: deleteDialog.entryId as any });
        setDeleteDialog(initialDeleteState);
    }, [deleteDialog, deleteEntryMutation]);

    const cancelDelete = useCallback(() => {
        setDeleteDialog(initialDeleteState);
    }, []);

    const handleTogglePin = useCallback(async (entryId: string, currentlyPinned: boolean) => {
        await updateEntryMutation({
            entryId: entryId as any,
            isPinned: !currentlyPinned,
        });
    }, [updateEntryMutation]);

    return {
        entries: sortedEntries,
        isLoading: result === undefined,
        deleteDialog,
        requestDelete,
        confirmDelete,
        cancelDelete,
        handleTogglePin,
    };
}
