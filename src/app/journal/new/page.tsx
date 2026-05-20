"use client";

import { Redirect } from "@/components/redirect";

/**
 * This page now redirects to the new unified stream page.
 * Old routes like /journal/new?presetPrompt=...&type=... are preserved
 * as redirects to /journal?compose=true&prompt=...&type=...
 */
export default function NewJournalEntryPage() {
    return <Redirect />;
}