"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { QuickCapture } from "./quick-capture";
import { StreamTimeline } from "./stream-timeline";
import { StreakIndicator } from "./streak-indicator";
import { DailyPromptInline } from "./daily-prompt-inline";
import { ModeBar, type JournalTab } from "./mode-bar";
import { GiScrollUnfurled } from "react-icons/gi";

// Calendar/Search/Stats/Settings components (existing ones, adapted)
import { CalendarTab } from "./calendar-tab";
import { SearchTab } from "./search-tab";

/**
 * JournalStreamPage — the main unified journal page.
 * Everything lives in one view with tabs: Stream, Calendar, Search, Insights.
 * URL params control initial state: ?compose=true, ?tab=calendar, ?entry=xxx
 */
export function JournalStreamPage({ className }: { className?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Read URL params for initial state
    const paramTab = searchParams.get("tab") as JournalTab | null;
    const paramCompose = searchParams.get("compose") === "true";
    const paramEntry = searchParams.get("entry");
    const paramEdit = searchParams.get("edit") === "true";
    const paramPrompt = searchParams.get("prompt") || searchParams.get("presetPrompt");
    const paramType = searchParams.get("type");
    const paramOracleSessionId = searchParams.get("oracleSessionId");

    // Local state for active tab
    const [activeTab, setActiveTab] = React.useState<JournalTab>(
        paramTab || "stream"
    );

    // QuickCapture ref for scroll/focus
    const captureRef = React.useRef<HTMLDivElement>(null);

    // Handle tab change — update URL params
    function handleTabChange(tab: JournalTab) {
        setActiveTab(tab);
        // Update URL without full navigation
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        // Remove transient params when switching tabs
        url.searchParams.delete("compose");
        url.searchParams.delete("entry");
        url.searchParams.delete("edit");
        window.history.replaceState({}, "", url.toString());
    }

    // Handle "New Entry" button — scroll to QuickCapture and focus
    function handleNewEntry() {
        setActiveTab("stream");
        // Scroll to capture area
        captureRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        // Focus the textarea
        setTimeout(() => {
            const textarea = captureRef.current?.querySelector("textarea");
            textarea?.focus();
        }, 200);
    }

    // Handle "Use prompt" from DailyPromptInline
    function handleUsePrompt(promptText: string) {
        handleNewEntry();
        // The QuickCapture will need the prompt — we handle this via URL params or state
    }

    // Handle entry click from timeline — open detail panel (Phase 2)
    function handleEntryClick(entryId: string) {
        const url = new URL(window.location.href);
        url.searchParams.set("entry", entryId);
        window.history.pushState({}, "", url.toString());
        // TODO: Open detail panel (Phase 2)
        // For now, navigate to the old detail page
        router.push(`/journal/${entryId}`);
    }

    // Initial compose: if ?compose=true was in URL, auto-focus
    React.useEffect(() => {
        if (paramCompose) {
            handleNewEntry();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Main content area */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {/* ── Stream Tab ─────────────────────────────── */}
                {activeTab === "stream" && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-1">
                                <GiScrollUnfurled className="h-4 w-4 text-galactic/60" />
                                <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-galactic/50">
                                    Your Cosmic Diary
                                </span>
                            </div>
                            <h1 className="text-2xl font-serif font-bold text-white/90 tracking-wide">
                                Journal
                            </h1>
                        </div>

                        {/* Streak indicator */}
                        <StreakIndicator />

                        {/* Daily prompt (inline banner) */}
                        <DailyPromptInline onUsePrompt={handleUsePrompt} />

                        {/* QuickCapture */}
                        <div ref={captureRef}>
                            <QuickCapture
                                initialContent={paramPrompt || undefined}
                                oracleSessionId={paramOracleSessionId || undefined}
                                oracleInspired={Boolean(paramPrompt)}
                                initialType={paramType === "dream" ? "dream" : paramType === "gratitude" ? "gratitude" : undefined}
                                onSave={() => {
                                    // Optional: could show a success animation
                                }}
                            />
                        </div>

                        {/* Timeline */}
                        <StreamTimeline onEntryClick={handleEntryClick} />
                    </div>
                )}

                {/* ── Calendar Tab ────────────────────────────── */}
                {activeTab === "calendar" && (
                    <div className="space-y-4">
                        <div className="mb-4">
                            <h2 className="text-xl font-serif font-bold text-white/90 tracking-wide">
                                Calendar
                            </h2>
                            <p className="mt-1 text-sm text-white/35 font-sans">
                                View entries by date
                            </p>
                        </div>
                        <CalendarTab
                            onEntryClick={(entryId) => handleEntryClick(entryId)}
                        />
                    </div>
                )}

                {/* ── Search Tab ─────────────────────────────── */}
                {activeTab === "search" && (
                    <div className="space-y-4">
                        <div className="mb-4">
                            <h2 className="text-xl font-serif font-bold text-white/90 tracking-wide">
                                Search
                            </h2>
                            <p className="mt-1 text-sm text-white/35 font-sans">
                                Find entries by keyword, mood, or tag
                            </p>
                        </div>
                        <SearchTab onEntryClick={(entryId) => handleEntryClick(entryId)} />
                    </div>
                )}

                {/* ── Insights Tab ────────────────────────────── */}
                {activeTab === "insights" && (
                    <div>
                        <div className="mb-6">
                            <h2 className="text-xl font-serif font-bold text-white/90 tracking-wide">
                                Insights
                            </h2>
                            <p className="mt-1 text-sm text-white/35 font-sans">
                                Patterns, streaks, and cosmic correlations
                            </p>
                        </div>
                        {/* TODO: Integrate stats components */}
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <GiScrollUnfurled className="h-10 w-10 text-white/10 mb-4" />
                            <p className="text-sm font-serif text-white/30">
                                Insights coming soon
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Settings Tab ─────────────────────────────── */}
                {activeTab === "settings" && (
                    <div>
                        <div className="mb-6">
                            <h2 className="text-xl font-serif font-bold text-white/90 tracking-wide">
                                Settings
                            </h2>
                            <p className="mt-1 text-sm text-white/35 font-sans">
                                Manage journal preferences
                            </p>
                        </div>
                        {/* TODO: Integrate consent settings */}
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <GiScrollUnfurled className="h-10 w-10 text-white/10 mb-4" />
                            <p className="text-sm font-serif text-white/30">
                                Settings coming soon
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Mode bar — bottom tab bar */}
            <ModeBar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
    );
}