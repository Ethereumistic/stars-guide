"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    ENTRY_TYPES,
    ENTRY_TYPE_META,
    type EntryType,
    type EmotionEntry,
    type TimeOfDay,
    autoDetectTimeOfDay,
} from "@/lib/journal/constants";
import { FreeformEditor } from "./freeform-editor";
import { CheckinWidget } from "./checkin-widget";
import { DreamEditor } from "./dream-editor";
import { GratitudeEditor } from "./gratitude-editor";
import { MoodPad } from "./mood-pad";
import { EmotionSelector } from "./emotion-selector";
import { EnergyLevelPicker } from "./energy-level-picker";
import { TimeOfDayPicker } from "./time-of-day-picker";
import { TagInput } from "./tag-input";
import { AstroContextStrip } from "./astro-context-strip";
import { VoiceInputButton } from "./voice-input-button";
import { PhotoUploader } from "./photo-uploader";
import { LocationInput } from "./location-input";
import { useJournalStore } from "@/store/use-journal-store";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { GiScrollUnfurled } from "react-icons/gi";

interface EntryComposerProps {
    /** Edit mode: pass existing entry data to pre-fill */
    editEntry?: any;
    editEntryId?: string;
    /** Pre-fill content (from Oracle suggestion, etc.) */
    initialContent?: string;
    /** Oracle session that inspired this entry */
    oracleSessionId?: string;
    /** Whether this entry was suggested by Oracle */
    oracleInspired?: boolean;
    className?: string;
}

export function EntryComposer({ editEntry, editEntryId, initialContent, oracleSessionId, oracleInspired, className }: EntryComposerProps) {
    const router = useRouter();
    const { entryType, setEntryType } = useJournalStore();
    const isEditing = Boolean(editEntry);

    // ── Composer state ────────────────────────────────────────
    const [title, setTitle] = React.useState(editEntry?.title ?? "");
    const [content, setContent] = React.useState(editEntry?.content ?? initialContent ?? "");
    const [mood, setMood] = React.useState<{ valence: number; arousal: number } | null>(
        editEntry?.mood ?? null
    );
    const [emotions, setEmotions] = React.useState<EmotionEntry[]>(
        editEntry?.emotions ?? []
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
    const [showExtras, setShowExtras] = React.useState(false);
    const [photoId, setPhotoId] = React.useState<any>(editEntry?.photoId ?? null);
    const [photoCaption, setPhotoCaption] = React.useState(editEntry?.photoCaption ?? "");
    const [location, setLocation] = React.useState<any>(editEntry?.location ?? null);
    const [voiceTranscript, setVoiceTranscript] = React.useState(editEntry?.voiceTranscript ?? "");

    // Active entry type
    const activeType = (isEditing ? editEntry?.entryType : entryType) as EntryType;
    const activeTypeMeta = ENTRY_TYPE_META[activeType];

    // Mutations
    const createEntry = useMutation(api.journal.entries.createEntry);
    const updateEntry = useMutation(api.journal.entries.updateEntry);
    const [isSaving, setIsSaving] = React.useState(false);

    // Fetch cosmic weather for astro context strip display
    const today = new Date().toISOString().split("T")[0];
    const cosmicWeather = useQuery(api.cosmicWeather.getForPublicDate, {
        date: today,
    });

    // Build client-side astro context for display
    const displayAstroContext = React.useMemo(() => {
        if (!cosmicWeather) return null;
        return {
            moonPhase: cosmicWeather.moonPhase.name,
            moonSign: cosmicWeather.planetPositions.find(
                (p: any) => p.planet === "Moon"
            )?.sign,
            sunSign: cosmicWeather.planetPositions.find(
                (p: any) => p.planet === "Sun"
            )?.sign,
            retrogradePlanets: cosmicWeather.planetPositions
                .filter((p: any) => p.isRetrograde)
                .map((p: any) => p.planet),
        };
    }, [cosmicWeather]);

    // Keyboard shortcut: Cmd/Ctrl+Enter to save
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

    async function handleSave() {
        if (isSaving) return;
        setIsSaving(true);

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
                        activeType === "dream" && Object.keys(dreamData).length > 0
                            ? dreamData
                            : undefined,
                    gratitudeItems:
                        activeType === "gratitude" ? gratitudeItems.filter(Boolean) : undefined,
                    photoId: photoId ?? undefined,
                    photoCaption: photoCaption || undefined,
                    location: location ?? undefined,
                });
            } else {
                await createEntry({
                    title: title || undefined,
                    content,
                    entryType: activeType,
                    mood: mood ?? undefined,
                    emotions: emotions.length > 0 ? emotions : undefined,
                    energyLevel: energyLevel ?? undefined,
                    timeOfDay: timeOfDay ?? undefined,
                    tags: tags.length > 0 ? tags : undefined,
                    dreamData:
                        activeType === "dream" && Object.keys(dreamData).length > 0
                            ? dreamData
                            : undefined,
                    gratitudeItems:
                        activeType === "gratitude" ? gratitudeItems.filter(Boolean) : undefined,
                    photoId: photoId ?? undefined,
                    photoCaption: photoCaption || undefined,
                    location: location ?? undefined,
                    voiceTranscript: voiceTranscript || undefined,
                    oracleSessionId: oracleSessionId ? (oracleSessionId as any) : undefined,
                    oracleInspired: oracleInspired || undefined,
                });
            }

            router.push("/journal");
        } catch (error: any) {
            console.error("Failed to save entry:", error);
        } finally {
            setIsSaving(false);
        }
    }

    function canSave(): boolean {
        if (isSaving) return false;
        switch (activeType) {
            case "freeform":
                return content.trim().length > 0;
            case "checkin":
                return true;
            case "dream":
                return content.trim().length > 0;
            case "gratitude":
                return gratitudeItems.filter(Boolean).length > 0;
            default:
                return false;
        }
    }

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* ── Entry Type Selector ───────────────────────────── */}
            {!isEditing && (
                <div className="flex items-center gap-1.5 mb-5">
                    <GiScrollUnfurled className="h-4 w-4 text-galactic/60 mr-1" />
                    {ENTRY_TYPES.map((type) => {
                        const meta = ENTRY_TYPE_META[type];
                        return (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setEntryType(type)}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-medium font-sans uppercase tracking-[0.12em] transition-all duration-300",
                                    activeType === type
                                        ? "border-galactic/30 bg-galactic/15 text-white"
                                        : "border-white/[0.06] bg-white/[0.02] text-white/35 hover:bg-white/[0.06] hover:text-white/55"
                                )}
                            >
                                <span className="text-xs">{meta.icon}</span>
                                <span>{meta.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Astro Context Strip ───────────────────────────── */}
            <AstroContextStrip astroContext={displayAstroContext} className="mb-4" />

            {/* ── Entry Content Area ─────────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {activeType === "freeform" && (
                    <>
                        <FreeformEditor
                            title={title}
                            content={content}
                            onTitleChange={setTitle}
                            onContentChange={setContent}
                        />
                        {/* Mood/Emotion extras below content */}
                        <div className="mt-4 space-y-4">
                            <MoodPad
                                value={mood}
                                onChange={setMood}
                                compact
                            />
                            <EmotionSelector
                                value={emotions}
                                onChange={setEmotions}
                            />
                        </div>
                    </>
                )}

                {activeType === "checkin" && (
                    <CheckinWidget
                        mood={mood}
                        onMoodChange={setMood}
                        emotions={emotions}
                        onEmotionsChange={setEmotions}
                        content={content}
                        onContentChange={setContent}
                    />
                )}

                {activeType === "dream" && (
                    <DreamEditor
                        content={content}
                        onContentChange={setContent}
                        dreamData={dreamData}
                        onDreamDataChange={setDreamData}
                        mood={mood}
                        onMoodChange={setMood}
                        emotions={emotions}
                        onEmotionsChange={setEmotions}
                    />
                )}

                {activeType === "gratitude" && (
                    <GratitudeEditor
                        gratitudeItems={gratitudeItems}
                        onGratitudeItemsChange={setGratitudeItems}
                        content={content}
                        onContentChange={setContent}
                    />
                )}

                {/* ── Expandable extras ──────────────────────────── */}
                {activeType !== "checkin" && (
                    <div className="mt-5 border-t border-white/[0.06] pt-4">
                        <button
                            type="button"
                            onClick={() => setShowExtras(!showExtras)}
                            className="flex items-center gap-1.5 text-[10px] font-sans uppercase tracking-[0.15em] text-white/30 hover:text-white/50 transition-colors mb-3"
                        >
                            {showExtras ? (
                                <ChevronUp className="h-3 w-3" />
                            ) : (
                                <ChevronDown className="h-3 w-3" />
                            )}
                            {showExtras ? "Hide" : "Energy, Time, Tags & more"}
                        </button>
                        {showExtras && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <EnergyLevelPicker
                                    value={energyLevel}
                                    onChange={setEnergyLevel}
                                />
                                <TimeOfDayPicker
                                    value={timeOfDay}
                                    onChange={setTimeOfDay}
                                />
                                <TagInput value={tags} onChange={setTags} />
                                {/* Voice input */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-sans uppercase tracking-[0.15em] text-white/30">Voice</label>
                                    <VoiceInputButton
                                        onTranscript={(text: string) => {
                                            setContent((prev: string) =>
                                                prev ? prev + " " + text : text
                                            );
                                            setVoiceTranscript((prev: string) =>
                                                prev ? prev + " " + text : text
                                            );
                                        }}
                                        onInterim={(text: string) => {
                                            // Optional: show interim text somewhere
                                        }}
                                    />
                                </div>
                                {/* Photo upload */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-sans uppercase tracking-[0.15em] text-white/30">Photo</label>
                                    <PhotoUploader
                                        photoId={photoId}
                                        photoCaption={photoCaption}
                                        onPhotoChange={setPhotoId}
                                        onCaptionChange={setPhotoCaption}
                                    />
                                </div>
                                {/* Location */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-sans uppercase tracking-[0.15em] text-white/30">Location</label>
                                    <LocationInput
                                        value={location}
                                        onChange={setLocation}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Check-in extras (simpler) */}
                {activeType === "checkin" && (
                    <div className="mt-5 border-t border-white/[0.06] pt-4 space-y-4">
                        <EnergyLevelPicker value={energyLevel} onChange={setEnergyLevel} />
                        <TimeOfDayPicker value={timeOfDay} onChange={setTimeOfDay} />
                        <TagInput value={tags} onChange={setTags} />
                        {/* Voice input for check-ins */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-sans uppercase tracking-[0.15em] text-white/30">Voice</label>
                            <VoiceInputButton
                                onTranscript={(text: string) => {
                                    setContent((prev: string) =>
                                        prev ? prev + " " + text : text
                                    );
                                    setVoiceTranscript((prev: string) =>
                                        prev ? prev + " " + text : text
                                    );
                                }}
                            />
                        </div>
                        {/* Photo upload for check-ins */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-sans uppercase tracking-[0.15em] text-white/30">Photo</label>
                            <PhotoUploader
                                photoId={photoId}
                                photoCaption={photoCaption}
                                onPhotoChange={setPhotoId}
                                onCaptionChange={setPhotoCaption}
                            />
                        </div>
                        {/* Location for check-ins */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-sans uppercase tracking-[0.15em] text-white/30">Location</label>
                            <LocationInput
                                value={location}
                                onChange={setLocation}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* ── Save Bar ──────────────────────────────────────── */}
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-4 mt-4">
                <div className="text-[10px] font-sans uppercase tracking-[0.12em] text-white/20">
                    {content.length > 0 && (
                        <span>{content.length} chars</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/journal")}
                        className="text-white/35 hover:text-white/60"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="galactic"
                        size="sm"
                        onClick={handleSave}
                        disabled={!canSave()}
                        className="gap-2"
                    >
                        {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {isEditing ? "Update" : "Save Entry"}
                    </Button>
                </div>
            </div>
        </div>
    );
}