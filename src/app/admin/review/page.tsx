"use client";

import { useState, useMemo, Fragment } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ClipboardCheck,
    CalendarDays,
    Loader2,
    Eye,
    Send,
    AlertTriangle,
    Pencil,
    Trash2,
    Save,
    X,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, eachDayOfInterval } from "date-fns";

const VALID_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
] as const;

const statusConfig = {
    draft: { label: "Draft", dot: "bg-amber-500", badge: "outline" as const },
    published: { label: "Published", dot: "bg-emerald-500", badge: "secondary" as const },
    failed: { label: "Failed", dot: "bg-red-500", badge: "destructive" as const },
};

export default function ReviewPage() {
    const publishHoroscopes = useMutation(api.admin.publishHoroscopes);
    const updateContent = useMutation(api.admin.updateHoroscopeContent);
    const deleteHoroscope = useMutation(api.admin.deleteHoroscope);

    // Date range for fetching
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(),
        to: addDays(new Date(), 6),
    });

    // Active date filter
    const [activeDateFilter, setActiveDateFilter] = useState<string>("all");

    const allDates = useMemo(() => {
        if (!dateRange.from || !dateRange.to) return [];
        return eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map(
            (d) => format(d, "yyyy-MM-dd")
        );
    }, [dateRange]);

    // Fetch horoscopes
    const horoscopes = useQuery(
        api.admin.getHoroscopesByDate,
        allDates.length > 0 ? { dates: allDates } : "skip"
    );

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // View mode
    const [viewMode, setViewMode] = useState<"table" | "matrix">("table");

    // Expanded rows (set of IDs)
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; sign: string; date: string } | null>(null);

    // Filter horoscopes by active date
    const filteredHoroscopes = useMemo(() => {
        if (!horoscopes) return undefined;
        if (activeDateFilter === "all") return horoscopes;
        return horoscopes.filter((h) => h.targetDate === activeDateFilter);
    }, [horoscopes, activeDateFilter]);

    // Coverage matrix map
    const horoscopeMap = useMemo(() => {
        const map = new Map<string, NonNullable<typeof horoscopes>[number]>();
        horoscopes?.forEach((h) => {
            map.set(`${h.sign}-${h.targetDate}`, h);
        });
        return map;
    }, [horoscopes]);

    // Bulk selection helpers
    const allDrafts = filteredHoroscopes?.filter((h) => h.status === "draft") || [];
    const allDraftsSelected = allDrafts.length > 0 && allDrafts.every((h) => selectedIds.has(h._id));

    const hasMissingEntries = useMemo(() => {
        for (const date of allDates) {
            for (const sign of VALID_SIGNS) {
                const h = horoscopeMap.get(`${sign}-${date}`);
                if (!h || h.status === "failed") return true;
            }
        }
        return false;
    }, [horoscopeMap, allDates]);

    // ───── Handlers ─────

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (allDraftsSelected) setSelectedIds(new Set());
        else setSelectedIds(new Set(allDrafts.map((h) => h._id)));
    };

    const toggleExpand = (id: string) => {
        const next = new Set(expandedRows);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedRows(next);
    };

    const handlePublish = async () => {
        if (selectedIds.size === 0) return toast.error("No horoscopes selected.");
        try {
            await publishHoroscopes({ horoscopeIds: Array.from(selectedIds) as Id<"horoscopes">[] });
            toast.success(`Published ${selectedIds.size} horoscope(s).`);
            setSelectedIds(new Set());
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to publish.");
        }
    };

    const startEditing = (id: string, content: string) => {
        setEditingId(id);
        setEditContent(content);
        // Auto-expand the row when editing
        setExpandedRows((prev) => new Set(prev).add(id));
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditContent("");
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            await updateContent({ horoscopeId: editingId as Id<"horoscopes">, content: editContent });
            toast.success("Content updated. Status reset to draft.");
            setEditingId(null);
            setEditContent("");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update.");
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteHoroscope({ horoscopeId: deleteTarget.id as Id<"horoscopes"> });
            toast.success(`Deleted ${deleteTarget.sign} — ${deleteTarget.date}.`);
            setDeleteTarget(null);
            selectedIds.delete(deleteTarget.id);
            setSelectedIds(new Set(selectedIds));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete.");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-serif font-bold tracking-tight flex items-center gap-2">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                    Review & Publish
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Review generated horoscopes, edit content inline, and publish to the live site.
                </p>
            </div>

            {/* Controls Row */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Date Range Picker */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 bg-background/50">
                            <CalendarDays className="h-4 w-4" />
                            {dateRange.from && dateRange.to
                                ? `${format(dateRange.from, "MMM d")} — ${format(dateRange.to, "MMM d")}`
                                : "Select dates"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={(range) => {
                                if (range?.from && range?.to) {
                                    setDateRange({ from: range.from, to: range.to });
                                    setActiveDateFilter("all");
                                } else if (range?.from) {
                                    setDateRange({ from: range.from, to: range.from });
                                    setActiveDateFilter("all");
                                }
                            }}
                            numberOfMonths={1}
                        />
                    </PopoverContent>
                </Popover>

                {/* Date Filter Dropdown */}
                <Select value={activeDateFilter} onValueChange={setActiveDateFilter}>
                    <SelectTrigger className="w-[170px] h-9 text-xs bg-background/50">
                        <SelectValue placeholder="Filter by date" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All dates ({allDates.length})</SelectItem>
                        {allDates.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-md">
                    <Button
                        variant={viewMode === "table" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("table")}
                        className="text-xs h-7 px-3"
                    >
                        Table
                    </Button>
                    <Button
                        variant={viewMode === "matrix" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("matrix")}
                        className="text-xs h-7 px-3"
                    >
                        Matrix
                    </Button>
                </div>

                {/* Bulk Actions */}
                <div className="ml-auto flex items-center gap-2">
                    {selectedIds.size > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {selectedIds.size} selected
                        </Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={toggleSelectAll} className="text-xs h-8">
                        {allDraftsSelected ? "Deselect All" : "Select All Drafts"}
                    </Button>
                    <Button
                        onClick={handlePublish}
                        disabled={selectedIds.size === 0}
                        size="sm"
                        className="gap-1 h-8"
                    >
                        <Send className="h-3 w-3" />
                        Publish ({selectedIds.size})
                    </Button>
                </div>
            </div>

            {/* Loading */}
            {filteredHoroscopes === undefined && (
                <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading horoscopes...</span>
                </div>
            )}

            {/* ═══════════ DATA TABLE VIEW ═══════════ */}
            {filteredHoroscopes !== undefined && viewMode === "table" && (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-0">
                        {filteredHoroscopes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <Eye className="h-8 w-8 text-muted-foreground mb-3" />
                                <p className="text-muted-foreground text-sm">
                                    No horoscopes found for the selected date{activeDateFilter !== "all" ? ` (${activeDateFilter})` : "s"}.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-border/30 hover:bg-transparent">
                                            <TableHead className="w-10 pl-4"></TableHead>
                                            <TableHead className="w-8"></TableHead>
                                            <TableHead className="w-24 text-xs">Status</TableHead>
                                            <TableHead className="w-28 text-xs">Sign</TableHead>
                                            <TableHead className="w-28 text-xs">Date</TableHead>
                                            <TableHead className="text-xs">Content</TableHead>
                                            <TableHead className="w-20 text-right text-xs">Chars</TableHead>
                                            <TableHead className="w-24 text-right text-xs pr-4">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredHoroscopes.map((h) => {
                                            const charCount = h.content.length;
                                            const isUnder = charCount < 330;
                                            const isOver = charCount > 460;
                                            const isOutOfRange = isUnder || isOver;
                                            const isExpanded = expandedRows.has(h._id);
                                            const isEditing = editingId === h._id;
                                            const config = statusConfig[h.status];

                                            return (
                                                <Fragment key={h._id}>
                                                    {/* ── Main Row ── */}
                                                    <TableRow
                                                        className={`border-border/20 cursor-pointer transition-colors ${isExpanded ? "bg-muted/30" : "hover:bg-muted/20"
                                                            }`}
                                                        onClick={() => {
                                                            if (!isEditing) toggleExpand(h._id);
                                                        }}
                                                    >
                                                        {/* Checkbox */}
                                                        <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                                                            {h.status === "draft" && (
                                                                <Checkbox
                                                                    checked={selectedIds.has(h._id)}
                                                                    onCheckedChange={() => toggleSelect(h._id)}
                                                                />
                                                            )}
                                                        </TableCell>

                                                        {/* Expand Chevron */}
                                                        <TableCell className="px-0">
                                                            {isExpanded ? (
                                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </TableCell>

                                                        {/* Status */}
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`h-2 w-2 rounded-full shrink-0 ${config.dot}`} />
                                                                <span className="text-xs">{config.label}</span>
                                                            </div>
                                                        </TableCell>

                                                        {/* Sign */}
                                                        <TableCell className="font-medium text-sm">
                                                            {h.sign}
                                                        </TableCell>

                                                        {/* Date */}
                                                        <TableCell>
                                                            <span className="text-xs font-mono text-muted-foreground">
                                                                {h.targetDate}
                                                            </span>
                                                        </TableCell>

                                                        {/* Content Preview (single line, truncated) */}
                                                        <TableCell className="max-w-md">
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {h.content}
                                                            </p>
                                                        </TableCell>

                                                        {/* Char Count */}
                                                        <TableCell className="text-right">
                                                            <span
                                                                className={`text-xs font-mono ${isOutOfRange
                                                                        ? "text-red-400 font-semibold"
                                                                        : "text-muted-foreground"
                                                                    }`}
                                                            >
                                                                {charCount}
                                                                {isUnder && " ↓"}
                                                                {isOver && " ↑"}
                                                            </span>
                                                        </TableCell>

                                                        {/* Actions */}
                                                        <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    title="Edit"
                                                                    onClick={() => startEditing(h._id, h.content)}
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                                    title="Delete"
                                                                    onClick={() =>
                                                                        setDeleteTarget({
                                                                            id: h._id,
                                                                            sign: h.sign,
                                                                            date: h.targetDate,
                                                                        })
                                                                    }
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* ── Expanded Sub-Row (accordion-like) ── */}
                                                    {isExpanded && (
                                                        <TableRow className="bg-muted/20 hover:bg-muted/20 border-border/10">
                                                            <TableCell colSpan={8} className="px-6 py-4">
                                                                {isEditing ? (
                                                                    /* ── Editing Mode ── */
                                                                    <div className="space-y-3">
                                                                        <Textarea
                                                                            value={editContent}
                                                                            onChange={(e) => setEditContent(e.target.value)}
                                                                            className="min-h-[140px] text-sm font-mono leading-relaxed bg-background/60 border-border/40"
                                                                            autoFocus
                                                                        />
                                                                        <div className="flex items-center justify-between">
                                                                            <Badge
                                                                                variant={
                                                                                    editContent.length < 330 || editContent.length > 460
                                                                                        ? "destructive"
                                                                                        : "secondary"
                                                                                }
                                                                                className="text-xs font-mono"
                                                                            >
                                                                                {editContent.length} / 330-460 chars
                                                                            </Badge>
                                                                            <div className="flex items-center gap-2">
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={cancelEditing}
                                                                                    className="gap-1 text-xs h-7"
                                                                                >
                                                                                    <X className="h-3 w-3" /> Cancel
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    onClick={saveEdit}
                                                                                    className="gap-1 text-xs h-7"
                                                                                >
                                                                                    <Save className="h-3 w-3" /> Save
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    /* ── Read-only Expanded View ── */
                                                                    <div className="space-y-2">
                                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                                            {h.content}
                                                                        </p>
                                                                        <div className="flex items-center gap-3 pt-1">
                                                                            <Badge variant="outline" className="text-xs font-mono">
                                                                                {charCount} characters
                                                                            </Badge>
                                                                            {isOutOfRange && (
                                                                                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                                                                    <AlertTriangle className="h-3 w-3" />
                                                                                    {isUnder ? "Below 330 minimum" : "Exceeds 460 maximum"}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ═══════════ COVERAGE MATRIX VIEW ═══════════ */}
            {filteredHoroscopes !== undefined && viewMode === "matrix" && (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Coverage Matrix</CardTitle>
                        <CardDescription>
                            12 signs × {allDates.length} days. 🟢 published · 🟡 draft · 🔴 missing/failed
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-28 sticky left-0 bg-card/90 backdrop-blur-sm z-10">Sign</TableHead>
                                        {allDates.map((d) => (
                                            <TableHead key={d} className="text-center text-xs font-mono min-w-[80px]">
                                                {d.slice(5)}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {VALID_SIGNS.map((sign) => (
                                        <TableRow key={sign}>
                                            <TableCell className="font-medium text-sm sticky left-0 bg-card/90 backdrop-blur-sm z-10">
                                                {sign}
                                            </TableCell>
                                            {allDates.map((date) => {
                                                const h = horoscopeMap.get(`${sign}-${date}`);
                                                let color = "bg-red-500/20 border-red-500/30";
                                                let emoji = "🔴";
                                                let tooltipText = "Missing";

                                                if (h) {
                                                    if (h.status === "published") {
                                                        color = "bg-emerald-500/20 border-emerald-500/30";
                                                        emoji = "🟢";
                                                        tooltipText = `Published (${h.content.length} chars)`;
                                                    } else if (h.status === "draft") {
                                                        color = "bg-amber-500/20 border-amber-500/30";
                                                        emoji = "🟡";
                                                        tooltipText = `Draft (${h.content.length} chars)`;
                                                    } else {
                                                        tooltipText = "Failed";
                                                    }
                                                }

                                                return (
                                                    <TableCell key={`${sign}-${date}`} className="text-center" title={tooltipText}>
                                                        <div className={`mx-auto h-8 w-8 rounded border ${color} flex items-center justify-center text-xs cursor-default`}>
                                                            {emoji}
                                                        </div>
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Missing coverage warning */}
            {hasMissingEntries && viewMode === "matrix" && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-400">
                        <strong>Missing Coverage:</strong> Some sign/date combinations are missing or failed.
                        Regenerate them from the Generation Desk.
                    </p>
                </div>
            )}

            {/* ═══════════ DELETE CONFIRMATION DIALOG ═══════════ */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Horoscope</DialogTitle>
                        <DialogDescription>
                            Permanently delete the horoscope for{" "}
                            <strong>{deleteTarget?.sign}</strong> on <strong>{deleteTarget?.date}</strong>?
                            This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} className="gap-1">
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
