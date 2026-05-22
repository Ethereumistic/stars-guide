"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type EntryType } from "@/lib/journal/constants";

export interface JournalTopic {
    id: string;
    icon: string;
    title: string;
    description: string;
    entryType: EntryType;
    /** Text pre-filled into the textarea when this topic is selected */
    starterPrompt: string;
    /** Accent color for the card */
    color: string;
}

/**
 * JOURNAL_TOPICS — hardcoded Phase 1 topics.
 * These will be extended with AI-generated topics in Phase 2,
 * filtered by cosmic weather and natal chart context.
 */
export const JOURNAL_TOPICS: JournalTopic[] = [
    {
        id: "daily",
        icon: "✨",
        title: "Today's Reflection",
        description: "How was your day?",
        entryType: "freeform",
        starterPrompt: "Today I...",
        color: "#c8a45c",
    },
    {
        id: "dream",
        icon: "🌙",
        title: "Dream Log",
        description: "What did you dream?",
        entryType: "dream",
        starterPrompt: "",
        color: "#818cf8",
    },
    {
        id: "gratitude",
        icon: "🙏",
        title: "Gratitude",
        description: "Three things I'm grateful for",
        entryType: "gratitude",
        starterPrompt: "",
        color: "#34d399",
    },
    {
        id: "cosmic",
        icon: "🔮",
        title: "Cosmic Check-in",
        description: "How's the energy today?",
        entryType: "checkin",
        starterPrompt: "Right now I feel...",
        color: "#a78bfa",
    },
    {
        id: "release",
        icon: "🍂",
        title: "Release",
        description: "What are you letting go?",
        entryType: "freeform",
        starterPrompt: "I'm ready to release...",
        color: "#fb923c",
    },
    {
        id: "noticed",
        icon: "👁️",
        title: "I Noticed",
        description: "Something that stood out",
        entryType: "freeform",
        starterPrompt: "Something I noticed today...",
        color: "#38bdf8",
    },
];

interface JournalTopicCardsProps {
    onSelect: (topic: JournalTopic) => void;
    className?: string;
}

export function JournalTopicCards({ onSelect, className }: JournalTopicCardsProps) {
    const [tapped, setTapped] = React.useState<string | null>(null);
    const scrollRef = React.useRef<HTMLDivElement>(null);

    function handleTap(topic: JournalTopic) {
        setTapped(topic.id);
        setTimeout(() => setTapped(null), 200);
        onSelect(topic);
    }

    return (
        <div className={cn("space-y-2", className)}>
            <p className="text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--journal-muted)]">
                What do you want to explore?
            </p>
            {/* Horizontal scroll row */}
            <div
                ref={scrollRef}
                className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {JOURNAL_TOPICS.map((topic) => {
                    const isTapped = tapped === topic.id;
                    return (
                        <button
                            key={topic.id}
                            type="button"
                            onClick={() => handleTap(topic)}
                            className={cn(
                                "flex-none snap-start w-[120px] md:w-[130px] rounded-2xl border p-3 text-left transition-all duration-200",
                                "bg-white/[0.03] hover:bg-white/[0.07]",
                                "active:scale-95",
                                isTapped && "scale-95",
                            )}
                            style={{
                                borderColor: `${topic.color}25`,
                            }}
                        >
                            {/* Icon */}
                            <span className="block text-2xl mb-2 leading-none">{topic.icon}</span>

                            {/* Title */}
                            <p
                                className="text-xs font-serif font-semibold leading-tight mb-1"
                                style={{ color: topic.color }}
                            >
                                {topic.title}
                            </p>

                            {/* Description */}
                            <p className="text-[10px] font-sans text-[var(--journal-muted)] leading-snug line-clamp-2">
                                {topic.description}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
