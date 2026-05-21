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
import { PostSaveActions, type PostSaveData } from "./post-save-actions";

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
    /** Called when the user clicks "Ask Oracle about this" post-save */
    onAskOracle?: (entryId: string, contentPreview: string) => void;
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
    onAskOracle,
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

    // ── Post-save state ─────────────────────────────────────
    const [postSaveData, setPostSaveData] = React.useState<PostSaveData | null>(null);

    // Auto-detect title from first line
    const handleContentChange = React.useCallback(
        (newContent: string) => {
            setContent(newContent);
            // Clear post-save state when user starts typing again
            if (newContent.trim().length > 0) {
                setPostSaveData(null);
            }
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
                const entryId = await createEntry({
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

                // ── Set post-save data for Ask Oracle + enrichment badges ──
                setPostSaveData({
                    entryId: entryId as string,
                    tags,
                    energyLevel,
                    timeOfDay: timeOfDay ?? autoDetectTimeOfDay(),
                    contentPreview: content.slice(0, 120),
                    emotions,
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

    // ── Visual Viewport keyboard handling ─────────────────────
    // Detects when the mobile keyboard opens/closes and adjusts layout.
    // visualViewport is supported on iOS Safari 13+ and Android Chrome 56+.
    React.useEffect(() => {
        if (typeof window === "undefined" || !window.visualViewport) return;

        let pending = false;

        function onVisualViewportChange() {
            // Coalesce rapid events — only run at animation frame rate.
            if (pending) return;
            pending = true;
            requestAnimationFrame(() => {
                pending = false;
                const viewport = window.visualViewport!;
                // keyboardHeight > 0 means keyboard is open on Android.
                // On iOS, we rely on offsetTop change + page height reduction.
                const viewportHeight = viewport.height;
                const offsetTop = viewport.offsetTop;
                // When keyboard opens, offsetTop becomes positive (visible area moves up).
                // When keyboard closes, offsetTop returns to 0 and height grows.
                const isKeyboardOpen = offsetTop > 0;
                // Set a CSS custom property on :root so all components can react.
                document.documentElement.style.setProperty(
                    "--keyboard-height",
                    isKeyboardOpen ? String(viewportHeight - offsetTop) : "0px"
                );
            });
        }

        // Scroll QuickCapture into view when textarea gets focus on mobile.
        function onTextareaFocus() {
            const capture = captureWrapperRef.current;
            if (!capture) return;
            // Use block:center to centre the QuickCapture vertically in the viewport.
            capture.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        const textarea = textareaRef.current;
        textarea?.addEventListener("focus", onTextareaFocus);

        window.visualViewport!.addEventListener("resize", onVisualViewportChange);
        window.visualViewport!.addEventListener("scroll", onVisualViewportChange);

        // Initialize state
        onVisualViewportChange();

        return () => {
            textarea?.removeEventListener("focus", onTextareaFocus);
            window.visualViewport!.removeEventListener("resize", onVisualViewportChange);
            window.visualViewport!.removeEventListener("scroll", onVisualViewportChange);
        };
    }, []);

    // Ref for the outer QuickCapture div (used by keyboard handling above)
    const captureWrapperRef = React.useRef<HTMLDivElement>(null);

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
            {/* Prompt banner (if any) */}
            {/* DailyPromptInline is rendered outside QuickCapture by the parent */}

            <div className="p-4 md:p-5 space-y-4">
                {/* Textarea — warm paper feel on dark desk */}
                <div className="space-y-2">
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
                            onChange={(e) => handleContentChange(e.target.value)}
                            placeholder="What's on your mind?"
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
                            onInput={(e) => {
                                // Auto-expand
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = "auto";
                                target.style.height =
                                    Math.min(target.scrollHeight, 320) + "px";
                            }}
                        />
                    </div>
                </div>

                {/* Dream or Gratitude fields (if type is set) */}
                {entryType === "dream" && (
                    <DreamFields
                        dreamData={dreamData}
                        onDreamDataChange={setDreamData}
                        className="border-t border-[var(--journal-border)] pt-4"
                    />
                )}

                {entryType === "gratitude" && (
                    <GratitudeFields
                        gratitudeItems={gratitudeItems}
                        onGratitudeItemsChange={setGratitudeItems}
                        className="border-t border-[var(--journal-border)] pt-4"
                    />
                )}

                {/* Mood bar — always visible, optional to fill */}
                <div className="border-t border-[var(--journal-border)] pt-4">
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
                    <div className="text-[10px] font-sans uppercase tracking-[0.12em] text-[var(--journal-muted)]">
                        {content.length > 0 && <span>{content.length} chars</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        {isEditing && onCancel && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onCancel}
                                className="text-[var(--journal-muted)] hover:text-white/60"
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

                {/* ── Post-save actions: Ask Oracle + enrichment badges ── */}
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
        </div>
    );
}