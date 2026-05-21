"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
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
import {
    MOOD_ZONES,
    ENTRY_TYPE_META,
    type MoodZone,
} from "@/lib/journal/constants";
import { EmotionBadges } from "./emotion-badges";
import { AstroContextStrip } from "../composer/astro-context-strip";
import { QuickCapture } from "../stream/quick-capture";
import {
    Loader2,
    ArrowLeft,
    Pencil,
    Trash2,
    Pin,
    PinOff,
    MoreVertical,
    Sparkles,
} from "lucide-react";

interface DetailPanelProps {
    entryId: string | null;
    open: boolean;
    onClose: () => void;
    /** If true, open in edit mode */
    editMode?: boolean;
    className?: string;
}

/**
 * DetailPanel — slide-over panel for viewing/editing a journal entry.
 * Desktop: 40% width from right. Mobile: full-screen.
 * Uses shadcn Sheet for the slide-over animation.
 */
export function DetailPanel({
    entryId,
    open,
    onClose,
    editMode = false,
    className,
}: DetailPanelProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = React.useState(editMode);
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    // Reset edit mode when panel opens with a new entry
    React.useEffect(() => {
        if (open) {
            setIsEditing(editMode);
        }
    }, [open, editMode]);

    const entry = useQuery(
        api.journal.entries.getEntry,
        entryId ? { entryId: entryId as any } : "skip"
    );

    const photoUrl = useQuery(
        api.files.getUrl,
        entry?.photoId ? { storageId: entry.photoId as any } : "skip"
    );

    const updateEntry = useMutation(api.journal.entries.updateEntry);
    const deleteEntry = useMutation(api.journal.entries.deleteEntry);

    async function handleDelete() {
        if (!entryId) return;
        setIsDeleting(true);
        try {
            await deleteEntry({ entryId: entryId as any });
            onClose();
        } catch (e) {
            console.error("Delete failed:", e);
        } finally {
            setIsDeleting(false);
        }
    }

    async function handleTogglePin() {
        if (!entry || !entryId) return;
        await updateEntry({
            entryId: entryId as any,
            isPinned: !entry.isPinned,
        });
    }

    function handleEdit() {
        setIsEditing(true);
    }

    function handleCancelEdit() {
        setIsEditing(false);
    }

    function handleSaveEdit() {
        setIsEditing(false);
        // QuickCapture's internal onSave will handle the mutation
    }

    function handleAskOracle() {
        if (!entryId) return;
        router.push(`/oracle/new?journalEntryId=${entryId}`);
    }

    // Don't render the panel if no entry selected
    if (!entryId) return null;

    const isLoading = entry === undefined;

    return (
        <>
            <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
                <SheetContent
                    side="right"
                    className={cn(
                        "w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl",
                        "bg-[#0f1628] border-l border-white/[0.06]",
                        "overflow-y-auto p-0",
                        className
                    )}
                >
                    {isLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-5 w-5 animate-spin text-white/30" />
                        </div>
                    ) : !entry ? (
                        <div className="flex flex-col items-center justify-center py-20 text-white/30">
                            <p className="text-sm font-sans">Entry not found</p>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="mt-4 text-white/35 hover:text-white/60"
                            >
                                Go back
                            </Button>
                        </div>
                    ) : isEditing ? (
                        /* ── Edit mode: QuickCapture inside the panel ── */
                        <div className="p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-sans uppercase tracking-[0.15em] text-white/40">
                                    Edit Entry
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    className="text-white/35 hover:text-white/60"
                                >
                                    Cancel
                                </Button>
                            </div>
                            <QuickCapture
                                editEntry={entry}
                                editEntryId={entryId}
                                onSave={handleSaveEdit}
                                onCancel={handleCancelEdit}
                            />
                        </div>
                    ) : (
                        /* ── Read mode: entry detail view ── */
                        <div className="p-4 sm:p-6 space-y-5">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClose}
                                    className="text-white/35 hover:text-white/60"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-1" />
                                    Back
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            className="text-white/35 hover:text-white/60"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={handleEdit}>
                                            <Pencil className="h-4 w-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleTogglePin}>
                                            {entry.isPinned ? (
                                                <>
                                                    <PinOff className="h-4 w-4 mr-2" />
                                                    Unpin
                                                </>
                                            ) : (
                                                <>
                                                    <Pin className="h-4 w-4 mr-2" />
                                                    Pin
                                                </>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleAskOracle}>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Ask Oracle
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => setShowDeleteDialog(true)}
                                            className="text-red-400 focus:text-red-400"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Mood zone label */}
                            {entry.moodZone && (() => {
                                const zoneInfo = MOOD_ZONES.find(
                                    (z) => z.key === (entry.moodZone as MoodZone)
                                );
                                return zoneInfo ? (
                                    <div>
                                        <span
                                            className="text-2xl font-serif font-bold tracking-wide"
                                            style={{ color: zoneInfo.color }}
                                        >
                                            {zoneInfo.emoji} {zoneInfo.label}
                                        </span>
                                    </div>
                                ) : null;
                            })()}

                            {/* Time + date */}
                            <div className="text-[11px] font-sans text-white/35">
                                {new Date(entry.createdAt).toLocaleString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                })}
                            </div>

                            {/* Astro context */}
                            {entry.astroContext && (
                                <AstroContextStrip astroContext={entry.astroContext} />
                            )}

                            {/* Divider */}
                            <div className="border-t border-white/[0.06]" />

                            {/* Content */}
                            {entry.content && (
                                <div className="whitespace-pre-wrap text-sm font-serif text-white/75 leading-relaxed">
                                    {entry.content}
                                </div>
                            )}

                            {/* Dream data */}
                            {entry.dreamData && (
                                <>
                                    <div className="border-t border-white/[0.06]" />
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-serif text-white/65">
                                            🌙{" "}
                                            {entry.dreamData.isLucid && "Lucid "}
                                            Dream
                                            {entry.dreamData.isRecurring && " · Recurring"}
                                        </h3>
                                        {entry.dreamData.dreamSigns &&
                                            entry.dreamData.dreamSigns.length > 0 && (
                                                <div className="text-xs text-white/40">
                                                    Dream signs:{" "}
                                                    {entry.dreamData.dreamSigns.join(", ")}
                                                </div>
                                            )}
                                        {entry.dreamData.emotionalTone && (
                                            <div className="text-xs text-white/40 capitalize">
                                                Emotional tone:{" "}
                                                {entry.dreamData.emotionalTone}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Gratitude items */}
                            {entry.gratitudeItems && entry.gratitudeItems.length > 0 && (
                                <>
                                    <div className="border-t border-white/[0.06]" />
                                    <div className="space-y-1.5">
                                        <h3 className="text-sm font-serif text-white/65">
                                            🙏 Grateful for:
                                        </h3>
                                        <ul className="space-y-1">
                                            {entry.gratitudeItems.map(
                                                (item: string, i: number) => (
                                                    <li
                                                        key={i}
                                                        className="text-sm font-sans text-white/60 flex items-start gap-2"
                                                    >
                                                        <span className="text-galactic/50 mt-0.5">
                                                            ✦
                                                        </span>
                                                        {item}
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </div>
                                </>
                            )}

                            {/* Divider */}
                            <div className="border-t border-white/[0.06]" />

                            {/* Context badges: emotions, energy, time, location, tags */}
                            <div className="space-y-3">
                                {entry.emotions && entry.emotions.length > 0 && (
                                    <EmotionBadges
                                        emotions={entry.emotions}
                                        size="sm"
                                    />
                                )}

                                <div className="flex gap-2 flex-wrap">
                                    {entry.energyLevel && (
                                        <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-0.5 text-[10px] font-sans uppercase tracking-[0.08em] text-white/40">
                                            ⚡ Energy: {entry.energyLevel}/5
                                        </span>
                                    )}
                                    {entry.timeOfDay && (
                                        <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-0.5 text-[10px] font-sans uppercase tracking-[0.08em] text-white/40 capitalize">
                                            {entry.timeOfDay === "morning" && "🌅"}
                                            {entry.timeOfDay === "midday" && "☀️"}
                                            {entry.timeOfDay === "evening" && "🌇"}
                                            {entry.timeOfDay === "night" && "🌙"}{" "}
                                            {entry.timeOfDay}
                                        </span>
                                    )}
                                    {entry.location?.displayName && (
                                        <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-0.5 text-[10px] font-sans uppercase tracking-[0.08em] text-white/40">
                                            📍 {entry.location.displayName}
                                        </span>
                                    )}
                                </div>

                                {entry.tags && entry.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {entry.tags.map((tag: string) => (
                                            <span
                                                key={tag}
                                                className="text-[10px] rounded-full border border-galactic/25 bg-galactic/10 px-2 py-0.5 font-sans uppercase tracking-[0.08em] text-galactic"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Photo */}
                            {photoUrl && (
                                <div className="relative overflow-hidden rounded-xl border border-border/30">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={photoUrl}
                                        alt={entry.photoCaption || "Entry photo"}
                                        className="w-full max-h-96 object-cover"
                                    />
                                    {entry.photoCaption && (
                                        <p className="text-[10px] font-sans uppercase tracking-[0.1em] text-white/30 px-4 py-2 border-t border-white/[0.04]">
                                            {entry.photoCaption}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Voice transcript */}
                            {entry.voiceTranscript && (
                                <div className="relative overflow-hidden rounded-xl border border-border/30 p-4">
                                    <h3 className="text-sm font-serif text-white/65 mb-1">
                                        🎙️ Voice Transcript
                                    </h3>
                                    <p className="text-xs font-sans text-white/35">
                                        {entry.voiceTranscript}
                                    </p>
                                </div>
                            )}

                            {/* Oracle CTA */}
                            <div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAskOracle}
                                    className="text-galactic/60 border-galactic/20 hover:bg-galactic/10 hover:text-galactic/80"
                                >
                                    ✦ Ask Oracle about this
                                </Button>
                            </div>

                            {/* Metadata */}
                            <div className="pt-4 border-t border-white/[0.04] text-[10px] font-sans uppercase tracking-[0.1em] text-white/20 space-y-0.5">
                                <p>
                                    Created:{" "}
                                    {new Date(entry.createdAt).toLocaleString()}
                                </p>
                                {entry.updatedAt !== entry.createdAt && (
                                    <p>
                                        Updated:{" "}
                                        {new Date(entry.updatedAt).toLocaleString()}
                                    </p>
                                )}
                                {entry.wordCount && <p>{entry.wordCount} words</p>}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Delete confirmation dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete this entry?</DialogTitle>
                        <DialogDescription>
                            This action can&apos;t be undone. The entry and any
                            attached photo will be permanently deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting && (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            )}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}