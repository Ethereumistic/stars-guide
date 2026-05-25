"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Loader2,
    Moon,
    Sun,
    Orbit,
    RefreshCw,
    ChevronDown,
    ChevronRight,
    Flame,
    Wind,
    Droplets,
    Mountain,
    CalendarDays,
    Zap,
    Globe,
} from "lucide-react";
import { toast } from "sonner";
import { planetUIConfig } from "@/config/planet-ui";


function getTodayUTC(): string {
    return new Date().toISOString().split("T")[0];
}

function Section({
    title,
    icon,
    children,
    defaultOpen = true,
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer pb-3 hover:bg-white/5 transition-colors rounded-t-lg">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                {icon}
                                {title}
                            </CardTitle>
                            {isOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="pt-0">{children}</CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}

const ELEMENT_ICONS: Record<string, React.ReactNode> = {
    fire: <Flame className="h-4 w-4 text-orange-400" />,
    earth: <Mountain className="h-4 w-4 text-green-600" />,
    air: <Wind className="h-4 w-4 text-sky-400" />,
    water: <Droplets className="h-4 w-4 text-blue-400" />,
};

export default function ContextViewerPage() {
    const [selectedDate, setSelectedDate] = useState(getTodayUTC());
    const context = useQuery(api.horoscopes.admin.getAstrologyContext, { date: selectedDate });
    const recomputeContext = useAction(api.horoscopes.admin.recomputeAstrologyContext);
    const [isRecomputing, setIsRecomputing] = useState(false);

    const handleRecompute = async () => {
        setIsRecomputing(true);
        try {
            await recomputeContext({ date: selectedDate });
            toast.success("Context recomputation scheduled.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to recompute context.");
        } finally {
            setIsRecomputing(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-serif font-bold tracking-tight">
                    Context Viewer
                </h1>
                <p className="text-muted-foreground mt-1">
                    Inspect the daily astrology context computed from astronomical data.
                </p>
            </div>

            {/* Date Picker + Actions */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-44 bg-background/50"
                    />
                </div>
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
            </div>

            {/* Loading / Empty */}
            {context === undefined ? (
                <div className="flex items-center gap-2 text-muted-foreground py-10">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading context...</span>
                </div>
            ) : context === null ? (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Orbit className="h-8 w-8 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground text-sm">
                            No astrology context computed yet for {selectedDate}.
                        </p>
                        <p className="text-muted-foreground text-xs mt-1">
                            Click &quot;Recompute Context&quot; to generate it.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {/* Meta */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                            Generated: {new Date(context.generatedAt).toLocaleString()}
                        </Badge>
                        {context.dominantElement && (
                            <Badge variant="outline" className="text-xs gap-1">
                                {ELEMENT_ICONS[context.dominantElement] ?? null}
                                {context.dominantElement}
                            </Badge>
                        )}
                        {context.stelliumSign && (
                            <Badge variant="secondary" className="text-xs">
                                Stellium in {context.stelliumSign}
                            </Badge>
                        )}
                    </div>

                    {/* Energy Signature */}
                    {context.energySignature && (
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-amber-400" />
                                    Energy Signature
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">{context.energySignature}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Moon Phase */}
                    <Section
                        title={`Moon Phase: ${context.moonPhase.name}`}
                        icon={<Moon className="h-4 w-4 text-blue-300" />}
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-3xl">{context.moonPhase.emoji}</span>
                            <div>
                                <p className="text-sm font-medium">{context.moonPhase.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {context.moonPhase.illumination.toFixed(1)}% illuminated
                                </p>
                            </div>
                        </div>
                        {context.voidOfCourseMoon && context.voidOfCourseMoon.isVoid && (
                            <div className="mt-3 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                <p className="text-xs font-medium text-purple-300">Void of Course Moon</p>
                                <p className="text-xs text-muted-foreground">
                                    {context.voidOfCourseMoon.inSign} → {context.voidOfCourseMoon.untilSign}
                                    {context.voidOfCourseMoon.windowStart && (
                                        <> ({new Date(context.voidOfCourseMoon.windowStart).toLocaleTimeString()} – {context.voidOfCourseMoon.windowEnd ? new Date(context.voidOfCourseMoon.windowEnd).toLocaleTimeString() : "unknown"})</>
                                    )}
                                </p>
                            </div>
                        )}
                        {context.moonNextIngress && (
                            <p className="text-xs text-muted-foreground mt-2">
                                Next ingress: {context.moonNextIngress.fromSign} → {context.moonNextIngress.toSign} at{" "}
                                {new Date(context.moonNextIngress.timestamp).toLocaleString()}
                            </p>
                        )}
                    </Section>

                    {/* Planet Positions */}
                    <Section
                        title={`Planet Positions (${context.planetPositions.length})`}
                        icon={<Sun className="h-4 w-4 text-amber-400" />}
                    >
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {context.planetPositions.map((p: { planet: string; sign: string; degree: number; retrograde: boolean }) => (
                                <div key={p.planet} className="flex items-center gap-1.5 text-xs">
                                    <span className="font-medium text-foreground">{p.planet}</span>
                                    <span className="text-muted-foreground">
                                        in {p.sign} ({p.degree.toFixed(1)}°)
                                    </span>
                                    {p.retrograde && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-red-400 border-red-400/30">
                                            ℞
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Active Aspects */}
                    <Section
                        title={`Active Aspects (${context.activeAspects.length})`}
                        icon={<Orbit className="h-4 w-4 text-purple-400" />}
                        defaultOpen={false}
                    >
                        <div className="flex flex-wrap gap-2">
                            {context.activeAspects.map((a: { planetA: string; planetB: string; aspectType: string; orb: number; influence: string }, idx: number) => {
                                const influenceColor =
                                    a.influence === "harmonious" ? "text-emerald-400 border-emerald-400/30" :
                                    a.influence === "challenging" ? "text-red-400 border-red-400/30" :
                                    "text-amber-400 border-amber-400/30";
                                return (
                                    <Badge key={idx} variant="secondary" className={`text-xs ${influenceColor}`}>
                                        {a.planetA} {a.aspectType} {a.planetB}
                                        <span className="text-muted-foreground ml-1">(orb: {a.orb.toFixed(1)}°)</span>
                                    </Badge>
                                );
                            })}
                        </div>
                    </Section>

                    {/* Retrograde Context — Planet Cards */}
                    {(!context.retrogradePlanets || context.retrogradePlanets.length === 0) ? (
                        <Section
                            title="Retrograde Context"
                            icon={<RefreshCw className="h-4 w-4 text-red-400" />}
                        >
                            <div className="flex flex-wrap gap-3">
                                {context.retrogradeContext.current.length > 0 && context.retrogradeContext.current.map((p: string) => (
                                    <Badge key={p} variant="destructive" className="text-xs">{p} ℞</Badge>
                                ))}
                                {context.retrogradeContext.upcoming.length > 0 && context.retrogradeContext.upcoming.map((p: string) => (
                                    <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                                ))}
                                {context.retrogradeContext.current.length === 0 && context.retrogradeContext.upcoming.length === 0 && (
                                    <p className="text-xs text-muted-foreground">No retrograde activity.</p>
                                )}
                            </div>
                        </Section>
                    ) : (
                        <>
                            {/* Active Retrogrades */}
                            {context.retrogradePlanets
                                .filter((rp: any) => rp.status === 'active')
                                .sort((a: any, b: any) => a.daysRemaining - b.daysRemaining)
                                .map((rp: any) => {
                                    const planetId = rp.planet.toLowerCase();
                                    const ui = planetUIConfig[planetId];
                                    const phaseColors: Record<string, string> = {
                                        entering: '#f97316',
                                        deepening: '#f97316',
                                        peak: '#ef4444',
                                        exiting: '#eab308',
                                    };
                                    const accent = phaseColors[rp.phase] ?? '#f97316';
                                    const phaseLabel: Record<string, string> = {
                                        entering: 'Just began',
                                        deepening: 'Deepening',
                                        peak: 'Peak intensity',
                                        exiting: 'Winding down',
                                    };
                                    return (
                                        <div
                                            key={rp.planet}
                                            className="relative rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden"
                                        >
                                            {/* Accent line */}
                                            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />
                                            <div className="p-4 flex gap-4">
                                                {/* Planet Image */}
                                                <div className="shrink-0 w-16 h-16 flex items-center justify-center">
                                                    {ui?.imageUrl ? (
                                                        <img
                                                            src={ui.imageUrl}
                                                            alt={rp.planet}
                                                            className="w-full h-full object-contain"
                                                            style={{ transform: `scale(${ui.imageScale ?? 1})` }}
                                                        />
                                                    ) : (
                                                        <span className="text-2xl font-serif" style={{ color: ui?.themeColor }}>
                                                            {ui?.rulerSymbol ?? '℞'}
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="text-sm font-semibold">{rp.planet}</h4>
                                                        <span
                                                            className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0 rounded"
                                                            style={{ color: accent, background: `${accent}15`, border: `1px solid ${accent}30` }}
                                                        >
                                                            ℞ Retrograde
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] font-mono text-muted-foreground mb-2">
                                                        {phaseLabel[rp.phase] ?? rp.phase}
                                                    </p>
                                                    {/* Progress bar */}
                                                    <div className="relative w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-2">
                                                        <div
                                                            className="absolute inset-y-0 left-0 rounded-full transition-all"
                                                            style={{
                                                                width: `${rp.progressPercent}%`,
                                                                background: `linear-gradient(to right, ${accent}40, ${accent})`,
                                                                boxShadow: `0 0 8px ${accent}30`,
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                                                        <span>{rp.progressPercent}% through</span>
                                                        <span className="text-white/8">|</span>
                                                        <span>{rp.daysRemaining}d remaining</span>
                                                        <span className="text-white/8">|</span>
                                                        <span>{rp.totalDays}d total</span>
                                                    </div>
                                                    <p className="text-[9px] text-muted-foreground/60 mt-1">
                                                        {new Date(rp.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(rp.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            }

                            {/* Upcoming Retrogrades */}
                            {context.retrogradePlanets.filter((rp: any) => rp.status === 'upcoming').length > 0 && (
                                <Section
                                    title="Upcoming Retrogrades"
                                    icon={<RefreshCw className="h-4 w-4 text-blue-400" />}
                                    defaultOpen={true}
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {context.retrogradePlanets
                                            .filter((rp: any) => rp.status === 'upcoming')
                                            .sort((a: any, b: any) => a.daysRemaining - b.daysRemaining)
                                            .map((rp: any) => {
                                                const planetId = rp.planet.toLowerCase();
                                                const ui = planetUIConfig[planetId];
                                                return (
                                                    <div
                                                        key={rp.planet}
                                                        className="flex items-center gap-3 p-3 rounded-lg border border-blue-500/15 bg-blue-500/[0.03]"
                                                    >
                                                        {/* Planet image */}
                                                        <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                                                            {ui?.imageUrl ? (
                                                                <img
                                                                    src={ui.imageUrl}
                                                                    alt={rp.planet}
                                                                    className="w-full h-full object-contain opacity-50"
                                                                    style={{ transform: `scale(${ui.imageScale ?? 1})` }}
                                                                />
                                                            ) : (
                                                                <span className="text-lg font-serif" style={{ color: ui?.themeColor }}>{ui?.rulerSymbol ?? '?'}</span>
                                                            )}
                                                        </div>
                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-semibold">{rp.planet}</span>
                                                                <span className="text-[9px] font-mono text-blue-400 bg-blue-400/10 border border-blue-400/20 px-1.5 py-0 rounded">
                                                                    in {rp.daysRemaining}d
                                                                </span>
                                                            </div>
                                                            <p className="text-[9px] text-muted-foreground mt-0.5">
                                                                {new Date(rp.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(rp.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {rp.totalDays}d window
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </Section>
                            )}

                            {/* Recently Direct */}
                            {context.retrogradePlanets.filter((rp: any) => rp.status === 'recently_direct').length > 0 && (
                                <Section
                                    title="Recently Direct"
                                    icon={<RefreshCw className="h-4 w-4 text-emerald-400" />}
                                >
                                    <div className="flex flex-wrap gap-2">
                                        {context.retrogradePlanets
                                            .filter((rp: any) => rp.status === 'recently_direct')
                                            .map((rp: any) => (
                                                <Badge key={rp.planet} variant="secondary" className="text-xs gap-1">
                                                    {rp.planet} <span className="text-[9px] text-muted-foreground">{rp.daysRemaining}d ago</span>
                                                </Badge>
                                            ))}
                                    </div>
                                </Section>
                            )}
                        </>
                    )}

                    {/* Dominant Themes */}
                    <Section
                        title={`Dominant Themes (${context.dominantThemes.length})`}
                        icon={<Globe className="h-4 w-4 text-indigo-400" />}
                        defaultOpen={false}
                    >
                        <div className="flex flex-wrap gap-2">
                            {context.dominantThemes.map((theme: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs capitalize">
                                    {theme}
                                </Badge>
                            ))}
                        </div>
                    </Section>

                    {/* Aspect Summary */}
                    {context.aspectSummary && context.aspectSummary.length > 0 && (
                        <Section
                            title="Aspect Summary"
                            icon={<Orbit className="h-4 w-4 text-cyan-400" />}
                            defaultOpen={false}
                        >
                            <div className="flex flex-wrap gap-2">
                                {context.aspectSummary.map((s: string, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                        {s.replace(/_/g, " ")}
                                    </Badge>
                                ))}
                            </div>
                        </Section>
                    )}
                </div>
            )}
        </div>
    );
}
