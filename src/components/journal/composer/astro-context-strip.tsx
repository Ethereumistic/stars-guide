"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, RotateCcw } from "lucide-react";

interface AstroContextStripProps {
    astroContext: {
        moonPhase?: string;
        moonSign?: string;
        sunSign?: string;
        retrogradePlanets?: string[];
    } | null;
    className?: string;
}

const MOON_PHASE_ICONS: Record<string, string> = {
    "New Moon": "🌑",
    "Waxing Crescent": "🌒",
    "First Quarter": "🌓",
    "Waxing Gibbous": "🌔",
    "Full Moon": "🌕",
    "Waning Gibbous": "🌖",
    "Last Quarter": "🌗",
    "Waning Crescent": "🌘",
};

function getMoonIcon(phaseName: string): string {
    for (const [key, icon] of Object.entries(MOON_PHASE_ICONS)) {
        if (phaseName.includes(key.split(" ")[0])) return icon;
    }
    return "🌙";
}

export function AstroContextStrip({ astroContext, className }: AstroContextStripProps) {
    const [expanded, setExpanded] = React.useState(false);

    if (!astroContext) return null;

    const { moonPhase, moonSign, sunSign, retrogradePlanets } = astroContext;
    const hasDetails = Boolean(moonSign || sunSign || (retrogradePlanets && retrogradePlanets.length > 0));

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl border border-border/30",
                className
            )}
            style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
            }}
        >
            {/* Compact strip — always visible */}
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-xs hover:bg-white/[0.02] transition-colors"
            >
                <span className="text-base">{getMoonIcon(moonPhase ?? "")}</span>
                <span className="text-[10px] font-sans uppercase tracking-[0.15em] text-white/45">{moonPhase ?? "Unknown"}</span>
                {moonSign && (
                    <span className="text-[10px] font-sans text-white/25">• Moon in {moonSign}</span>
                )}
                {retrogradePlanets && retrogradePlanets.length > 0 && (
                    <span className="ml-auto flex items-center gap-1 text-amber-500/50">
                        <RotateCcw className="h-3 w-3" />
                        <span className="text-[10px] font-sans">{retrogradePlanets.join(", ")} Rx</span>
                    </span>
                )}
                {hasDetails && (
                    <ChevronDown
                        className={cn(
                            "ml-1 h-3 w-3 transition-transform text-white/25",
                            expanded && "rotate-180"
                        )}
                    />
                )}
            </button>

            {/* Expanded details */}
            {expanded && hasDetails && (
                <div className="border-t border-white/[0.04] px-4 py-2.5 space-y-1.5 text-[10px] font-sans text-white/35">
                    {sunSign && (
                        <div className="flex items-center gap-2">
                            <span>☉</span>
                            <span className="uppercase tracking-[0.12em]">Sun in {sunSign}</span>
                        </div>
                    )}
                    {moonSign && (
                        <div className="flex items-center gap-2">
                            <span>☽</span>
                            <span className="uppercase tracking-[0.12em]">Moon in {moonSign}</span>
                        </div>
                    )}
                    {retrogradePlanets && retrogradePlanets.length > 0 && (
                        <div className="flex items-center gap-2 text-amber-500/50">
                            <RotateCcw className="h-3 w-3" />
                            <span className="uppercase tracking-[0.12em]">{retrogradePlanets.join(", ")} retrograde</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}