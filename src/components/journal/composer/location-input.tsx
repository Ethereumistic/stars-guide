"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
    isGeolocationSupported,
    getCurrentLocation,
    formatLocationDisplay,
    type LocationData,
} from "@/lib/journal/location";
import { MapPin, X, Loader2, Pencil } from "lucide-react";

interface LocationInputProps {
    /** Current location value */
    value?: LocationData | null;
    /** Called when location changes */
    onChange: (location: LocationData | null) => void;
    className?: string;
}

export function LocationInput({ value, onChange, className }: LocationInputProps) {
    const [isFetching, setIsFetching] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [isEditing, setIsEditing] = React.useState(false);
    const [editText, setEditText] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    async function handleDetectLocation() {
        if (!isGeolocationSupported()) {
            setError("Geolocation not supported in this browser");
            return;
        }

        setIsFetching(true);
        setError(null);

        try {
            const location = await getCurrentLocation();
            if (location) {
                onChange(location);
            } else {
                setError("Could not detect your location");
            }
        } catch {
            setError("Location access denied");
        } finally {
            setIsFetching(false);
        }
    }

    function handleRemove() {
        onChange(null);
        setError(null);
        setIsEditing(false);
    }

    function handleEditDisplayName() {
        setEditText(value?.displayName ?? "");
        setIsEditing(true);
        // Focus the input on next tick
        setTimeout(() => inputRef.current?.focus(), 0);
    }

    function handleSaveEdit() {
        if (value && editText.trim()) {
            onChange({
                ...value,
                displayName: editText.trim(),
            });
        }
        setIsEditing(false);
    }

    function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            handleSaveEdit();
        } else if (e.key === "Escape") {
            setIsEditing(false);
        }
    }

    // Display text
    const displayText = value ? formatLocationDisplay(value) : null;

    if (value && !isEditing) {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 pl-2.5 pr-1.5 py-1 text-xs text-white/50">
                    <MapPin className="h-3 w-3 text-white/40" />
                    {displayText}
                    <button
                        type="button"
                        onClick={handleEditDisplayName}
                        className="ml-1 rounded-full p-0.5 text-white/30 hover:text-white/60 transition-colors"
                    >
                        <Pencil className="h-2.5 w-2.5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="rounded-full p-0.5 text-white/30 hover:text-red-400/60 transition-colors"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </span>
            </div>
        );
    }

    if (isEditing && value) {
        return (
            <div className={cn("flex items-center gap-1.5", className)}>
                <MapPin className="h-3.5 w-3.5 text-white/40" />
                <input
                    ref={inputRef}
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={handleSaveEdit}
                    placeholder="Location name..."
                    className="bg-transparent text-xs text-white/60 placeholder:text-white/25 border-b border-white/10 focus:border-white/20 focus:outline-none w-40"
                />
            </div>
        );
    }

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isFetching}
                className={cn(
                    "flex items-center gap-1.5 rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-white/40 hover:bg-white/5 hover:text-white/60 transition-colors",
                    isFetching && "opacity-60 cursor-not-allowed",
                )}
                title={isGeolocationSupported() ? "Tag your current location" : "Geolocation not supported"}
            >
                {isFetching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <MapPin className="h-3.5 w-3.5" />
                )}
                {isFetching ? "Detecting..." : "Add location"}
            </button>
            {error && (
                <span className="text-xs text-red-400/60">{error}</span>
            )}
        </div>
    );
}