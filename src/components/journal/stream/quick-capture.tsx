"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
    ENTRY_TYPE_META,
    type EntryType,
    type EmotionEntry,
    type TimeOfDay,
    autoDetectTimeOfDay,
} from "@/lib/journal/constants";
import { MoodBar } from "./mood-bar";
import { EmotionChips } from "./emotion-chips";
import { CaptureActionBar } from "./capture-action-bar";
import { DreamFields } from "./dream-fields";
import { GratitudeFields } from "./gratitude-fields";
import { JOURNAL_LIMITS } from "@/lib/journal/constants";

interface QuickCaptureProps {
    /** Pre-fill content (from Oracle, URL params, etc.) */
    initialContent?: string;
    /** Oracle session that inspired this entry */
    oracleSessionId?: string;
    /** Whether this was suggested by Oracle */
    oracleInspired?: boolean;
    /** Initial entry type (from URL params like ?type=dream) */
    initialType?: EntryType;
    /** Edit mode: pass existing entry data to pre-fill */
    editEntry?: any;
    editEntryId?: string;
    /** Called after successful save */
    onSave?: () => void;
    /** Called when cancelled (edit mode) */
    onCancel?: () => void;
    className?: string;
}

export function QuickCapture({
    initialContent,
    oracleSessionId,
    oracleInspired,
    initialType,
    editEntry,
    editEntryId,
    onSave,
    onCancel,
    className,
}: QuickCaptureProps) {
    const router = useRouter();
    const isEditing = Boolean(editEntry);

    // ── Composer state ────────────────────────────────────────
    const [title, setTitle] = React.useState(editEntry?.title ?? "");
    const [content, setContent] = React.useState(
        editEntry?.content ?? initialContent ?? ""
    );
    const [valence, setValence] = React.useState<number | null>(
        editEntry?.mood?.valence ?? null
    );
    const [energy, setEnergy] = React.useState<number | null>(
        editEntry?.mood?.arousal ?? null
    );
    const [emotions, setEmotions] = React.useState<EmotionEntry[]>(
        editEntry?.emotions ?? []
    );
    const [entryType, setEntryType] = React.useState<EntryType>(
        (editEntry?.entryType as EntryType) ?? initialType ?? "freeform"
    );
    const [energyLevel, setEnergyLevel] = React.useState<number | null>(
        editEntry?.energyLevel ?? null
    );
    const [timeOfDay, setTimeOfDay] = React.useState<TimeOfDay | null>(
        editEntry?.timeOfDay ?? autoDetectTimeOfDay()
    );
    const [tags, setTags] = React.useState<string[]>(editEntry?.tags ?? []);
    const [dreamData, setDreamData] = React.useState<{
        isLucid?: boolean;
        isRecurring?: boolean;
        dreamSigns?: string[];
        emotionalTone?: string;
    }>(editEntry?.dreamData ?? {});
    const [gratitudeItems, setGratitudeItems] = React.useState<string[]>(
        editEntry?.gratitudeItems ?? ["", "", ""]
    );
    const [photoId, setPhotoId] = React.useState<any>(editEntry?.photoId ?? null);
    const [photoCaption, setPhotoCaption] = React.useState(
        editEntry?.photoCaption ?? ""
    );
    const [location, setLocation] = React.useState<any>(editEntry?.location ?? null);
    const [voiceTranscript, setVoiceTranscript] = React.useState(
        editEntry?.voiceTranscript ?? ""
    );
    const [isSaving, setIsSaving] = React.useState(false);

    // Auto-detect title from first line
    const handleContentChange = React.useCallback(
        (newContent: string) => {
            setContent(newContent);
            // Auto-detect title: if first line is short (<60 chars) and there's a second line
            const lines = newContent.split("\n");
            if (
                lines.length > 1 &&
                lines[0].trim().length > 0 &&
                lines[0].trim().length < 60
            ) {
                setTitle(lines[0].trim());
            } else {
                setTitle("");
            }
        },
        []
    );

    // Voice transcript callback
    const handleVoiceTranscript = React.useCallback(
        (text: string) => {
            setContent((prev: string) => (prev ? prev + " " + text : text));
            setVoiceTranscript((prev: string) => (prev ? prev + " " + text : text));
        },
        []
    );

    // Auto-derive entry type: if content is empty/short and mood is set → checkin
    function getEffectiveEntryType(): EntryType {
        if (entryType !== "freeform") return entryType;
        if (
            (!content || content.trim().length < 20) &&
            (valence !== null || energy !== null || emotions.length > 0)
        ) {
            return "checkin";
        }
        return "freeform";
    }

    // Mutations
    const createEntry = useMutation(api.journal.entries.createEntry);
    const updateEntry = useMutation(api.journal.entries.updateEntry);

    // Build mood object
    const mood =
        valence !== null && energy !== null
            ? { valence, arousal: energy }
            : null;

    async function handleSave() {
        if (isSaving) return;
        setIsSaving(true);

        const effectiveType = getEffectiveEntryType();

        try {
            if (isEditing && editEntryId) {
                await updateEntry({
                    entryId: editEntryId as any,
                    title: title || undefined,
                    content,
                    mood: mood ?? undefined,
                    emotions: emotions.length > 0 ? emotions : undefined,
                    energyLevel: energyLevel ?? undefined,
                    timeOfDay: timeOfDay ?? undefined,
                    tags: tags.length > 0 ? tags : undefined,
                    dreamData:
                        effectiveType === "dream" && Object.keys(dreamData).length > 0
                            ? dreamData
                            : undefined,
                    gratitudeItems:
                        effectiveType === "gratitude"
                            ? gratitudeItems.filter(Boolean)
                            : undefined,
                    photoId: photoId ?? undefined,
                    photoCaption: photoCaption || undefined,
                    location: location ?? undefined,
                });
            } else {
                await createEntry({
                    title: title || undefined,
                    content,
                    entryType: effectiveType,
                    mood: mood ?? undefined,
                    emotions: emotions.length > 0 ? emotions : undefined,
                    energyLevel: energyLevel ?? undefined,
                    timeOfDay: timeOfDay ?? undefined,
                    tags: tags.length > 0 ? tags : undefined,
                    dreamData:
                        effectiveType === "dream" && Object.keys(dreamData).length > 0
                            ? dreamData
                            : undefined,
                    gratitudeItems:
                        effectiveType === "gratitude"
                            ? gratitudeItems.filter(Boolean)
                            : undefined,
                    photoId: photoId ?? undefined,
                    photoCaption: photoCaption || undefined,
                    location: location ?? undefined,
                    voiceTranscript: voiceTranscript || undefined,
                    oracleSessionId: oracleSessionId
                        ? (oracleSessionId as any)
                        : undefined,
                    oracleInspired: oracleInspired || undefined,
                });
            }

            // Clear form on create
            if (!isEditing) {
                setContent("");
                setTitle("");
                setValence(null);
                setEnergy(null);
                setEmotions([]);
                setEntryType("freeform");
                setDreamData({});
                setGratitudeItems(["", "", ""]);
                setPhotoId(null);
                setPhotoCaption("");
                setLocation(null);
                setVoiceTranscript("");
            }

            onSave?.();
        } catch (error: any) {
            console.error("Failed to save entry:", error);
        } finally {
            setIsSaving(false);
        }
    }

    function canSave(): boolean {
        if (isSaving) return false;
        const effectiveType = getEffectiveEntryType();
        switch (effectiveType) {
            case "freeform":
                return content.trim().length > 0;
            case "checkin":
                return true; // mood-only entries are valid
            case "dream":
                return content.trim().length > 0;
            case "gratitude":
                return gratitudeItems.filter(Boolean).length > 0;
            default:
                return false;
        }
    }

    // Auto-focus textarea on mount (for new entries)
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    React.useEffect(() => {
        if (!isEditing && textareaRef.current) {
            // Small delay to let the page settle
            const timer = setTimeout(() => textareaRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [isEditing]);

    return (
        <div
            className={cn(
                "rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden",
                className
            )}
        >
            {/* Prompt banner (if any) */}
            {/* DailyPromptInline is rendered outside QuickCapture by the parent */}

            <div className="p-4 md:p-5 space-y-4">
                {/* Textarea — always visible, auto-expanding */}
                <div className="space-y-2">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => handleContentChange(e.target.value)}
                        placeholder="What's on your mind?"
                        maxLength={JOURNAL_LIMITS.MAX_CONTENT_LENGTH}
                        rows={3}
                        className="w-full bg-transparent text-[15px] text-white/80 placeholder:text-white/20 outline-none border-none resize-none leading-relaxed"
                        style={{
                            fontFamily:
                                'Crimson Pro, "Cinzel", ui-serif, Georgia, serif',
                            minHeight: "4rem",
                            maxHeight: "20rem",
                        }}
                        onInput={(e) => {
                            // Auto-expand
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = "auto";
                            target.style.height =
                                Math.min(target.scrollHeight, 320) + "px";
                        }}
                    />
                </div>

                {/* Dream or Gratitude fields (if type is set) */}
                {entryType === "dream" && (
                    <DreamFields
                        dreamData={dreamData}
                        onDreamDataChange={setDreamData}
                        className="border-t border-white/[0.04] pt-4"
                    />
                )}

                {entryType === "gratitude" && (
                    <GratitudeFields
                        gratitudeItems={gratitudeItems}
                        onGratitudeItemsChange={setGratitudeItems}
                        className="border-t border-white/[0.04] pt-4"
                    />
                )}

                {/* Mood bar — always visible, optional to fill */}
                <div className="border-t border-white/[0.04] pt-4">
                    <MoodBar
                        valence={valence}
                        energy={energy}
                        onValenceChange={setValence}
                        onEnergyChange={setEnergy}
                    />
                </div>

                {/* Emotion chips — always visible, optional */}
                <EmotionChips
                    value={emotions}
                    onChange={setEmotions}
                    maxEmotions={3}
                />

                {/* Action bar — voice, photo, location, type hints */}
                <CaptureActionBar
                    entryType={entryType}
                    onTypeChange={setEntryType}
                    onVoiceTranscript={handleVoiceTranscript}
                    onPhotoChange={setPhotoId}
                    onPhotoCaptionChange={setPhotoCaption}
                    onLocationChange={setLocation}
                    photoId={photoId}
                    photoCaption={photoCaption}
                    location={location}
                    isSaving={isSaving}
                />

                {/* Save bar */}
                <div className="flex items-center justify-between pt-2">
                    <div className="text-[10px] font-sans uppercase tracking-[0.12em] text-white/20">
                        {content.length > 0 && <span>{content.length} chars</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        {isEditing && onCancel && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onCancel}
                                className="text-white/35 hover:text-white/60"
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            variant="galactic"
                            size="sm"
                            onClick={handleSave}
                            disabled={!canSave()}
                            className="gap-2"
                        >
                            {isSaving && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            )}
                            {isEditing ? "Update" : "Save Entry"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}