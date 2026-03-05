"use client";

import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Loader2,
    Save,
    Pencil,
    Plus,
    GripVertical,
    Users,
} from "lucide-react";
import { toast } from "sonner";

export default function OracleTemplatesPage() {
    const categories = useQuery(api.oracle.categories.listAll);
    const allTemplates = useQuery(api.oracle.templates.listAll, {});
    const createTemplate = useMutation(api.oracle.templates.create);
    const updateTemplate = useMutation(api.oracle.templates.update);

    const [activeTab, setActiveTab] = useState("all");
    const [showDialog, setShowDialog] = useState(false);
    const [editingId, setEditingId] = useState<Id<"oracle_templates"> | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formCategoryId, setFormCategoryId] = useState<string>("");
    const [formQuestionText, setFormQuestionText] = useState("");
    const [formShortLabel, setFormShortLabel] = useState("");
    const [formRequiresThirdParty, setFormRequiresThirdParty] = useState(false);
    const [formDisplayOrder, setFormDisplayOrder] = useState(0);

    const filteredTemplates = allTemplates?.filter((t) => {
        if (activeTab === "all") return true;
        return t.categoryId === activeTab;
    }).sort((a, b) => a.displayOrder - b.displayOrder);

    const getCategoryName = (catId: Id<"oracle_categories">) =>
        categories?.find((c) => c._id === catId)?.name ?? "Unknown";

    const getCategoryIcon = (catId: Id<"oracle_categories">) =>
        categories?.find((c) => c._id === catId)?.icon ?? "✦";

    const openCreate = () => {
        setEditingId(null);
        setFormCategoryId(activeTab !== "all" ? activeTab : "");
        setFormQuestionText("");
        setFormShortLabel("");
        setFormRequiresThirdParty(false);
        setFormDisplayOrder(0);
        setShowDialog(true);
    };

    const openEdit = (tpl: NonNullable<typeof allTemplates>[number]) => {
        setEditingId(tpl._id);
        setFormCategoryId(tpl.categoryId);
        setFormQuestionText(tpl.questionText);
        setFormShortLabel(tpl.shortLabel ?? "");
        setFormRequiresThirdParty(tpl.requiresThirdParty);
        setFormDisplayOrder(tpl.displayOrder);
        setShowDialog(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editingId) {
                await updateTemplate({
                    id: editingId,
                    questionText: formQuestionText,
                    shortLabel: formShortLabel || undefined,
                    requiresThirdParty: formRequiresThirdParty,
                    displayOrder: formDisplayOrder,
                });
                toast.success("Template updated");
            } else {
                await createTemplate({
                    categoryId: formCategoryId as Id<"oracle_categories">,
                    questionText: formQuestionText,
                    shortLabel: formShortLabel || "",
                    requiresThirdParty: formRequiresThirdParty,
                    displayOrder: formDisplayOrder,
                });
                toast.success("Template created");
            }
            setShowDialog(false);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (id: Id<"oracle_templates">, currentActive: boolean) => {
        try {
            await updateTemplate({ id, isActive: !currentActive });
            toast.success(`Template ${currentActive ? "deactivated" : "activated"}`);
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
        <div className="space-y-6 max-w-6xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-serif font-bold">Templates</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage template questions per category
                    </p>
                </div>
                <Button onClick={openCreate} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Template
                </Button>
            </div>

            {/* Category Tab Bar */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex-wrap h-auto gap-1 p-1">
                    <TabsTrigger value="all" className="text-xs">
                        All ({allTemplates.length})
                    </TabsTrigger>
                    {categories
                        .filter((c) => c.isActive)
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((cat) => {
                            const count = allTemplates.filter((t) => t.categoryId === cat._id).length;
                            return (
                                <TabsTrigger key={cat._id} value={cat._id} className="text-xs gap-1.5">
                                    <span>{cat.icon}</span>
                                    {cat.name} ({count})
                                </TabsTrigger>
                            );
                        })}
                </TabsList>
            </Tabs>

            {/* Templates Table */}
            <Card className="bg-card/50 border-border/50">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border/50">
                                <TableHead className="w-12"></TableHead>
                                <TableHead className="w-16">Category</TableHead>
                                <TableHead>Question</TableHead>
                                <TableHead className="w-28 text-center">3rd Party</TableHead>
                                <TableHead className="w-20 text-center">Active</TableHead>
                                <TableHead className="w-16 text-center">Order</TableHead>
                                <TableHead className="w-16"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTemplates?.map((tpl) => (
                                <TableRow key={tpl._id} className="border-border/30 hover:bg-white/3">
                                    <TableCell>
                                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                                    </TableCell>
                                    <TableCell>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <span className="text-xl">{getCategoryIcon(tpl.categoryId)}</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {getCategoryName(tpl.categoryId)}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-medium">{tpl.questionText}</span>
                                        {tpl.shortLabel && (
                                            <span className="block text-xs text-muted-foreground mt-0.5">{tpl.shortLabel}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {tpl.requiresThirdParty ? (
                                            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 gap-1">
                                                <Users className="w-3 h-3" />
                                                3rd Party
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={tpl.isActive}
                                            onCheckedChange={() => handleToggle(tpl._id, tpl.isActive)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="text-sm text-muted-foreground">{tpl.displayOrder}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEdit(tpl)}
                                            className="h-8 w-8"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredTemplates?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No templates found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? "Edit Template" : "New Template"}
                        </DialogTitle>
                        <DialogDescription>
                            Template questions are shown to users as pre-built options.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                                <SelectTrigger className="bg-black/20 border-white/10">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories
                                        .filter((c) => c.isActive)
                                        .map((cat) => (
                                            <SelectItem key={cat._id} value={cat._id}>
                                                {cat.icon} {cat.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Question Text</Label>
                            <Input
                                value={formQuestionText}
                                onChange={(e) => setFormQuestionText(e.target.value)}
                                placeholder="AM I BEING TRUE TO MYSELF?"
                                className="bg-black/20 border-white/10"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Short Label (admin display)</Label>
                            <Input
                                value={formShortLabel}
                                onChange={(e) => setFormShortLabel(e.target.value)}
                                placeholder="True self"
                                className="bg-black/20 border-white/10"
                            />
                        </div>

                        <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/15 rounded-lg p-4">
                            <div className="flex-1">
                                <Label className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-amber-400" />
                                    Requires Third-Party Context
                                </Label>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Turn on if Oracle needs to ask about another person.
                                    Off = uses the user&apos;s chart directly.
                                </p>
                            </div>
                            <Switch
                                checked={formRequiresThirdParty}
                                onCheckedChange={setFormRequiresThirdParty}
                            />
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
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving || !formQuestionText.trim() || !formCategoryId}>
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            {editingId ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
