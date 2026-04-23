"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    MOOD_ZONES,
    ENTRY_TYPE_META,
    INTENSITY_LABELS,
    EMOTIONS,
    type MoodZone,
} from "@/lib/journal/constants";
import { AstroContextStrip } from "@/components/journal/composer/astro-context-strip";
import { EmotionBadges } from "@/components/journal/detail/emotion-badges";
import { GiScrollUnfurled } from "react-icons/gi";
import {
    Loader2,
    ArrowLeft,
    Pencil,
    Trash2,
    Pin,
    PinOff,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function EntryDetailPage() {
    const router = useRouter();
    const params = useParams();
    const entryId = params.entryId as string;

    const entry = useQuery(api.journal.entries.getEntry, {
        entryId: entryId as any,
    });

    // Fetch photo URL from Convex storage
    const photoUrl = useQuery(
        api.files.getUrl,
        entry?.photoId ? { storageId: entry.photoId as any } : "skip"
    );

    const updateEntry = useMutation(api.journal.entries.updateEntry);
    const deleteEntry = useMutation(api.journal.entries.deleteEntry);

    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    async function handleDelete() {
        setIsDeleting(true);
        try {
            await deleteEntry({ entryId: entryId as any });
            router.push("/journal");
        } catch (e) {
            console.error("Delete failed:", e);
        } finally {
            setIsDeleting(false);
        }
    }

    async function handleTogglePin() {
        if (!entry) return;
        await updateEntry({
            entryId: entryId as any,
            isPinned: !entry.isPinned,
        });
    }

    if (!entry) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-5 w-5 animate-spin text-white/30" />
            </div>
        );
    }

    const typeMeta = ENTRY_TYPE_META[entry.entryType as keyof typeof ENTRY_TYPE_META];
    const moodZone = entry.moodZone as MoodZone | undefined;
    const zoneInfo = moodZone ? MOOD_ZONES.find((z) => z.key === moodZone) : null;
    const glowColor = zoneInfo?.color ?? "var(--galactic)";

    return (
        <div className="space-y-5">
            {/* Header bar */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/journal")}
                    className="text-white/35 hover:text-white/60"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                </Button>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleTogglePin}
                        className="text-white/35 hover:text-white/60"
                    >
                        {entry.isPinned ? (
                            <PinOff className="h-4 w-4" />
                        ) : (
                            <Pin className="h-4 w-4" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => router.push(`/journal/${entryId}/edit`)}
                        className="text-white/35 hover:text-white/60"
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-400/50 hover:text-red-400"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Entry type badge + title */}
            <div>
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-sans uppercase tracking-[0.2em]" style={{ color: glowColor, opacity: 0.7 }}>
                        {typeMeta?.icon} {typeMeta?.label}
                    </span>
                    {zoneInfo && (
                        <span className="text-[9px] font-sans uppercase tracking-[0.2em]" style={{ color: zoneInfo.color, opacity: 0.7 }}>
                            {zoneInfo.emoji} {zoneInfo.label}
                        </span>
                    )}
                </div>
                {(entry.title || entry.entryType !== "checkin") && (
                    <h1 className="text-xl font-serif font-bold text-white/90 tracking-wide">
                        {entry.title || "Untitled Entry"}
                    </h1>
                )}
            </div>

            {/* Mood snapshot card */}
            {entry.mood && (
                <div className="relative overflow-hidden rounded-xl border border-border/30">
                    <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)" }} />
                    <div className="absolute inset-0 opacity-5" style={{ background: `linear-gradient(135deg, transparent 0%, ${glowColor} 100%)` }} />
                    <div className="relative z-10 flex items-center gap-3 p-4">
                        <div className={cn("h-4 w-4 rounded-full")} style={{ backgroundColor: zoneInfo?.color }} />
                        <span className="text-sm font-serif font-medium" style={{ color: zoneInfo?.color }}>
                            {zoneInfo?.emoji} {zoneInfo?.label}
                        </span>
                        <span className="text-[10px] font-sans uppercase tracking-[0.12em] text-white/25 ml-auto">
                            Valence: {entry.mood.valence.toFixed(1)} / Arousal: {entry.mood.arousal.toFixed(1)}
                        </span>
                    </div>
                </div>
            )}

            {/* Emotion badges */}
            {entry.emotions && entry.emotions.length > 0 && (
                <EmotionBadges emotions={entry.emotions} size="md" />
            )}

            {/* Energy + Time */}
            <div className="flex gap-2 flex-wrap">
                {entry.energyLevel && (
                    <div className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 text-[10px] font-sans uppercase tracking-[0.1em] text-white/40">
                        ⚡ Energy: {entry.energyLevel}/5
                    </div>
                )}
                {entry.timeOfDay && (
                    <div className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 text-[10px] font-sans uppercase tracking-[0.1em] text-white/40 capitalize">
                        {entry.timeOfDay === "morning" && "🌅"}
                        {entry.timeOfDay === "midday" && "☀️"}
                        {entry.timeOfDay === "evening" && "🌇"}
                        {entry.timeOfDay === "night" && "🌙"}
                        {" "}{entry.timeOfDay}
                    </div>
                )}
            </div>

            {/* Astro context */}
            {entry.astroContext && (
                <AstroContextStrip astroContext={entry.astroContext} />
            )}

            {/* Content */}
            {entry.content && (
                <div className="prose prose-sm prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm font-sans text-white/65 leading-relaxed">
                        {entry.content}
                    </div>
                </div>
            )}

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

            {/* Dream data */}
            {entry.dreamData && (
                <div className="relative overflow-hidden rounded-xl border border-border/30">
                    <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)" }} />
                    <div className="relative z-10 p-4 space-y-2">
                        <h3 className="text-sm font-serif text-white/65">🌙 Dream Details</h3>
                        <div className="flex flex-wrap gap-2">
                            {entry.dreamData.isLucid && (
                                <span className="text-[10px] rounded-full border border-galactic/25 bg-galactic/10 px-2 py-0.5 font-sans uppercase tracking-[0.08em] text-galactic">
                                    Lucid
                                </span>
                            )}
                            {entry.dreamData.isRecurring && (
                                <span className="text-[10px] rounded-full border border-galactic/25 bg-galactic/10 px-2 py-0.5 font-sans uppercase tracking-[0.08em] text-galactic">
                                    Recurring
                                </span>
                            )}
                            {entry.dreamData.emotionalTone && (
                                <span className="text-[10px] rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 font-sans uppercase tracking-[0.08em] text-white/45 capitalize">
                                    {entry.dreamData.emotionalTone}
                                </span>
                            )}
                        </div>
                        {entry.dreamData.dreamSigns && entry.dreamData.dreamSigns.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {entry.dreamData.dreamSigns.map((sign: string) => (
                                    <span
                                        key={sign}
                                        className="text-[10px] rounded-full border border-galactic/25 bg-galactic/10 px-2 py-0.5 font-sans uppercase tracking-[0.08em] text-galactic"
                                    >
                                        {sign}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Gratitude items */}
            {entry.gratitudeItems && entry.gratitudeItems.length > 0 && (
                <div className="relative overflow-hidden rounded-xl border border-border/30">
                    <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)" }} />
                    <div className="relative z-10 p-4 space-y-2">
                        <h3 className="text-sm font-serif text-white/65">🙏 Grateful For</h3>
                        <ul className="space-y-1.5">
                            {entry.gratitudeItems.map((item: string, i: number) => (
                                <li key={i} className="text-sm font-sans text-white/60 flex items-start gap-2">
                                    <span className="text-galactic/50 mt-0.5">✦</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Tags */}
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

            {/* Location */}
            {entry.location?.displayName && (
                <div className="text-[10px] font-sans uppercase tracking-[0.1em] text-white/25">
                    📍 {entry.location.displayName}
                </div>
            )}

            {/* Voice transcript */}
            {entry.voiceTranscript && (
                <div className="relative overflow-hidden rounded-xl border border-border/30">
                    <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)" }} />
                    <div className="relative z-10 p-4">
                        <h3 className="text-sm font-serif text-white/65 mb-2">🎙️ Voice Transcript</h3>
                        <p className="text-xs font-sans text-white/35">{entry.voiceTranscript}</p>
                    </div>
                </div>
            )}

            {/* Meta */}
            <div className="pt-4 border-t border-white/[0.04] text-[10px] font-sans uppercase tracking-[0.1em] text-white/20 space-y-1">
                <p>Created: {new Date(entry.createdAt).toLocaleString()}</p>
                {entry.updatedAt !== entry.createdAt && (
                    <p>Updated: {new Date(entry.updatedAt).toLocaleString()}</p>
                )}
                {entry.wordCount && <p>{entry.wordCount} words</p>}
            </div>

            {/* Ask Oracle about this entry */}
            <div className="pt-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/oracle/new?journalEntryId=${entryId}`)}
                    className="text-galactic/60 border-galactic/20 hover:bg-galactic/10 hover:text-galactic/80"
                >
                    ✦ Ask Oracle about this
                </Button>
            </div>

            {/* Delete confirmation dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete this entry?</DialogTitle>
                        <DialogDescription>
                            This action can&apos;t be undone. The entry and any attached photo will be permanently deleted.
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
                            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}