"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { EntryComposer } from "@/components/journal/composer/entry-composer";
import { useJournalStore } from "@/store/use-journal-store";
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

    return (
        <div>
            <div className="mb-4">
                <h1 className="text-xl font-serif font-bold text-white/90">
                    New Entry
                </h1>
            </div>

            <EntryComposer />
        </div>
    );
}