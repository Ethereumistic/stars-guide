"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
    MOOD_ZONES,
    ENTRY_TYPE_META,
    ENTRY_TYPES,
    type MoodZone,
    type EntryType,
} from "@/lib/journal/constants";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";

interface SearchFiltersProps {
    filters: {
        entryType?: EntryType;
        moodZone?: MoodZone;
        startDate?: string;
        endDate?: string;
        tags?: string[];
        moonPhase?: string;
    };
    onFiltersChange: (filters: SearchFiltersProps["filters"]) => void;
    className?: string;
}

const MOON_PHASES = [
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent",
];

export function SearchFilters({ filters, onFiltersChange, className }: SearchFiltersProps) {
    const [isExpanded, setIsExpanded] = React.useState(false);

    function updateFilter(key: string, value: any) {
        onFiltersChange({ ...filters, [key]: value || undefined });
    }

    function clearFilters() {
        onFiltersChange({});
    }

    const activeFilterCount = Object.values(filters).filter(
        (v) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0),
    ).length;

    return (
        <div className={cn("space-y-3", className)}>
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                    <span className="rounded-full bg-galactic/20 text-galactic px-1.5 py-0.5 text-[10px]">
                        {activeFilterCount}
                    </span>
                )}
                {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                ) : (
                    <ChevronDown className="h-3 w-3" />
                )}
            </button>

            {isExpanded && (
                <div className="space-y-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Entry Type */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-white/40">Entry Type</label>
                        <div className="flex flex-wrap gap-1">
                            {ENTRY_TYPES.map((type) => {
                                const meta = ENTRY_TYPE_META[type];
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() =>
                                            updateFilter("entryType", filters.entryType === type ? undefined : type)
                                        }
                                        className={cn(
                                            "rounded-full border px-2.5 py-1 text-[10px] transition-all",
                                            filters.entryType === type
                                                ? "border-galactic/40 bg-galactic/10 text-white"
                                                : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10",
                                        )}
                                    >
                                        {meta.icon} {meta.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mood Zone */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-white/40">Mood Zone</label>
                        <div className="flex flex-wrap gap-1">
                            {MOOD_ZONES.map((zone) => (
                                <button
                                    key={zone.key}
                                    type="button"
                                    onClick={() =>
                                        updateFilter("moodZone", filters.moodZone === zone.key ? undefined : zone.key)
                                    }
                                    className={cn(
                                        "rounded-full border px-2.5 py-1 text-[10px] transition-all",
                                        filters.moodZone === zone.key
                                            ? "border-galactic/40 bg-galactic/10 text-white"
                                            : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10",
                                    )}
                                >
                                    {zone.emoji} {zone.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Moon Phase */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-white/40">Moon Phase</label>
                        <select
                            value={filters.moonPhase ?? ""}
                            onChange={(e) => updateFilter("moonPhase", e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-black/20 text-xs text-white/60 p-2 focus:outline-none focus:border-white/20"
                        >
                            <option value="">Any phase</option>
                            {MOON_PHASES.map((phase) => (
                                <option key={phase} value={phase}>
                                    {phase}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-white/40">Date Range</label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={filters.startDate ?? ""}
                                onChange={(e) => updateFilter("startDate", e.target.value)}
                                className="flex-1 rounded-lg border border-white/10 bg-black/20 text-xs text-white/60 p-2 focus:outline-none focus:border-white/20"
                            />
                            <span className="text-xs text-white/20 self-center">to</span>
                            <input
                                type="date"
                                value={filters.endDate ?? ""}
                                onChange={(e) => updateFilter("endDate", e.target.value)}
                                className="flex-1 rounded-lg border border-white/10 bg-black/20 text-xs text-white/60 p-2 focus:outline-none focus:border-white/20"
                            />
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-white/40">Tags (comma-separated)</label>
                        <input
                            type="text"
                            value={filters.tags?.join(", ") ?? ""}
                            onChange={(e) => {
                                const val = e.target.value;
                                const tags = val
                                    .split(",")
                                    .map((t) => t.trim())
                                    .filter(Boolean);
                                updateFilter("tags", tags.length > 0 ? tags : undefined);
                            }}
                            placeholder="e.g. work, family"
                            className="w-full rounded-lg border border-white/10 bg-black/20 text-xs text-white/60 p-2 placeholder:text-white/25 focus:outline-none focus:border-white/20"
                        />
                    </div>

                    {/* Clear filters */}
                    {activeFilterCount > 0 && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="text-xs text-red-400/60 hover:text-red-400/80 transition-colors"
                        >
                            Clear all filters
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}