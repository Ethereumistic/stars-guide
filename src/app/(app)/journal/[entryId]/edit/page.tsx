"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

/**
 * Redirect page: /journal/[entryId]/edit → /journal?entry=entryId&edit=true
 * Opens the entry in the new detail panel edit mode instead of a separate page.
 */
export default function EditEntryRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const entryId = params.entryId as string;

    useEffect(() => {
        router.replace(`/journal?entry=${entryId}&edit=true`);
    }, [entryId, router]);

    return null;
}