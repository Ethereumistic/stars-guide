"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { JOURNAL_LIMITS } from "@/lib/journal/constants";

interface TagInputProps {
    value: string[];
    onChange: (tags: string[]) => void;
    maxTags?: number;
    maxLength?: number;
    className?: string;
}

export function TagInput({
    value,
    onChange,
    maxTags = JOURNAL_LIMITS.MAX_TAGS_PER_ENTRY,
    maxLength = JOURNAL_LIMITS.MAX_TAG_LENGTH,
    className,
}: TagInputProps) {
    const [input, setInput] = React.useState("");

    function addTag(tag: string) {
        const trimmed = tag.trim().toLowerCase();
        if (!trimmed) return;
        if (trimmed.length > maxLength) return;
        if (value.length >= maxTags) return;
        if (value.includes(trimmed)) return;

        onChange([...value, trimmed]);
        setInput("");
    }

    function removeTag(tag: string) {
        onChange(value.filter((t) => t !== tag));
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(input);
        }
        if (e.key === "Backspace" && !input && value.length > 0) {
            removeTag(value[value.length - 1]);
        }
    }

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center justify-between">
                <label className="text-sm font-serif text-white/70">Tags</label>
                <span className="text-[10px] font-sans uppercase tracking-[0.12em] text-white/25">
                    {value.length}/{maxTags}
                </span>
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 min-h-[40px]" style={{ background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)" }}>
                {value.map((tag) => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full border border-galactic/25 bg-galactic/10 px-2 py-0.5 text-[10px] font-sans uppercase tracking-[0.08em] text-galactic"
                    >
                        #{tag}
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="text-galactic/40 hover:text-galactic transition-colors"
                        >
                            ×
                        </button>
                    </span>
                ))}
                {value.length < maxTags && (
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => input && addTag(input)}
                        placeholder={value.length === 0 ? "Add tags..." : ""}
                        className="flex-1 min-w-[80px] bg-transparent text-xs text-white/60 placeholder:text-white/20 outline-none font-sans"
                        maxLength={maxLength}
                    />
                )}
            </div>
        </div>
    );
}