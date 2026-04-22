"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

interface SearchBarProps {
    query: string;
    onQueryChange: (query: string) => void;
    className?: string;
}

export function SearchBar({ query, onQueryChange, className }: SearchBarProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);

    return (
        <div className={cn("relative", className)}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search your journal entries..."
                className={cn(
                    "w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-10 py-2.5",
                    "text-sm text-white/80 placeholder:text-white/25",
                    "focus:outline-none focus:border-white/20 focus:bg-white/[0.05]",
                    "transition-colors",
                )}
                autoFocus
            />
            {query && (
                <button
                    type="button"
                    onClick={() => {
                        onQueryChange("");
                        inputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}