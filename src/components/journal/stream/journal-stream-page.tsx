"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { QuickCapture } from "./quick-capture";
import { StreamTimeline } from "./stream-timeline";
import { StreakIndicator } from "./streak-indicator";
import { DailyPromptInline } from "./daily-prompt-inline";
import { ModeBar, type JournalTab } from "./mode-bar";
import { DetailPanel } from "@/components/journal/detail/detail-panel";
import { ConsentBanner } from "@/components/journal/consent/consent-banner";
import { CalendarTab } from "./calendar-tab";
import { SearchTab } from "./search-tab";
import { InsightsTab } from "./insights-tab";
import { useUserStore } from "@/store/use-user-store";
import {
    detectTimezone,
    getLocalHour,
    getGreetingForHour,
} from "@/lib/timezone";
import { GiScrollUnfurled } from "react-icons/gi";

/**
 * JournalStreamPage — the main unified journal page.
 * Everything lives in one view with tabs: Stream, Calendar, Search, Insights.
 * URL params control initial state: ?compose=true, ?tab=calendar, ?entry=xxx
 *
 * Detail panel opens via ?entry= param (slide-over from right).
 */
export function JournalStreamPage({ className }: { className?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useUserStore();

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

    // Timezone-aware greeting state
    const [localHour, setLocalHour] = React.useState<number>(() =>
        typeof window !== "undefined" ? getLocalHour(detectTimezone()) : 12,
    );
    const [timezone] = React.useState(detectTimezone);

    React.useEffect(() => {
        const sync = () => setLocalHour(getLocalHour(timezone));
        const id = setInterval(sync, 60_000);
        return () => clearInterval(id);
    }, [timezone]);

    const firstName = user?.username?.split(/[_\s]/)[0] ?? "Seeker";
    const greeting = getGreetingForHour(localHour, firstName);

    // Format current date: "Thursday, May 22"
    const dateStr = React.useMemo(() => {
        try {
            return new Intl.DateTimeFormat("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
            }).format(new Date());
        } catch {
            return "";
        }
    }, []);

    // Detail panel state — driven by ?entry= URL param
    const [activeEntryId, setActiveEntryId] = React.useState<string | null>(
        paramEntry || null
    );
    const [isEditingEntry, setIsEditingEntry] = React.useState(
        paramEdit || false
    );

    // QuickCapture ref for scroll/focus
    const captureRef = React.useRef<HTMLDivElement>(null);

    // Prompt text to pre-fill into QuickCapture (set when user clicks a prompt card)
    const [promptContent, setPromptContent] = React.useState<string | undefined>();

    // Handle tab change — update URL params
    function handleTabChange(tab: JournalTab) {
        setActiveTab(tab);
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
        setPromptContent(undefined);
        captureRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
            const textarea = captureRef.current?.querySelector("textarea");
            textarea?.focus();
        }, 200);
    }

    // Handle "Use prompt" from DailyPromptInline — scroll to QuickCapture and pre-fill content
    function handleUsePrompt(promptText: string) {
        setActiveTab("stream");
        setPromptContent(promptText);
        captureRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
            const textarea = captureRef.current?.querySelector("textarea");
            textarea?.focus();
        }, 200);
    }

    // Handle "Ask Oracle about this" — navigate to Oracle with journal context
    function handleAskOracle(entryId: string, contentPreview: string) {
        const params = new URLSearchParams();
        params.set("journalEntryId", entryId);
        if (contentPreview) {
            params.set("prompt", contentPreview);
        }
        router.push(`/oracle/new?${params.toString()}`);
    }

    // Handle entry click from timeline — open detail panel
    function handleEntryClick(entryId: string) {
        setActiveEntryId(entryId);
        setIsEditingEntry(false);
        // Update URL to reflect the open entry
        const url = new URL(window.location.href);
        url.searchParams.set("entry", entryId);
        url.searchParams.delete("edit");
        window.history.pushState({}, "", url.toString());
    }

    // Handle closing the detail panel
    function handleCloseDetailPanel() {
        setActiveEntryId(null);
        setIsEditingEntry(false);
        // Remove entry params from URL
        const url = new URL(window.location.href);
        url.searchParams.delete("entry");
        url.searchParams.delete("edit");
        window.history.replaceState({}, "", url.toString());
    }

    // Handle opening edit mode from detail panel
    function handleEditEntry(entryId: string) {
        setIsEditingEntry(true);
        const url = new URL(window.location.href);
        url.searchParams.set("entry", entryId);
        url.searchParams.set("edit", "true");
        window.history.replaceState({}, "", url.toString());
    }

    // Sync URL params with state on back/forward navigation
    React.useEffect(() => {
        const onPopState = () => {
            const url = new URL(window.location.href);
            const tab = url.searchParams.get("tab") as JournalTab | null;
            const entry = url.searchParams.get("entry");
            const edit = url.searchParams.get("edit") === "true";
            if (tab) setActiveTab(tab);
            setActiveEntryId(entry);
            setIsEditingEntry(edit);
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

    // Initial compose: if ?compose=true was in URL, auto-focus
    React.useEffect(() => {
        if (paramCompose) {
            handleNewEntry();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Main content area */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {/* ── Stream Tab ─────────────────────────────── */}
                {activeTab === "stream" && (
                    <div className="space-y-6">
{/* Header — warm, personalized greeting */}
                        <div className="mb-6">
                            <p className="text-2xl md:text-3xl font-serif font-bold text-[var(--journal-accent,#c8a45c)] tracking-wide leading-relaxed">
                                {greeting}
                            </p>
                            <p className="text-xs font-sans text-white/30 mt-1 tracking-wide">
                                {dateStr}
                            </p>
                        </div>

                        {/* Consent banner — shown only if user hasn't granted Oracle access */}
                        <ConsentBanner />

                        {/* Streak indicator */}
                        <StreakIndicator />

                        {/* Daily prompt (inline banner) */}
                        <DailyPromptInline onUsePrompt={handleUsePrompt} />

                        {/* QuickCapture */}
                        <div ref={captureRef}>
                            <QuickCapture
                                initialContent={promptContent ?? paramPrompt ?? undefined}
                                oracleSessionId={
                                    paramOracleSessionId || undefined
                                }
                                oracleInspired={Boolean(paramPrompt)}
                                initialType={
                                    paramType === "dream"
                                        ? "dream"
                                        : paramType === "gratitude"
                                          ? "gratitude"
                                          : undefined
                                }
                                onSave={() => {
                                    // Could show success animation
                                }}
                                onAskOracle={handleAskOracle}
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
                        <SearchTab
                            onEntryClick={(entryId) => handleEntryClick(entryId)}
                        />
                    </div>
                )}

                {/* ── Insights Tab ────────────────────────────── */}
                {activeTab === "insights" && (
                    <div className="space-y-4">
                        <div className="mb-6">
                            <h2 className="text-xl font-serif font-bold text-white/90 tracking-wide">
                                Insights
                            </h2>
                            <p className="mt-1 text-sm text-white/35 font-sans">
                                Patterns, streaks, and cosmic correlations
                            </p>
                        </div>
                        <InsightsTab />
                    </div>
                )}

                {/* ── Settings Tab ─────────────────────────────── */}
                {activeTab === "settings" && (
                    <div className="space-y-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-serif font-bold text-white/90 tracking-wide">
                                Settings
                            </h2>
                            <p className="mt-1 text-sm text-white/35 font-sans">
                                Manage journal preferences
                            </p>
                        </div>
                        <ConsentSettingsInline />
                    </div>
                )}
            </div>

            {/* Mode bar — bottom tab bar */}
            <ModeBar activeTab={activeTab} onTabChange={handleTabChange} />

            {/* Detail panel — slide-over from right */}
            <DetailPanel
                entryId={activeEntryId}
                open={activeEntryId !== null}
                onClose={handleCloseDetailPanel}
                editMode={isEditingEntry}
            />
        </div>
    );
}

/**
 * Inline consent settings for the Settings tab.
 * Reuses the existing ConsentSettings component in a non-modal layout.
 */
import { ConsentSettings } from "@/components/journal/consent/consent-settings";
import { useQuery as useConsentQuery } from "convex/react";
import { api as consentApi } from "../../../../convex/_generated/api";

function ConsentSettingsInline() {
    const consent = useConsentQuery(consentApi.journal.consent.getConsent);

    if (consent === undefined) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-white/5 rounded w-48" />
                    <div className="h-20 bg-white/5 rounded" />
                </div>
            </div>
        );
    }

    // No consent record — show prompt to enable
    if (consent === null) {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-sm font-sans uppercase tracking-[0.15em] text-white/40 mb-3">
                        Oracle Integration
                    </h3>
                    <p className="text-xs text-white/30 font-sans">
                        Enable Oracle access from the banner at the top of your journal stream.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-sm font-sans uppercase tracking-[0.15em] text-white/40 mb-3">
                    Oracle Integration
                </h3>
                <p className="text-xs text-white/30 font-sans mb-4">
                    Control what journal data Oracle can access for personalized readings.
                </p>
                <ConsentSettings consent={consent} />
            </div>

            <div className="border-t border-white/[0.06] pt-6">
                <h3 className="text-sm font-sans uppercase tracking-[0.15em] text-white/40 mb-3">
                    Data
                </h3>
                <p className="text-xs text-white/30 font-sans">
                    Export and manage your journal data coming soon.
                </p>
            </div>
        </div>
    );
}