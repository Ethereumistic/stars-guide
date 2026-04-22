"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DateSeparatorProps {
    date: string; // YYYY-MM-DD
    className?: string;
}

function formatRelativeDate(date: string): string {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    if (date === today) return "Today";
    if (date === yesterday) return "Yesterday";

    return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

export function DateSeparator({ date, className }: DateSeparatorProps) {
    return (
        <div className={cn("sticky top-0 z-10 py-2", className)}>
            <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-xs font-medium text-white/30 uppercase tracking-wider">
                    {formatRelativeDate(date)}
                </span>
                <div className="h-px flex-1 bg-white/5" />
            </div>
        </div>
    );
}