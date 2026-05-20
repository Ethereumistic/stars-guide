"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Redirect utility component.
 * If `to` is provided, redirects to that URL.
 * Otherwise, reads old query params from /journal/new and maps to /journal?compose=true&...
 */
export function Redirect({ to }: { to?: string } = {}) {
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        if (to) {
            router.replace(to);
            return;
        }

        // Default: map old /journal/new params to new /journal stream params
        const params = new URLSearchParams();
        params.set("compose", "true");

        const presetPrompt = searchParams.get("presetPrompt");
        const prompt = searchParams.get("prompt");
        if (presetPrompt) params.set("prompt", presetPrompt);
        if (prompt) params.set("prompt", prompt);

        const type = searchParams.get("type");
        if (type) params.set("type", type);

        const oracleSessionId = searchParams.get("oracleSessionId");
        if (oracleSessionId) params.set("oracleSessionId", oracleSessionId);

        router.replace(`/journal?${params.toString()}`);
    }, [searchParams, router, to]);

    return null;
}