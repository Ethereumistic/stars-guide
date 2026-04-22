"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { EntryComposer } from "@/components/journal/composer/entry-composer";
import { Loader2 } from "lucide-react";

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
                <h1 className="text-xl font-serif font-bold text-white/90">
                    Edit Entry
                </h1>
            </div>

            <EntryComposer editEntry={entry} editEntryId={entryId} />
        </div>
    );
}