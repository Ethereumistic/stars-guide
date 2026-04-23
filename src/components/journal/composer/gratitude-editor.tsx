"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { JOURNAL_LIMITS } from "@/lib/journal/constants";

interface GratitudeEditorProps {
    gratitudeItems: string[];
    onGratitudeItemsChange: (items: string[]) => void;
    content: string;
    onContentChange: (content: string) => void;
    className?: string;
}

export function GratitudeEditor({
    gratitudeItems,
    onGratitudeItemsChange,
    content,
    onContentChange,
    className,
}: GratitudeEditorProps) {
    const maxItems = JOURNAL_LIMITS.MAX_GRATITUDE_ITEMS;

    // Ensure at least 3 slots
    const displayItems = gratitudeItems.length < 3
        ? [...gratitudeItems, ...Array(3 - gratitudeItems.length).fill("")]
        : gratitudeItems;

    function updateItem(index: number, value: string) {
        const newItems = [...gratitudeItems];
        if (index < newItems.length) {
            newItems[index] = value;
        }
        onGratitudeItemsChange(newItems.filter(Boolean));
    }

    function addAnother() {
        if (gratitudeItems.length >= maxItems) return;
        onGratitudeItemsChange([...gratitudeItems, ""]);
    }

    function removeItem(index: number) {
        onGratitudeItemsChange(gratitudeItems.filter((_, i) => i !== index));
    }

    return (
        <div className={cn("space-y-5", className)}>
            <div className="space-y-3">
                <label className="text-sm font-serif text-white/70">
                    What are you grateful for?
                </label>
                {displayItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <span className="text-galactic/50 text-sm">✦</span>
                        <input
                            type="text"
                            value={item}
                            onChange={(e) => updateItem(index, e.target.value)}
                            placeholder="I'm grateful for..."
                            className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm font-sans text-white/70 placeholder:text-white/20 outline-none focus:border-galactic/25 transition-colors"
                            autoFocus={index === 0}
                        />
                        {gratitudeItems.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="text-white/25 hover:text-white/50 transition-colors text-sm"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}
                {gratitudeItems.length < maxItems && (
                    <button
                        type="button"
                        onClick={addAnother}
                        className="text-[10px] font-sans uppercase tracking-[0.12em] text-galactic/50 hover:text-galactic/80 transition-colors"
                    >
                        + Add another
                    </button>
                )}
            </div>

            {/* Optional note */}
            <textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="Anything else on your mind? (optional)"
                maxLength={JOURNAL_LIMITS.MAX_CONTENT_LENGTH}
                className="w-full min-h-[80px] bg-transparent text-sm font-sans text-white/70 placeholder:text-white/20 outline-none border-none resize-y leading-relaxed"
            />
        </div>
    );
}