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
                className="w-full bg-transparent text-lg font-medium text-white/90 placeholder:text-white/25 outline-none border-none"
            />
            <textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="What's on your mind?"
                autoFocus
                maxLength={JOURNAL_LIMITS.MAX_CONTENT_LENGTH}
                className="w-full min-h-[200px] bg-transparent text-sm text-white/80 placeholder:text-white/25 outline-none border-none resize-y leading-relaxed"
            />
        </div>
    );
}