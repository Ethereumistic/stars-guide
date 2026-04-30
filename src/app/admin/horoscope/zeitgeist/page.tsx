"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Globe,
    Plus,
    X,
    Sparkles,
    Loader2,
    AlertTriangle,
    History,
    PenLine,
    Bot,
    Heart,
    RefreshCw,
    ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

// Model options — same list as the Generation Desk for consistency
const MODEL_OPTIONS = [
    { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast", provider: "xAI" },
    { id: "x-ai/grok-4.1", name: "Grok 4.1", provider: "xAI" },
    { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", provider: "Google" },
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google" },
    { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic" },
    { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "OpenAI" },
    { id: "arcee-ai/trinity-large-preview:free", name: "Trinity Large Preview", provider: "Arcee AI" },
];

// Suspicious patterns for prompt injection defense (warn, don't block)
const SUSPICIOUS_PATTERNS = [
    /ignore previous/i,
    /forget your instructions/i,
    /output the system prompt/i,
    /disregard all/i,
    /new instructions/i,
];

export default function ZeitgeistPage() {
    const zeitgeists = useQuery(api.admin.getZeitgeists);
    const createZeitgeist = useMutation(api.admin.createZeitgeist);
    const synthesize = useAction(api.admin.synthesizeZeitgeistAction);
    const synthesizeEmotional = useAction(api.admin.synthesizeEmotionalZeitgeistAction);

    const [isManual, setIsManual] = useState(false);
    const [title, setTitle] = useState("");
    const [manualSummary, setManualSummary] = useState("");
    const [archetypes, setArchetypes] = useState<string[]>([""]);
    const [aiSummary, setAiSummary] = useState("");
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0].id);

    // v3: Emotional Translation Layer
    const [emotionalTranslation, setEmotionalTranslation] = useState("");
    const [isTranslating, setIsTranslating] = useState(false);
    const [skipTranslation, setSkipTranslation] = useState(false);

    // Prompt injection warning
    const summaryText = isManual ? manualSummary : (emotionalTranslation || aiSummary);
    const hasSuspiciousPattern = SUSPICIOUS_PATTERNS.some((p) => p.test(summaryText));

    const addArchetype = () => {
        if (archetypes.length < 7) {
            setArchetypes([...archetypes, ""]);
        }
    };

    const removeArchetype = (index: number) => {
        setArchetypes(archetypes.filter((_, i) => i !== index));
    };

    const updateArchetype = (index: number, value: string) => {
        const updated = [...archetypes];
        updated[index] = value;
        setArchetypes(updated);
    };

    const handleSynthesize = async () => {
        const validArchetypes = archetypes.filter((a) => a.trim());
        if (validArchetypes.length === 0) {
            toast.error("Add at least one world event to synthesize.");
            return;
        }

        setIsSynthesizing(true);
        try {
            const result = await synthesize({
                archetypes: validArchetypes,
                modelId: selectedModel,
            });
            setAiSummary(result);
            toast.success("Synthesis complete!");

            // v3: Auto-translate to emotional zeitgeist unless skip is checked
            if (!skipTranslation) {
                await handleEmotionalTranslation(result);
            }
        } catch (error) {
            toast.error("Synthesis failed. " + (error instanceof Error ? error.message : ""));
        } finally {
            setIsSynthesizing(false);
        }
    };

    // v3: Emotional Translation
    const handleEmotionalTranslation = async (rawText?: string) => {
        const textToTranslate = rawText || aiSummary;
        if (!textToTranslate.trim()) {
            toast.error("No summary to translate. Synthesize first.");
            return;
        }

        setIsTranslating(true);
        try {
            const result = await synthesizeEmotional({
                rawEvents: textToTranslate,
                modelId: selectedModel,
            });
            setEmotionalTranslation(result);
            toast.success("Emotional translation generated!");
        } catch (error) {
            toast.error("Translation failed. " + (error instanceof Error ? error.message : ""));
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error("Please enter a title for this Zeitgeist.");
            return;
        }

        // v3: Use emotional translation if available, fallback to raw summary
        const summary = isManual
            ? manualSummary
            : (skipTranslation ? aiSummary : (emotionalTranslation || aiSummary));

        if (!summary.trim()) {
            toast.error("Please provide a summary (write one manually or synthesize via AI).");
            return;
        }

        setIsSaving(true);
        try {
            await createZeitgeist({
                title: title.trim(),
                isManual,
                archetypes: isManual ? undefined : archetypes.filter((a) => a.trim()),
                summary: summary.trim(),
            });
            toast.success("Zeitgeist saved successfully.");
            // Reset form
            setTitle("");
            setManualSummary("");
            setAiSummary("");
            setEmotionalTranslation("");
            setArchetypes([""]);
        } catch (error) {
            toast.error("Failed to save. " + (error instanceof Error ? error.message : ""));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 max-w-5xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-serif font-bold tracking-tight flex items-center gap-2">
                    <Globe className="h-6 w-6 text-primary" />
                    Zeitgeist Engine
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Define the current world vibe that shapes horoscope generation.
                    v3 adds an Emotional Translation Layer that converts raw events into felt emotional states.
                </p>
            </div>

            {/* Mode Toggle */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base">Creation Mode</CardTitle>
                            <CardDescription>
                                {isManual
                                    ? "Write the Zeitgeist summary directly for instant control."
                                    : "Input world events and let AI synthesize + emotionally translate."}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <Label htmlFor="mode-toggle" className="text-xs text-muted-foreground flex items-center gap-1">
                                <Bot className="h-3 w-3" /> AI Synthesis
                            </Label>
                            <Switch
                                id="mode-toggle"
                                checked={isManual}
                                onCheckedChange={setIsManual}
                            />
                            <Label htmlFor="mode-toggle" className="text-xs text-muted-foreground flex items-center gap-1">
                                <PenLine className="h-3 w-3" /> Manual
                            </Label>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Title */}
            <div className="space-y-2">
                <Label htmlFor="zeitgeist-title" className="text-sm font-medium">
                    Zeitgeist Title
                </Label>
                <Input
                    id="zeitgeist-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder='e.g., "Week of March 10 — Economic Uncertainty & AI Disruption"'
                    className="bg-background/50"
                />
            </div>

            {/* Manual Mode */}
            {isManual ? (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <PenLine className="h-4 w-4" />
                            Manual Override
                        </CardTitle>
                        <CardDescription>
                            Write the world vibe summary directly. This should already be emotionally framed —
                            describe how people FEEL, not what happened in the news.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={manualSummary}
                            onChange={(e) => setManualSummary(e.target.value)}
                            className="min-h-[200px] font-mono text-sm bg-background/50"
                            placeholder='e.g., "There is a widespread, low-grade anxiety about professional stability right now. A lot of people are quietly asking *is my position safe?* even when nothing concrete has happened..."'
                        />
                    </CardContent>
                </Card>
            ) : (
                /* AI Synthesis Mode — Two-Panel */
                <div className="space-y-6">
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Bot className="h-4 w-4" />
                                AI Synthesis
                            </CardTitle>
                            <CardDescription>
                                Input 3-7 primary archetypal world events. The AI will synthesize them into a psychological baseline,
                                then translate it into an emotional state.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Model Selector */}
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">LLM Model</Label>
                                <Select value={selectedModel} onValueChange={setSelectedModel}>
                                    <SelectTrigger className="bg-background/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MODEL_OPTIONS.map((model) => (
                                            <SelectItem key={model.id} value={model.id}>
                                                <div className="flex items-center gap-2">
                                                    <span>{model.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {model.provider}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Archetypes */}
                            <div className="space-y-3">
                                {archetypes.map((archetype, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs shrink-0 w-6 justify-center">
                                            {index + 1}
                                        </Badge>
                                        <Input
                                            value={archetype}
                                            onChange={(e) => updateArchetype(index, e.target.value)}
                                            placeholder={`e.g., "massive tech layoffs", "oil price surge", "AI regulation debates"`}
                                            className="bg-background/50"
                                        />
                                        {archetypes.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeArchetype(index)}
                                                className="shrink-0 h-8 w-8"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                {archetypes.length < 7 && (
                                    <Button variant="outline" size="sm" onClick={addArchetype} className="gap-1">
                                        <Plus className="h-3 w-3" /> Add Event
                                    </Button>
                                )}
                                <Button
                                    onClick={handleSynthesize}
                                    disabled={isSynthesizing || archetypes.every((a) => !a.trim())}
                                    size="sm"
                                    className="gap-1"
                                >
                                    {isSynthesizing ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-3 w-3" />
                                    )}
                                    {isSynthesizing ? "Synthesizing..." : "Synthesize & Translate"}
                                </Button>
                            </div>

                            {/* Skip Translation Checkbox */}
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border border-border/30">
                                <Checkbox
                                    id="skip-translation"
                                    checked={skipTranslation}
                                    onCheckedChange={(checked) => setSkipTranslation(checked as boolean)}
                                />
                                <Label htmlFor="skip-translation" className="text-xs text-muted-foreground cursor-pointer">
                                    Skip emotional translation (use raw synthesis directly)
                                </Label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* v3: Two-Panel Display */}
                    {(aiSummary || emotionalTranslation) && (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {/* Left Panel: Raw Summary */}
                            {aiSummary && (
                                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Bot className="h-4 w-4 text-blue-400" />
                                            Raw Psychological Summary
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            What the AI synthesized from your events
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Textarea
                                            value={aiSummary}
                                            onChange={(e) => setAiSummary(e.target.value)}
                                            className="font-mono text-sm min-h-[120px] bg-background/50 resize-y"
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {/* Right Panel: Emotional Translation */}
                            {!skipTranslation && (
                                <Card className={`border-border/50 backdrop-blur-sm ${emotionalTranslation ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card/50"
                                    }`}>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <Heart className="h-4 w-4 text-rose-400" />
                                                    Emotional Translation
                                                    {emotionalTranslation && (
                                                        <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">
                                                            Active
                                                        </Badge>
                                                    )}
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    How people are FEELING — this goes into the prompt
                                                </CardDescription>
                                            </div>
                                            {aiSummary && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEmotionalTranslation()}
                                                    disabled={isTranslating}
                                                    className="gap-1 text-xs"
                                                >
                                                    {isTranslating ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="h-3 w-3" />
                                                    )}
                                                    {isTranslating ? "Translating..." : "Regenerate"}
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {emotionalTranslation ? (
                                            <Textarea
                                                value={emotionalTranslation}
                                                onChange={(e) => setEmotionalTranslation(e.target.value)}
                                                className="font-mono text-sm min-h-[120px] bg-transparent border-0 p-0 resize-y focus-visible:ring-0"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
                                                {isTranslating ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Translating to felt emotional state...
                                                    </>
                                                ) : (
                                                    <>
                                                        <ArrowRight className="h-4 w-4" />
                                                        Will be generated after synthesis
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Prompt Injection Warning */}
            {hasSuspiciousPattern && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <div className="text-sm text-amber-400">
                        <strong>Warning:</strong> Suspicious pattern detected in Zeitgeist text
                        (e.g., &quot;ignore previous instructions&quot;). This text is placed in the user message
                        to reduce prompt injection risk, but please review carefully before saving.
                    </div>
                </div>
            )}

            {/* Save */}
            <Button
                onClick={handleSave}
                disabled={isSaving || !title.trim() || !summaryText.trim()}
                className="gap-2"
            >
                {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Globe className="h-4 w-4" />
                )}
                {isSaving ? "Saving..." : "Save Zeitgeist"}
            </Button>

            {/* History */}
            <div className="pt-4 border-t border-border/30">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <History className="h-4 w-4" />
                    Recent Zeitgeists
                </h2>
                {zeitgeists === undefined ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : zeitgeists.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No zeitgeists created yet.</p>
                ) : (
                    <div className="space-y-3">
                        {zeitgeists.slice(0, 10).map((z) => (
                            <Card key={z._id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                                <CardContent className="py-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-medium truncate">{z.title}</p>
                                                <Badge variant="outline" className="text-xs shrink-0">
                                                    {z.isManual ? "Manual" : "AI"}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {z.summary}
                                            </p>
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0">
                                            {new Date(z.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
