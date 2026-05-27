"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { QuickCapture } from "@/components/journal/stream/quick-capture";
import { AstroContextStrip } from "@/components/journal/composer/astro-context-strip";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { EntryType } from "@/lib/journal/constants";

function NewJournalEntryContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const paramType = searchParams.get("type") as EntryType | null;
    const paramPrompt = searchParams.get("prompt") || searchParams.get("presetPrompt");
    const paramOracleSessionId = searchParams.get("oracleSessionId");

    // Fetch cosmic weather for the astro context strip
    const today = new Date().toISOString().split("T")[0];
    const cosmicWeather = useQuery(api.cosmicWeather.getForPublicDate, { date: today });

    const displayAstroContext = React.useMemo(() => {
        if (!cosmicWeather) return null;
        return {
            moonPhase: cosmicWeather.moonPhase.name,
            moonIllumination: cosmicWeather.moonPhase.illuminationPercent,
            moonSign: cosmicWeather.planetPositions.find((p: any) => p.planet === "Moon")?.sign,
            sunSign: cosmicWeather.planetPositions.find((p: any) => p.planet === "Sun")?.sign,
            retrogradePlanets: cosmicWeather.planetPositions
                .filter((p: any) => p.isRetrograde)
                .map((p: any) => p.planet),
        };
    }, [cosmicWeather]);

    function handleSave() {
        router.push("/journal");
    }

    function handleAskOracle(entryId: string, contentPreview: string) {
        const params = new URLSearchParams();
        params.set("journalEntryId", entryId);
        if (contentPreview) params.set("prompt", contentPreview);
        router.push(`/oracle/new?${params.toString()}`);
    }

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* ── Top bar ─────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 md:px-6 border-b border-white/[0.06] shrink-0">
                <button
                    type="button"
                    onClick={() => router.push("/journal")}
                    className="flex items-center gap-1.5 text-[var(--journal-muted)] hover:text-white/70 transition-colors text-sm font-sans"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Journal</span>
                </button>

                <div className="flex-1" />

                <p className="text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--journal-muted)]">
                    New Entry
                </p>

                <div className="flex-1" />
            </div>

            {/* ── Scrollable composer area ─────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="mx-auto w-full max-w-xl px-4 py-5 md:px-6 space-y-4">

                    {/* Astro context strip */}
                    <AstroContextStrip astroContext={displayAstroContext} />

                    {/* Full composer — no topic cards (user explicitly navigated here) */}
                    <QuickCapture
                        initialContent={paramPrompt ?? undefined}
                        oracleSessionId={paramOracleSessionId ?? undefined}
                        oracleInspired={Boolean(paramPrompt)}
                        initialType={
                            paramType === "dream" ? "dream"
                            : paramType === "gratitude" ? "gratitude"
                            : paramType === "checkin" ? "checkin"
                            : undefined
                        }
                        onSave={handleSave}
                        onAskOracle={handleAskOracle}
                        showTopics={false}
                    />
                </div>
            </div>
        </div>
    );
}

export default function NewJournalEntryPage() {
    return (
        <Suspense>
            <NewJournalEntryContent />
        </Suspense>
    );
}