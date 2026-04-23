"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { EntryComposer } from "@/components/journal/composer/entry-composer";
import { Loader2 } from "lucide-react";
import { GiScrollUnfurled } from "react-icons/gi";

export default function EditJournalEntryPage() {
    const router = useRouter();
    const params = useParams();
    const entryId = params.entryId as string;

    const entry = useQuery(api.journal.entries.getEntry, {
        entryId: entryId as any,
    });

    if (!entry) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-5 w-5 animate-spin text-white/30" />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                    <GiScrollUnfurled className="h-4 w-4 text-galactic/60" />
                    <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-galactic/50">
                        Edit
                    </span>
                </div>
                <h1 className="text-xl font-serif font-bold text-white/90 tracking-wide">
                    Edit Entry
                </h1>
            </div>

            <EntryComposer editEntry={entry} editEntryId={entryId} />
        </div>
    );
}