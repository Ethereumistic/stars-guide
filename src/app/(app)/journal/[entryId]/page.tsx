"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

/**
 * Redirect page: /journal/[entryId] → /journal?entry=entryId
 * Opens the entry in the new detail panel instead of a separate page.
 */
export default function EntryRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const entryId = params.entryId as string;

    useEffect(() => {
        router.replace(`/journal?entry=${entryId}`);
    }, [entryId, router]);

    return null;
}