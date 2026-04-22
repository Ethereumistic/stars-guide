"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Moon, RotateCcw } from "lucide-react";

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
                "rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden",
                className
            )}
        >
            {/* Compact strip — always visible */}
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-white/50 hover:text-white/70 transition-colors"
            >
                <span className="text-base">{getMoonIcon(moonPhase ?? "")}</span>
                <span className="font-medium">{moonPhase ?? "Unknown"}</span>
                {moonSign && (
                    <span className="text-white/30">• Moon in {moonSign}</span>
                )}
                {retrogradePlanets && retrogradePlanets.length > 0 && (
                    <span className="ml-auto flex items-center gap-1 text-amber-500/60">
                        <RotateCcw className="h-3 w-3" />
                        <span>{retrogradePlanets.join(", ")} Rx</span>
                    </span>
                )}
                {hasDetails && (
                    <ChevronDown
                        className={cn(
                            "ml-1 h-3 w-3 transition-transform",
                            expanded && "rotate-180"
                        )}
                    />
                )}
            </button>

            {/* Expanded details */}
            {expanded && hasDetails && (
                <div className="border-t border-white/5 px-3 py-2 space-y-1 text-xs text-white/40">
                    {sunSign && (
                        <div className="flex items-center gap-2">
                            <span>☉</span>
                            <span>Sun in {sunSign}</span>
                        </div>
                    )}
                    {moonSign && (
                        <div className="flex items-center gap-2">
                            <span>☽</span>
                            <span>Moon in {moonSign}</span>
                        </div>
                    )}
                    {retrogradePlanets && retrogradePlanets.length > 0 && (
                        <div className="flex items-center gap-2 text-amber-500/60">
                            <RotateCcw className="h-3 w-3" />
                            <span>{retrogradePlanets.join(", ")} retrograde</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}