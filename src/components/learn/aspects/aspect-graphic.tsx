"use client";

import { motion } from "motion/react";
import { AspectData } from "@/astrology/aspects";
import { AspectUIConfig } from "@/config/aspects-ui";

interface AspectGraphicProps {
    data: AspectData;
    ui: AspectUIConfig;
    size?: "default" | "large";
}

export function AspectGraphic({ data, ui, size = "default" }: AspectGraphicProps) {
    const maxWidth = size === "large" ? "600px" : "500px";
    const hexColor = ui.hexFallback;

    // Determine how many orbit circles to show based on the harmonic number
    const orbits = Math.min(data.harmonicNumber, 6);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
            className="lg:col-span-7 relative h-full min-h-[500px] flex items-center justify-center lg:sticky lg:top-32 -translate-y-12"
        >
            <div
                className="relative w-full max-w-[420px] aspect-square rounded-full border border-white/10 bg-black/40 flex items-center justify-center p-8 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)]"
                style={{ maxWidth }}
            >
                {/* Radial gradient */}
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        background: `radial-gradient(circle at center, ${hexColor} 0%, transparent 65%)`
                    }}
                />

                {/* Grid overlay */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-40"
                    style={{
                        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)`,
                        backgroundSize: '3rem 3rem'
                    }}
                />

                {/* Concentric orbit rings */}
                {Array.from({ length: orbits }).map((_, i) => {
                    const scale = 0.25 + (i / orbits) * 0.75;
                    return (
                        <div
                            key={i}
                            className="absolute rounded-full border border-white/10"
                            style={{
                                width: `${scale * 100}%`,
                                height: `${scale * 100}%`,
                                borderColor: `${hexColor}${Math.round((1 - i / orbits) * 40).toString(16).padStart(2, '0')}`,
                            }}
                        />
                    );
                })}

                {/* Central content — glyphOffsetGraphic on the wrapper shifts the whole glyph block */}
                <div className={`relative z-10 flex flex-col items-center justify-center gap-6 ${ui.glyphOffsetGraphic}`}>
                    {/* Glyph SVG — paths authored for 24×24 viewBox */}
                    <svg
                        viewBox="0 0 24 24"
                        className="w-48 h-48 md:w-64 md:h-64 shrink-0"
                        fill="none"
                        stroke={ui.themeColor}
                        strokeWidth={ui.lineWeight === "heavy" ? 1 : ui.lineWeight === "medium" ? 0.75 : 0.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                            filter: `drop-shadow(0 0 12px ${hexColor}cc) drop-shadow(0 0 32px ${hexColor}66) drop-shadow(0 0 64px ${hexColor}33)`
                        }}
                    >
                        <path d={ui.glyphPath} />
                    </svg>

                    {/* Degrees label */}
                    {/* <div className="flex flex-col items-center gap-1">
                        <span
                            className="font-mono text-[11px] uppercase tracking-[0.4em]"
                            style={{ color: hexColor }}
                        >
                            {data.degreesExact}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
                            {data.fraction} · Harmonic {data.harmonicNumber}
                        </span>
                    </div> */}
                </div>

                {/* Line style indicator — subtle lines emanating for dashed vs dotted */}
                {ui.lineStyle !== "solid" && (
                    <div className="absolute inset-0 rounded-full pointer-events-none">
                        <svg className="w-full h-full opacity-10" viewBox="0 0 100 100">
                            <line
                                x1="10" y1="50" x2="90" y2="50"
                                stroke={hexColor}
                                strokeWidth="1"
                                strokeDasharray={ui.lineStyle === "dashed" ? "6 4" : "2 4"}
                            />
                            <line
                                x1="50" y1="10" x2="50" y2="90"
                                stroke={hexColor}
                                strokeWidth="1"
                                strokeDasharray={ui.lineStyle === "dashed" ? "6 4" : "2 4"}
                            />
                        </svg>
                    </div>
                )}
            </div>

            {/* Bottom corner labels */}
            <div className="absolute bottom-6 left-6 font-mono text-[10px] uppercase tracking-widest text-white/30 hidden lg:block">
                FIG. {data.harmonicNumber} // {data.id.toUpperCase()}
            </div>
            <div
                className="absolute bottom-6 right-6 font-mono text-[10px] uppercase tracking-[0.3em] hidden lg:block"
                style={{ color: hexColor }}
            >
                {data.ptolemaic ? "Ptolemaic" : data.keplerIntroduced ? "Keplerian" : "Harmonic"}
            </div>
        </motion.div>
    );
}
