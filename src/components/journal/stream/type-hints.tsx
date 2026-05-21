"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { EntryType } from "@/lib/journal/constants";

interface TypeHintsProps {
    activeType: EntryType;
    onTypeChange: (type: EntryType) => void;
    className?: string;
}

const TYPE_HINTS: { type: EntryType; icon: string; label: string }[] = [
    { type: "freeform", icon: "✍️", label: "Freeform" },
    { type: "dream", icon: "✨", label: "Mark as dream" },
    { type: "gratitude", icon: "🙏", label: "Mark as gratitude" },
];

export function TypeHints({
    activeType,
    onTypeChange,
    className,
}: TypeHintsProps) {
    return (
        <div
            className={cn(
                "flex flex-wrap items-center gap-2 md:gap-2 text-[10px] font-sans",
                className
            )}
        >
            {TYPE_HINTS.map((hint) => {
                const isActive = activeType === hint.type;
                return (
                    <button
                        key={hint.type}
                        type="button"
                        onClick={() => onTypeChange(hint.type)}
                        className={cn(
                            "transition-all duration-200 min-h-[44px] md:min-h-0 inline-flex items-center",
                            isActive
                                ? "text-[var(--journal-accent)]"
                                : "text-[var(--journal-muted)] hover:text-white/45"
                        )}
                    >
                        <span className="mr-1">{hint.icon}</span>
                        {isActive ? (
                            <span className="underline underline-offset-2">
                                {hint.label}
                            </span>
                        ) : (
                            hint.label
                        )}
                    </button>
                );
            })}
        </div>
    );
}