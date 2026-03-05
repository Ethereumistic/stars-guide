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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
    Loader2,
    Save,
    Pencil,
    Plus,
    GripVertical,
} from "lucide-react";
import { toast } from "sonner";

export default function OracleCategoriesPage() {
    const categories = useQuery(api.oracle.categories.listAll);
    const createCategory = useMutation(api.oracle.categories.create);
    const updateCategory = useMutation(api.oracle.categories.update);

    const [showDialog, setShowDialog] = useState(false);
    const [editingId, setEditingId] = useState<Id<"oracle_categories"> | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formName, setFormName] = useState("");
    const [formSlug, setFormSlug] = useState("");
    const [formIcon, setFormIcon] = useState("");
    const [formColor, setFormColor] = useState("#9d4edd");
    const [formDescription, setFormDescription] = useState("");
    const [formDisplayOrder, setFormDisplayOrder] = useState(0);

    const openCreate = () => {
        setEditingId(null);
        setFormName("");
        setFormSlug("");
        setFormIcon("✦");
        setFormColor("#9d4edd");
        setFormDescription("");
        setFormDisplayOrder((categories?.length ?? 0) + 1);
        setShowDialog(true);
    };

    const openEdit = (cat: NonNullable<typeof categories>[number]) => {
        setEditingId(cat._id);
        setFormName(cat.name);
        setFormSlug(cat.slug);
        setFormIcon(cat.icon);
        setFormColor(cat.color);
        setFormDescription(cat.description ?? "");
        setFormDisplayOrder(cat.displayOrder);
        setShowDialog(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editingId) {
                await updateCategory({
                    id: editingId,
                    name: formName,
                    slug: formSlug,
                    icon: formIcon,
                    color: formColor,
                    description: formDescription || undefined,
                    displayOrder: formDisplayOrder,
                });
                toast.success("Category updated");
            } else {
                await createCategory({
                    name: formName,
                    slug: formSlug,
                    icon: formIcon,
                    color: formColor,
                    description: formDescription || "",
                    displayOrder: formDisplayOrder,
                });
                toast.success("Category created");
            }
            setShowDialog(false);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (id: Id<"oracle_categories">, currentActive: boolean) => {
        try {
            await updateCategory({ id, isActive: !currentActive });
            toast.success(`Category ${currentActive ? "deactivated" : "activated"}`);
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    // Auto-generate slug from name
    const handleNameChange = (name: string) => {
        setFormName(name);
        if (!editingId) {
            setFormSlug(name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
        }
    };

    if (!categories) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-serif font-bold">Categories</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage Oracle&apos;s domain badges. Soft deactivation only.
                    </p>
                </div>
                <Button onClick={openCreate} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Category
                </Button>
            </div>

            <Card className="bg-card/50 border-border/50">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border/50">
                                <TableHead className="w-12">#</TableHead>
                                <TableHead className="w-16">Icon</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead className="w-20">Color</TableHead>
                                <TableHead className="w-20 text-center">Active</TableHead>
                                <TableHead className="w-20 text-center">Order</TableHead>
                                <TableHead className="w-16"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories
                                .sort((a, b) => a.displayOrder - b.displayOrder)
                                .map((cat) => (
                                    <TableRow key={cat._id} className="border-border/30 hover:bg-white/3">
                                        <TableCell>
                                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-2xl">{cat.icon}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium">{cat.name}</span>
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-xs text-muted-foreground bg-black/20 px-2 py-0.5 rounded">
                                                {cat.slug}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-5 h-5 rounded-full border border-white/20"
                                                    style={{ backgroundColor: cat.color }}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Switch
                                                checked={cat.isActive}
                                                onCheckedChange={() => handleToggle(cat._id, cat.isActive)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-sm text-muted-foreground">{cat.displayOrder}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEdit(cat)}
                                                className="h-8 w-8"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? "Edit Category" : "New Category"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingId
                                ? "Update category details. Changes apply immediately."
                                : "Add a new Oracle domain category."
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                    value={formName}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="Self"
                                    className="bg-black/20 border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Slug</Label>
                                <Input
                                    value={formSlug}
                                    onChange={(e) => setFormSlug(e.target.value)}
                                    placeholder="self"
                                    className="bg-black/20 border-white/10 font-mono text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Icon (emoji)</Label>
                                <Input
                                    value={formIcon}
                                    onChange={(e) => setFormIcon(e.target.value)}
                                    placeholder="🔮"
                                    className="bg-black/20 border-white/10 text-xl text-center"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Color</Label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={formColor}
                                        onChange={(e) => setFormColor(e.target.value)}
                                        className="w-10 h-10 rounded cursor-pointer border-none bg-transparent"
                                    />
                                    <Input
                                        value={formColor}
                                        onChange={(e) => setFormColor(e.target.value)}
                                        className="bg-black/20 border-white/10 font-mono text-xs flex-1"
                                    />
                                </div>
                            </div>
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

                        <div className="space-y-2">
                            <Label>Description (admin reference)</Label>
                            <Textarea
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                placeholder="Internal notes about this category..."
                                className="bg-black/20 border-white/10 min-h-[80px]"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving || !formName.trim() || !formSlug.trim()}>
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
