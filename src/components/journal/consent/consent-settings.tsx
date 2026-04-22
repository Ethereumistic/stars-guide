"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ConsentSettingsProps {
    consent: any;
    className?: string;
}

export function ConsentSettings({ consent, className }: ConsentSettingsProps) {
    const [includeEntryContent, setIncludeEntryContent] = React.useState(consent.includeEntryContent);
    const [includeMoodData, setIncludeMoodData] = React.useState(consent.includeMoodData);
    const [includeDreamData, setIncludeDreamData] = React.useState(consent.includeDreamData);
    const [lookbackDays, setLookbackDays] = React.useState(consent.lookbackDays);
    const [showRevokeDialog, setShowRevokeDialog] = React.useState(false);

    const updateGranularity = useMutation(api.journal.consent.updateConsentGranularity);
    const revokeConsent = useMutation(api.journal.consent.revokeConsent);
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [isRevoking, setIsRevoking] = React.useState(false);

    async function handleSaveGranularity() {
        setIsUpdating(true);
        try {
            await updateGranularity({
                includeEntryContent,
                includeMoodData,
                includeDreamData,
                lookbackDays,
            });
            toast.success("Consent settings updated");
        } catch (e: any) {
            toast.error(e?.message ?? "Failed to update settings");
        } finally {
            setIsUpdating(false);
        }
    }

    async function handleRevoke() {
        setIsRevoking(true);
        try {
            await revokeConsent();
            toast.success("Oracle journal access revoked");
        } catch (e: any) {
            toast.error(e?.message ?? "Failed to revoke access");
        } finally {
            setIsRevoking(false);
            setShowRevokeDialog(false);
        }
    }

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center gap-2 text-sm text-emerald-400/80 mb-4">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Oracle has access to your journal
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                    <div>
                        <Label className="text-sm">Include entry text</Label>
                        <p className="text-[10px] text-white/40">Oracle can read the full content of your entries</p>
                    </div>
                    <Switch
                        checked={includeEntryContent}
                        onCheckedChange={(v) => { setIncludeEntryContent(v); }}
                    />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                    <div>
                        <Label className="text-sm">Include mood & emotion data</Label>
                        <p className="text-[10px] text-white/40">Mood zones, emotion clusters, and intensity levels</p>
                    </div>
                    <Switch
                        checked={includeMoodData}
                        onCheckedChange={(v) => { setIncludeMoodData(v); }}
                    />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                    <div>
                        <Label className="text-sm">Include dream data</Label>
                        <p className="text-[10px] text-white/40">Dream entries, dream signs, and emotional tone</p>
                    </div>
                    <Switch
                        checked={includeDreamData}
                        onCheckedChange={(v) => { setIncludeDreamData(v); }}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-sm">Lookback window</Label>
                    <p className="text-[10px] text-white/40">How far back Oracle can see your entries</p>
                    <div className="flex gap-2">
                        {[
                            { value: 30, label: "30 days" },
                            { value: 90, label: "90 days" },
                            { value: 365, label: "1 year" },
                            { value: 9999, label: "All time" },
                        ].map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setLookbackDays(option.value)}
                                className={cn(
                                    "flex-1 rounded-lg border px-3 py-1.5 text-xs transition-all",
                                    lookbackDays === option.value
                                        ? "border-galactic/40 bg-galactic/10 text-white"
                                        : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10",
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
                <Button
                    variant="galactic"
                    size="sm"
                    onClick={handleSaveGranularity}
                    disabled={isUpdating}
                >
                    {isUpdating ? "Saving..." : "Save Settings"}
                </Button>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowRevokeDialog(true)}
                    className="ml-auto"
                >
                    Revoke Access
                </Button>
            </div>

            {/* Revoke confirmation dialog */}
            <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Revoke Oracle Access?</DialogTitle>
                        <DialogDescription>
                            Oracle will no longer be able to read your journal entries. Your
                            past readings will not be affected. You can re-enable access at any time.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleRevoke} disabled={isRevoking}>
                            {isRevoking ? "Revoking..." : "Revoke Access"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}