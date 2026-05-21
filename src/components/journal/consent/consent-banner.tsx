"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConsentModal } from "./consent-modal";
import { Sparkles, X } from "lucide-react";

/**
 * ConsentBanner — inline consent prompt shown when a user first visits
 * the Journal and has no consent record for Oracle integration.
 *
 * Shows a warm, non-blocking banner with three options:
 * - Enable access: grants consent with default settings
 * - Customize: opens the ConsentModal with granular toggles
 * - Not now: dismisses (stored in localStorage to not re-ask immediately)
 */
export function ConsentBanner({ className }: { className?: string }) {
    const consent = useQuery(api.journal.consent.getConsent);
    const grantConsent = useMutation(api.journal.consent.grantConsent);
    const [showCustomize, setShowCustomize] = React.useState(false);
    const [isGranting, setIsGranting] = React.useState(false);
    const [dismissed, setDismissed] = React.useState(false);

    // Check localStorage for dismissed state
    React.useEffect(() => {
        const dismissedAt = localStorage.getItem("journal-consent-banner-dismissed");
        if (dismissedAt) {
            const dismissedDate = new Date(parseInt(dismissedAt, 10));
            const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            // Re-show after 7 days
            if (daysSince < 7) {
                setDismissed(true);
            }
        }
    }, []);

    // Don't render while loading, if consent already granted, or if dismissed
    if (consent === undefined || consent?.oracleCanReadJournal || dismissed) {
        return null;
    }

    // consent === null means no record exists — show the banner
    if (consent !== null) {
        // consent exists but oracleCanReadJournal is false
        // still show — they may want to enable
    }

    async function handleEnableAccess() {
        setIsGranting(true);
        try {
            await grantConsent({
                includeEntryContent: true,
                includeMoodData: true,
                includeDreamData: true,
                lookbackDays: 90,
            });
        } catch (e) {
            console.error("Failed to grant consent:", e);
        } finally {
            setIsGranting(false);
        }
    }

    function handleDismiss() {
        localStorage.setItem("journal-consent-banner-dismissed", Date.now().toString());
        setDismissed(true);
    }

    return (
        <>
            <div
                className={cn(
                    "relative rounded-xl border border-[var(--journal-accent)]/20",
                    "bg-[var(--journal-accent)]/5 p-4",
                    className
                )}
                style={{
                    "--journal-accent": "#c8a45c",
                } as React.CSSProperties}
            >
                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 text-white/25 hover:text-white/50 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-[var(--journal-accent)] shrink-0 mt-0.5" />
                    <div className="space-y-2">
                        <div className="text-sm font-serif font-semibold text-white/80">
                            Oracle + Journal
                        </div>
                        <p className="text-xs font-sans text-white/45 leading-relaxed">
                            Let Oracle read your journal entries to give you more
                            personalized readings. You control what&apos;s shared.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                            <Button
                                size="sm"
                                onClick={handleEnableAccess}
                                disabled={isGranting}
                                className="bg-[var(--journal-accent)]/80 hover:bg-[var(--journal-accent)] text-[#0f1628] text-xs font-sans"
                            >
                                {isGranting ? "Enabling..." : "Enable access"}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowCustomize(true)}
                                className="text-white/40 hover:text-white/60 text-xs font-sans"
                            >
                                Customize
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDismiss}
                                className="text-white/25 hover:text-white/40 text-xs font-sans"
                            >
                                Not now
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <ConsentModal
                open={showCustomize}
                onClose={() => setShowCustomize(false)}
            />
        </>
    );
}