"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, AlertTriangle, CheckCircle, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

export default function ContextEditorPage() {
    const setting = useQuery(api.admin.getSystemSetting, { key: "master_context" });
    const upsertSetting = useMutation(api.admin.upsertSystemSetting);

    const [content, setContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Sync from DB on load
    useEffect(() => {
        if (setting !== undefined && setting !== null && setting.content) {
            setContent(setting.content);
        }
    }, [setting]);

    // Track changes — handle both "no record exists" and "record exists but content differs"
    useEffect(() => {
        if (setting === undefined) return; // Still loading, don't track yet
        const savedContent = setting?.content ?? "";
        setHasUnsavedChanges(content !== savedContent && content.length > 0);
    }, [content, setting]);

    // Token estimation
    const estimatedTokens = Math.ceil(content.length / 4);
    const isTokenWarning = estimatedTokens > 6000;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await upsertSetting({ key: "master_context", content });
            toast.success("Master context saved successfully.");
            setHasUnsavedChanges(false);
        } catch (error) {
            toast.error("Failed to save context. " + (error instanceof Error ? error.message : ""));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
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

            {/* Stats Bar */}
            <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="text-xs">
                    {content.length.toLocaleString()} characters
                </Badge>
                <Badge
                    variant={isTokenWarning ? "destructive" : "outline"}
                    className="text-xs"
                >
                    ~{estimatedTokens.toLocaleString()} tokens
                </Badge>
                {isTokenWarning && (
                    <Badge variant="destructive" className="text-xs flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Prompt is becoming dense. Consider compressing to avoid Lost-in-the-Middle degradation.
                    </Badge>
                )}
                {hasUnsavedChanges && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1 text-amber-400 border-amber-400/30">
                        <AlertTriangle className="h-3 w-3" />
                        Unsaved changes
                    </Badge>
                )}
                {setting?.updatedAt && (
                    <span className="text-xs text-muted-foreground ml-auto">
                        Last saved: {new Date(setting.updatedAt).toLocaleString()}
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
                    {setting === undefined ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="min-h-[600px] font-mono text-sm leading-relaxed resize-y bg-background/50"
                            placeholder="Paste or write the master astrology context here..."
                        />
                    )}
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex items-center gap-3">
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !hasUnsavedChanges}
                    className="gap-2"
                >
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : hasUnsavedChanges ? (
                        <Save className="h-4 w-4" />
                    ) : (
                        <CheckCircle className="h-4 w-4" />
                    )}
                    {isSaving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Saved"}
                </Button>
            </div>
        </div>
    );
}
