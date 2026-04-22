"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, Pencil, Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

const PROMPT_CATEGORIES = [
    "daily", "moon", "retrograde", "seasonal",
    "gratitude", "dream", "relationship", "career",
] as const;

const ASTROLOGY_LEVELS = ["none", "light", "medium", "deep"] as const;

const MOON_PHASES = [
    "", "New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
    "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent",
];

interface PromptEntry {
    _id: string;
    category: string;
    moonPhase?: string;
    text: string;
    astrologyLevel: string;
    isActive: boolean;
}

function SeedPromptBankButton() {
    const seedPromptBank = useMutation(api.journal.prompts.seedPromptBankPublic);
    const [isSeeding, setIsSeeding] = React.useState(false);

    async function handleSeed() {
        setIsSeeding(true);
        try {
            await seedPromptBank();
            toast.success("Prompt bank seeded with default prompts");
        } catch (e: any) {
            // If already seeded, it's fine
            toast.info("Prompt bank already has prompts");
        } finally {
            setIsSeeding(false);
        }
    }

    return (
        <Button variant="outline" size="sm" onClick={handleSeed} disabled={isSeeding} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            {isSeeding ? "Seeding..." : "Seed Default Prompts"}
        </Button>
    );
}

export function PromptBankEditor() {
    const prompts = useQuery(api.journal.prompts.getPromptsForAdmin);
    const addPrompt = useMutation(api.journal.prompts.addPrompt);
    const updatePrompt = useMutation(api.journal.prompts.updatePrompt);
    const deletePrompt = useMutation(api.journal.prompts.deletePrompt);

    const [showAddForm, setShowAddForm] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);

    // New prompt form state
    const [newPrompt, setNewPrompt] = React.useState({
        category: "daily" as typeof PROMPT_CATEGORIES[number],
        moonPhase: "",
        text: "",
        astrologyLevel: "none" as typeof ASTROLOGY_LEVELS[number],
        isActive: true,
    });

    // Edit state
    const [editText, setEditText] = React.useState("");

    async function handleAddPrompt() {
        if (!newPrompt.text.trim()) {
            toast.error("Prompt text is required");
            return;
        }
        try {
            await addPrompt({
                category: newPrompt.category,
                moonPhase: newPrompt.moonPhase || undefined,
                text: newPrompt.text.trim(),
                astrologyLevel: newPrompt.astrologyLevel,
                isActive: newPrompt.isActive,
            });
            toast.success("Prompt added");
            setNewPrompt({
                category: "daily",
                moonPhase: "",
                text: "",
                astrologyLevel: "none",
                isActive: true,
            });
            setShowAddForm(false);
        } catch (e: any) {
            toast.error(e?.message ?? "Failed to add prompt");
        }
    }

    async function handleToggleActive(promptId: string, isActive: boolean) {
        try {
            await updatePrompt({ promptId: promptId as any, isActive: !isActive });
        } catch (e: any) {
            toast.error(e?.message ?? "Failed to toggle prompt");
        }
    }

    async function handleDeletePrompt(promptId: string) {
        try {
            await deletePrompt({ promptId: promptId as any });
            toast.success("Prompt deleted");
        } catch (e: any) {
            toast.error(e?.message ?? "Failed to delete prompt");
        }
    }

    async function handleSaveEdit(promptId: string) {
        try {
            await updatePrompt({ promptId: promptId as any, text: editText.trim() });
            toast.success("Prompt updated");
            setEditingId(null);
        } catch (e: any) {
            toast.error(e?.message ?? "Failed to update prompt");
        }
    }

    if (!prompts) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <Card className="border-border/50 bg-card/50">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Prompt Bank</CardTitle>
                        <CardDescription>
                            Daily journaling prompts — algorithmic, astrology-aware, zero LLM cost.
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="gap-1.5"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Prompt
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Add prompt form */}
                {showAddForm && (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Category</Label>
                                <select
                                    value={newPrompt.category}
                                    onChange={(e) => setNewPrompt({ ...newPrompt, category: e.target.value as any })}
                                    className="w-full rounded-lg border border-white/10 bg-black/20 text-xs text-white/60 p-2 focus:outline-none focus:border-white/20"
                                >
                                    {PROMPT_CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Moon Phase (optional)</Label>
                                <select
                                    value={newPrompt.moonPhase}
                                    onChange={(e) => setNewPrompt({ ...newPrompt, moonPhase: e.target.value })}
                                    className="w-full rounded-lg border border-white/10 bg-black/20 text-xs text-white/60 p-2 focus:outline-none focus:border-white/20"
                                >
                                    <option value="">Any phase</option>
                                    {MOON_PHASES.filter(Boolean).map((phase) => (
                                        <option key={phase} value={phase}>{phase}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Astrology Level</Label>
                                <select
                                    value={newPrompt.astrologyLevel}
                                    onChange={(e) => setNewPrompt({ ...newPrompt, astrologyLevel: e.target.value as any })}
                                    className="w-full rounded-lg border border-white/10 bg-black/20 text-xs text-white/60 p-2 focus:outline-none focus:border-white/20"
                                >
                                    {ASTROLOGY_LEVELS.map((level) => (
                                        <option key={level} value={level}>{level}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Prompt Text</Label>
                            <textarea
                                value={newPrompt.text}
                                onChange={(e) => setNewPrompt({ ...newPrompt, text: e.target.value })}
                                placeholder="What reflection would you like to offer users?"
                                rows={2}
                                className="w-full rounded-lg border border-white/10 bg-black/20 text-xs text-white/60 p-2 placeholder:text-white/25 focus:outline-none focus:border-white/20 resize-none"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={newPrompt.isActive}
                                    onCheckedChange={(checked) => setNewPrompt({ ...newPrompt, isActive: checked })}
                                />
                                <Label className="text-xs">Active</Label>
                            </div>
                            <div className="flex gap-2 ml-auto">
                                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                                    Cancel
                                </Button>
                                <Button variant="galactic" size="sm" onClick={handleAddPrompt}>
                                    Add
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Prompts list */}
                {prompts.length === 0 && !showAddForm && (
                    <div className="text-center py-6 space-y-3">
                        <p className="text-sm text-muted-foreground">
                            No prompts yet. Add one or seed the defaults.
                        </p>
                        <SeedPromptBankButton />
                    </div>
                )}

                <div className="space-y-2">
                    {prompts.map((prompt: PromptEntry) => (
                        <div
                            key={prompt._id}
                            className={cn(
                                "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                                prompt.isActive
                                    ? "border-white/10 bg-white/[0.02]"
                                    : "border-white/5 bg-transparent opacity-60",
                            )}
                        >
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                {editingId === prompt._id ? (
                                    <textarea
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        rows={2}
                                        className="w-full rounded-lg border border-white/10 bg-black/20 text-xs text-white/60 p-2 focus:outline-none focus:border-white/20 resize-none"
                                    />
                                ) : (
                                    <p className="text-xs text-white/60 line-clamp-2">
                                        {prompt.text}
                                    </p>
                                )}

                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[10px] rounded-full border border-galactic/20 bg-galactic/10 px-1.5 py-0.5 text-galactic">
                                        {prompt.category}
                                    </span>
                                    {prompt.moonPhase && (
                                        <span className="text-[10px] rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-white/40">
                                            🌙 {prompt.moonPhase}
                                        </span>
                                    )}
                                    <span className="text-[10px] text-white/30">
                                        {prompt.astrologyLevel}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <Switch
                                    checked={prompt.isActive}
                                    onCheckedChange={() => handleToggleActive(prompt._id, prompt.isActive)}
                                />
                                {editingId === prompt._id ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => handleSaveEdit(prompt._id)}
                                            className="p-1 rounded-md text-emerald-400/60 hover:text-emerald-400 transition-colors"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingId(null)}
                                            className="p-1 rounded-md text-white/30 hover:text-white/60 transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditText(prompt.text);
                                                setEditingId(prompt._id);
                                            }}
                                            className="p-1 rounded-md text-white/30 hover:text-white/60 transition-colors"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeletePrompt(prompt._id)}
                                            className="p-1 rounded-md text-red-400/40 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}