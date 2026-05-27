"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Loader2,
    RefreshCw,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    Edit3,
    Sparkles,
    CalendarDays,
    RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { compositionalSigns } from "@/astrology/signs";

const SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

// ── Element color map (hex values from CSS vars) ──────────────────────────
const ELEMENT_COLORS: Record<string, string> = {
    Fire: "#FF6B35",
    Earth: "#2D5016",
    Air: "#87CEEB",
    Water: "#1E90FF",
};

// ── Sign → Element lookup ────────────────────────────────────────────────
const SIGN_ELEMENT: Record<string, string> = {};
for (const s of compositionalSigns) {
    SIGN_ELEMENT[s.name] = s.element;
}

function getTodayUTC(): string {
    return new Date().toISOString().split("T")[0];
}

export default function HoroscopeAdminPage() {
    // ── Data ──────────────────────────────────────────────────────────────
    const [selectedDate, setSelectedDate] = useState(getTodayUTC());
    const [selectedSign, setSelectedSign] = useState<string | null>(null);
    const [selectedSigns, setSelectedSigns] = useState<Set<string>>(new Set());

    const horoscopes = useQuery(api.horoscopes.admin.listHoroscopesForDate, { date: selectedDate });
    const failedGens = useQuery(api.horoscopes.admin.getFailedGenerations, {});

    // Mutations & actions
    const retryMutation = useAction(api.horoscopes.admin.retryFailedGeneration);
    const overrideMutation = useMutation(api.horoscopes.admin.overrideHoroscope);
    const recomputeMutation = useAction(api.horoscopes.admin.recomputeAstrologyContext);
    const generateAllMutation = useAction(api.horoscopes.admin.triggerDailyGeneration);
    const generateSelectedMutation = useAction(api.horoscopes.admin.triggerGenerationForSigns);

    // UI state
    const [retryingSign, setRetryingSign] = useState<string | null>(null);
    const [isRecomputing, setIsRecomputing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
    const [overrideForm, setOverrideForm] = useState({
        date: getTodayUTC(),
        sign: "Aries",
        hook: "",
        bodyText: "",
        mantra: "",
        vibe: "",
        powerMove: "",
        blindSpot: "",
        luckySpark: "",
        domainScores: "",
    });

    // ── Build maps ────────────────────────────────────────────────────────
    const signMap = new Map<string, any>();
    if (horoscopes) {
        for (const h of horoscopes) {
            signMap.set(h.sign, h);
        }
    }

    const selectedHoroscope = selectedSign ? signMap.get(selectedSign) : null;

    const counts = { generated: 0, pending: 0, failed: 0, overridden: 0, missing: 0 };
    for (const sign of SIGNS) {
        const h = signMap.get(sign);
        if (h) {
            counts[h.status as keyof typeof counts]++;
        } else {
            counts.missing++;
        }
    }

    // ── Sign selection helpers ─────────────────────────────────────────────
    const toggleSign = (sign: string) => {
        setSelectedSigns(prev => {
            const next = new Set(prev);
            if (next.has(sign)) next.delete(sign);
            else next.add(sign);
            return next;
        });
    };

    const selectAll = () => setSelectedSigns(new Set(SIGNS));
    const selectNone = () => setSelectedSigns(new Set());
    const isAllSelected = selectedSigns.size === SIGNS.length;

    // ── Handlers ──────────────────────────────────────────────────────────
    const handleRecompute = async () => {
        setIsRecomputing(true);
        try {
            await recomputeMutation({ date: selectedDate });
            toast.success("Context recomputation scheduled.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to recompute context.");
        } finally {
            setIsRecomputing(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            if (selectedSigns.size > 0 && selectedSigns.size < 12) {
                const signsArray = Array.from(selectedSigns);
                await generateSelectedMutation({ date: selectedDate, signs: signsArray });
                toast.success(`Generation started for ${signsArray.length} selected sign${signsArray.length > 1 ? "s" : ""} on ${selectedDate}.`);
            } else {
                await generateAllMutation({ date: selectedDate });
                toast.success(`Generation started for all 12 signs on ${selectedDate}.`);
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to trigger generation.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRetry = async (date: string, sign: string) => {
        setRetryingSign(sign);
        try {
            await retryMutation({ date, sign });
            toast.success(`Retry scheduled for ${sign}.`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to retry.");
        } finally {
            setRetryingSign(null);
        }
    };

    const handleOverride = async () => {
        try {
            await overrideMutation({
                date: overrideForm.date,
                sign: overrideForm.sign,
                content: {
                    hook: overrideForm.hook,
                    bodyText: overrideForm.bodyText,
                    mantra: overrideForm.mantra || undefined,
                    dailyPillars: {
                        vibe: overrideForm.vibe || "shifting",
                        powerMove: overrideForm.powerMove || "Take the next step",
                        blindSpot: overrideForm.blindSpot || "The obvious path",
                        luckySpark: overrideForm.luckySpark || "An unexpected opening",
                    },
                    domainScores: overrideForm.domainScores
                        ? JSON.parse(overrideForm.domainScores)
                        : [
                            { name: "Love", score: 50 },
                            { name: "Career", score: 50 },
                            { name: "Health", score: 50 },
                            { name: "Social", score: 50 },
                        ],
                },
            });
            toast.success(`Override saved for ${overrideForm.sign} on ${overrideForm.date}.`);
            setOverrideDialogOpen(false);
            setOverrideForm({
                date: getTodayUTC(), sign: "Aries", hook: "", bodyText: "",
                mantra: "", vibe: "", powerMove: "", blindSpot: "", luckySpark: "", domainScores: "",
            });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to override.");
        }
    };

    // ── Status icon renderer ─────────────────────────────────────────────
    const renderStatusIcon = (status: string | undefined) => {
        switch (status) {
            case "generated":
                return <CheckCircle className="h-4 w-4 text-primary" />;
            case "failed":
                return <XCircle className="h-4 w-4 text-destructive" />;
            case "pending":
                return <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />;
            case "overridden":
                return <Edit3 className="h-4 w-4 text-amber-500" />;
            default:
                return <AlertTriangle className="h-4 w-4 text-muted-foreground/40" />;
        }
    };

    // ── Generate button label ────────────────────────────────────────────
    const generateLabel = selectedSigns.size > 0 && selectedSigns.size < 12
        ? `Generate ${selectedSigns.size}`
        : "Generate All 12";

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-serif font-bold tracking-tight">Horoscopes</h1>
                <p className="text-muted-foreground mt-1">Generate, monitor, and override daily horoscopes for all 12 signs.</p>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-[140px] h-8 text-sm bg-transparent border-0 p-0 focus:ring-0"
                    />
                </div>
                <Button
                    size="sm"
                    onClick={handleGenerate}
                    disabled={isGenerating || !selectedDate}
                    className="gap-2"
                >
                    {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {isGenerating ? "Starting..." : generateLabel}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRecompute}
                    disabled={isRecomputing}
                    className="gap-2"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRecomputing ? "animate-spin" : ""}`} />
                    {isRecomputing ? "Scheduling..." : "Recompute Context"}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOverrideDialogOpen(true)}
                    className="gap-2"
                >
                    <Edit3 className="h-3.5 w-3.5" />
                    Override
                </Button>

                {selectedSigns.size > 0 && (
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-muted-foreground">{selectedSigns.size} selected</span>
                        <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
                            All
                        </Button>
                        <Button variant="ghost" size="sm" onClick={selectNone} className="text-xs h-7">
                            None
                        </Button>
                    </div>
                )}
                {selectedSigns.size === 0 && (
                    <div className="flex items-center gap-2 ml-auto">
                        <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
                            Select All
                        </Button>
                    </div>
                )}
            </div>

            {/* Summary */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {renderStatusIcon("generated")}
                    <span>{counts.generated}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {renderStatusIcon("pending")}
                    <span>{counts.pending}</span>
                </div>
                {counts.failed > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive">
                        {renderStatusIcon("failed")}
                        <span>{counts.failed}</span>
                    </div>
                )}
                {counts.overridden > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-500">
                        {renderStatusIcon("overridden")}
                        <span>{counts.overridden}</span>
                    </div>
                )}
                {counts.missing > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                        {renderStatusIcon(undefined)}
                        <span>{counts.missing} not queued</span>
                    </div>
                )}
            </div>

            {/* Failed Generations */}
            {failedGens && failedGens.length > 0 && (
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold flex items-center gap-2 text-red-400">
                        <XCircle className="h-4 w-4" /> Failed
                    </h2>
                    <div className="space-y-2">
                        {failedGens.map((h: any) => (
                            <div key={h._id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-red-400" />
                                    <span className="text-sm font-medium">{h.sign} — {h.date}</span>
                                    {h.errors?.length > 0 && <span className="text-xs text-red-300/80 truncate max-w-[300px]">{h.errors.join("; ")}</span>}
                                </div>
                                <Button variant="outline" size="sm" onClick={() => handleRetry(h.date, h.sign)} disabled={retryingSign === h.sign} className="gap-1 h-7 text-xs">
                                    {retryingSign === h.sign ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                                    Retry
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sign Grid */}
            {horoscopes === undefined ? (
                <div className="flex items-center gap-2 text-muted-foreground py-10">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading horoscopes...</span>
                </div>
            ) : (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {SIGNS.map((sign) => {
                        const h = signMap.get(sign);
                        const isSelected = selectedSigns.has(sign);
                        const element = SIGN_ELEMENT[sign] ?? "Fire";
                        const elementColor = ELEMENT_COLORS[element] ?? "#888";
                        const signUi = zodiacUIConfig[sign.toLowerCase()];
                        const ZodiacIcon = signUi?.icon;

                        return (
                            <div
                                key={sign}
                                className={`
                                    group relative cursor-pointer rounded-lg border bg-card/50 backdrop-blur-sm
                                    transition-all duration-200 overflow-hidden
                                    ${isSelected
                                        ? "border-primary/60 ring-1 ring-primary/30"
                                        : "border-border/50 hover:border-border"
                                    }
                                `}
                                onClick={() => setSelectedSign(sign)}
                            >
                                {/* Element color accent line */}
                                <div
                                    className="absolute top-0 left-0 right-0 h-0.5"
                                    style={{ backgroundColor: elementColor }}
                                />

                                <div className="p-3 flex flex-col gap-3">
                                    {/* Row 1: checkbox, zodiac icon, status icon */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onClick={(e) => { e.stopPropagation(); toggleSign(sign); }}
                                                onChange={() => {}}
                                                className="h-3.5 w-3.5 rounded border-border accent-primary"
                                            />
                                            {ZodiacIcon && (
                                                <ZodiacIcon
                                                    className="w-5 h-5"
                                                    style={{ color: elementColor }}
                                                    strokeWidth={1.5}
                                                />
                                            )}
                                            <span className="text-sm font-semibold leading-none">{sign}</span>
                                        </div>
                                        {renderStatusIcon(h?.status)}
                                    </div>

                                    {/* Row 2: Meta info — badges for time, duration, model */}
                                    {h ? (
                                        <div className="flex flex-wrap gap-1">
                                            {h.generatedAt && (
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                                                    {new Date(h.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </Badge>
                                            )}
                                            {h.generationDurationMs != null && (
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                                                    {(h.generationDurationMs / 1000).toFixed(1)}s
                                                </Badge>
                                            )}
                                            {h.modelUsed && (
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 truncate max-w-[90px]">
                                                    {h.modelUsed}
                                                </Badge>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground/50">Not queued</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Detail Dialog ────────────────────────────────────────────── */}
            <Dialog open={!!selectedSign} onOpenChange={(open) => !open && setSelectedSign(null)}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedSign} — {selectedDate}</DialogTitle>
                    </DialogHeader>
                    {selectedHoroscope ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Badge variant={selectedHoroscope.status === "generated" ? "default" : selectedHoroscope.status === "failed" ? "destructive" : selectedHoroscope.status === "overridden" ? "secondary" : "outline"}>
                                    {selectedHoroscope.status}
                                </Badge>
                                {selectedHoroscope.modelUsed && (
                                    <span className="text-xs text-muted-foreground">Model: {selectedHoroscope.modelUsed}</span>
                                )}
                            </div>
                            {selectedHoroscope.generatedAt && (
                                <p className="text-xs text-muted-foreground">
                                    Generated: {new Date(selectedHoroscope.generatedAt).toLocaleString()}
                                    {selectedHoroscope.generationDurationMs != null && ` (${(selectedHoroscope.generationDurationMs / 1000).toFixed(1)}s)`}
                                </p>
                            )}
                            {selectedHoroscope.content && (
                                <div className="space-y-3">
                                    {selectedHoroscope.content.hook && (
                                        <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Hook</p><p className="text-sm font-medium">{selectedHoroscope.content.hook}</p></div>
                                    )}
                                    {selectedHoroscope.content.bodyText && (
                                        <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Body</p><p className="text-sm">{selectedHoroscope.content.bodyText}</p></div>
                                    )}
                                    {!selectedHoroscope.content.hook && selectedHoroscope.content.insight && (
                                        <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Insight</p><p className="text-sm">{selectedHoroscope.content.insight}</p></div>
                                    )}
                                    {!selectedHoroscope.content.bodyText && selectedHoroscope.content.energy && (
                                        <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Energy</p><p className="text-sm">{selectedHoroscope.content.energy}</p></div>
                                    )}
                                    {!selectedHoroscope.content.bodyText && selectedHoroscope.content.navigate && (
                                        <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Navigate</p><p className="text-sm">{selectedHoroscope.content.navigate}</p></div>
                                    )}
                                    {selectedHoroscope.content.mantra && (
                                        <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Mantra</p><p className="text-sm italic">{selectedHoroscope.content.mantra}</p></div>
                                    )}
                                    {selectedHoroscope.content.dailyPillars && (
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <div className="p-2 rounded bg-muted/50"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Vibe</p><p className="text-sm">{selectedHoroscope.content.dailyPillars.vibe}</p></div>
                                            <div className="p-2 rounded bg-muted/50"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Power Move</p><p className="text-sm">{selectedHoroscope.content.dailyPillars.powerMove}</p></div>
                                            <div className="p-2 rounded bg-muted/50"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Blind Spot</p><p className="text-sm">{selectedHoroscope.content.dailyPillars.blindSpot}</p></div>
                                            <div className="p-2 rounded bg-muted/50"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lucky Spark</p><p className="text-sm">{selectedHoroscope.content.dailyPillars.luckySpark}</p></div>
                                        </div>
                                    )}
                                    {selectedHoroscope.content.domainScores && Array.isArray(selectedHoroscope.content.domainScores) && (
                                        <div className="space-y-1 mt-2">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Domain Scores</p>
                                            <div className="grid grid-cols-2 gap-1">
                                                {selectedHoroscope.content.domainScores.map((d: any, i: number) => (
                                                    <div key={i} className="flex items-center justify-between px-2 py-1 rounded bg-muted/50"><span className="text-xs">{d.name}</span><span className="text-xs font-mono">{d.score}</span></div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {selectedHoroscope.content.cosmicDetails && !selectedHoroscope.content.dailyPillars && (
                                        <div className="space-y-1 mt-2"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cosmic Details</p><p className="text-sm text-muted-foreground">{JSON.stringify(selectedHoroscope.content.cosmicDetails)}</p></div>
                                    )}
                                </div>
                            )}
                            {selectedHoroscope.errors && selectedHoroscope.errors.length > 0 && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <p className="text-xs font-medium text-red-400 mb-1">Errors</p>
                                    {selectedHoroscope.errors.map((err: string, i: number) => <p key={i} className="text-xs text-red-300/80">{err}</p>)}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                            <AlertTriangle className="h-8 w-8 text-muted-foreground mb-3" />
                            <p className="text-muted-foreground text-sm">No horoscope record for {selectedSign} on {selectedDate}.</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Override Dialog ──────────────────────────────────────────── */}
            <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Override Horoscope</DialogTitle>
                        <DialogDescription>Manually set content for a specific sign and date. Marks the record as &quot;overridden&quot;.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Date</Label>
                                <Input type="date" value={overrideForm.date} onChange={(e) => setOverrideForm({ ...overrideForm, date: e.target.value })} className="bg-background/50" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Sign</Label>
                                <Select value={overrideForm.sign} onValueChange={(v) => setOverrideForm({ ...overrideForm, sign: v })}>
                                    <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                                    <SelectContent>{SIGNS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Hook <span className="text-muted-foreground">(15-60 chars)</span></Label>
                            <Textarea value={overrideForm.hook} onChange={(e) => setOverrideForm({ ...overrideForm, hook: e.target.value })} placeholder="The thing you've been avoiding is the thing that needs doing." className="min-h-[60px] bg-background/50" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Body Text <span className="text-muted-foreground">(2-3 sentences, 100-390 chars)</span></Label>
                            <Textarea value={overrideForm.bodyText} onChange={(e) => setOverrideForm({ ...overrideForm, bodyText: e.target.value })} placeholder="The friction you're feeling isn't resistance — it's the sound of something shifting." className="min-h-[100px] bg-background/50" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Mantra <span className="text-muted-foreground">(≤12 words, first-person)</span></Label>
                            <Input value={overrideForm.mantra} onChange={(e) => setOverrideForm({ ...overrideForm, mantra: e.target.value })} placeholder="I trust the timing of my life." className="bg-background/50" />
                        </div>
                        <div className="border-t pt-4 mt-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Daily Pillars</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2"><Label className="text-xs">Vibe</Label><Input value={overrideForm.vibe} onChange={(e) => setOverrideForm({ ...overrideForm, vibe: e.target.value })} placeholder="quiet momentum" className="bg-background/50" /></div>
                                <div className="space-y-2"><Label className="text-xs">Power Move</Label><Input value={overrideForm.powerMove} onChange={(e) => setOverrideForm({ ...overrideForm, powerMove: e.target.value })} placeholder="Send that message" className="bg-background/50" /></div>
                                <div className="space-y-2"><Label className="text-xs">Blind Spot</Label><Input value={overrideForm.blindSpot} onChange={(e) => setOverrideForm({ ...overrideForm, blindSpot: e.target.value })} placeholder="Your own limits" className="bg-background/50" /></div>
                                <div className="space-y-2"><Label className="text-xs">Lucky Spark</Label><Input value={overrideForm.luckySpark} onChange={(e) => setOverrideForm({ ...overrideForm, luckySpark: e.target.value })} placeholder="A side conversation" className="bg-background/50" /></div>
                            </div>
                        </div>
                        <div className="border-t pt-4 mt-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Domain Scores</p>
                            <p className="text-xs text-muted-foreground mb-2">JSON array of 4–6 objects with name and score (0–100). Leave empty for defaults.</p>
                            <Textarea value={overrideForm.domainScores} onChange={(e) => setOverrideForm({ ...overrideForm, domainScores: e.target.value })} placeholder='[{"name":"Love","score":78},{"name":"Career","score":62}]' className="min-h-[80px] font-mono text-xs bg-background/50" />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleOverride} disabled={!overrideForm.hook || !overrideForm.bodyText} className="gap-2"><Edit3 className="h-3.5 w-3.5" /> Save Override</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}