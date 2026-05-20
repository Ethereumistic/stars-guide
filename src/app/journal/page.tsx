"use client";

import { Suspense } from "react";
import { JournalStreamPage } from "@/components/journal/stream/journal-stream-page";

export default function JournalPage() {
    return (
        <Suspense>
            <JournalStreamPage />
        </Suspense>
    );
}