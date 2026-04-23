"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { JOURNAL_LIMITS } from "@/lib/journal/constants";

interface FreeformEditorProps {
    title: string;
    content: string;
    onTitleChange: (title: string) => void;
    onContentChange: (content: string) => void;
    className?: string;
}

export function FreeformEditor({
    title,
    content,
    onTitleChange,
    onContentChange,
    className,
}: FreeformEditorProps) {
    return (
        <div className={cn("space-y-3", className)}>
            <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Give this entry a title..."
                maxLength={JOURNAL_LIMITS.MAX_TITLE_LENGTH}
                className="w-full bg-transparent text-lg font-serif font-medium text-white/90 placeholder:text-white/20 outline-none border-none tracking-wide"
            />
            <textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="What's on your mind?"
                autoFocus
                maxLength={JOURNAL_LIMITS.MAX_CONTENT_LENGTH}
                className="w-full min-h-[200px] bg-transparent text-sm text-white/70 placeholder:text-white/20 outline-none border-none resize-y leading-relaxed font-sans"
            />
        </div>
    );
}