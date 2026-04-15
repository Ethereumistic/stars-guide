"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { planetUIConfig } from "@/config/planet-ui";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { elementUIConfig } from "@/config/elements-ui";
import { getPlanetTelemetry } from "@/lib/planets/telemetry";
import { TbArrowRight } from "react-icons/tb";
import type { compositionalSigns } from "@/astrology/signs";
import type { PlanetTelemetry } from "@/lib/planets/telemetry";

/**
 * Scans forward day-by-day to find when the current retrograde period ends.
 * Returns the end date, or null if the planet isn't retrograde or can't be determined.
 */
function findRetrogradeEndDate(planetId: string, startDate: Date): Date | null {
    const maxDays = 200; // safety limit
    const d = new Date(startDate);
    for (let i = 0; i < maxDays; i++) {
        d.setDate(d.getDate() + 1);
        const t = getPlanetTelemetry(planetId, d);
        if (t && !t.retrograde) return d;
    }
    return null;
}

/**
 * Scans backward day-by-day to find when the current retrograde period started.
 */
function findRetrogradeStartDate(planetId: string, startDate: Date): Date | null {
    const maxDays = 200;
    const d = new Date(startDate);
    for (let i = 0; i < maxDays; i++) {
        d.setDate(d.getDate() - 1);
        const t = getPlanetTelemetry(planetId, d);
        if (t && !t.retrograde) {
            // The day after this is the start
            d.setDate(d.getDate() + 1);
            return d;
        }
    }
    return null;
}

function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysBetween(a: Date, b: Date): number {
    return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

interface RetrogradeProps {
    planetId: string;
    planetName: string;
    telemetry: PlanetTelemetry;
    signData: typeof compositionalSigns[number];
    /** Force retrograde display for debugging, even if planet isn't actually retrograde. */
    debug?: boolean;
    /** Override end date for visual testing (e.g. "2026-05-15"). */
    debugEndDate?: string;
    /** Override start date for visual testing (e.g. "2026-03-15"). */
    debugStartDate?: string;
}

export function Retrograde({ planetId, planetName, telemetry, signData, debug, debugEndDate, debugStartDate }: RetrogradeProps) {
    const planetUi = planetUIConfig[planetId];
    const signUi = zodiacUIConfig[telemetry.signId];
    const elementUi = elementUIConfig[signData.element];
    const styles = elementUi.styles;
    const SignIcon = signUi.icon;

    const imageScale = planetUi?.imageScale ?? 1;
    const themeColor = planetUi?.themeColor ?? "#f97316";

    const [endDate, setEndDate] = useState<Date | null>(null);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [progress, setProgress] = useState<number>(0);

    useEffect(() => {
        const now = new Date();

        const end = debugEndDate ? new Date(debugEndDate) : findRetrogradeEndDate(planetId, now);
        const start = debugStartDate ? new Date(debugStartDate) : findRetrogradeStartDate(planetId, now);

        setEndDate(end);
        setStartDate(start);

        if (start && end) {
            const totalDays = daysBetween(start, end);
            const elapsed = daysBetween(start, now);
            setProgress(Math.max(0, Math.min(100, (elapsed / totalDays) * 100)));
        }
    }, [planetId, debugEndDate, debugStartDate]);

    const daysLeft = endDate ? daysBetween(new Date(), endDate) : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="h-full"
        >
            <Link
                href={`/learn/planets/${planetId}`}
                className="group block h-full flex flex-col"
            >
                {/* ── TITLE ── */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <span
                        className="text-3xl md:text-5xl font-serif leading-none"
                    >
                        {planetUi?.rulerSymbol}
                    </span>
                    <h3
                        className="text-3xl md:text-5xl font-serif tracking-tight leading-[0.85]"
                    >
                        Retrograde
                    </h3>
                </div>

                {/* ── PLANET — floating freely ── */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="relative flex items-center justify-center pb-8"
                >
                    <div className="relative w-full max-w-[360px] md:max-w-[420px] aspect-square flex items-center justify-center">
                        {planetUi?.imageUrl && (
                            <img
                                src={planetUi.imageUrl}
                                alt={planetName}
                                className="w-full h-full object-contain"
                                style={{ transform: `scale(${imageScale})` }}
                            />
                        )}
                    </div>
                </motion.div>

                {/* ── INFO CARD — below the planet ── */}
                <div
                    className="relative p-5 md:p-6 border border-white/[0.06] bg-black/40 overflow-hidden"
                    style={{ borderRadius: "4px" }}
                >
                    {/* Element glow */}
                    <div
                        className="absolute top-1/2 right-0 -translate-y-1/2 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
                        style={{ backgroundColor: styles.glow }}
                    />

                    <div className="relative z-10 flex items-center gap-5">
                        {/* Element frame + sign icon badge */}
                        <div className="shrink-0 relative flex items-center justify-center">
                            <img
                                src={elementUi.frameUrl}
                                alt=""
                                className="w-[88px] h-[88px] md:w-[100px] md:h-[100px] object-cover opacity-90"
                            />
                            <SignIcon
                                className="absolute w-9 h-9 md:w-10 md:h-10 drop-shadow-lg"
                                style={{ color: styles.primary }}
                            />
                        </div>

                        <div className="flex-1 min-w-0">
                            <span className="font-mono text-[8px] uppercase tracking-[0.35em] block mb-1.5" style={{ color: styles.primary }}>
                                Transiting {signData.name}
                            </span>
                            <h3 className="text-3xl md:text-[2.4rem] font-serif tracking-tight leading-[0.85] mb-2">
                                {planetName}
                            </h3>
                            <div className="flex items-center gap-4 mb-3">
                                <div className="flex items-center gap-1">
                                    <span className="text-xl md:text-2xl font-serif text-white/65 tabular-nums">
                                        {daysLeft !== null && daysLeft > 0 ? daysLeft : "—"}
                                    </span>
                                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">days left</span>
                                </div>

                                <span className="text-white/8">|</span>

                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-[18px] h-[18px] rounded-full flex items-center justify-center"
                                        style={{
                                            border: `1px solid ${styles.primary}30`,
                                            background: `${styles.primary}10`,
                                        }}
                                    >
                                        <SignIcon className="w-2.5 h-2.5" style={{ color: styles.primary }} />
                                    </div>
                                    <span className="font-serif text-sm" style={{ color: styles.primary }}>
                                        {signData.name}
                                    </span>
                                </div>
                            </div>

                            <div className="relative w-full h-[2px] bg-white/[0.06] rounded-full overflow-hidden mb-3">
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${progress}%` }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1.4, delay: 0.6, ease: "easeOut" }}
                                    className="absolute inset-y-0 left-0 rounded-full"
                                    style={{
                                        background: `linear-gradient(to right, ${themeColor}25, ${themeColor}60)`,
                                        boxShadow: `0 0 8px ${themeColor}15`,
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] text-white/20">
                                    {startDate ? formatDate(startDate) : "—"} → {endDate ? formatDate(endDate) : "—"}
                                </span>
                                <span className="flex items-center gap-1 font-mono text-[9px] text-white/30 group-hover:text-white/60 transition-colors">
                                    Explore <TbArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
