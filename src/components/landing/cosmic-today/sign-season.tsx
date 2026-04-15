"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { elementUIConfig } from "@/config/elements-ui";
import { planetUIConfig } from "@/config/planet-ui";
import { TbArrowRight } from "react-icons/tb";
import type { compositionalSigns } from "@/astrology/signs";
import type { PlanetTelemetry } from "@/lib/planets/telemetry";

interface SignSeasonProps {
    signData: typeof compositionalSigns[number];
    signId: string;
    telemetry: PlanetTelemetry;
    /** Override which planet image to display (for side-by-side size debugging). */
    debugPlanetId?: string;
}

export function SignSeason({ signData, signId, telemetry, debugPlanetId }: SignSeasonProps) {
    const ui = zodiacUIConfig[signId];
    const elementUi = elementUIConfig[signData.element];
    const styles = elementUi.styles;
    const Icon = ui.icon;
    const ElementIcon = elementUi.icon;

    const planetId = debugPlanetId ?? signData.ruler;
    const planetUi = planetUIConfig[planetId];
    const planetName = planetId.charAt(0).toUpperCase() + planetId.slice(1);
    const imageScale = planetUi?.imageScale ?? 1;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
        >
            <Link
                href={`/learn/signs/${signId}`}
                className="group block"
            >
                {/* ── TITLE ── */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <span
                        className="text-3xl md:text-[2.4rem] font-serif leading-none"
                        style={{ color: styles.primary }}
                    >
                        {planetUi?.rulerSymbol}
                    </span>
                    <h3
                        className="text-3xl md:text-[2.4rem] font-serif tracking-tight leading-[0.85]"
                        style={{ color: styles.primary }}
                    >
                        {planetName} is Ruling
                    </h3>
                </div>

                {/* ── RULING PLANET — floating freely ── */}
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
                                className="w-full h-full object-contain "
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
                    {/* Constellation watermark */}
                    <div className="absolute inset-y-0 right-0 w-1/2 pointer-events-none">
                        <img
                            src={ui.constellationUrl}
                            alt=""
                            className="absolute top-1/2 right-[-20%] -translate-y-1/2 h-full object-contain opacity-[0.06] scale-125 transition-all duration-700 group-hover:opacity-[0.12] group-hover:scale-100 group-hover:right-[50%]"
                            style={{ filter: `drop-shadow(0 0 10px ${styles.glow})` }}
                        />
                    </div>

                    {/* Element glow */}
                    <div
                        className="absolute top-1/2 right-0 -translate-y-1/2 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
                        style={{ backgroundColor: styles.glow }}
                    />

                    <div className="relative z-10 flex items-start gap-4">
                        {/* Element frame + sign icon badge */}
                        <div className="shrink-0 relative flex items-center justify-center">
                            <img
                                src={elementUi.frameUrl}
                                alt=""
                                className="w-16 h-16 md:w-[72px] md:h-[72px] object-cover opacity-90"
                            />
                            <Icon
                                className="absolute w-6 h-6 md:w-7 md:h-7 drop-shadow-lg"
                                style={{ color: styles.primary }}
                            />
                        </div>

                        <div className="flex-1 min-w-0">
                            <span className="font-mono text-[8px] uppercase tracking-[0.35em] block mb-1.5" style={{ color: styles.primary, opacity: 0.6 }}>
                                Current Season
                            </span>
                            <h3 className="text-3xl md:text-[2.4rem] font-serif tracking-tight leading-[0.85] mb-2" style={{ color: styles.primary }}>
                                {signData.name}
                            </h3>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex items-center gap-1.5">
                                    <ElementIcon className="w-3 h-3" style={{ color: styles.primary }} />
                                    <span className="font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: styles.secondary }}>
                                        {signData.element}
                                    </span>
                                </div>
                                <span className="text-white/10">·</span>
                                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/35">
                                    {signData.modality}
                                </span>
                                <span className="text-white/10">·</span>
                                <span className="font-mono text-[9px] text-white/25">
                                    {signData.dates}
                                </span>
                            </div>
                            <p className="font-serif italic text-[13px] text-white/40 leading-relaxed mb-3" style={{ borderLeft: `1px solid ${styles.primary}30`, paddingLeft: "8px" }}>
                                &ldquo;{signData.motto}&rdquo;
                            </p>
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] text-white/20">
                                    Sun @ {telemetry.longitude.toFixed(1)}°
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
