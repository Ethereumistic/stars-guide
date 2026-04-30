"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Sparkles,
    CalendarDays,
    Loader2,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    Zap,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, eachDayOfInterval } from "date-fns";

const VALID_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
] as const;

const MODEL_OPTIONS = [
    { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast", provider: "xAI" },
    { id: "x-ai/grok-4.1", name: "Grok 4.1", provider: "xAI" },
    { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", provider: "Google" },
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google" },
    { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic" },
    { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "OpenAI" },
    { id: "arcee-ai/trinity-large-preview:free", name: "Trinity Large Preview", provider: "Arcee AI" },
];

const statusConfig = {
    running: { label: "Running", icon: Clock, color: "text-blue-400", bgColor: "bg-blue-400" },
    completed: { label: "Completed", icon: CheckCircle, color: "text-emerald-400", bgColor: "bg-emerald-400" },
    partial: { label: "Partial", icon: AlertTriangle, color: "text-amber-400", bgColor: "bg-amber-400" },
    failed: { label: "Failed", icon: XCircle, color: "text-red-400", bgColor: "bg-red-400" },
    cancelled: { label: "Cancelled", icon: XCircle, color: "text-gray-400", bgColor: "bg-gray-400" },
};

export default function GeneratorPage() {
    const zeitgeists = useQuery(api.admin.getZeitgeists);
    const startGeneration = useMutation(api.admin.startGeneration);

    // Form state
    const [selectedZeitgeistId, setSelectedZeitgeistId] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0].id);
    const [selectedSigns, setSelectedSigns] = useState<Set<string>>(new Set(VALID_SIGNS));
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(),
        to: addDays(new Date(), 6),
    });
    const [isGenerating, setIsGenerating] = useState(false);

    // Active job tracking
    const [activeJobId, setActiveJobId] = useState<Id<"generationJobs"> | null>(null);
    const activeJob = useQuery(
        api.admin.getJobProgress,
        activeJobId ? { jobId: activeJobId } : "skip"
    );

    // Compute target dates from range
    const targetDates = useMemo(() => {
        if (!dateRange.from || !dateRange.to) return [];
        return eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map(
            (d) => format(d, "yyyy-MM-dd")
        );
    }, [dateRange]);

    const toggleSign = (sign: string) => {
        const next = new Set(selectedSigns);
        if (next.has(sign)) {
            next.delete(sign);
        } else {
            next.add(sign);
        }
        setSelectedSigns(next);
    };

    const toggleAllSigns = () => {
        if (selectedSigns.size === VALID_SIGNS.length) {
            setSelectedSigns(new Set());
        } else {
            setSelectedSigns(new Set(VALID_SIGNS));
        }
    };

    const handleGenerate = async () => {
        if (!selectedZeitgeistId) {
            toast.error("Please select a Zeitgeist.");
            return;
        }
        if (selectedSigns.size === 0) {
            toast.error("Please select at least one sign.");
            return;
        }
        if (targetDates.length === 0) {
            toast.error("Please select a date range.");
            return;
        }

        setIsGenerating(true);
        try {
            const jobId = await startGeneration({
                zeitgeistId: selectedZeitgeistId as Id<"zeitgeists">,
                modelId: selectedModel,
                targetDates,
                targetSigns: Array.from(selectedSigns),
            });
            setActiveJobId(jobId);
            toast.success("Generation started! Watching progress...");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to start generation.");
        } finally {
            setIsGenerating(false);
        }
    };

    // Progress calculation
    const progressPercent = activeJob
        ? Math.round(((activeJob.progress.completed + activeJob.progress.failed) / activeJob.progress.total) * 100)
        : 0;

    const isJobActive = activeJob?.status === "running";

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-serif font-bold tracking-tight flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    Generation Desk
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Configure and trigger AI horoscope generation. The process runs server-side —
                    you can close this tab and return later.
                </p>
            </div>

            {/* Configuration */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Zeitgeist Selection */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Zeitgeist</CardTitle>
                        <CardDescription>Select the world vibe context for generation.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedZeitgeistId} onValueChange={setSelectedZeitgeistId}>
                            <SelectTrigger className="bg-background/50">
                                <SelectValue placeholder="Select a zeitgeist..." />
                            </SelectTrigger>
                            <SelectContent>
                                {zeitgeists?.map((z) => (
                                    <SelectItem key={z._id} value={z._id}>
                                        <div className="flex items-center gap-2">
                                            <span>{z.title}</span>
                                            <Badge variant="outline" className="text-xs">
                                                {z.isManual ? "Manual" : "AI"}
                                            </Badge>
                                            {z.validFrom && z.validUntil && (
                                                <span className="text-xs text-muted-foreground">
                                                    {z.validFrom} → {z.validUntil}
                                                </span>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* Freshness Badge */}
                        {selectedZeitgeistId && (() => {
                            const zg = zeitgeists?.find((z) => z._id === selectedZeitgeistId);
                            if (!zg?.validFrom || !zg?.validUntil) {
                                return (
                                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                        <span>⚪ No window set (legacy)</span>
                                    </div>
                                );
                            }
                            const allInRange = targetDates.every((d) => d >= zg.validFrom! && d <= zg.validUntil!);
                            const someOutOfRange = targetDates.some((d) => d < zg.validFrom! || d > zg.validUntil!);
                            const allOutOfRange = targetDates.every((d) => d < zg.validFrom! || d > zg.validUntil!);
                            if (allOutOfRange) {
                                return (
                                    <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs">
                                        <span>🔴 <strong>Stale:</strong> Zeitgeist was written for {zg.validFrom}–{zg.validUntil}. All target dates are outside this range.</span>
                                    </div>
                                );
                            }
                            if (someOutOfRange) {
                                const outDates = targetDates.filter((d) => d < zg.validFrom! || d > zg.validUntil!);
                                return (
                                    <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                                        <span>🟡 <strong>Partial:</strong> Some dates outside window: {outDates.join(", ")}</span>
                                    </div>
                                );
                            }
                            return (
                                <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400">
                                    <span>🟢 Fresh — all dates within zeitgeist window</span>
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>

                {/* Model Selection */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">LLM Model</CardTitle>
                        <CardDescription>Select the model for generation.</CardDescription>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                </Card>

                {/* Date Range */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            Date Range
                        </CardTitle>
                        <CardDescription>
                            {targetDates.length} day{targetDates.length !== 1 ? "s" : ""} selected
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal bg-background/50">
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    {dateRange.from && dateRange.to
                                        ? `${format(dateRange.from, "MMM d")} — ${format(dateRange.to, "MMM d, yyyy")}`
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
                                        } else if (range?.from) {
                                            setDateRange({ from: range.from, to: range.from });
                                        }
                                    }}
                                    numberOfMonths={1}
                                />
                            </PopoverContent>
                        </Popover>
                        <div className="mt-2 flex flex-wrap gap-1">
                            {targetDates.map((d) => (
                                <Badge key={d} variant="secondary" className="text-xs">
                                    {d}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Sign Selection */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Signs</CardTitle>
                                <CardDescription>{selectedSigns.size} of 12 selected</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={toggleAllSigns} className="text-xs">
                                {selectedSigns.size === VALID_SIGNS.length ? "Deselect All" : "Select All"}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-2">
                            {VALID_SIGNS.map((sign) => (
                                <label
                                    key={sign}
                                    className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors"
                                >
                                    <Checkbox
                                        checked={selectedSigns.has(sign)}
                                        onCheckedChange={() => toggleSign(sign)}
                                    />
                                    {sign}
                                </label>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Generate Button */}
            <div className="flex items-center gap-4">
                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || isJobActive || !selectedZeitgeistId || selectedSigns.size === 0}
                    size="lg"
                    className="gap-2"
                >
                    {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Zap className="h-4 w-4" />
                    )}
                    {isGenerating ? "Starting..." : "Generate Horoscopes"}
                </Button>
                <span className="text-xs text-muted-foreground">
                    {selectedSigns.size} signs × {targetDates.length} days = {selectedSigns.size * targetDates.length} horoscopes
                </span>
            </div>

            {/* Active Job Progress */}
            {activeJob && (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                {(() => {
                                    const config = statusConfig[activeJob.status];
                                    const Icon = config.icon;
                                    return (
                                        <>
                                            <Icon className={`h-4 w-4 ${config.color}`} />
                                            Generation Progress
                                        </>
                                    );
                                })()}
                            </CardTitle>
                            <Badge
                                variant={activeJob.status === "running" ? "default" : "secondary"}
                            >
                                {statusConfig[activeJob.status].label}
                            </Badge>
                        </div>
                        <CardDescription>
                            Model: {activeJob.modelId} · Started: {new Date(activeJob.startedAt).toLocaleTimeString()}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span>
                                    <span className="text-emerald-400 font-medium">
                                        {activeJob.progress.completed}
                                    </span>
                                    {" completed"}
                                    {activeJob.progress.failed > 0 && (
                                        <span className="text-red-400 ml-2">
                                            ({activeJob.progress.failed} failed)
                                        </span>
                                    )}
                                </span>
                                <span className="text-muted-foreground">
                                    {progressPercent}% ({activeJob.progress.completed + activeJob.progress.failed} / {activeJob.progress.total})
                                </span>
                            </div>
                            <Progress value={progressPercent} className="h-2" />
                        </div>

                        {/* Error List */}
                        {activeJob.errors && activeJob.errors.length > 0 && (
                            <div className="space-y-1 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <p className="text-xs font-medium text-red-400 flex items-center gap-1">
                                    <XCircle className="h-3 w-3" /> Errors
                                </p>
                                {activeJob.errors.map((err, i) => (
                                    <p key={i} className="text-xs text-red-300/80 pl-4">
                                        • {err}
                                    </p>
                                ))}
                            </div>
                        )}

                        {activeJob.completedAt && (
                            <p className="text-xs text-muted-foreground">
                                Completed at: {new Date(activeJob.completedAt).toLocaleString()}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
