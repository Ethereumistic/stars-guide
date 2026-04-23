"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { EntryComposer } from "@/components/journal/composer/entry-composer";
import { useJournalStore } from "@/store/use-journal-store";
import { GiScrollUnfurled } from "react-icons/gi";
import type { EntryType } from "@/lib/journal/constants";

export default function NewJournalEntryPage() {
    const searchParams = useSearchParams();
    const { setEntryType } = useJournalStore();

    // Handle ?type= query param
    React.useEffect(() => {
        const typeParam = searchParams.get("type");
        if (typeParam && ["freeform", "checkin", "dream", "gratitude"].includes(typeParam)) {
            setEntryType(typeParam as EntryType);
        }
    }, [searchParams, setEntryType]);

    // Handle ?presetPrompt= from Oracle suggestions
    const presetPrompt = searchParams.get("presetPrompt");
    const oracleSessionId = searchParams.get("oracleSessionId");

    return (
        <div>
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                    <GiScrollUnfurled className="h-4 w-4 text-galactic/60" />
                    <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-galactic/50">
                        Compose
                    </span>
                </div>
                <h1 className="text-xl font-serif font-bold text-white/90 tracking-wide">
                    New Entry
                </h1>
                {presetPrompt && (
                    <div className="mt-2 relative overflow-hidden rounded-xl border border-galactic/20 bg-galactic/5 px-4 py-2">
                        <p className="text-[10px] font-sans uppercase tracking-[0.15em] text-galactic/50">Oracle Suggests</p>
                        <p className="text-sm font-sans text-white/55 mt-0.5">{presetPrompt}</p>
                    </div>
                )}
            </div>

            <EntryComposer
                initialContent={presetPrompt || undefined}
                oracleSessionId={oracleSessionId || undefined}
                oracleInspired={Boolean(presetPrompt)}
            />
        </div>
    );
}