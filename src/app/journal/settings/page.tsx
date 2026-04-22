"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { ConsentModal } from "@/components/journal/consent/consent-modal";
import { ConsentSettings } from "@/components/journal/consent/consent-settings";
import { Loader2, Shield, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function JournalSettingsPage() {
    const consent = useQuery(api.journal.consent.getConsent);
    const [showConsentModal, setShowConsentModal] = React.useState(false);

    // useQuery returns:
    //   undefined → still loading
    //   null      → loaded, no consent record (user hasn't granted or revoked)
    //   object    → loaded, consent record exists
    const isLoading = consent === undefined;
    const hasConsentRecord = consent !== null && consent !== undefined;
    const hasAccess = hasConsentRecord && consent.oracleCanReadJournal;

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-serif font-bold text-white/90">Settings</h1>
                <p className="mt-1 text-sm text-white/40">
                    Oracle consent and journal preferences
                </p>
            </div>

            {/* Oracle Consent Section */}
            <Card className="border-border/50 bg-card/50 mb-6">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-galactic/60" />
                        <div>
                            <CardTitle className="text-base">Oracle Journal Access</CardTitle>
                            <CardDescription>
                                Control how Oracle reads your journal entries to give personalized readings.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-white/30" />
                        </div>
                    ) : hasAccess ? (
                        <ConsentSettings consent={consent} />
                    ) : (
                        <div className="text-center py-6">
                            <BookOpen className="h-10 w-10 text-white/15 mx-auto mb-3" />
                            <p className="text-sm text-white/40 mb-4">
                                {hasConsentRecord
                                    ? "Oracle journal access was previously revoked. Re-enable it to receive personalized readings."
                                    : "Oracle can't read your journal yet. Enable access to receive more personalized readings."
                                }
                            </p>
                            <Button
                                variant="galactic"
                                size="sm"
                                onClick={() => setShowConsentModal(true)}
                            >
                                Enable Oracle Access
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* About section */}
            <Card className="border-border/50 bg-card/50">
                <CardHeader>
                    <CardTitle className="text-base">About Journal Data</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-white/40 space-y-2">
                    <p>
                        Your journal entries are private. Only you can read them unless you
                        explicitly grant Oracle access.
                    </p>
                    <p>
                        Oracle uses your journal context to give more personalized, emotionally aware readings.
                        It references your experiences naturally — never quoting you verbatim unless you ask.
                    </p>
                    <p>
                        You can revoke access at any time from this settings page.
                    </p>
                </CardContent>
            </Card>

            {/* Consent modal */}
            <ConsentModal
                open={showConsentModal}
                onClose={() => setShowConsentModal(false)}
            />
        </div>
    );
}