"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { getPlanetTelemetry } from "@/lib/planets/telemetry";
import { planetUIConfig } from "@/config/planet-ui";
import { compositionalSigns } from "@/astrology/signs";
import { TbArrowRight } from "react-icons/tb";

const PLANET_IDS = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;

interface RetrogradeHighlight {
    id: string;
    name: string;
    signName: string;
    symbol: string;
    themeColor: string;
    longitude: number;
    imageUrl?: string;
}

export function RetrogradeBanner() {
    const [retrogrades, setRetrogrades] = useState<RetrogradeHighlight[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const now = new Date();
        const results: RetrogradeHighlight[] = [];
        for (const id of PLANET_IDS) {
            const t = getPlanetTelemetry(id, now);
            const ui = planetUIConfig[id];
            if (!t || !ui || !t.retrograde) continue;
            const sign = compositionalSigns.find(s => s.id === t.signId);
            results.push({
                id,
                name: id.charAt(0).toUpperCase() + id.slice(1),
                signName: sign?.name ?? t.signId,
                symbol: ui.rulerSymbol,
                themeColor: ui.themeColor,
                longitude: t.longitude,
                imageUrl: ui.imageUrl,
            });
        }
        setRetrogrades(results);
    }, []);

    useEffect(() => {
        if (retrogrades.length <= 1) return;
        const interval = setInterval(() => {
            setActiveIndex(prev => (prev + 1) % retrogrades.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [retrogrades.length]);

    if (retrogrades.length === 0) return null;

    const active = retrogrades[activeIndex];

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7 }}
            className="relative w-full"
        >
            <div className="relative max-w-4xl mx-auto border border-white/[0.06] rounded-md overflow-hidden bg-black/40">
                {/* Ambient glow */}
                <div
                    className="absolute inset-0 opacity-10 blur-3xl pointer-events-none transition-colors duration-1000"
                    style={{ background: active.themeColor }}
                />

                <div className="relative grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-10 p-6 md:p-10 items-center">
                    {/* Planet image */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={active.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.5, type: "spring" }}
                            className="relative flex items-center justify-center"
                        >
                            <div
                                className="absolute w-32 h-32 rounded-full blur-2xl opacity-20"
                                style={{ background: active.themeColor }}
                            />
                            {active.imageUrl ? (
                                <img
                                    src={active.imageUrl}
                                    alt={active.name}
                                    className="relative w-24 h-24 md:w-32 md:h-32 object-contain scale-110"
                                    style={{ filter: `drop-shadow(0 0 25px ${active.themeColor}50)` }}
                                />
                            ) : (
                                <div
                                    className="relative text-6xl md:text-8xl font-serif"
                                    style={{ color: active.themeColor, textShadow: `0 0 40px ${active.themeColor}40` }}
                                >
                                    {active.symbol}
                                </div>
                            )}

                            {/* Retrograde orbit ring */}
                            <svg className="absolute w-36 h-36 md:w-44 md:h-44 animate-[spin_20s_linear_infinite_reverse]" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="48" fill="none" stroke={active.themeColor} strokeWidth="0.5" strokeDasharray="4 8" opacity="0.3" />
                            </svg>
                        </motion.div>
                    </AnimatePresence>

                    {/* Text content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={active.id + "-text"}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </div>
                                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-400/80">
                                    Currently Retrograde
                                </span>
                            </div>

                            <h3 className="text-3xl md:text-4xl font-serif tracking-tight text-white">
                                <span style={{ color: active.themeColor }}>{active.name}</span>{" "}
                                <span className="text-white/60">in {active.signName}</span>
                            </h3>

                            <p className="text-sm text-white/50 font-sans leading-relaxed max-w-md">
                                {active.name} appears to move backward through the zodiac. A period of review, reconsideration, and internal processing in its domain.
                            </p>

                            <div className="flex items-center gap-4">
                                <Link
                                    href={`/learn/planets/${active.id}`}
                                    className="inline-flex items-center gap-2 text-sm font-serif group transition-colors"
                                    style={{ color: active.themeColor }}
                                >
                                    <span>Full telemetry & analysis</span>
                                    <TbArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>

                            {/* Pagination dots */}
                            {retrogrades.length > 1 && (
                                <div className="flex items-center gap-2 pt-2">
                                    {retrogrades.map((r, i) => (
                                        <button
                                            key={r.id}
                                            onClick={() => setActiveIndex(i)}
                                            className={`w-6 h-1 rounded-full transition-all duration-300 ${
                                                i === activeIndex ? "bg-white/40" : "bg-white/10 hover:bg-white/20"
                                            }`}
                                            style={i === activeIndex ? { background: r.themeColor } : {}}
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </motion.section>
    );
}
