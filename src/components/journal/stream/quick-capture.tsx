"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Camera, Image as ImageIcon, X } from "lucide-react";
import {
    ENTRY_TYPE_META,
    type EntryType,
    type EmotionEntry,
    type TimeOfDay,
    type MoodZone,
    autoDetectTimeOfDay,
    JOURNAL_LIMITS,
} from "@/lib/journal/constants";
import { MoodPicker } from "./mood-picker";
import { EmotionChips } from "./emotion-chips";
import { DreamFields } from "./dream-fields";
import { GratitudeFields } from "./gratitude-fields";
import { PostSaveActions, type PostSaveData } from "./post-save-actions";
import { JournalTopicCards, type JournalTopic } from "./journal-topic-cards";
import { trackJournalEntry } from "@/lib/analytics";
import { useQuery } from "convex/react";

interface QuickCaptureProps {
    /** Pre-fill content (from Oracle, URL params, topic cards, etc.) */
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
    /** Called when the user clicks "Ask Oracle about this" post-save */
    onAskOracle?: (entryId: string, contentPreview: string) => void;
    /** Called when cancelled (edit mode) */
    onCancel?: () => void;
    /** Whether to show the topic cards row (hide on /journal/new dedicated page) */
    showTopics?: boolean;
    className?: string;
}

const ENTRY_TYPE_PILLS: { type: EntryType; icon: string; label: string }[] = [
    { type: "freeform",  icon: "✍️",  label: "Freeform"  },
    { type: "dream",     icon: "🌙",  label: "Dream"     },
    { type: "gratitude", icon: "🙏",  label: "Gratitude" },
    { type: "checkin",   icon: "⚡",  label: "Check-in"  },
];

export function QuickCapture({
    initialContent,
    oracleSessionId,
    oracleInspired,
    initialType,
    editEntry,
    editEntryId,
    onSave,
    onAskOracle,
    onCancel,
    showTopics = true,
    className,
}: QuickCaptureProps) {
    const isEditing = Boolean(editEntry);

    // ── State ──────────────────────────────────────────────────
    const [content, setContent] = React.useState(editEntry?.content ?? initialContent ?? "");
    const [title, setTitle] = React.useState(editEntry?.title ?? "");
    const [entryType, setEntryType] = React.useState<EntryType>(
        (editEntry?.entryType as EntryType) ?? initialType ?? "freeform"
    );
    const [moodZone, setMoodZone] = React.useState<MoodZone | null>(
        editEntry?.moodZone ?? null
    );
    const [moodValence, setMoodValence] = React.useState<number | null>(
        editEntry?.mood?.valence ?? null
    );
    const [moodArousal, setMoodArousal] = React.useState<number | null>(
        editEntry?.mood?.arousal ?? null
    );
    const [emotions, setEmotions] = React.useState<EmotionEntry[]>(editEntry?.emotions ?? []);
    const [timeOfDay] = React.useState<TimeOfDay>(editEntry?.timeOfDay ?? autoDetectTimeOfDay());
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
    const [photoId, setPhotoId] = React.useState<string | null>(editEntry?.photoId ?? null);
    const [photoCaption, setPhotoCaption] = React.useState(editEntry?.photoCaption ?? "");
    const [voiceTranscript, setVoiceTranscript] = React.useState(editEntry?.voiceTranscript ?? "");
    const [isSaving, setIsSaving] = React.useState(false);
    const [postSaveData, setPostSaveData] = React.useState<PostSaveData | null>(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [photoPreviewUrl, setPhotoPreviewUrl] = React.useState<string | null>(null);

    /** When topics are visible (content empty, no type locked) */
    const showTopicCards = showTopics && content.trim().length === 0 && !isEditing && !initialType;

    // Textarea ref for auto-expand + focus
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const captureWrapperRef = React.useRef<HTMLDivElement>(null);
    const cameraInputRef = React.useRef<HTMLInputElement>(null);
    const galleryInputRef = React.useRef<HTMLInputElement>(null);

    // Mutations
    const createEntry = useMutation(api.journal.entries.createEntry);
    const updateEntry = useMutation(api.journal.entries.updateEntry);
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);

    // Stored photo URL
    const storedPhotoUrl = useQuery(
        api.files.getUrl,
        photoId && !photoPreviewUrl ? { storageId: photoId as any } : "skip"
    );

    // Auto-focus on mount (new entries only)
    React.useEffect(() => {
        if (!isEditing && textareaRef.current) {
            const timer = setTimeout(() => textareaRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [isEditing]);

    // Keyboard: Cmd/Ctrl+Enter to save
    React.useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSave();
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

    // Visual viewport keyboard handling (mobile)
    React.useEffect(() => {
        if (typeof window === "undefined" || !window.visualViewport) return;
        let pending = false;
        function onViewportChange() {
            if (pending) return;
            pending = true;
            requestAnimationFrame(() => {
                pending = false;
                const vp = window.visualViewport!;
                document.documentElement.style.setProperty(
                    "--keyboard-height",
                    vp.offsetTop > 0 ? String(vp.height - vp.offsetTop) : "0px"
                );
            });
        }
        function onTextareaFocus() {
            captureWrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        const ta = textareaRef.current;
        ta?.addEventListener("focus", onTextareaFocus);
        window.visualViewport!.addEventListener("resize", onViewportChange);
        window.visualViewport!.addEventListener("scroll", onViewportChange);
        return () => {
            ta?.removeEventListener("focus", onTextareaFocus);
            window.visualViewport!.removeEventListener("resize", onViewportChange);
            window.visualViewport!.removeEventListener("scroll", onViewportChange);
        };
    }, []);

    function handleContentChange(newContent: string) {
        setContent(newContent);
        if (newContent.trim().length > 0) setPostSaveData(null);
        // Auto-derive title from first line
        const lines = newContent.split("\n");
        if (lines.length > 1 && lines[0].trim().length > 0 && lines[0].trim().length < 60) {
            setTitle(lines[0].trim());
        } else {
            setTitle("");
        }
    }

    function handleMoodChange(zone: MoodZone | null, valence: number | null, arousal: number | null) {
        setMoodZone(zone);
        setMoodValence(valence);
        setMoodArousal(arousal);
    }

    function handleTopicSelect(topic: JournalTopic) {
        setEntryType(topic.entryType);
        if (topic.starterPrompt) {
            setContent(topic.starterPrompt);
            // Focus textarea after a brief delay
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    // Move cursor to end
                    textareaRef.current.setSelectionRange(
                        topic.starterPrompt.length,
                        topic.starterPrompt.length
                    );
                }
            }, 50);
        } else {
            setTimeout(() => textareaRef.current?.focus(), 50);
        }
    }

    async function handlePhotoSelect(file: File) {
        if (!file.type.startsWith("image/")) return;
        if (file.size > JOURNAL_LIMITS.MAX_PHOTO_SIZE_BYTES) return;

        const localUrl = URL.createObjectURL(file);
        setPhotoPreviewUrl(localUrl);
        setIsUploading(true);

        try {
            const uploadUrl = await generateUploadUrl();
            const result = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            if (!result.ok) throw new Error("Upload failed");
            const { storageId } = await result.json() as { storageId: string };
            setPhotoId(storageId);
        } catch {
            setPhotoPreviewUrl(null);
        } finally {
            setIsUploading(false);
            if (cameraInputRef.current) cameraInputRef.current.value = "";
            if (galleryInputRef.current) galleryInputRef.current.value = "";
        }
    }

    function handleRemovePhoto() {
        setPhotoId(null);
        setPhotoCaption("");
        if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
        setPhotoPreviewUrl(null);
    }

    function getEffectiveEntryType(): EntryType {
        if (entryType !== "freeform") return entryType;
        if (
            (!content || content.trim().length < 20) &&
            (moodZone !== null || emotions.length > 0)
        ) {
            return "checkin";
        }
        return "freeform";
    }

    function canSave(): boolean {
        if (isSaving) return false;
        const effectiveType = getEffectiveEntryType();
        switch (effectiveType) {
            case "freeform":   return content.trim().length > 0;
            case "checkin":    return true;
            case "dream":      return content.trim().length > 0;
            case "gratitude":  return gratitudeItems.filter(Boolean).length > 0;
            default:           return false;
        }
    }

    async function handleSave() {
        if (isSaving) return;
        setIsSaving(true);
        const effectiveType = getEffectiveEntryType();
        const mood = moodValence !== null && moodArousal !== null
            ? { valence: moodValence, arousal: moodArousal }
            : undefined;

        try {
            if (isEditing && editEntryId) {
                await updateEntry({
                    entryId: editEntryId as any,
                    title: title || undefined,
                    content,
                    mood,
                    emotions: emotions.length > 0 ? emotions : undefined,
                    timeOfDay,
                    tags: tags.length > 0 ? tags : undefined,
                    dreamData: effectiveType === "dream" && Object.keys(dreamData).length > 0 ? dreamData : undefined,
                    gratitudeItems: effectiveType === "gratitude" ? gratitudeItems.filter(Boolean) : undefined,
                    photoId: photoId ? (photoId as any) : undefined,
                    photoCaption: photoCaption || undefined,
                    isPinned: undefined,
                });
            } else {
                const entryId = await createEntry({
                    title: title || undefined,
                    content,
                    entryType: effectiveType,
                    mood,
                    emotions: emotions.length > 0 ? emotions : undefined,
                    timeOfDay,
                    tags: tags.length > 0 ? tags : undefined,
                    dreamData: effectiveType === "dream" && Object.keys(dreamData).length > 0 ? dreamData : undefined,
                    gratitudeItems: effectiveType === "gratitude" ? gratitudeItems.filter(Boolean) : undefined,
                    photoId: photoId ? (photoId as any) : undefined,
                    photoCaption: photoCaption || undefined,
                    voiceTranscript: voiceTranscript || undefined,
                    oracleSessionId: oracleSessionId ? (oracleSessionId as any) : undefined,
                    oracleInspired: oracleInspired || undefined,
                });

                setPostSaveData({
                    entryId: entryId as string,
                    tags,
                    energyLevel: null,
                    timeOfDay,
                    contentPreview: content.slice(0, 120),
                    emotions,
                });
            }

            if (!isEditing) {
                trackJournalEntry();
                setContent("");
                setTitle("");
                setMoodZone(null);
                setMoodValence(null);
                setMoodArousal(null);
                setEmotions([]);
                setEntryType("freeform");
                setDreamData({});
                setGratitudeItems(["", "", ""]);
                setPhotoId(null);
                setPhotoCaption("");
                setPhotoPreviewUrl(null);
                setVoiceTranscript("");
            }

            onSave?.();
        } catch (error: any) {
            console.error("Failed to save entry:", error);
        } finally {
            setIsSaving(false);
        }
    }

    const displayPhotoUrl = photoPreviewUrl || storedPhotoUrl || null;

    return (
        <div
            ref={captureWrapperRef}
            className={cn(
                "journal-theme rounded-2xl overflow-hidden",
                "border border-[var(--journal-accent)]/20",
                "bg-[var(--journal-bg)]",
                className
            )}
        >
            <div className="p-4 md:p-5 space-y-4">

                {/* ── Topic Cards (shown when composer is empty & no type set) ──────── */}
                {showTopicCards && (
                    <JournalTopicCards
                        onSelect={handleTopicSelect}
                        className="animate-in fade-in duration-300"
                    />
                )}

                {/* ── Entry Type Pills ──────────────────────────────────────────────── */}
                {!isEditing && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {ENTRY_TYPE_PILLS.map(({ type, icon, label }) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setEntryType(type)}
                                className={cn(
                                    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-sans uppercase tracking-[0.1em] transition-all duration-200",
                                    "min-h-[36px]",
                                    entryType === type
                                        ? "border-[var(--journal-accent)]/40 bg-[var(--journal-accent)]/15 text-[var(--journal-accent)]"
                                        : "border-[var(--journal-border)] bg-white/[0.02] text-[var(--journal-muted)] hover:bg-white/[0.06] hover:text-white/60"
                                )}
                            >
                                <span className="text-xs">{icon}</span>
                                <span className="hidden sm:inline">{label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Textarea — warm paper feel ──────────────────────────────────── */}
                <div
                    className="rounded-xl p-3 transition-colors duration-300"
                    style={{
                        backgroundColor: "var(--journal-paper)",
                        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.2)",
                    }}
                >
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => {
                            handleContentChange(e.target.value);
                            // Auto-expand
                            e.target.style.height = "auto";
                            e.target.style.height = Math.min(e.target.scrollHeight, 320) + "px";
                        }}
                        placeholder={
                            entryType === "checkin"
                                ? "Add a note (optional)..."
                                : "What's on your mind?"
                        }
                        maxLength={JOURNAL_LIMITS.MAX_CONTENT_LENGTH}
                        rows={3}
                        inputMode="text"
                        enterKeyHint="done"
                        autoCapitalize="sentences"
                        className="w-full bg-transparent outline-none border-none resize-none leading-relaxed text-[15px] placeholder:text-[var(--journal-ink)]/30"
                        style={{
                            fontFamily: '"Crimson Pro", ui-serif, Georgia, serif',
                            color: "var(--journal-ink)",
                            minHeight: "4rem",
                            maxHeight: "20rem",
                        }}
                    />
                </div>

                {/* ── Dream Fields ─────────────────────────────────────────────────── */}
                {entryType === "dream" && (
                    <DreamFields
                        dreamData={dreamData}
                        onDreamDataChange={setDreamData}
                        className="border-t border-[var(--journal-border)] pt-4 animate-in fade-in slide-in-from-top-2 duration-200"
                    />
                )}

                {/* ── Gratitude Fields ──────────────────────────────────────────────── */}
                {entryType === "gratitude" && (
                    <GratitudeFields
                        gratitudeItems={gratitudeItems}
                        onGratitudeItemsChange={setGratitudeItems}
                        className="border-t border-[var(--journal-border)] pt-4 animate-in fade-in slide-in-from-top-2 duration-200"
                    />
                )}

                {/* ── Photo preview (if attached) ──────────────────────────────────── */}
                {displayPhotoUrl && (
                    <div className="relative group rounded-xl overflow-hidden border border-white/10 animate-in fade-in duration-300">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={displayPhotoUrl}
                            alt="Entry photo"
                            className="w-full max-h-48 object-cover"
                        />
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-white" />
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white/80 hover:text-white transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                        <input
                            type="text"
                            placeholder="Add a caption..."
                            value={photoCaption}
                            onChange={(e) => setPhotoCaption(e.target.value)}
                            className="w-full bg-transparent px-3 py-2 text-xs text-white/50 placeholder:text-white/25 border-t border-white/5 focus:outline-none"
                        />
                    </div>
                )}

                {/* ── Mood Picker ──────────────────────────────────────────────────── */}
                <div className="border-t border-[var(--journal-border)] pt-4">
                    <MoodPicker
                        value={moodZone}
                        onChange={handleMoodChange}
                    />
                </div>

                {/* ── Emotion Chips ────────────────────────────────────────────────── */}
                <EmotionChips
                    value={emotions}
                    onChange={setEmotions}
                    maxEmotions={3}
                />

                {/* ── Bottom Action Bar ─────────────────────────────────────────────
                     Always visible. Left: Voice (placeholder) + Camera + Gallery
                     Right: character count + Save button
                ─────────────────────────────────────────────────────────────────── */}
                <div className="flex items-center gap-2 pt-2 border-t border-[var(--journal-border)]">
                    {/* Left — media buttons */}
                    <div className="flex items-center gap-1.5">
                        {/* Voice — non-functional placeholder */}
                        <button
                            type="button"
                            title="Voice journaling — coming soon"
                            onClick={() => {
                                // Non-functional placeholder
                            }}
                            className={cn(
                                "inline-flex items-center justify-center rounded-lg border transition-all duration-200",
                                "min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-9 md:w-9",
                                "border-[var(--journal-border)] text-[var(--journal-muted)] opacity-50 cursor-not-allowed",
                            )}
                        >
                            <Mic className="h-4 w-4" />
                        </button>

                        {/* Camera — triggers device camera on mobile */}
                        <button
                            type="button"
                            title="Take photo"
                            onClick={() => cameraInputRef.current?.click()}
                            disabled={isUploading}
                            className={cn(
                                "inline-flex items-center justify-center rounded-lg border transition-all duration-200",
                                "min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-9 md:w-9",
                                "border-[var(--journal-border)] text-[var(--journal-muted)] hover:bg-white/[0.06] hover:text-white/60",
                                isUploading && "opacity-50 cursor-not-allowed",
                                !!displayPhotoUrl && "border-[var(--journal-accent)]/30 text-[var(--journal-accent)]",
                            )}
                        >
                            <Camera className="h-4 w-4" />
                        </button>

                        {/* Gallery — triggers photo library */}
                        <button
                            type="button"
                            title="Choose from gallery"
                            onClick={() => galleryInputRef.current?.click()}
                            disabled={isUploading}
                            className={cn(
                                "inline-flex items-center justify-center rounded-lg border transition-all duration-200",
                                "min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-9 md:w-9",
                                "border-[var(--journal-border)] text-[var(--journal-muted)] hover:bg-white/[0.06] hover:text-white/60",
                                isUploading && "opacity-50 cursor-not-allowed",
                                !!displayPhotoUrl && "border-[var(--journal-accent)]/30 text-[var(--journal-accent)]",
                            )}
                        >
                            <ImageIcon className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Spacer + char count */}
                    <div className="flex-1 text-right">
                        {content.length > 0 && (
                            <span className="text-[10px] font-sans uppercase tracking-[0.1em] text-[var(--journal-muted)]">
                                {content.length}
                            </span>
                        )}
                    </div>

                    {/* Cancel (edit mode) */}
                    {isEditing && onCancel && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onCancel}
                            className="text-[var(--journal-muted)] hover:text-white/60 h-11 md:h-9"
                        >
                            Cancel
                        </Button>
                    )}

                    {/* Save */}
                    <Button
                        variant="galactic"
                        size="sm"
                        onClick={handleSave}
                        disabled={!canSave()}
                        className="gap-2 min-h-[44px] md:min-h-0 md:h-9 px-5"
                    >
                        {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {isEditing ? "Update" : "Save"}
                    </Button>
                </div>

                {/* ── Post-save actions ─────────────────────────────────────────────── */}
                {postSaveData && !isEditing && (
                    <PostSaveActions
                        data={postSaveData}
                        onAskOracle={(entryId, contentPreview) => {
                            onAskOracle?.(entryId, contentPreview);
                        }}
                        onDismiss={() => setPostSaveData(null)}
                    />
                )}
            </div>

            {/* ── Hidden file inputs ─────────────────────────────────────────────── */}
            {/* Camera — capture="environment" opens rear camera on mobile */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoSelect(file);
                }}
                className="hidden"
            />
            {/* Gallery — standard file picker */}
            <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoSelect(file);
                }}
                className="hidden"
            />
        </div>
    );
}