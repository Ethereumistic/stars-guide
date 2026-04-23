"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, RotateCcw } from "lucide-react";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { elementUIConfig } from "@/config/elements-ui";
import { compositionalSigns } from "@/astrology/signs";
import { planetUIConfig } from "@/config/planet-ui";

interface AstroContextStripProps {
    astroContext: {
        moonPhase?: string;
        moonSign?: string;
        sunSign?: string;
        retrogradePlanets?: string[];
        moonIllumination?: number;
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

/**
 * Generate an SVG-based moon phase visualization.
 * This creates a simple and lightweight moon disc with a shadow overlay.
 */
function MoonPhaseDisc({
    illumination,
    phaseName,
    size = 40,
}: {
    illumination: number; // 0–100
    phaseName: string;
    size?: number;
}) {
    const isWaxing =
        phaseName.includes("Waxing") ||
        phaseName === "First Quarter" ||
        phaseName === "New Moon"; // default

    // illumination 0 = new moon (full shadow), 100 = full moon (no shadow)
    const k = illumination / 100;

    // Don't render shadow for full/near-full or new/near-new
    if (k >= 0.995) {
        // Full moon — no shadow
        return null;
    }

    if (k <= 0.005) {
        // New moon — full shadow
        return (
            <div
                className="absolute inset-0 rounded-full"
                style={{ background: "rgba(3,3,12,0.93)" }}
            />
        );
    }

    // Determine the terminator ellipse rx based on illumination
    // When illumination = 50%, rx = 100 (exactly half)
    // When illumination is small, rx approaches 0
    const termRx = Math.abs(Math.cos(Math.acos(2 * k - 1))) * 100;

    // For waxing: right side lit, shadow on left
    // For waning: left side lit, shadow on right
    return (
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
            <svg
                viewBox="0 0 200 200"
                className="absolute inset-0 w-full h-full"
                preserveAspectRatio="none"
            >
                <defs>
                    <filter id="moon-penumbra-sm">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
                    </filter>
                    <mask id="moon-phase-mask-sm">
                        <g filter="url(#moon-penumbra-sm)">
                            {k < 0.5 ? (
                                // Crescent: shadow = dark half + terminator
                                <>
                                    <rect width="200" height="200" fill="black" />
                                    <rect
                                        x={isWaxing ? 0 : 100}
                                        width="100"
                                        height="200"
                                        fill="white"
                                    />
                                    <ellipse cx="100" cy="100" rx={termRx} ry="100" fill="white" />
                                </>
                            ) : (
                                // Gibbous: shadow = full disc - lit half - terminator
                                <>
                                    <rect width="200" height="200" fill="white" />
                                    <rect
                                        x={isWaxing ? 100 : 0}
                                        width="100"
                                        height="200"
                                        fill="black"
                                    />
                                    <ellipse cx="100" cy="100" rx={termRx} ry="100" fill="black" />
                                </>
                            )}
                        </g>
                    </mask>
                </defs>
                <circle
                    cx="100"
                    cy="100"
                    r="100"
                    fill="rgba(3,3,12,0.93)"
                    mask="url(#moon-phase-mask-sm)"
                />
            </svg>
        </div>
    );
}

export function AstroContextStrip({ astroContext, className }: AstroContextStripProps) {
    const [expanded, setExpanded] = React.useState(false);

    if (!astroContext) return null;

    const { moonPhase, moonSign, sunSign, retrogradePlanets, moonIllumination } = astroContext;
    const hasDetails = Boolean(moonSign || sunSign || (retrogradePlanets && retrogradePlanets.length > 0));

    // Resolve sign data for the moon sign
    const moonSignData = moonSign
        ? compositionalSigns.find((s) => s.name.toLowerCase() === moonSign.toLowerCase())
        : null;
    const moonSignId = moonSignData?.id ?? moonSign?.toLowerCase();
    const moonSignUi = moonSignId ? zodiacUIConfig[moonSignId] : null;
    const moonSignElement = moonSignData?.element;
    const moonElementUi = moonSignElement ? elementUIConfig[moonSignElement] : null;
    const moonStyles = moonElementUi?.styles;

    // Moon image from planet UI config
    const moonPlanetUi = planetUIConfig["moon"];

    // Illumination with fallback
    const illum = moonIllumination ?? 50;

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl border border-border/30",
                className
            )}
        >
            {/* Card surface */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
                }}
            />

            {/* Moon sign element glow */}
            {moonStyles && (
                <div
                    className="absolute -right-6 top-1/2 -translate-y-1/2 h-24 w-24 rounded-full blur-2xl opacity-5 pointer-events-none"
                    style={{ backgroundColor: moonStyles.glow }}
                />
            )}

            {/* Collapsible trigger */}
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="relative z-10 flex w-full items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
            >
                {/* Moon visualization */}
                <div className="relative flex-shrink-0 w-10 h-10">
                    {moonPlanetUi?.imageUrl ? (
                        <>
                            <img
                                src={moonPlanetUi.imageUrl}
                                alt="Moon"
                                className="w-full h-full rounded-full object-cover"
                                style={{
                                    filter: "brightness(1.15) contrast(1.08)",
                                    transform: `scale(${moonPlanetUi.imageScale ?? 1})`,
                                }}
                            />
                            <MoonPhaseDisc
                                illumination={illum}
                                phaseName={moonPhase ?? "Full Moon"}
                            />
                        </>
                    ) : (
                        <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center text-lg">
                            {getMoonIcon(moonPhase ?? "")}
                        </div>
                    )}
                </div>

                {/* Text content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-serif text-white/85 tracking-wide">
                            {moonPhase ?? "Unknown"}
                        </span>
                        {moonSign && moonStyles && (
                            <span
                                className="text-[9px] font-sans uppercase tracking-[0.15em]"
                                style={{ color: moonStyles.primary, opacity: 0.7 }}
                            >
                                Moon in {moonSign}
                            </span>
                        )}
                    </div>

                    {/* Illumination bar */}
                    <div className="flex items-center gap-2 mt-1">
                        <div className="relative w-20 h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                                className="absolute inset-y-0 left-0 rounded-full"
                                style={{
                                    width: `${illum}%`,
                                    background: moonStyles
                                        ? `linear-gradient(to right, rgba(224,224,224,0.25), rgba(224,224,224,0.6))`
                                        : "linear-gradient(to right, rgba(224,224,224,0.25), rgba(224,224,224,0.6))",
                                    boxShadow: "0 0 6px rgba(224,224,224,0.15)",
                                }}
                            />
                        </div>
                        <span className="text-[9px] font-mono text-white/25 tabular-nums">
                            {illum.toFixed(0)}%
                        </span>

                        {retrogradePlanets && retrogradePlanets.length > 0 && (
                            <>
                                <span className="text-white/[0.06]">|</span>
                                <span className="flex items-center gap-1 text-amber-500/50">
                                    <RotateCcw className="h-2.5 w-2.5" />
                                    <span className="text-[9px] font-mono">
                                        {retrogradePlanets.join(", ")} Rx
                                    </span>
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Moon sign icon badge */}
                {moonSignUi && moonElementUi && (
                    <div className="flex-shrink-0 relative flex items-center justify-center w-9 h-9">
                        <div
                            className="absolute inset-0 rounded-full"
                            style={{
                                border: moonStyles ? `1px solid ${moonStyles.primary}30` : "1px solid rgba(255,255,255,0.1)",
                                background: moonStyles ? `${moonStyles.primary}10` : "rgba(255,255,255,0.05)",
                            }}
                        />
                        <moonSignUi.icon
                            className="relative w-4 h-4"
                            style={{ color: moonStyles?.primary ?? "rgba(255,255,255,0.5)" }}
                        />
                    </div>
                )}

                {/* Expand chevron */}
                {hasDetails && (
                    <ChevronDown
                        className={cn(
                            "h-4 w-4 flex-shrink-0 transition-transform text-white/25",
                            expanded && "rotate-180"
                        )}
                    />
                )}
            </button>

            {/* Expanded details */}
            {expanded && hasDetails && (
                <div className="relative z-10 border-t border-white/[0.04] px-4 py-2.5 space-y-1.5">
                    {sunSign && (
                        <div className="flex items-center gap-2 text-[10px] font-sans text-white/35">
                            <span>☉</span>
                            <span className="uppercase tracking-[0.12em]">Sun in {sunSign}</span>
                        </div>
                    )}
                    {moonSign && (
                        <div className="flex items-center gap-2 text-[10px] font-sans text-white/35">
                            <span>☽</span>
                            <span className="uppercase tracking-[0.12em]">Moon in {moonSign}</span>
                        </div>
                    )}
                    {retrogradePlanets && retrogradePlanets.length > 0 && (
                        <div className="flex items-center gap-2 text-[10px] font-sans text-amber-500/50">
                            <RotateCcw className="h-3 w-3" />
                            <span className="uppercase tracking-[0.12em]">
                                {retrogradePlanets.join(", ")} retrograde
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}