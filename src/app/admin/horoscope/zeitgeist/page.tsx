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
import { HoroscopeModelSelector } from "@/components/horoscope-admin/model-selector";
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
    CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
    const [selectedModel, setSelectedModel] = useState("google/gemini-2.5-flash");
    const [selectedProviderId, setSelectedProviderId] = useState("openrouter");

    // v3: Emotional Translation Layer
    const [emotionalTranslation, setEmotionalTranslation] = useState("");
    const [isTranslating, setIsTranslating] = useState(false);
    const [skipTranslation, setSkipTranslation] = useState(false);

    // v4: Emotional register
    const [emotionalRegister, setEmotionalRegister] = useState<string[]>([]);

    const EMOTIONAL_REGISTER_OPTIONS = [
        "anxious", "expansive", "tender", "defiant",
        "restless", "hopeful", "grief", "clarity",
    ];

    // v4: Freshness window
    const [validFrom, setValidFrom] = useState(format(new Date(), "yyyy-MM-dd"));
    const [validUntil, setValidUntil] = useState(format(addDays(new Date(), 6), "yyyy-MM-dd"));

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
                providerId: selectedProviderId,
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
                providerId: selectedProviderId,
            });

            // v4: Parse JSON response with translation + emotional register
            try {
                const parsed = JSON.parse(result);
                if (parsed.translation) {
                    setEmotionalTranslation(parsed.translation);
                }
                if (parsed.emotionalRegister) {
                    setEmotionalRegister(parsed.emotionalRegister.split(","));
                }
            } catch {
                // Fallback: treat as plain text (backward compat)
                setEmotionalTranslation(result);
            }

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
                validFrom,
                validUntil,
                emotionalRegister: emotionalRegister.length > 0 ? emotionalRegister.join(",") : undefined,
            });
            toast.success("Zeitgeist saved successfully.");
            // Reset form
            setTitle("");
            setManualSummary("");
            setAiSummary("");
            setEmotionalTranslation("");
            setEmotionalRegister([]);
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

            {/* v4: Validity Window */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Validity Window
                    </CardTitle>
                    <CardDescription>
                        Define when this zeitgeist is relevant. Used to warn if target dates fall outside this range.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Valid From</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-background/50">
                                        <CalendarDays className="mr-2 h-4 w-4" />
                                        {validFrom}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={new Date(validFrom)}
                                        onSelect={(d) => d && setValidFrom(format(d, "yyyy-MM-dd"))}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Valid Until</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-background/50">
                                        <CalendarDays className="mr-2 h-4 w-4" />
                                        {validUntil}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={new Date(validUntil)}
                                        onSelect={(d) => d && setValidUntil(format(d, "yyyy-MM-dd"))}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </CardContent>
            </Card>

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
                                <HoroscopeModelSelector
                                    providerId={selectedProviderId}
                                    modelId={selectedModel}
                                    onProviderChange={setSelectedProviderId}
                                    onModelChange={setSelectedModel}
                                    showProvider={true}
                                />
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

            {/* v4: Emotional Register Override */}
            {emotionalTranslation && !isManual && (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Heart className="h-4 w-4 text-rose-400" />
                            Emotional Register
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Auto-detected from the emotional translation. Adjust if needed — this is used for hook selection during generation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {EMOTIONAL_REGISTER_OPTIONS.map((reg) => (
                                <button
                                    key={reg}
                                    onClick={() => {
                                        setEmotionalRegister((prev) =>
                                            prev.includes(reg)
                                                ? prev.filter((r) => r !== reg)
                                                : [...prev, reg].slice(0, 2)
                                        );
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                                        emotionalRegister.includes(reg)
                                            ? "bg-primary/20 border-primary/50 text-primary"
                                            : "bg-background/50 border-border/30 text-muted-foreground hover:border-border/60"
                                    }`}
                                >
                                    {reg}
                                </button>
                            ))}
                        </div>
                        {emotionalRegister.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                                Selected: {emotionalRegister.join(", ")}
                            </p>
                        )}
                    </CardContent>
                </Card>
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
                                                {z.validFrom && z.validUntil ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs shrink-0"
                                                    >
                                                        {new Date(z.validUntil) >= new Date() ? (
                                                            <span className="text-emerald-400">{z.validFrom} → {z.validUntil}</span>
                                                        ) : (
                                                            <span className="text-red-400">Expired {z.validUntil}</span>
                                                        )}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">
                                                        No window
                                                    </Badge>
                                                )}
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
