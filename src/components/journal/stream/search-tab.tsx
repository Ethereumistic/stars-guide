"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Loader2, Search, X } from "lucide-react";
import { StreamEntryCard } from "./stream-entry-card";

export function SearchTab({ onEntryClick }: { onEntryClick?: (entryId: string) => void }) {
  const [query, setQuery] = React.useState("");
  const [settledQuery, setSettledQuery] = React.useState("");
  React.useEffect(() => { const timer = window.setTimeout(() => setSettledQuery(query.trim()), 250); return () => window.clearTimeout(timer); }, [query]);
  const results = useQuery(api.journal.search.searchEntries, settledQuery ? { query: settledQuery } : "skip");

  return <section>
    <div className="relative">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/25" />
      <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your reflections…" className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.035] pl-12 pr-12 text-base text-white outline-none placeholder:text-white/25 focus:border-[#a995f2]/45" />
      {query && <button aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"><X className="h-4 w-4" /></button>}
    </div>
    <div className="mt-7">
      {settledQuery && results === undefined && <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-white/30" /></div>}
      {!settledQuery && <p className="py-16 text-center text-sm text-white/30">Search by a word or phrase you remember.</p>}
      {results?.length === 0 && <p className="py-16 text-center text-sm text-white/30">No reflections found.</p>}
      {results && results.length > 0 && <div className="space-y-1"><p className="mb-3 px-4 text-xs text-white/30">{results.length} {results.length === 1 ? "reflection" : "reflections"}</p>{results.map((entry: any) => <StreamEntryCard key={entry._id} entry={entry} onClick={() => onEntryClick?.(entry._id)} />)}</div>}
    </div>
  </section>;
}
