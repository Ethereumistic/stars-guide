"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Edit2, Trash2, MoreVertical, Loader2 } from "lucide-react";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StreakDisplay } from "@/components/journal/timeline/streak-display";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
    Calendar,
    BarChart3,
    Settings,
} from "lucide-react";
import { GiScrollUnfurled } from "react-icons/gi";
import { useJournalSidebarEntries, type SidebarEntryItem } from "./use-journal-entries";
import { MOOD_ZONES, type MoodZone } from "@/lib/journal/constants";

const NAV_ITEMS = [
    { key: "timeline", label: "Timeline", href: "/journal", icon: GiScrollUnfurled },
    { key: "calendar", label: "Calendar", href: "/journal/calendar", icon: Calendar },
    { key: "stats", label: "Stats", href: "/journal/stats", icon: BarChart3 },
    { key: "settings", label: "Settings", href: "/journal/settings", icon: Settings },
];

// --- Helpers ---

function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

function groupEntriesByDate(entries: SidebarEntryItem[]) {
    const groups = new Map<string, SidebarEntryItem[]>();
    for (const entry of entries) {
        const bucket = groups.get(entry.entryDate) ?? [];
        bucket.push(entry);
        groups.set(entry.entryDate, bucket);
    }
    return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
}

function formatDateLabel(dateStr: string): string {
    const today = new Date();
    const entryDate = new Date(dateStr + "T00:00:00");
    const todayStr = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (dateStr === todayStr) return "Today";
    if (dateStr === yesterdayStr) return "Yesterday";
    return entryDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// --- Dialog state types ---

interface DeleteDialogState {
    open: boolean;
    entryId: string | null;
    entryTitle: string;
    isActive: boolean;
}

interface RenameDialogState {
    open: boolean;
    entryId: string | null;
    currentTitle: string;
}

const initialDeleteState: DeleteDialogState = {
    open: false,
    entryId: null,
    entryTitle: "",
    isActive: false,
};

const initialRenameState: RenameDialogState = {
    open: false,
    entryId: null,
    currentTitle: "",
};

// --- Entry list item ---

function EntryListItem({
    entry,
    isActive,
    onRequestDelete,
    onRequestRename,
}: {
    entry: SidebarEntryItem;
    isActive: boolean;
    onRequestDelete: (entryId: string, entryTitle: string, isActive: boolean) => void;
    onRequestRename: (entryId: string, currentTitle: string) => void;
}) {
    const moodZone = entry.moodZone as MoodZone | undefined;
    const zoneInfo = moodZone ? MOOD_ZONES.find((z) => z.key === moodZone) : null;
    const accentColor = zoneInfo?.color ?? "var(--primary)";

    return (
        <SidebarMenuSubItem className="group/item relative">
            {/*
             * pr-8 reserves space on the right for the action button,
             * so the title always has room to truncate cleanly.
             */}
            <SidebarMenuSubButton
                asChild
                isActive={isActive}
                className="pr-8 transition-colors duration-300 group h-10 w-62 flex items-center gap-3 rounded-md border border-transparent text-foreground/70 hover:bg-accent/40 hover:text-primary data-[active=true]:bg-accent/40 data-[active=true]:text-primary data-[active=true]:font-medium"
            >
                <Link href={`/journal/${entry._id}`}>
                    {/* Mood zone color dot */}
                    <span className="shrink-0 flex h-5 w-5 items-center justify-center">
                        <span
                            className={cn(
                                "h-2 w-2 rounded-full transition-all duration-300",
                                !zoneInfo && "bg-foreground/20"
                            )}
                            style={zoneInfo ? {
                                backgroundColor: accentColor,
                                boxShadow: `0 0 6px ${accentColor}60`,
                            } : undefined}
                        />
                    </span>

                    {/* Title + time */}
                    <span className="flex-1 min-w-0 flex flex-col overflow-hidden">
                        <span className="text-sm font-serif italic truncate leading-tight">
                            {entry.title}
                        </span>
                        <span className="text-[10px] text-foreground/30 leading-tight">
                            {formatRelativeTime(entry.createdAt)}
                        </span>
                    </span>
                </Link>
            </SidebarMenuSubButton>

            {/* Three-dot action button — absolutely positioned, appears on hover */}
            <div className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 focus-within:opacity-100">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="flex h-6 w-6 items-center justify-center rounded-md text-foreground/30 hover:bg-accent/40 hover:text-primary aria-expanded:bg-accent/40 aria-expanded:text-primary"
                            aria-label="Entry options"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side="right"
                        align="start"
                        className="w-48 border-white/15 bg-background/90 backdrop-blur-xl text-foreground shadow-xl"
                    >
                        <DropdownMenuItem
                            onClick={() => onRequestRename(entry._id, entry.title)}
                            className="gap-2 cursor-pointer"
                        >
                            <Edit2 className="h-4 w-4" />
                            Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                            onClick={() => onRequestDelete(entry._id, entry.title, isActive)}
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

// --- Delete dialog ---

function DeleteEntryDialog({
    open,
    onOpenChange,
    onConfirm,
    entryTitle,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    entryTitle: string;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="max-w-sm border-white/15 bg-background/90 backdrop-blur-xl text-foreground shadow-xl"
            >
                <DialogHeader>
                    <DialogTitle className="text-foreground font-serif">Delete this entry?</DialogTitle>
                    <DialogDescription className="text-foreground/50">
                        This will permanently delete &ldquo;{entryTitle}&rdquo;. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="border border-white/10 text-foreground/70 hover:bg-accent/40 hover:text-primary transition-all duration-500"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        className="gap-2 bg-red-600 hover:bg-red-500 text-white"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Rename dialog ---

function RenameEntryDialog({
    open,
    onOpenChange,
    onRename,
    currentTitle,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRename: (newTitle: string) => void;
    currentTitle: string;
}) {
    const [title, setTitle] = React.useState(currentTitle);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (open) {
            setTitle(currentTitle);
            const timer = window.setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 50);
            return () => window.clearTimeout(timer);
        }
    }, [open, currentTitle]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim() && title.trim() !== currentTitle) {
            onRename(title.trim());
        }
    };

    const handleOpenChange = (nextOpen: boolean) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
            setTitle(currentTitle);
        }
    };

    const isValid = title.trim().length > 0 && title.trim() !== currentTitle;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="max-w-sm border-white/15 bg-background/90 backdrop-blur-xl text-foreground shadow-xl"
            >
                <DialogHeader>
                    <DialogTitle className="text-foreground font-serif">Rename entry</DialogTitle>
                    <DialogDescription className="text-foreground/50">
                        Give this entry a new name.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <Input
                        ref={inputRef}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-background/40 border-white/15 text-foreground placeholder:text-foreground/30 focus-visible:ring-primary/30"
                        placeholder="Enter a new name..."
                    />
                    <DialogFooter className="mt-4 gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleOpenChange(false)}
                            className="border border-white/10 text-foreground/70 hover:bg-accent/40 hover:text-primary transition-all duration-500"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!isValid}
                            className="gap-2 bg-galactic/20 hover:bg-galactic/30 text-white border-0 disabled:opacity-40"
                        >
                            <Edit2 className="h-4 w-4" />
                            Rename
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// --- Main section ---

export function JournalNavSection() {
    const router = useRouter();
    const pathname = usePathname();
    const { entries, isLoading } = useJournalSidebarEntries();

    const deleteEntry = useMutation(api.journal.entries.deleteEntry);
    const updateEntry = useMutation(api.journal.entries.updateEntry);

    const [deleteDialog, setDeleteDialog] = React.useState<DeleteDialogState>(initialDeleteState);
    const [renameDialog, setRenameDialog] = React.useState<RenameDialogState>(initialRenameState);

    const requestDelete = (entryId: string, entryTitle: string, isActive: boolean) => {
        setDeleteDialog({ open: true, entryId, entryTitle, isActive });
    };

    const confirmDelete = async () => {
        if (!deleteDialog.entryId) return;
        const { entryId, isActive } = deleteDialog;
        await deleteEntry({ entryId: entryId as any });
        if (isActive) {
            router.push("/journal");
        }
        setDeleteDialog(initialDeleteState);
    };

    const requestRename = (entryId: string, currentTitle: string) => {
        setRenameDialog({ open: true, entryId, currentTitle });
    };

    const confirmRename = async (newTitle: string) => {
        if (!renameDialog.entryId || !newTitle.trim()) return;
        await updateEntry({ entryId: renameDialog.entryId as any, title: newTitle.trim() });
        setRenameDialog(initialRenameState);
    };

    const grouped = entries ? groupEntriesByDate(entries) : [];

    return (
        <>
            <SidebarGroup className="mt-2 min-h-0 flex-1 w-full min-w-0 group-data-[collapsible=icon]:hidden">
                {/* Streak */}
                <div className="px-1 mb-2">
                    <StreakDisplay />
                </div>

                <SidebarGroupLabel className="flex items-center gap-2 text-[10px] font-serif tracking-wide lowercase italic text-foreground/40">
                    <GiScrollUnfurled className="h-3 w-3 text-foreground/40" />
                    <span>Navigate</span>
                </SidebarGroupLabel>
                <SidebarGroupContent className="h-full w-full min-w-12">
                    {/* Nav Items */}
                    <SidebarMenuSub className="mx-0 border-none pl-0 gap-0.5">
                        {NAV_ITEMS.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== "/journal" && pathname.startsWith(item.href));
                            return (
                                <SidebarMenuSubItem key={item.key}>
                                    <SidebarMenuSubButton
                                        isActive={isActive}
                                        onClick={() => router.push(item.href)}
                                        className={cn(
                                            "h-8 gap-2.5 rounded-lg px-3 text-foreground/50 hover:bg-accent/40 hover:text-primary transition-all duration-500",
                                            isActive && "bg-accent/40 text-primary font-medium"
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        <span>{item.label}</span>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            );
                        })}
                    </SidebarMenuSub>

                    {/* Recent Entries */}
                    <div className="mt-3">
                        <p className="px-3 py-1.5 text-[10px] font-serif italic text-foreground/30 uppercase tracking-wider">
                            Recent Entries
                        </p>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-foreground/30" />
                            </div>
                        ) : entries && entries.length === 0 ? (
                            <div className="px-3 py-3 text-center">
                                <GiScrollUnfurled className="mx-auto mb-1.5 h-4 w-4 text-foreground/15" />
                                <p className="text-[11px] font-serif italic text-foreground/25">
                                    Your reflections will appear here
                                </p>
                            </div>
                        ) : (
                            <ScrollArea className="max-h-[40vh]">
                                {grouped.map((group) => (
                                    <div key={group.date} className="mb-1">
                                        {group.items.length > 1 && (
                                            <p className="px-3 py-0.5 text-[10px] font-serif italic text-foreground/20">
                                                {formatDateLabel(group.date)}
                                            </p>
                                        )}
                                        <SidebarMenuSub className="mx-0 border-none pl-0 gap-0.5">
                                            {group.items.map((entry) => {
                                                const isActive = pathname === `/journal/${entry._id}`;
                                                return (
                                                    <EntryListItem
                                                        key={entry._id}
                                                        entry={entry}
                                                        isActive={isActive}
                                                        onRequestDelete={requestDelete}
                                                        onRequestRename={requestRename}
                                                    />
                                                );
                                            })}
                                        </SidebarMenuSub>
                                    </div>
                                ))}
                                <ScrollBar className="w-1.5" />
                            </ScrollArea>
                        )}
                    </div>
                </SidebarGroupContent>
            </SidebarGroup>

            <DeleteEntryDialog
                open={deleteDialog.open}
                onOpenChange={(open) => { if (!open) setDeleteDialog(initialDeleteState); }}
                onConfirm={confirmDelete}
                entryTitle={deleteDialog.entryTitle}
            />

            <RenameEntryDialog
                open={renameDialog.open}
                onOpenChange={(open) => { if (!open) setRenameDialog(initialRenameState); }}
                onRename={confirmRename}
                currentTitle={renameDialog.currentTitle}
            />
        </>
    );
}
