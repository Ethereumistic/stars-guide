"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Save,
    AlertTriangle,
    CheckCircle,
    Loader2,
    FileText,
    Undo2,
    Eye,
    Wand2,
} from "lucide-react";
import { toast } from "sonner";

export default function ContextEditorPage() {
    const slots = useQuery(api.admin.getAllContextSlots);
    const legacySetting = useQuery(api.admin.getSystemSetting, { key: "master_context" });
    const upsertSlot = useMutation(api.admin.upsertContextSlot);
    const revertSlot = useMutation(api.admin.revertContextSlot);
    const toggleSlot = useMutation(api.admin.toggleContextSlot);
    const seedSlots = useMutation(api.admin.seedContextSlots);
    const upsertSetting = useMutation(api.admin.upsertSystemSetting);

    // Active tab (slotKey)
    const [activeTab, setActiveTab] = useState<string>("");
    const [editedContents, setEditedContents] = useState<Record<string, string>>({});
    const [savingSlots, setSavingSlots] = useState<Set<string>>(new Set());
    const [isSeeding, setIsSeeding] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    // Legacy mode state
    const [legacyContent, setLegacyContent] = useState("");
    const [legacyHasChanges, setLegacyHasChanges] = useState(false);
    const [isSavingLegacy, setIsSavingLegacy] = useState(false);

    const isSlotMode = slots !== undefined && slots.length > 0;

    // Set initial active tab when slots load
    useEffect(() => {
        if (slots && slots.length > 0 && !activeTab) {
            setActiveTab(slots[0].slotKey);
        }
    }, [slots, activeTab]);

    // Initialize edited contents from DB
    useEffect(() => {
        if (slots) {
            const initial: Record<string, string> = {};
            for (const slot of slots) {
                if (!(slot.slotKey in editedContents)) {
                    initial[slot.slotKey] = slot.content;
                }
            }
            if (Object.keys(initial).length > 0) {
                setEditedContents((prev) => ({ ...prev, ...initial }));
            }
        }
    }, [slots]);

    // Legacy content sync
    useEffect(() => {
        if (legacySetting !== undefined && legacySetting !== null && legacySetting.content) {
            setLegacyContent(legacySetting.content);
        }
    }, [legacySetting]);

    useEffect(() => {
        if (legacySetting === undefined) return;
        const savedContent = legacySetting?.content ?? "";
        setLegacyHasChanges(legacyContent !== savedContent && legacyContent.length > 0);
    }, [legacyContent, legacySetting]);

    const activeSlot = slots?.find((s) => s.slotKey === activeTab);
    const activeContent = activeTab ? (editedContents[activeTab] ?? activeSlot?.content ?? "") : "";

    const hasUnsavedChanges = useMemo(() => {
        if (!slots) return false;
        return slots.some((s) => editedContents[s.slotKey] !== undefined && editedContents[s.slotKey] !== s.content);
    }, [slots, editedContents]);

    // Token estimation
    const getSlotTokens = (content: string) => Math.ceil(content.length / 4);
    const getTotalTokens = useMemo(() => {
        if (!slots) return 0;
        return slots.reduce((sum, s) => {
            const content = editedContents[s.slotKey] ?? s.content;
            return sum + getSlotTokens(content);
        }, 0);
    }, [slots, editedContents]);

    // Preview assembled prompt
    const assembledPreview = useMemo(() => {
        if (!slots) return "";
        return slots
            .filter((s) => s.isEnabled)
            .map((s) => `## ${s.label}\n\n${editedContents[s.slotKey] ?? s.content}`)
            .join("\n\n---\n\n");
    }, [slots, editedContents]);

    const handleSaveSlot = async (slotKey: string) => {
        const content = editedContents[slotKey];
        if (content === undefined) return;

        setSavingSlots((prev) => new Set(prev).add(slotKey));
        try {
            await upsertSlot({ slotKey, content });
            toast.success(`"${slots?.find((s) => s.slotKey === slotKey)?.label}" saved.`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to save slot.");
        } finally {
            setSavingSlots((prev) => {
                const next = new Set(prev);
                next.delete(slotKey);
                return next;
            });
        }
    };

    const handleRevert = async (slotKey: string) => {
        try {
            await revertSlot({ slotKey });
            toast.success("Reverted to previous version.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to revert.");
        }
    };

    const handleToggle = async (slotKey: string) => {
        try {
            await toggleSlot({ slotKey });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to toggle.");
        }
    };

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            const result = await seedSlots();
            if (result.status === "skipped") {
                toast.info(result.message);
            } else {
                toast.success(result.message);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to seed slots.");
        } finally {
            setIsSeeding(false);
        }
    };

    const handleSaveLegacy = async () => {
        setIsSavingLegacy(true);
        try {
            await upsertSetting({ key: "master_context", content: legacyContent });
            toast.success("Master context saved successfully.");
            setLegacyHasChanges(false);
        } catch (error) {
            toast.error("Failed to save context. " + (error instanceof Error ? error.message : ""));
        } finally {
            setIsSavingLegacy(false);
        }
    };

    // ─── Slot Mode UI ───
    if (isSlotMode) {
        return (
            <div className="space-y-6 max-w-4xl">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-serif font-bold tracking-tight flex items-center gap-2">
                            <FileText className="h-6 w-6 text-primary" />
                            Context Editor
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Edit system prompt sections independently. Each slot is versioned with one-click undo.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewOpen(true)}
                        className="gap-1"
                    >
                        <Eye className="h-3 w-3" /> Preview Assembled
                    </Button>
                </div>

                {/* Stats Bar */}
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                        {slots.length} slots
                    </Badge>
                    <Badge variant={getTotalTokens > 6000 ? "destructive" : "outline"} className="text-xs">
                        ~{getTotalTokens.toLocaleString()} tokens total
                    </Badge>
                    {getTotalTokens > 6000 && (
                        <Badge variant="destructive" className="text-xs flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Prompt density warning
                        </Badge>
                    )}
                    {hasUnsavedChanges && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1 text-amber-400 border-amber-400/30">
                            <AlertTriangle className="h-3 w-3" />
                            Unsaved changes
                        </Badge>
                    )}
                </div>

                {/* Tab Bar */}
                <div className="flex gap-1 border-b border-border/30 pb-0">
                    {slots.map((slot) => {
                        const isUnsaved = editedContents[slot.slotKey] !== undefined && editedContents[slot.slotKey] !== slot.content;
                        const tokenWarning = getSlotTokens(editedContents[slot.slotKey] ?? slot.content) > 1500;
                        return (
                            <button
                                key={slot.slotKey}
                                onClick={() => setActiveTab(slot.slotKey)}
                                className={`relative px-4 py-2 text-sm font-medium transition-colors rounded-t-md ${
                                    activeTab === slot.slotKey
                                        ? "text-primary bg-card/80 border border-border/30 border-b-transparent"
                                        : "text-muted-foreground hover:text-foreground"
                                } ${!slot.isEnabled ? "opacity-40" : ""}`}
                            >
                                {slot.label}
                                {!slot.isEnabled && (
                                    <span className="ml-1 text-xs">(off)</span>
                                )}
                                {isUnsaved && (
                                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400" />
                                )}
                                {tokenWarning && (
                                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-400" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Active Slot Editor */}
                {activeSlot && (
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">{activeSlot.label}</CardTitle>
                                    <CardDescription className="text-xs mt-1">
                                        v{activeSlot.version} · {getSlotTokens(editedContents[activeSlot.slotKey] ?? activeSlot.content).toLocaleString()} tokens
                                        {activeSlot.updatedAt && ` · Last saved: ${new Date(activeSlot.updatedAt).toLocaleString()}`}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Revert Button */}
                                    {activeSlot.previousContent && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRevert(activeSlot.slotKey)}
                                            className="gap-1 text-xs"
                                        >
                                            <Undo2 className="h-3 w-3" />
                                            Revert to v{activeSlot.version - 1}
                                        </Button>
                                    )}
                                    {/* Enable/Disable Toggle */}
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs text-muted-foreground">Enabled</Label>
                                        <Switch
                                            checked={activeSlot.isEnabled}
                                            onCheckedChange={() => handleToggle(activeSlot.slotKey)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={editedContents[activeSlot.slotKey] ?? activeSlot.content}
                                onChange={(e) =>
                                    setEditedContents((prev) => ({
                                        ...prev,
                                        [activeSlot.slotKey]: e.target.value,
                                    }))
                                }
                                className="min-h-[300px] font-mono text-sm leading-relaxed resize-y bg-background/50"
                            />
                            <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant={
                                            getSlotTokens(editedContents[activeSlot.slotKey] ?? activeSlot.content) > 1500
                                                ? "destructive"
                                                : "outline"
                                        }
                                        className="text-xs"
                                    >
                                        {getSlotTokens(editedContents[activeSlot.slotKey] ?? activeSlot.content).toLocaleString()} / 1,500 tokens
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                        {(editedContents[activeSlot.slotKey] ?? activeSlot.content).length.toLocaleString()} chars
                                    </Badge>
                                </div>
                                <Button
                                    onClick={() => handleSaveSlot(activeSlot.slotKey)}
                                    disabled={savingSlots.has(activeSlot.slotKey) || !hasUnsavedChanges}
                                    size="sm"
                                    className="gap-1"
                                >
                                    {savingSlots.has(activeSlot.slotKey) ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : hasUnsavedChanges ? (
                                        <Save className="h-3 w-3" />
                                    ) : (
                                        <CheckCircle className="h-3 w-3" />
                                    )}
                                    {savingSlots.has(activeSlot.slotKey) ? "Saving..." : hasUnsavedChanges ? "Save" : "Saved"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Preview Dialog */}
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Assembled System Prompt</DialogTitle>
                            <DialogDescription>
                                This is the full system prompt that will be sent to the LLM. Only enabled slots are included.
                            </DialogDescription>
                        </DialogHeader>
                        <pre className="text-sm font-mono whitespace-pre-wrap bg-muted/50 p-4 rounded-lg border border-border/30">
                            {assembledPreview}
                        </pre>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // ─── Legacy Mode (no slots seeded yet) ───
    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-serif font-bold tracking-tight flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    Context Editor
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Edit the master astrology system prompt. This is injected as the{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">system</code> message
                    for every LLM generation call.
                </p>
            </div>

            {/* Migration Banner */}
            <Card className="border-purple-500/30 bg-purple-500/5">
                <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-purple-300">
                                Upgrade to Context Slots
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Split your master context into independently versioned sections with one-click undo.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleSeed}
                            disabled={isSeeding}
                            className="gap-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                        >
                            {isSeeding ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Wand2 className="h-4 w-4" />
                            )}
                            {isSeeding ? "Seeding..." : "Seed Context Slots"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Bar */}
            <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="text-xs">
                    {legacyContent.length.toLocaleString()} characters
                </Badge>
                <Badge
                    variant={Math.ceil(legacyContent.length / 4) > 6000 ? "destructive" : "outline"}
                    className="text-xs"
                >
                    ~{Math.ceil(legacyContent.length / 4).toLocaleString()} tokens
                </Badge>
                {legacyHasChanges && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1 text-amber-400 border-amber-400/30">
                        <AlertTriangle className="h-3 w-3" />
                        Unsaved changes
                    </Badge>
                )}
                {legacySetting?.updatedAt && (
                    <span className="text-xs text-muted-foreground ml-auto">
                        Last saved: {new Date(legacySetting.updatedAt).toLocaleString()}
                    </span>
                )}
            </div>

            {/* Editor */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">master-astrology-context.md</CardTitle>
                    <CardDescription>
                        The complete system prompt sent to the LLM. Keep it under 6,000 tokens for optimal performance.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {legacySetting === undefined ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Textarea
                            value={legacyContent}
                            onChange={(e) => setLegacyContent(e.target.value)}
                            className="min-h-[600px] font-mono text-sm leading-relaxed resize-y bg-background/50"
                            placeholder="Paste or write the master astrology context here..."
                        />
                    )}
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex items-center gap-3">
                <Button
                    onClick={handleSaveLegacy}
                    disabled={isSavingLegacy || !legacyHasChanges}
                    className="gap-2"
                >
                    {isSavingLegacy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : legacyHasChanges ? (
                        <Save className="h-4 w-4" />
                    ) : (
                        <CheckCircle className="h-4 w-4" />
                    )}
                    {isSavingLegacy ? "Saving..." : legacyHasChanges ? "Save Changes" : "Saved"}
                </Button>
            </div>
        </div>
    );
}
