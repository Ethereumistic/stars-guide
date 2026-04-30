"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Anchor,
    Plus,
    X,
    Pencil,
    Trash2,
    Sparkles,
    Loader2,
    Moon,
    Eye,
    EyeOff,
    Wand2,
    Save,
    Check,
    MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

// Moon phase mapping options
const MOON_PHASE_OPTIONS = [
    { value: "new_moon", label: "🌑 New Moon" },
    { value: "waxing", label: "🌓 Waxing (Crescent / First Quarter)" },
    { value: "full_moon", label: "🌕 Full Moon" },
    { value: "waning", label: "🌗 Waning (Gibbous / Last Quarter)" },
];

// Emotional register options
const EMOTIONAL_REGISTER_OPTIONS = [
    "anxious", "expansive", "tender", "defiant",
    "restless", "hopeful", "grief", "clarity",
];

type HookFormData = {
    name: string;
    description: string;
    examples: string[];
    isActive: boolean;
    moonPhaseMapping?: string;
    emotionalRegisters: string[];
};

const emptyForm: HookFormData = {
    name: "",
    description: "",
    examples: ["", "", ""],
    isActive: true,
    moonPhaseMapping: undefined,
    emotionalRegisters: [],
};

export default function HooksPage() {
    const hooks = useQuery(api.hooks.getAll);
    const createHook = useMutation(api.hooks.create);
    const updateHook = useMutation(api.hooks.update);
    const toggleActive = useMutation(api.hooks.toggleActive);
    const approveHook = useMutation(api.hooks.approveHook);
    const deleteHook = useMutation(api.hooks.deleteHook);
    const seedHooks = useMutation(api.hooks.seed);

    const [isCreating, setIsCreating] = useState(false);
    const [editingHookId, setEditingHookId] = useState<Id<"hooks"> | null>(null);
    const [form, setForm] = useState<HookFormData>({ ...emptyForm });
    const [isSaving, setIsSaving] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);

    // AI Proposal
    const [proposeOpen, setProposeOpen] = useState(false);
    const [proposeRegisters, setProposeRegisters] = useState<string[]>([]);
    const [proposeCount, setProposeCount] = useState(5);
    const [isProposing, setIsProposing] = useState(false);
    // proposeHooksAction is an internalAction — will need a public wrapper when AI proposal feature is enabled

    const activeHooks = hooks?.filter((h) => h.isActive && h.source !== "ai_proposed") ?? [];
    const pendingHooks = hooks?.filter((h) => h.source === "ai_proposed" && !h.approvedAt) ?? [];
    const inactiveHooks = hooks?.filter((h) => !h.isActive && h.source !== "ai_proposed") ?? [];

    // ─── Form handlers ───────────────────────────────────────────────────

    const resetForm = () => {
        setForm({ ...emptyForm });
        setEditingHookId(null);
        setIsCreating(false);
        setSheetOpen(false);
    };

    const openCreateSheet = () => {
        setForm({ ...emptyForm });
        setEditingHookId(null);
        setIsCreating(true);
        setSheetOpen(true);
    };

    const openEditSheet = (hook: NonNullable<typeof hooks>[0]) => {
        setForm({
            name: hook.name,
            description: hook.description,
            examples: [...hook.examples],
            isActive: hook.isActive,
            moonPhaseMapping: hook.moonPhaseMapping,
            emotionalRegisters: (hook as any).emotionalRegisters ?? [],
        });
        setEditingHookId(hook._id);
        setIsCreating(false);
        setSheetOpen(true);
    };

    const updateExample = (index: number, value: string) => {
        const updated = [...form.examples];
        updated[index] = value;
        setForm({ ...form, examples: updated });
    };

    const addExample = () => {
        if (form.examples.length < 5) {
            setForm({ ...form, examples: [...form.examples, ""] });
        }
    };

    const removeExample = (index: number) => {
        if (form.examples.length > 2) {
            setForm({ ...form, examples: form.examples.filter((_, i) => i !== index) });
        }
    };

    const toggleEmotionalRegister = (reg: string) => {
        setForm((prev) => ({
            ...prev,
            emotionalRegisters: prev.emotionalRegisters.includes(reg)
                ? prev.emotionalRegisters.filter((r) => r !== reg)
                : [...prev.emotionalRegisters, reg].slice(0, 2),
        }));
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error("Hook name is required.");
            return;
        }
        if (!form.description.trim()) {
            toast.error("Description is required.");
            return;
        }
        const validExamples = form.examples.filter((e) => e.trim());
        if (validExamples.length < 2) {
            toast.error("At least 2 example lines are required.");
            return;
        }

        setIsSaving(true);
        try {
            if (editingHookId) {
                await updateHook({
                    hookId: editingHookId,
                    name: form.name.trim(),
                    description: form.description.trim(),
                    examples: validExamples,
                    isActive: form.isActive,
                    moonPhaseMapping: form.moonPhaseMapping || undefined,
                    emotionalRegisters: form.emotionalRegisters,
                });
                toast.success("Hook updated.");
            } else {
                await createHook({
                    name: form.name.trim(),
                    description: form.description.trim(),
                    examples: validExamples,
                    isActive: form.isActive,
                    moonPhaseMapping: form.moonPhaseMapping || undefined,
                    emotionalRegisters: form.emotionalRegisters,
                });
                toast.success("Hook created.");
            }
            resetForm();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to save hook.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggle = async (hookId: Id<"hooks">) => {
        try {
            await toggleActive({ hookId });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to toggle hook.");
        }
    };

    const handleApprove = async (hookId: Id<"hooks">) => {
        try {
            await approveHook({ hookId });
            toast.success("Hook approved!");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to approve hook.");
        }
    };

    const handleDelete = async (hookId: Id<"hooks">, hookName: string) => {
        if (!confirm(`Delete "${hookName}"? This cannot be undone.`)) return;
        try {
            await deleteHook({ hookId });
            toast.success("Hook deleted.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete hook.");
        }
    };

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            const result = await seedHooks();
            if (result.status === "skipped") {
                toast.info(result.message);
            } else {
                toast.success(result.message);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to seed hooks.");
        } finally {
            setIsSeeding(false);
        }
    };

    const getMoonPhaseLabel = (mapping?: string) => {
        if (!mapping) return null;
        return MOON_PHASE_OPTIONS.find((o) => o.value === mapping)?.label || mapping;
    };

    const getSourceBadge = (source: string) => {
        switch (source) {
            case "curated": return <Badge variant="outline" className="text-xs text-blue-400 border-blue-400/30">Curated</Badge>;
            case "ai_proposed": return <Badge variant="outline" className="text-xs text-purple-400 border-purple-400/30">AI Proposed</Badge>;
            case "admin_written": return <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">Admin</Badge>;
            default: return null;
        }
    };

    return (
        <div className="space-y-8 max-w-5xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-serif font-bold tracking-tight flex items-center gap-2">
                        <Anchor className="h-6 w-6 text-primary" />
                        Hook Manager
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm max-w-xl">
                        Manage hook archetypes that control how horoscopes open. v4 adds emotional register
                        matching for contextually appropriate hook selection.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {hooks && hooks.length === 0 && (
                        <Button
                            variant="outline"
                            onClick={handleSeed}
                            disabled={isSeeding}
                            className="gap-1"
                        >
                            {isSeeding ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Wand2 className="h-4 w-4" />
                            )}
                            Seed Defaults
                        </Button>
                    )}
                    <Button onClick={openCreateSheet} className="gap-1">
                        <Plus className="h-4 w-4" />
                        New Hook
                    </Button>
                </div>
            </div>

            {/* Moon Phase Auto-Assignment Info */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Moon className="h-4 w-4 text-purple-400" />
                        Auto-Assignment
                    </CardTitle>
                    <CardDescription>
                        Hook selection: emotional register (primary) → moon phase (secondary) → weighted random by usage count.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {MOON_PHASE_OPTIONS.map((phase) => {
                            const assignedHook = hooks?.find(
                                (h) => h.isActive && h.moonPhaseMapping === phase.value
                            );
                            return (
                                <div
                                    key={phase.value}
                                    className="p-3 rounded-lg bg-background/80 border border-border/50 text-center"
                                >
                                    <p className="text-xs text-muted-foreground mb-1">{phase.label}</p>
                                    <p className="text-sm font-medium truncate">
                                        {assignedHook?.name || (
                                            <span className="text-muted-foreground/50 italic">Unassigned</span>
                                        )}
                                    </p>
                                    {assignedHook && (assignedHook as any).emotionalRegisters?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1 justify-center">
                                            {(assignedHook as any).emotionalRegisters.map((r: string) => (
                                                <span key={r} className="text-[10px] text-muted-foreground bg-muted/50 px-1 rounded">{r}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Pending AI-Proposed Hooks */}
            {pendingHooks.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <MessageSquare className="h-4 w-4 text-purple-400" />
                        Pending Approval
                        <Badge variant="secondary" className="text-xs">{pendingHooks.length}</Badge>
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {pendingHooks.map((hook) => (
                            <Card key={hook._id} className="border-purple-500/20 bg-purple-500/5 backdrop-blur-sm">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-base">{hook.name}</CardTitle>
                                        {getSourceBadge((hook as any).source ?? "curated")}
                                    </div>
                                    <CardDescription className="text-xs">{hook.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="space-y-1">
                                        {hook.examples.slice(0, 2).map((ex, i) => (
                                            <p key={i} className="text-xs text-muted-foreground italic pl-3 border-l border-border/50">
                                                &ldquo;{ex}&rdquo;
                                            </p>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                                        <Button size="sm" onClick={() => handleApprove(hook._id)} className="gap-1 text-xs">
                                            <Check className="h-3 w-3" /> Approve
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(hook._id, hook.name)} className="gap-1 text-xs text-red-400">
                                            <Trash2 className="h-3 w-3" /> Discard
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Hooks */}
            <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <Eye className="h-4 w-4 text-emerald-400" />
                    Active Hooks
                    {activeHooks.length > 0 && (
                        <Badge variant="secondary" className="text-xs">{activeHooks.length}</Badge>
                    )}
                </h2>
                {hooks === undefined ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading hooks...
                    </div>
                ) : activeHooks.length === 0 ? (
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                        <CardContent className="py-8 text-center">
                            <p className="text-sm text-muted-foreground">
                                No active hooks. {hooks.length === 0 ? "Click \"Seed Defaults\" to create the initial 4 archetypes." : "Activate hooks below or create a new one."}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {activeHooks.map((hook) => (
                            <HookCard
                                key={hook._id}
                                hook={hook}
                                moonPhaseLabel={getMoonPhaseLabel(hook.moonPhaseMapping)}
                                onEdit={() => openEditSheet(hook)}
                                onToggle={() => handleToggle(hook._id)}
                                onDelete={() => handleDelete(hook._id, hook.name)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Inactive Hooks */}
            {inactiveHooks.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                        Inactive Hooks
                        <Badge variant="outline" className="text-xs">{inactiveHooks.length}</Badge>
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {inactiveHooks.map((hook) => (
                            <HookCard
                                key={hook._id}
                                hook={hook}
                                moonPhaseLabel={getMoonPhaseLabel(hook.moonPhaseMapping)}
                                onEdit={() => openEditSheet(hook)}
                                onToggle={() => handleToggle(hook._id)}
                                onDelete={() => handleDelete(hook._id, hook.name)}
                                dimmed
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Create/Edit Sheet */}
            <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
                <SheetContent className="overflow-y-auto sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            {editingHookId ? (
                                <><Pencil className="h-4 w-4" /> Edit Hook</>
                            ) : (
                                <><Sparkles className="h-4 w-4" /> New Hook Archetype</>
                            )}
                        </SheetTitle>
                        <SheetDescription>
                            {editingHookId
                                ? "Modify this hook archetype. Changes take effect on the next generation run."
                                : "Create a new opening style for horoscope copy. Add at least 2 example lines."}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-6 mt-6">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="hook-name">Name</Label>
                            <Input
                                id="hook-name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder='e.g., "The Whisper Hook"'
                                className="bg-background/50"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="hook-description">Description</Label>
                            <Textarea
                                id="hook-description"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="One sentence describing what this hook does and how it makes the reader feel."
                                className="bg-background/50 min-h-[80px]"
                            />
                        </div>

                        {/* Examples */}
                        <div className="space-y-3">
                            <Label>Example Lines ({form.examples.length}/5)</Label>
                            {form.examples.map((example, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs shrink-0 w-6 justify-center">
                                        {index + 1}
                                    </Badge>
                                    <Input
                                        value={example}
                                        onChange={(e) => updateExample(index, e.target.value)}
                                        placeholder={`Example opening line ${index + 1}...`}
                                        className="bg-background/50"
                                    />
                                    {form.examples.length > 2 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeExample(index)}
                                            className="shrink-0 h-8 w-8"
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {form.examples.length < 5 && (
                                <Button variant="outline" size="sm" onClick={addExample} className="gap-1">
                                    <Plus className="h-3 w-3" /> Add Example
                                </Button>
                            )}
                        </div>

                        {/* Emotional Registers */}
                        <div className="space-y-2">
                            <Label>Emotional Registers (max 2)</Label>
                            <div className="flex flex-wrap gap-2">
                                {EMOTIONAL_REGISTER_OPTIONS.map((reg) => (
                                    <button
                                        key={reg}
                                        onClick={() => toggleEmotionalRegister(reg)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                                            form.emotionalRegisters.includes(reg)
                                                ? "bg-primary/20 border-primary/50 text-primary"
                                                : "bg-background/50 border-border/30 text-muted-foreground hover:border-border/60"
                                        }`}
                                    >
                                        {reg}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Empty = matches any emotional register (universal). Select 1-2 for context-specific matching.
                            </p>
                        </div>

                        {/* Moon Phase Mapping */}
                        <div className="space-y-2">
                            <Label>Moon Phase Mapping (Auto-Assignment)</Label>
                            <Select
                                value={form.moonPhaseMapping || "none"}
                                onValueChange={(val) =>
                                    setForm({ ...form, moonPhaseMapping: val === "none" ? undefined : val })
                                }
                            >
                                <SelectTrigger className="bg-background/50">
                                    <SelectValue placeholder="Select moon phase..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        <span className="text-muted-foreground">No auto-assignment</span>
                                    </SelectItem>
                                    {MOON_PHASE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Secondary filter after emotional register matching.
                            </p>
                        </div>

                        {/* Active Toggle */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/80 border border-border/50">
                            <div>
                                <Label htmlFor="hook-active" className="text-sm font-medium">Active</Label>
                                <p className="text-xs text-muted-foreground">
                                    Only active hooks are available for assignment.
                                </p>
                            </div>
                            <Switch
                                id="hook-active"
                                checked={form.isActive}
                                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                            />
                        </div>

                        {/* Save */}
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full gap-2"
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            {isSaving ? "Saving..." : editingHookId ? "Update Hook" : "Create Hook"}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}

// ─── Hook Card Component ──────────────────────────────────────────────────

function HookCard({
    hook,
    moonPhaseLabel,
    onEdit,
    onToggle,
    onDelete,
    dimmed = false,
}: {
    hook: {
        _id: Id<"hooks">;
        name: string;
        description: string;
        examples: string[];
        isActive: boolean;
        moonPhaseMapping?: string;
        updatedAt: number;
        emotionalRegisters?: string[];
        source?: string;
        usageCount?: number;
    };
    moonPhaseLabel: string | null;
    onEdit: () => void;
    onToggle: () => void;
    onDelete: () => void;
    dimmed?: boolean;
}) {
    const source = hook.source ?? "curated";
    const registers = hook.emotionalRegisters ?? [];
    const usageCount = hook.usageCount ?? 0;

    const getSourceBadge = () => {
        switch (source) {
            case "curated": return <Badge variant="outline" className="text-xs text-blue-400 border-blue-400/30">Curated</Badge>;
            case "ai_proposed": return <Badge variant="outline" className="text-xs text-purple-400 border-purple-400/30">AI</Badge>;
            case "admin_written": return <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">Admin</Badge>;
            default: return null;
        }
    };

    return (
        <Card className={`border-border/50 bg-card/50 backdrop-blur-sm transition-opacity ${dimmed ? "opacity-50" : ""}`}>
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-base flex items-center gap-2">
                            {hook.name}
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs">
                            {hook.description}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7">
                            <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-red-400 hover:text-red-300">
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Examples */}
                <div className="space-y-1">
                    {hook.examples.slice(0, 3).map((example, i) => (
                        <p key={i} className="text-xs text-muted-foreground italic pl-3 border-l border-border/50">
                            &ldquo;{example}&rdquo;
                        </p>
                    ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border/30 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        {moonPhaseLabel && (
                            <Badge variant="outline" className="text-xs">
                                {moonPhaseLabel}
                            </Badge>
                        )}
                        {registers.length > 0 && (
                            <div className="flex gap-1">
                                {registers.map((r) => (
                                    <span key={r} className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{r}</span>
                                ))}
                            </div>
                        )}
                        {getSourceBadge()}
                        <Badge
                            variant={hook.isActive ? "default" : "secondary"}
                            className="text-xs cursor-pointer"
                            onClick={onToggle}
                        >
                            {hook.isActive ? "Active" : "Inactive"}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            Used: {usageCount}×
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {new Date(hook.updatedAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
