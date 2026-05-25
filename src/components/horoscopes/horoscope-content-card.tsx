"use client";

import { useEffect, useState, useMemo } from "react";
import { HoroscopePaywallOverlay } from "@/components/horoscopes/horoscope-paywall-overlay";
import { HoroscopeCardActions } from "@/components/horoscopes/horoscope-card-actions";
import { trackHoroscopeRead } from "@/lib/analytics";
import {
    GiPulse,
    GiSwordBrandish,
    GiBlindfold,
    GiClover,
} from "react-icons/gi";

interface LockedHoroscope {
    requiredTier: "popular" | "premium";
}

/** Paywalled response from Convex query */
interface PaywalledResponse {
    isPaywalled: true;
    requiredTier: string;
    date: string;
    sign: string;
}

/** Full horoscope data from Convex query (v2 format) */
type HoroscopeDataRaw = Record<string, any> | null;

/** v2.0 content shape */
interface V2Content {
    hook: string;
    bodyText: string;
    mantra: string;
    dailyPillars: {
        vibe: string;
        powerMove: string;
        blindSpot: string;
        luckySpark: string;
    };
    domainScores?: {
        name: string;
        score: number;
    }[];
}

/** v1.0 content shape (legacy) */
interface V1Content {
    insight: string;
    energy: string;
    navigate: string;
    mantra?: string;
    cosmicDetails?: Record<string, any>;
}

function isV2Content(content: any): content is V2Content {
    return content && typeof content.hook === "string" && typeof content.bodyText === "string";
}

function isV1Content(content: any): content is V1Content {
    return content && typeof content.insight === "string" && !content.hook;
}

interface HoroscopeContentCardProps {
    horoscopeData?: HoroscopeDataRaw;
    isLoading?: boolean;
    date: string;
    /** Zodiac sign name — needed for ratings & sharing */
    sign: string;
    styles: {
        primary: string;
        glow: string;
    };
    /** Callback when user clicks unlock on paywalled content */
    onUnlock?: () => void;
}

export function HoroscopeContentCard({
    horoscopeData,
    isLoading,
    date,
    sign,
    styles,
    onUnlock,
}: HoroscopeContentCardProps) {
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSkeleton(false);
        }, 12000);
        return () => clearTimeout(timer);
    }, []);

    const shouldShowSkeleton = (isLoading || horoscopeData === undefined) && showSkeleton;

    // Track horoscope read once when non-paywalled content is displayed
    useEffect(() => {
        if (!horoscopeData || shouldShowSkeleton) return;
        if ("isPaywalled" in (horoscopeData as any) && (horoscopeData as any).isPaywalled) return;
        if (sign) trackHoroscopeRead(sign);
    }, [horoscopeData, shouldShowSkeleton, sign]);

    // Extract copyable text content from any format
    const copyableText = useMemo(() => {
        if (!horoscopeData || ("isPaywalled" in horoscopeData && horoscopeData.isPaywalled)) return "";
        const content = (horoscopeData as Record<string, any>)?.content;
        if (!content) return "";
        if (isV2Content(content)) {
            return `${content.hook}\n\n${content.bodyText}${
                content.dailyPillars
                    ? `\n\nVibe: ${content.dailyPillars.vibe}\nPower Move: ${content.dailyPillars.powerMove}\nBlind Spot: ${content.dailyPillars.blindSpot}\nLucky Spark: ${content.dailyPillars.luckySpark}`
                    : ""
            }${content.mantra ? `\n\nMantra: ${content.mantra}` : ""}`;
        }
        if (isV1Content(content)) {
            return [content.insight, content.energy, content.navigate, content.mantra]
                .filter(Boolean)
                .join("\n\n");
        }
        return typeof content === "string" ? content : JSON.stringify(content);
    }, [horoscopeData]);

    // Whether to show the action bar (only for accessible content)
    const canShowActions = !shouldShowSkeleton && horoscopeData != null && !("isPaywalled" in (horoscopeData as any) && (horoscopeData as any).isPaywalled) && (horoscopeData as Record<string, any>)?.content;

    if (shouldShowSkeleton) {
        return (
            <div className="border border-white/10 bg-black/50 rounded-md overflow-hidden min-h-134">
                <div className="p-8 md:p-12 border-b border-white/10">
                    <div
                        className="h-2 w-24 rounded animate-pulse mb-6"
                        style={{ backgroundColor: styles.primary, opacity: 0.3 }}
                    />
                    <div
                        className="h-10 md:h-12 w-3/4 rounded animate-pulse mb-4"
                        style={{ backgroundColor: styles.primary, opacity: 0.2 }}
                    />
                    <div className="space-y-4">
                        <div className="h-5 w-full rounded animate-pulse bg-white/10" />
                        <div className="h-5 w-full rounded animate-pulse bg-white/10" />
                        <div className="h-5 w-5/6 rounded animate-pulse bg-white/10" />
                    </div>
                </div>
            </div>
        );
    }

    // No data: "stars still aligning" message
    if (horoscopeData == null) {
        return (
            <div className="border border-white/10 bg-black/50 rounded-md overflow-hidden min-h-134">
                <div className="p-8 md:p-10 text-center flex flex-col items-center justify-center space-y-6 min-h-[400px]">
                    <h2 className="text-2xl font-serif">The stars are still aligning.</h2>
                    <p className="text-white/60 font-serif">
                        We haven&apos;t published the forecast for{" "}
                        <span className="font-sans text-white">{date}</span> yet. Check back soon.
                    </p>
                </div>
            </div>
        );
    }

    // Paywalled — show the sealed-scroll overlay (component owns the card chrome)
    if (horoscopeData && "isPaywalled" in horoscopeData && horoscopeData.isPaywalled) {
        return (
            <HoroscopePaywallOverlay
                requiredTier={horoscopeData.requiredTier as "popular" | "premium"}
                date={(horoscopeData as Record<string, any>).date ?? date}
                onUnlock={onUnlock ?? (() => {})}
            />
        );
    }

    // Get the content
    const content = (horoscopeData as Record<string, any>)?.content;

    // If no content, show fallback
    if (!content) {
        return (
            <div className="border border-white/10 bg-black/50 rounded-md overflow-hidden min-h-134">
                <div className="p-8 md:p-10 text-center flex flex-col items-center justify-center space-y-6 min-h-[400px]">
                    <h2 className="text-2xl font-serif">The stars are still aligning.</h2>
                    <p className="text-white/60 font-serif">
                        Content for{" "}
                        <span className="font-sans text-white">{date}</span> is not yet available.
                    </p>
                </div>
            </div>
        );
    }

    // ─── V2 Format (hook + bodyText + mantra + dailyPillars) ──────────────────
    if (isV2Content(content)) {
        return (
            <div
                className="border border-white/10 bg-black/50 rounded-md overflow-hidden"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Hook — the addictive opening line */}
                <div className="p-8 md:p-12 border-b border-white/10">
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-6">
                        Daily Horoscope
                    </span>
                    <h2 className="text-2xl md:text-3xl font-serif text-white tracking-tight mb-6 leading-snug">
                        {content.hook}
                    </h2>
                    <p className="text-lg text-white/70 leading-relaxed font-serif">
                        {content.bodyText}
                    </p>

                    {/* Action bar — lives inside the text section */}
                    {canShowActions && (
                        <HoroscopeCardActions
                            sign={sign}
                            date={date}
                            content={copyableText}
                            isHovered={isHovered}
                        />
                    )}
                </div>

                {/* Daily Pillars — 2×2 grid */}
                {content.dailyPillars && (
                    <div className="grid grid-cols-2 gap-px bg-black/30 overflow-hidden">
                        {[
                            { label: "Vibe", value: content.dailyPillars.vibe, Icon: GiPulse },
                            { label: "Power Move", value: content.dailyPillars.powerMove, Icon: GiSwordBrandish },
                            { label: "Blind Spot", value: content.dailyPillars.blindSpot, Icon: GiBlindfold },
                            { label: "Lucky Spark", value: content.dailyPillars.luckySpark, Icon: GiClover },
                        ].map((pillar) => (
                            <div
                                key={pillar.label}
                                className="p-4 sm:p-6 flex flex-row items-center gap-3 sm:gap-4 group hover:bg-white/2 transition-colors"
                            >
                                <div className="flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity shrink-0">
                                    <pillar.Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                                </div>
                                <div className="flex flex-col space-y-0.5 min-w-0">
                                    <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
                                        {pillar.label}
                                    </span>
                                    <p className="text-sm sm:text-base font-serif text-white tracking-tight leading-snug capitalize">
                                        {pillar.value}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ─── V1 Format fallback (legacy) ──────────────────────────────────────────
    if (isV1Content(content)) {
        const insight = content.insight as string;
        const energy = content.energy as string;
        const navigate = content.navigate as string;
        const mantra = content.mantra as string | undefined;
        const cosmicDetails = content.cosmicDetails as Record<string, any> | undefined;

        // Extract a title from insight (first sentence)
        const titleText = insight
            ? insight.split(/[.!?]\s/)[0]
            : undefined;
        // Body text is the rest of the insight
        const bodyText = insight && titleText && insight.length > titleText.length
            ? insight.substring(titleText.length).trim().replace(/^[.!?]\s*/, "")
            : insight;

        return (
            <div
                className="border border-white/10 bg-black/50 rounded-md overflow-hidden"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Main insight */}
                {insight && (
                    <div className="p-8 md:p-12 border-b border-white/10">
                        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-6">
                            Daily Horoscope
                        </span>
                        {titleText && (
                            <h2 className="text-2xl md:text-3xl font-serif text-white tracking-tight mb-4">
                                {titleText}
                            </h2>
                        )}
                        {bodyText && bodyText !== titleText && (
                            <p className="text-lg text-white/70 leading-relaxed font-serif">
                                {bodyText}
                            </p>
                        )}

                        {/* Action bar — lives inside the insight section */}
                        {canShowActions && (
                            <HoroscopeCardActions
                                sign={sign}
                                date={date}
                                content={copyableText}
                                isHovered={isHovered}
                            />
                        )}
                    </div>
                )}

                {/* Energy description */}
                {energy && (
                    <div className="p-8 md:p-12 border-b border-white/10">
                        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-3">
                            Energy
                        </span>
                        <p className="text-lg text-white/70 leading-relaxed font-serif">
                            {energy}
                        </p>
                    </div>
                )}

                {/* Navigate */}
                {navigate && (
                    <div className="p-8 md:p-12 border-b border-white/10">
                        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-3">
                            Navigate
                        </span>
                        <p className="text-lg text-white/70 leading-relaxed font-serif">
                            {navigate}
                        </p>
                    </div>
                )}

                {/* Mantra */}
                {mantra && (
                    <div className="p-8 md:p-12 border-b border-white/10 text-center">
                        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-3">
                            Today&apos;s Mantra
                        </span>
                        <p className="text-lg md:text-xl font-serif text-white/80 italic">
                            {mantra}
                        </p>
                    </div>
                )}

                {/* Cosmic Details */}
                {cosmicDetails && (
                    <div className="p-8 md:p-12">
                        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-4">
                            Cosmic Details
                        </span>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {cosmicDetails.keyThemes && Array.isArray(cosmicDetails.keyThemes) && cosmicDetails.keyThemes.length > 0 && (
                                <div className="col-span-2 md:col-span-1">
                                    <div className="text-xs text-white/40 mb-1">Themes</div>
                                    <div className="text-sm text-white/70">
                                        {(cosmicDetails.keyThemes as string[]).join(" · ")}
                                    </div>
                                </div>
                            )}
                            {cosmicDetails.powerHour && (
                                <div className="text-center">
                                    <div className="text-xs text-white/40 mb-1">Power Hour</div>
                                    <div className="text-sm text-white/70">{cosmicDetails.powerHour}</div>
                                </div>
                            )}
                            {cosmicDetails.luckyDirection && (
                                <div className="text-center">
                                    <div className="text-xs text-white/40 mb-1">Direction</div>
                                    <div className="text-sm text-white/70">{cosmicDetails.luckyDirection}</div>
                                </div>
                            )}
                            {cosmicDetails.watchFor && (
                                <div className="col-span-2 md:col-span-2">
                                    <div className="text-xs text-white/40 mb-1">Watch For</div>
                                    <div className="text-sm text-white/70">{cosmicDetails.watchFor}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Unknown format — try to render as text
    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    return (
        <div
            className="border border-white/10 bg-black/50 rounded-md overflow-hidden min-h-134"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="p-8 md:p-12 border-b border-white/10">
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-6">Daily Horoscope</span>
                <p className="text-lg text-white/70 leading-relaxed font-serif whitespace-pre-wrap">
                    {contentStr}
                </p>

                {/* Action bar — lives inside the text section */}
                {canShowActions && (
                    <HoroscopeCardActions
                        sign={sign}
                        date={date}
                        content={copyableText}
                        isHovered={isHovered}
                    />
                )}
            </div>
        </div>
    );
}