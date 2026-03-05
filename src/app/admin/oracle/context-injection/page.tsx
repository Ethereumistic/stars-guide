"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id, Doc } from "../../../../../convex/_generated/dataModel";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
    Loader2,
    Save,
    Eye,
} from "lucide-react";
import { toast } from "sonner";

type CategoryDoc = Doc<"oracle_categories">;
type TemplateDoc = Doc<"oracle_templates">;

export default function OracleContextInjectionPage() {
    const categories = useQuery(api.oracle.categories.listAll);
    const allTemplates = useQuery(api.oracle.templates.listAll, {});
    const saveCategoryContext = useMutation(api.oracle.injections.saveCategoryContext);
    const saveScenarioInjection = useMutation(api.oracle.injections.saveScenarioInjection);
    const settings = useQuery(api.oracle.settings.listAllSettings);

    // Category context editing states
    const [contextEdits, setContextEdits] = useState<Record<string, string>>({});
    const [savingContext, setSavingContext] = useState<string | null>(null);

    // Scenario injection states
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
    const [injectionMode, setInjectionMode] = useState<"structured" | "raw">("structured");
    const [toneModifier, setToneModifier] = useState("");
    const [psychologicalFrame, setPsychologicalFrame] = useState("");
    const [avoid, setAvoid] = useState("");
    const [emphasize, setEmphasize] = useState("");
    const [openingGuide, setOpeningGuide] = useState("");
    const [rawInjection, setRawInjection] = useState("");
    const [savingInjection, setSavingInjection] = useState(false);

    // Preview state
    const [showPreview, setShowPreview] = useState(false);
    const [previewContent, setPreviewContent] = useState("");

    // Load existing category contexts
    const categoryContexts = useQuery(api.oracle.injections.listAllCategoryContexts);

    // Load existing scenario injection for selected template
    const existingInjection = useQuery(
        api.oracle.injections.getScenarioInjection,
        selectedTemplateId ? { templateId: selectedTemplateId as Id<"oracle_templates"> } : "skip",
    );

    // Load injection data when selection changes
    useEffect(() => {
        if (existingInjection) {
            setToneModifier(existingInjection.toneModifier ?? "");
            setPsychologicalFrame(existingInjection.psychologicalFrame ?? "");
            setAvoid(existingInjection.avoid ?? "");
            setEmphasize(existingInjection.emphasize ?? "");
            setOpeningGuide(existingInjection.openingAcknowledgmentGuide ?? "");
            setRawInjection(existingInjection.rawInjectionText ?? "");
            setInjectionMode(existingInjection.useRawText ? "raw" : "structured");
        } else if (existingInjection === null) {
            setToneModifier("");
            setPsychologicalFrame("");
            setAvoid("");
            setEmphasize("");
            setOpeningGuide("");
            setRawInjection("");
            setInjectionMode("structured");
        }
    }, [existingInjection]);

    // Initialize context edits from existing data
    useEffect(() => {
        if (categoryContexts && Object.keys(contextEdits).length === 0) {
            const initial: Record<string, string> = {};
            categoryContexts.forEach((ctx: { categoryId: string; contextText: string }) => {
                initial[ctx.categoryId] = ctx.contextText;
            });
            setContextEdits(initial);
        }
    }, [categoryContexts]);

    const soulPrompt = settings?.find((s: { key: string }) => s.key === "soul_prompt")?.value ?? "";

    const getCategoryName = (catId: Id<"oracle_categories">) =>
        categories?.find((c: CategoryDoc) => c._id === catId)?.name ?? "";
    const getCategoryIcon = (catId: Id<"oracle_categories">) =>
        categories?.find((c: CategoryDoc) => c._id === catId)?.icon ?? "✦";

    const handleSaveContext = async (categoryId: string) => {
        const text = contextEdits[categoryId];
        if (!text?.trim()) return;

        setSavingContext(categoryId);
        try {
            await saveCategoryContext({
                categoryId: categoryId as Id<"oracle_categories">,
                contextText: text,
            });
            toast.success("Category context saved with version history");
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Failed to save");
        } finally {
            setSavingContext(null);
        }
    };

    const handleSaveInjection = async () => {
        if (!selectedTemplateId) return;

        setSavingInjection(true);
        try {
            await saveScenarioInjection({
                templateId: selectedTemplateId as Id<"oracle_templates">,
                toneModifier: injectionMode === "structured" ? toneModifier : "",
                psychologicalFrame: injectionMode === "structured" ? psychologicalFrame : "",
                avoid: injectionMode === "structured" ? avoid : "",
                emphasize: injectionMode === "structured" ? emphasize : "",
                openingAcknowledgmentGuide: injectionMode === "structured" ? openingGuide : "",
                rawInjectionText: injectionMode === "raw" ? rawInjection : undefined,
                useRawText: injectionMode === "raw",
            });
            toast.success("Scenario injection saved with version history");
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Failed to save");
        } finally {
            setSavingInjection(false);
        }
    };

    const handlePreviewPrompt = (categoryId?: string) => {
        const parts: string[] = [];

        // Soul prompt
        parts.push("═══ LAYER 1: SOUL PROMPT ═══");
        parts.push(soulPrompt.substring(0, 500) + (soulPrompt.length > 500 ? "\n...(truncated)" : ""));

        // Category context
        if (categoryId) {
            parts.push("\n═══ LAYER 2: CATEGORY CONTEXT ═══");
            parts.push(contextEdits[categoryId] ?? "(not set)");
        }

        // Scenario injection
        if (selectedTemplateId && injectionMode === "structured") {
            parts.push("\n═══ LAYER 3: SCENARIO INJECTION ═══");
            parts.push(`Tone: ${toneModifier || "(not set)"}`);
            parts.push(`Psychological Frame: ${psychologicalFrame || "(not set)"}`);
            parts.push(`Avoid: ${avoid || "(not set)"}`);
            parts.push(`Emphasize: ${emphasize || "(not set)"}`);
            parts.push(`Opening: ${openingGuide || "(not set)"}`);
        } else if (selectedTemplateId && injectionMode === "raw") {
            parts.push("\n═══ LAYER 3: SCENARIO INJECTION (RAW) ═══");
            parts.push(rawInjection || "(not set)");
        }

        setPreviewContent(parts.join("\n"));
        setShowPreview(true);
    };

    if (!categories || !allTemplates) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="text-2xl font-serif font-bold">Context & Injections</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Edit prompt injection layers — the highest-leverage content in the system
                </p>
            </div>

            <Tabs defaultValue="contexts" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="contexts">Category Contexts</TabsTrigger>
                    <TabsTrigger value="injections">Scenario Injections</TabsTrigger>
                </TabsList>

                {/* ─── Tab A: Category Contexts ─── */}
                <TabsContent value="contexts" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Category contexts provide domain framing (Layer 2 of the prompt stack).
                        Each category gets its own context block appended to the soul prompt.
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                        {categories
                            .filter((c: CategoryDoc) => c.isActive)
                            .sort((a: CategoryDoc, b: CategoryDoc) => a.displayOrder - b.displayOrder)
                            .map((cat: CategoryDoc) => {
                                const existingCtx = categoryContexts?.find(
                                    (c: { categoryId: string }) => c.categoryId === cat._id
                                );
                                return (
                                    <Card key={cat._id} className="bg-card/50 border-border/50">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <span className="text-xl">{cat.icon}</span>
                                                    {cat.name}
                                                </CardTitle>
                                                <div className="flex items-center gap-2">
                                                    {existingCtx && (
                                                        <Badge variant="outline" className="text-[10px]">
                                                            v{existingCtx.version ?? 1}
                                                        </Badge>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handlePreviewPrompt(cat._id)}
                                                        className="h-7 gap-1 text-xs"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                        Preview
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <Textarea
                                                value={contextEdits[cat._id] ?? ""}
                                                onChange={(e) => setContextEdits((p) => ({ ...p, [cat._id]: e.target.value }))}
                                                placeholder={`Enter context framing for the ${cat.name} domain...`}
                                                className="min-h-[120px] font-mono text-sm bg-black/20 border-white/10"
                                            />
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">
                                                    {(contextEdits[cat._id] ?? "").length} chars ·
                                                    ~{Math.round((contextEdits[cat._id] ?? "").length / 4)} tokens
                                                </span>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSaveContext(cat._id)}
                                                    disabled={savingContext === cat._id}
                                                    className="gap-2"
                                                >
                                                    {savingContext === cat._id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Save className="w-3.5 h-3.5" />
                                                    )}
                                                    Save
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                    </div>
                </TabsContent>

                {/* ─── Tab B: Scenario Injections ─── */}
                <TabsContent value="injections" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Scenario injections are per-template behavioral modifiers (Layer 3 of the prompt stack).
                        They control tone, focus, and opening style for each question type.
                    </p>

                    {/* Template selector */}
                    <Card className="bg-card/50 border-border/50">
                        <CardContent className="pt-6">
                            <Label className="mb-2 block">Select Template</Label>
                            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                <SelectTrigger className="bg-black/20 border-white/10">
                                    <SelectValue placeholder="Choose a template to manage injection..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {allTemplates
                                        .filter((t: TemplateDoc) => t.isActive)
                                        .sort((a: TemplateDoc, b: TemplateDoc) =>
                                            getCategoryName(a.categoryId).localeCompare(getCategoryName(b.categoryId))
                                        )
                                        .map((tpl: TemplateDoc) => (
                                            <SelectItem key={tpl._id} value={tpl._id}>
                                                {getCategoryIcon(tpl.categoryId)} {tpl.questionText}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    {selectedTemplateId && (
                        <Card className="bg-card/50 border-border/50">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">Injection Editor</CardTitle>
                                    <div className="flex items-center gap-3">
                                        {existingInjection && (
                                            <Badge variant="outline" className="text-[10px]">
                                                v{existingInjection.version ?? 1}
                                            </Badge>
                                        )}
                                        <div className="flex items-center gap-2 text-xs">
                                            <button
                                                onClick={() => setInjectionMode("structured")}
                                                className={`px-2 py-1 rounded transition-colors ${injectionMode === "structured"
                                                    ? "bg-galactic/20 text-galactic"
                                                    : "text-muted-foreground hover:text-white"
                                                    }`}
                                            >
                                                Structured
                                            </button>
                                            <button
                                                onClick={() => setInjectionMode("raw")}
                                                className={`px-2 py-1 rounded transition-colors ${injectionMode === "raw"
                                                    ? "bg-galactic/20 text-galactic"
                                                    : "text-muted-foreground hover:text-white"
                                                    }`}
                                            >
                                                Raw Override
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {injectionMode === "structured" ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Tone Modifier</Label>
                                            <Input
                                                value={toneModifier}
                                                onChange={(e) => setToneModifier(e.target.value)}
                                                placeholder="Warm, emotionally attuned, gently reassuring"
                                                className="bg-black/20 border-white/10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Psychological Frame</Label>
                                            <Input
                                                value={psychologicalFrame}
                                                onChange={(e) => setPsychologicalFrame(e.target.value)}
                                                placeholder="Identity exploration — not loss"
                                                className="bg-black/20 border-white/10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Avoid</Label>
                                            <Textarea
                                                value={avoid}
                                                onChange={(e) => setAvoid(e.target.value)}
                                                placeholder="Avoid assumptions about the situation..."
                                                className="min-h-[60px] bg-black/20 border-white/10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Emphasize</Label>
                                            <Textarea
                                                value={emphasize}
                                                onChange={(e) => setEmphasize(e.target.value)}
                                                placeholder="Emphasize self-trust and inner alignment..."
                                                className="min-h-[60px] bg-black/20 border-white/10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Opening Acknowledgment Guide</Label>
                                            <Textarea
                                                value={openingGuide}
                                                onChange={(e) => setOpeningGuide(e.target.value)}
                                                placeholder="Begin by reflecting their Sun sign's core nature..."
                                                className="min-h-[60px] bg-black/20 border-white/10"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <Label>Raw Injection Text</Label>
                                        <p className="text-[11px] text-amber-400">
                                            This overrides all structured fields above.
                                        </p>
                                        <Textarea
                                            value={rawInjection}
                                            onChange={(e) => setRawInjection(e.target.value)}
                                            placeholder="Full custom injection text..."
                                            className="min-h-[200px] font-mono text-sm bg-black/20 border-white/10"
                                        />
                                    </div>
                                )}

                                <Separator className="opacity-10" />

                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePreviewPrompt()}
                                        className="gap-2"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        Preview Full Prompt
                                    </Button>
                                    <Button
                                        onClick={handleSaveInjection}
                                        disabled={savingInjection}
                                        className="gap-2"
                                    >
                                        {savingInjection ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        Save Injection
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Prompt Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Assembled Prompt Preview</DialogTitle>
                        <DialogDescription>
                            This shows how the prompt layers stack together as sent to the LLM.
                        </DialogDescription>
                    </DialogHeader>
                    <pre className="text-xs font-mono bg-black/30 border border-white/10 rounded-lg p-4 overflow-auto max-h-[50vh] whitespace-pre-wrap">
                        {previewContent}
                    </pre>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
