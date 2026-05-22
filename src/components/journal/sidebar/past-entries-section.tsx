"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, BookOpen, Pin, PinOff, Trash2, MoreVertical } from "lucide-react";
import { type SidebarEntryItem } from "./use-journal-sidebar-entries";
import { DeleteEntryDialog } from "./delete-entry-dialog";

interface PastEntriesSectionProps {
    entries: SidebarEntryItem[] | undefined;
    isLoading: boolean;
    deleteDialog: {
        open: boolean;
        entryId: string | null;
        entryTitle: string;
    };
    onRequestDelete: (entryId: string, entryTitle: string) => void;
    onConfirmDelete: () => void;
    onCancelDelete: () => void;
    onTogglePin: (entryId: string, currentlyPinned: boolean) => void;
}

function groupEntriesByTime(createdAt: number): string {
    const now = Date.now();
    const diff = now - createdAt;
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days <= 7) return "Previous 7 Days";
    return "Older";
}

function groupEntries(entries: SidebarEntryItem[]) {
    const groups = new Map<string, SidebarEntryItem[]>();
    for (const entry of entries) {
        const label = groupEntriesByTime(entry.createdAt);
        const bucket = groups.get(label) ?? [];
        bucket.push(entry);
        groups.set(label, bucket);
    }
    const order = ["Today", "Yesterday", "Previous 7 Days", "Older"];
    return order
        .filter((label) => groups.has(label))
        .map((label) => ({ label, items: groups.get(label)! }));
}

function EntryListItem({
    entry,
    isActive,
    onRequestDelete,
    onTogglePin,
}: {
    entry: SidebarEntryItem;
    isActive: boolean;
    onRequestDelete: (entryId: string, title: string) => void;
    onTogglePin: (entryId: string, isPinned: boolean) => void;
}) {
    return (
        <SidebarMenuSubItem className="group/item relative">
            <SidebarMenuSubButton
                asChild
                isActive={isActive}
                className="pr-8 transition-colors duration-300 group h-10 w-62 flex items-center gap-2 rounded-md border border-transparent text-foreground/70 hover:bg-[var(--journal-accent,#c8a45c)]/10 hover:text-[var(--journal-accent,#c8a45c)]/90 data-[active=true]:bg-[var(--journal-accent,#c8a45c)]/15 data-[active=true]:text-[var(--journal-accent,#c8a45c)] data-[active=true]:font-medium"
            >
                <a
                    href={`/journal?entry=${entry._id}`}
                    onClick={(e) => {
                        e.preventDefault();
                        // Update URL to open detail panel
                        const url = new URL(window.location.href);
                        url.searchParams.set("entry", entry._id);
                        url.searchParams.delete("edit");
                        window.history.pushState({}, "", url.toString());
                        // Dispatch a popstate-like event so JournalStreamPage reacts
                        window.dispatchEvent(new PopStateEvent("popstate"));
                    }}
                >
                    {/* Mood emoji or type icon */}
                    <span className="shrink-0 text-base leading-none w-5 text-center">
                        {entry.moodEmoji ?? entry.typeIcon}
                    </span>

                    {/* Title */}
                    <span className="flex-1 text-sm font-sans truncate leading-snug">
                        {entry.isPinned && (
                            <span className="mr-1 opacity-50 text-[10px]">📌</span>
                        )}
                        {entry.title}
                    </span>
                </a>
            </SidebarMenuSubButton>

            {/* Three-dot action button — appears on hover */}
            <div className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 focus-within:opacity-100">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="flex h-6 w-6 items-center justify-center rounded-md text-foreground/30 hover:bg-[var(--journal-accent,#c8a45c)]/10 hover:text-[var(--journal-accent,#c8a45c)] aria-expanded:bg-[var(--journal-accent,#c8a45c)]/10"
                            aria-label="Entry options"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side="right"
                        align="start"
                        className="w-44 border-white/15 bg-background/90 backdrop-blur-xl text-foreground shadow-xl"
                    >
                        <DropdownMenuItem
                            onClick={() => onTogglePin(entry._id, entry.isPinned)}
                            className="gap-2 cursor-pointer"
                        >
                            {entry.isPinned ? (
                                <>
                                    <PinOff className="h-4 w-4" />
                                    Unpin
                                </>
                            ) : (
                                <>
                                    <Pin className="h-4 w-4" />
                                    Pin entry
                                </>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                            onClick={() => onRequestDelete(entry._id, entry.title)}
                            className="gap-2 cursor-pointer text-red-500 hover:text-red-400 focus:text-red-400 focus:bg-red-500/10"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </SidebarMenuSubItem>
    );
}

export function PastEntriesSection({
    entries,
    isLoading,
    deleteDialog,
    onRequestDelete,
    onConfirmDelete,
    onCancelDelete,
    onTogglePin,
}: PastEntriesSectionProps) {
    const pathname = usePathname();
    const [activeEntryId, setActiveEntryId] = React.useState<string | null>(null);

    // Track the active entry from URL params
    React.useEffect(() => {
        const getActiveEntry = () => {
            const params = new URLSearchParams(window.location.search);
            setActiveEntryId(params.get("entry"));
        };
        getActiveEntry();
        window.addEventListener("popstate", getActiveEntry);
        return () => window.removeEventListener("popstate", getActiveEntry);
    }, []);

    return (
        <>
            <SidebarGroup className="mt-2 min-h-0 flex-1 w-full min-w-0 group-data-[collapsible=icon]:hidden">
                <SidebarGroupLabel className="flex items-center gap-2 text-[10px] font-serif tracking-wide lowercase italic text-foreground/40">
                    <BookOpen className="h-3 w-3 text-foreground/40" />
                    <span>Entries</span>
                </SidebarGroupLabel>
                <SidebarGroupContent className="h-full w-full min-w-12">
                    <ScrollArea className="h-full w-full min-w-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-foreground/30" />
                            </div>
                        ) : !entries || entries.length === 0 ? (
                            <div className="px-3 py-6 text-center">
                                <p className="text-xs text-foreground/30 font-serif italic">
                                    Your story begins here
                                </p>
                            </div>
                        ) : (
                            groupEntries(entries).map((group) => (
                                <div key={group.label} className="mb-2">
                                    {group.items.length >= 2 && (
                                        <p className="px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-foreground/25">
                                            {group.label}
                                        </p>
                                    )}
                                    <SidebarMenuSub className="mx-0 border-none pl-0 gap-0.5">
                                        {group.items.map((entry) => (
                                            <EntryListItem
                                                key={entry._id}
                                                entry={entry}
                                                isActive={activeEntryId === entry._id}
                                                onRequestDelete={onRequestDelete}
                                                onTogglePin={onTogglePin}
                                            />
                                        ))}
                                    </SidebarMenuSub>
                                </div>
                            ))
                        )}
                        <ScrollBar className="w-2 border-l-0" />
                    </ScrollArea>
                </SidebarGroupContent>
            </SidebarGroup>

            <DeleteEntryDialog
                open={deleteDialog.open}
                onOpenChange={(open) => {
                    if (!open) onCancelDelete();
                }}
                onConfirm={onConfirmDelete}
                entryTitle={deleteDialog.entryTitle}
            />
        </>
    );
}
