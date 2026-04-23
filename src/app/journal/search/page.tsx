"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { MOOD_ZONES, ENTRY_TYPE_META, ENTRY_TYPES, type MoodZone, type EntryType } from "@/lib/journal/constants";
import { EntryCard } from "@/components/journal/timeline/entry-card";
import { SearchBar } from "@/components/journal/search/search-bar";
import { SearchFilters } from "@/components/journal/search/search-filters";
import { Loader2, Search } from "lucide-react";
import { GiScrollUnfurled } from "react-icons/gi";

export default function JournalSearchPage() {
    const router = useRouter();

    const [query, setQuery] = React.useState("");
    const [filters, setFilters] = React.useState<{
        entryType?: EntryType;
        moodZone?: MoodZone;
        startDate?: string;
        endDate?: string;
        tags?: string[];
        moonPhase?: string;
    }>({});

    const [searchQuery, setSearchQuery] = React.useState("");
    const [searchFilters, setSearchFilters] = React.useState(filters);

    // Debounce search
    React.useEffect(() => {
        const timeout = setTimeout(() => {
            setSearchQuery(query);
            setSearchFilters(filters);
        }, 300);
        return () => clearTimeout(timeout);
    }, [query, filters]);

    const results = useQuery(
        api.journal.search.searchEntries,
        searchQuery.trim().length > 0
            ? {
                  query: searchQuery,
                  entryType: searchFilters.entryType,
                  moodZone: searchFilters.moodZone,
                  startDate: searchFilters.startDate,
                  endDate: searchFilters.endDate,
                  tags: searchFilters.tags,
                  moonPhase: searchFilters.moonPhase,
              }
            : "skip",
    );

    const isSearching = searchQuery.trim().length > 0;
    const hasResults = results && results.length > 0;

    return (
        <div>
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <GiScrollUnfurled className="h-4 w-4 text-galactic/60" />
                    <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-galactic/50">
                        Search
                    </span>
                </div>
                <h1 className="text-2xl font-serif font-bold text-white/90 tracking-wide">Search</h1>
                <p className="mt-1 text-sm font-sans text-white/35">Find entries by mood, tag, date, or content</p>
            </div>

            <div className="space-y-4">
                {/* Search bar */}
                <SearchBar query={query} onQueryChange={setQuery} />

                {/* Filters */}
                <SearchFilters filters={filters} onFiltersChange={setFilters} />

                {/* Results */}
                {isSearching && !results && (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-white/30" />
                    </div>
                )}

                {isSearching && results && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Search className="h-8 w-8 text-white/20 mb-3" />
                        <p className="text-sm text-white/40">No entries match your search</p>
                    </div>
                )}

                {hasResults && (
                    <div className="space-y-2">
                        <p className="text-xs text-white/30 mb-2">{results.length} results</p>
                        {results.map((entry: any) => (
                            <EntryCard
                                key={entry._id}
                                entry={entry}
                                onClick={() => router.push(`/journal/${entry._id}`)}
                            />
                        ))}
                    </div>
                )}

                {!isSearching && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Search className="h-8 w-8 text-white/20 mb-3" />
                        <p className="text-sm text-white/40">
                            Type a search to find entries
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}