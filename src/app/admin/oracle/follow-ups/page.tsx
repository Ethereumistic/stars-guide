"use client";

import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
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
import { Switch } from "@/components/ui/switch";
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
    Pencil,
    Plus,
    GripVertical,
    Trash2,
    AlertTriangle,
    Info,
} from "lucide-react";
import { toast } from "sonner";

const QUESTION_TYPES = [
    { value: "single_select", label: "Single Select (pills)" },
    { value: "multi_select", label: "Multi Select (pills)" },
    { value: "free_text", label: "Free Text" },
    { value: "date", label: "Date Picker" },
    { value: "sign_picker", label: "Zodiac Sign Picker" },
] as const;

export default function OracleFollowUpsPage() {
    const categories = useQuery(api.oracle.categories.listAll);
    const allTemplates = useQuery(api.oracle.templates.listAll, {});
    const createFollowUp = useMutation(api.oracle.followUps.createFollowUp);
    const updateFollowUp = useMutation(api.oracle.followUps.updateFollowUp);
    const createOption = useMutation(api.oracle.followUps.createOption);
    const updateOption = useMutation(api.oracle.followUps.updateOption);
    const deleteOption = useMutation(api.oracle.followUps.deleteOption);

    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

    // Query follow-ups for selected template
    const followUps = useQuery(
        api.oracle.followUps.getFollowUpsByTemplate,
        selectedTemplateId ? { templateId: selectedTemplateId as Id<"oracle_templates"> } : "skip",
    );

    const [showDialog, setShowDialog] = useState(false);
    const [editingId, setEditingId] = useState<Id<"oracle_follow_ups"> | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formQuestionText, setFormQuestionText] = useState("");
    const [formQuestionType, setFormQuestionType] = useState<"single_select" | "multi_select" | "free_text" | "date" | "sign_picker" | "conditional">("single_select");
    const [formContextLabel, setFormContextLabel] = useState("");
    const [formIsRequired, setFormIsRequired] = useState(true);
    const [formPlaceholder, setFormPlaceholder] = useState("");
    const [formDisplayOrder, setFormDisplayOrder] = useState(0);

    // Option form state
    const [showOptionDialog, setShowOptionDialog] = useState(false);
    const [editingOptionId, setEditingOptionId] = useState<Id<"oracle_follow_up_options"> | null>(null);
    const [editingFollowUpForOption, setEditingFollowUpForOption] = useState<Id<"oracle_follow_ups"> | null>(null);
    const [optionLabel, setOptionLabel] = useState("");
    const [optionValue, setOptionValue] = useState("");
    const [optionDisplayOrder, setOptionDisplayOrder] = useState(0);

    const selectedTemplate = allTemplates?.find((t) => t._id === selectedTemplateId);
    const isThirdParty = selectedTemplate?.requiresThirdParty;
    const activeFollowUpCount = followUps?.filter((f) => f.isActive !== false)?.length ?? 0;

    const getCategoryName = (catId: Id<"oracle_categories">) =>
        categories?.find((c) => c._id === catId)?.name ?? "";
    const getCategoryIcon = (catId: Id<"oracle_categories">) =>
        categories?.find((c) => c._id === catId)?.icon ?? "✦";

    const openCreateFollowUp = () => {
        setEditingId(null);
        setFormQuestionText("");
        setFormQuestionType("single_select");
        setFormContextLabel("");
        setFormIsRequired(true);
        setFormPlaceholder("");
        setFormDisplayOrder(activeFollowUpCount);
        setShowDialog(true);
    };

    const openEditFollowUp = (fu: any) => {
        setEditingId(fu._id);
        setFormQuestionText(fu.questionText);
        setFormQuestionType(fu.questionType);
        setFormContextLabel(fu.contextLabel);
        setFormIsRequired(fu.isRequired);
        setFormPlaceholder(fu.placeholder ?? "");
        setFormDisplayOrder(fu.displayOrder);
        setShowDialog(true);
    };

    const handleSaveFollowUp = async () => {
        if (!selectedTemplateId) return;
        setSaving(true);
        try {
            if (editingId) {
                await updateFollowUp({
                    id: editingId,
                    questionText: formQuestionText,
                    questionType: formQuestionType as any,
                    contextLabel: formContextLabel,
                    isRequired: formIsRequired,
                    placeholder: formPlaceholder || undefined,
                    displayOrder: formDisplayOrder,
                });
                toast.success("Follow-up updated");
            } else {
                await createFollowUp({
                    templateId: selectedTemplateId as Id<"oracle_templates">,
                    questionText: formQuestionText,
                    questionType: formQuestionType,
                    contextLabel: formContextLabel,
                    isRequired: formIsRequired,
                    placeholder: formPlaceholder || undefined,
                    displayOrder: formDisplayOrder,
                });
                toast.success("Follow-up created");
            }
            setShowDialog(false);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleFollowUp = async (id: Id<"oracle_follow_ups">, active: boolean) => {
        try {
            await updateFollowUp({ id, isActive: !active });
            toast.success(`Follow-up ${active ? "deactivated" : "activated"}`);
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    // Options CRUD
    const openCreateOption = (followUpId: Id<"oracle_follow_ups">) => {
        setEditingFollowUpForOption(followUpId);
        setEditingOptionId(null);
        setOptionLabel("");
        setOptionValue("");
        setOptionDisplayOrder(0);
        setShowOptionDialog(true);
    };

    const openEditOption = (followUpId: Id<"oracle_follow_ups">, opt: any) => {
        setEditingFollowUpForOption(followUpId);
        setEditingOptionId(opt._id);
        setOptionLabel(opt.label);
        setOptionValue(opt.value);
        setOptionDisplayOrder(opt.displayOrder);
        setShowOptionDialog(true);
    };

    const handleSaveOption = async () => {
        if (!editingFollowUpForOption) return;
        setSaving(true);
        try {
            if (editingOptionId) {
                await updateOption({
                    id: editingOptionId,
                    label: optionLabel,
                    value: optionValue,
                    displayOrder: optionDisplayOrder,
                });
            } else {
                await createOption({
                    followUpId: editingFollowUpForOption,
                    label: optionLabel,
                    value: optionValue,
                    displayOrder: optionDisplayOrder,
                });
            }
            toast.success("Option saved");
            setShowOptionDialog(false);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteOption = async (optId: Id<"oracle_follow_up_options">) => {
        try {
            await deleteOption({ id: optId });
            toast.success("Option deleted");
        } catch (e: any) {
            toast.error(e.message);
        }
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
                <h1 className="text-2xl font-serif font-bold">Follow-up Questions</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage follow-up questions and options per template (max 3 per template)
                </p>
            </div>

            {/* Template Selector */}
            <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                    <Label className="mb-2 block">Select Template</Label>
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                        <SelectTrigger className="bg-black/20 border-white/10">
                            <SelectValue placeholder="Choose a template to manage follow-ups..." />
                        </SelectTrigger>
                        <SelectContent>
                            {allTemplates
                                .filter((t) => t.isActive)
                                .sort((a, b) => {
                                    const catA = getCategoryName(a.categoryId);
                                    const catB = getCategoryName(b.categoryId);
                                    return catA.localeCompare(catB);
                                })
                                .map((tpl) => (
                                    <SelectItem key={tpl._id} value={tpl._id}>
                                        {getCategoryIcon(tpl.categoryId)} {tpl.questionText}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Selected template info */}
            {selectedTemplate && (
                <>
                    {!isThirdParty && (
                        <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/15 rounded-lg p-4">
                            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-amber-300">
                                    This template skips follow-ups
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Follow-ups defined here will not be shown to users unless
                                    <code className="mx-1 bg-black/20 px-1 rounded">requiresThirdParty</code>
                                    is enabled on the template.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                                {activeFollowUpCount}/3 follow-ups
                            </Badge>
                            {isThirdParty && (
                                <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                                    3rd Party
                                </Badge>
                            )}
                        </div>
                        <Button
                            onClick={openCreateFollowUp}
                            disabled={activeFollowUpCount >= 3}
                            size="sm"
                            className="gap-2"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Follow-up
                        </Button>
                    </div>

                    {/* Follow-up Cards */}
                    <div className="space-y-4">
                        {followUps?.map((fu, idx) => (
                            <Card key={fu._id} className={`bg-card/50 border-border/50 ${fu.isActive === false ? "opacity-50" : ""}`}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                                            <Badge variant="outline" className="text-[10px]">Q{idx + 1}</Badge>
                                            <CardTitle className="text-sm">{fu.questionText}</CardTitle>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px]">
                                                {QUESTION_TYPES.find((t) => t.value === fu.questionType)?.label ?? fu.questionType}
                                            </Badge>
                                            {fu.isRequired && (
                                                <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">Required</Badge>
                                            )}
                                            <Switch
                                                checked={fu.isActive !== false}
                                                onCheckedChange={() => handleToggleFollowUp(fu._id, fu.isActive !== false)}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditFollowUp(fu)}
                                                className="h-7 w-7"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <CardDescription className="ml-11">
                                        Context label: <code className="bg-black/20 px-1 rounded text-[10px]">{fu.contextLabel}</code>
                                    </CardDescription>
                                </CardHeader>

                                {/* Options (for select types) */}
                                {(fu.questionType === "single_select" || fu.questionType === "multi_select") && (
                                    <CardContent className="pt-0">
                                        <Separator className="opacity-10 mb-3" />
                                        <div className="ml-11 space-y-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Options</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openCreateOption(fu._id)}
                                                    className="h-6 text-xs gap-1"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    Add
                                                </Button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {fu.options
                                                    ?.sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                                                    .map((opt: any) => (
                                                        <div
                                                            key={opt._id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 group"
                                                        >
                                                            <span className="text-xs">{opt.label}</span>
                                                            <button
                                                                onClick={() => openEditOption(fu._id, opt)}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteOption(opt._id)}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 className="w-2.5 h-2.5 text-red-400" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                {(!fu.options || fu.options.length === 0) && (
                                                    <span className="text-xs text-muted-foreground italic">No options yet</span>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        ))}

                        {followUps?.length === 0 && (
                            <Card className="bg-card/50 border-border/50 border-dashed">
                                <CardContent className="py-8 text-center">
                                    <p className="text-sm text-muted-foreground">
                                        No follow-up questions for this template.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </>
            )}

            {/* Follow-up Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit Follow-up" : "New Follow-up"}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Question Text</Label>
                            <Input
                                value={formQuestionText}
                                onChange={(e) => setFormQuestionText(e.target.value)}
                                placeholder="What is the other person's birth date?"
                                className="bg-black/20 border-white/10"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Question Type</Label>
                                <Select value={formQuestionType} onValueChange={(v) => setFormQuestionType(v as typeof formQuestionType)}>
                                    <SelectTrigger className="bg-black/20 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {QUESTION_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Context Label</Label>
                                <Input
                                    value={formContextLabel}
                                    onChange={(e) => setFormContextLabel(e.target.value)}
                                    placeholder="their_birth_date"
                                    className="bg-black/20 border-white/10 font-mono text-xs"
                                />
                            </div>
                        </div>

                        {formQuestionType === "free_text" && (
                            <div className="space-y-2">
                                <Label>Placeholder</Label>
                                <Input
                                    value={formPlaceholder}
                                    onChange={(e) => setFormPlaceholder(e.target.value)}
                                    placeholder="Enter their details..."
                                    className="bg-black/20 border-white/10"
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <Label>Required</Label>
                            <Switch checked={formIsRequired} onCheckedChange={setFormIsRequired} />
                        </div>

                        <div className="space-y-2">
                            <Label>Display Order</Label>
                            <Input
                                type="number"
                                value={formDisplayOrder}
                                onChange={(e) => setFormDisplayOrder(parseInt(e.target.value) || 0)}
                                className="bg-black/20 border-white/10 w-24"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveFollowUp} disabled={saving || !formQuestionText.trim() || !formContextLabel.trim()}>
                            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            {editingId ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Option Create/Edit Dialog */}
            <Dialog open={showOptionDialog} onOpenChange={setShowOptionDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editingOptionId ? "Edit Option" : "New Option"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Label (shown to user)</Label>
                            <Input
                                value={optionLabel}
                                onChange={(e) => {
                                    setOptionLabel(e.target.value);
                                    if (!editingOptionId) setOptionValue(e.target.value.toLowerCase().replace(/\s+/g, "_"));
                                }}
                                placeholder="Aries"
                                className="bg-black/20 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Value (sent to prompt)</Label>
                            <Input
                                value={optionValue}
                                onChange={(e) => setOptionValue(e.target.value)}
                                placeholder="aries"
                                className="bg-black/20 border-white/10 font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Display Order</Label>
                            <Input
                                type="number"
                                value={optionDisplayOrder}
                                onChange={(e) => setOptionDisplayOrder(parseInt(e.target.value) || 0)}
                                className="bg-black/20 border-white/10 w-24"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowOptionDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveOption} disabled={saving || !optionLabel.trim() || !optionValue.trim()}>
                            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
