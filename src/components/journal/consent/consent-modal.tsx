"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ConsentModalProps {
    open: boolean;
    onClose: () => void;
    className?: string;
}

export function ConsentModal({ open, onClose, className }: ConsentModalProps) {
    const [includeEntryContent, setIncludeEntryContent] = React.useState(true);
    const [includeMoodData, setIncludeMoodData] = React.useState(true);
    const [includeDreamData, setIncludeDreamData] = React.useState(true);
    const [lookbackDays, setLookbackDays] = React.useState(90);
    const [isSaving, setIsSaving] = React.useState(false);

    const grantConsent = useMutation(api.journal.consent.grantConsent);

    async function handleGrant() {
        setIsSaving(true);
        try {
            await grantConsent({
                includeEntryContent,
                includeMoodData,
                includeDreamData,
                lookbackDays,
            });
            toast.success("Oracle can now read your journal");
            onClose();
        } catch (e: any) {
            toast.error(e?.message ?? "Failed to grant consent");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-galactic">✦</span>
                        Enable Oracle Journal Access
                    </DialogTitle>
                    <DialogDescription>
                        Would you like Oracle to read your journal entries to give you more
                        personalized readings? You can change this or revoke access at any time.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Granularity controls */}
                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                        <div>
                            <Label className="text-sm">Include entry text</Label>
                            <p className="text-[10px] text-white/40">Oracle can read the full content of your entries</p>
                        </div>
                        <Switch checked={includeEntryContent} onCheckedChange={setIncludeEntryContent} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                        <div>
                            <Label className="text-sm">Include mood & emotion data</Label>
                            <p className="text-[10px] text-white/40">Mood zones, emotion clusters, and intensity levels</p>
                        </div>
                        <Switch checked={includeMoodData} onCheckedChange={setIncludeMoodData} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                        <div>
                            <Label className="text-sm">Include dream data</Label>
                            <p className="text-[10px] text-white/40">Dream entries, dream signs, and emotional tone</p>
                        </div>
                        <Switch checked={includeDreamData} onCheckedChange={setIncludeDreamData} />
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

                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                        Not now
                    </Button>
                    <Button variant="galactic" onClick={handleGrant} disabled={isSaving} className="gap-2">
                        {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Allow Access
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}