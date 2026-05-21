"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { VoiceInputButton } from "@/components/journal/composer/voice-input-button";
import { PhotoUploader } from "@/components/journal/composer/photo-uploader";
import { LocationInput } from "@/components/journal/composer/location-input";
import type { EntryType } from "@/lib/journal/constants";
import { TypeHints } from "./type-hints";

interface CaptureActionBarProps {
    /** Current entry type */
    entryType: EntryType;
    /** Change entry type */
    onTypeChange: (type: EntryType) => void;
    /** Voice transcript callback */
    onVoiceTranscript: (text: string) => void;
    /** Photo change callback */
    onPhotoChange: (photoId: string | null) => void;
    /** Photo caption change callback */
    onPhotoCaptionChange: (caption: string) => void;
    /** Location change callback */
    onLocationChange: (location: any) => void;
    /** Current photo ID for editing */
    photoId?: string | null;
    /** Current photo caption */
    photoCaption?: string;
    /** Current location */
    location?: any;
    /** Whether save is disabled */
    isSaving?: boolean;
    className?: string;
}

export function CaptureActionBar({
    entryType,
    onTypeChange,
    onVoiceTranscript,
    onPhotoChange,
    onPhotoCaptionChange,
    onLocationChange,
    photoId,
    photoCaption,
    location,
    isSaving,
    className,
}: CaptureActionBarProps) {
    const [showVoice, setShowVoice] = React.useState(false);
    const [showPhoto, setShowPhoto] = React.useState(false);
    const [showLocation, setShowLocation] = React.useState(false);

    return (
        <div className={cn("space-y-3", className)}>
            {/* Action buttons row — stacked on mobile for touch targets */}
            <div className="flex items-center gap-2 flex-wrap">
                <ActionIconBtn
                    icon={
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                        >
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" x2="12" y1="19" y2="22" />
                        </svg>
                    }
                    label="Voice"
                    active={showVoice}
                    onClick={() => {
                        setShowVoice(!showVoice);
                        setShowPhoto(false);
                        setShowLocation(false);
                    }}
                />
                <ActionIconBtn
                    icon={
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                        >
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                    }
                    label="Photo"
                    active={showPhoto || !!photoId}
                    onClick={() => {
                        setShowPhoto(!showPhoto);
                        setShowVoice(false);
                        setShowLocation(false);
                    }}
                />
                <ActionIconBtn
                    icon={
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                        >
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                    }
                    label="Location"
                    active={showLocation || !!location}
                    onClick={() => {
                        setShowLocation(!showLocation);
                        setShowVoice(false);
                        setShowPhoto(false);
                    }}
                />

                {/* Type hints — wraps on mobile */}
                <div className="ml-auto md:ml-auto">
                    <TypeHints
                        activeType={entryType}
                        onTypeChange={onTypeChange}
                    />
                </div>
            </div>

            {/* Expandable sections */}
            {showVoice && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200 border-t border-[var(--journal-border)] pt-3">
                    <label className="text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--journal-muted)] mb-2 block">
                        Voice
                    </label>
                    <VoiceInputButton onTranscript={onVoiceTranscript} />
                </div>
            )}

            {showPhoto && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200 border-t border-[var(--journal-border)] pt-3">
                    <PhotoUploader
                        photoId={photoId}
                        photoCaption={photoCaption}
                        onPhotoChange={onPhotoChange}
                        onCaptionChange={onPhotoCaptionChange}
                    />
                </div>
            )}

            {showLocation && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200 border-t border-[var(--journal-border)] pt-3">
                    <LocationInput
                        value={location}
                        onChange={onLocationChange}
                    />
                </div>
            )}
        </div>
    );
}

/** Icon button with 44px minimum touch target for mobile */
function ActionIconBtn({
    icon,
    label,
    active,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border text-[10px] font-sans uppercase tracking-[0.08em] transition-all duration-200",
                // Mobile: ensure 44px minimum touch target
                "min-h-[44px] min-w-[44px] px-3 py-2",
                // Desktop: can compact slightly
                "md:px-2.5 md:py-1.5 md:min-h-0 md:min-w-0",
                active
                    ? "border-[var(--journal-accent)]/30 bg-[var(--journal-accent)]/10 text-[var(--journal-accent)]"
                    : "border-[var(--journal-border)] bg-transparent text-[var(--journal-muted)] hover:bg-white/[0.06] hover:text-white/50"
            )}
            title={label}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}