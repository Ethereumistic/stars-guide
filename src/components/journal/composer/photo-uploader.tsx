"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { JOURNAL_LIMITS } from "@/lib/journal/constants";
import { ImageIcon, X, Loader2 } from "lucide-react";

interface PhotoUploaderProps {
    /** Current photo storage ID (if any) */
    photoId?: string | null;
    /** Current caption */
    photoCaption?: string;
    /** Called when a photo is uploaded (storage ID) */
    onPhotoChange: (photoId: string | null) => void;
    /** Called when caption changes */
    onCaptionChange?: (caption: string) => void;
    className?: string;
}

export function PhotoUploader({
    photoId,
    photoCaption,
    onPhotoChange,
    onCaptionChange,
    className,
}: PhotoUploaderProps) {
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);
    const [isUploading, setIsUploading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Fetch URL for an already-stored photo (when not showing local preview)
    const storedPhotoUrl = useQuery(
        api.files.getUrl,
        photoId && !previewUrl ? { storageId: photoId as any } : "skip",
    )

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset
        setError(null);

        // Validate file type
        if (!file.type.startsWith("image/")) {
            setError("Please select an image file");
            return;
        }

        // Validate file size
        if (file.size > JOURNAL_LIMITS.MAX_PHOTO_SIZE_BYTES) {
            setError(`Image must be under ${Math.round(JOURNAL_LIMITS.MAX_PHOTO_SIZE_BYTES / 1048576)}MB`);
            return;
        }

        // Show local preview immediately
        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);

        setIsUploading(true);
        try {
            // Step 1: Get upload URL from Convex
            const uploadUrl = await generateUploadUrl();

            // Step 2: POST the file to the upload URL
            const result = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!result.ok) {
                throw new Error("Upload failed");
            }

            // Step 3: Get the storage ID from the response
            const uploadData = await result.json() as { storageId: string };
            const storageId = uploadData.storageId;

            // Step 4: Notify parent
            onPhotoChange(storageId);
        } catch (err: any) {
            setError(err?.message ?? "Upload failed");
            setPreviewUrl(null);
        } finally {
            setIsUploading(false);
            // Reset file input so the same file can be re-selected
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }

    function handleRemove() {
        onPhotoChange(null);
        onCaptionChange?.("");
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setError(null);
    }

    // Use local preview (during/just after upload) or the Convex URL for stored photos
    const displayUrl = previewUrl || storedPhotoUrl || null;

    return (
        <div className={cn("space-y-2", className)}>
            {displayUrl ? (
                <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/[0.02]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={displayUrl}
                        alt="Entry photo"
                        className="w-full max-h-48 object-cover"
                    />
                    {/* Remove button */}
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white/70 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                    {/* Caption input */}
                    {onCaptionChange && (
                        <input
                            type="text"
                            placeholder="Add a caption..."
                            value={photoCaption ?? ""}
                            onChange={(e) => onCaptionChange(e.target.value)}
                            className="w-full bg-transparent px-3 py-2 text-xs text-white/50 placeholder:text-white/25 border-t border-white/5 focus:outline-none focus:ring-0"
                        />
                    )}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className={cn(
                        "flex items-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/40 hover:bg-white/5 hover:text-white/60 transition-colors",
                        isUploading && "opacity-60 cursor-not-allowed",
                        className
                    )}
                >
                    {isUploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <ImageIcon className="h-3.5 w-3.5" />
                    )}
                    {isUploading ? "Uploading..." : "Add photo"}
                </button>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Error */}
            {error && (
                <p className="text-xs text-red-400/70">{error}</p>
            )}
        </div>
    );
}