"use client";

import { motion } from "motion/react";
import { AspectData } from "@/astrology/aspects";
import { AspectUIConfig } from "@/config/aspects-ui";

interface AspectTitleBlockProps {
    data: AspectData;
    ui: AspectUIConfig;
}

export function AspectTitleBlock({ data, ui }: AspectTitleBlockProps) {
    const themeColor = ui.themeColor;
    const hexColor = ui.hexFallback;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="space-y-6"
        >
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 border-b border-white/10 pb-6 sm:pb-8">
                {/* Glyph Frame */}
                <div className="relative flex items-center justify-center shrink-0 w-40 h-40">
                    {/* Outer glow ring */}
                    <div
                        className="absolute inset-0 rounded-full opacity-20 blur-xl"
                        style={{ backgroundColor: hexColor }}
                    />
                    {/* Border ring */}
                    <div
                        className="absolute inset-0 rounded-full border opacity-30"
                        style={{ borderColor: hexColor }}
                    />
                    {/* Inner subtle ring */}
                    <div
                        className="absolute inset-4 rounded-full border opacity-15"
                        style={{ borderColor: hexColor }}
                    />
                    {/* Radial gradient fill */}
                    <div
                        className="absolute inset-0 rounded-full opacity-10"
                        style={{
                            background: `radial-gradient(circle at center, ${hexColor} 0%, transparent 70%)`
                        }}
                    />
                    {/* Glyph SVG — glyphOffsetTitle on wrapper shifts the whole block */}
                    <div className={`relative z-10 flex items-center justify-center ${ui.glyphOffsetTitle}`}>
                        <svg
                            viewBox="0 0 24 24"
                            className="w-16 h-16 shrink-0"
                            fill="none"
                            stroke={themeColor}
                            strokeWidth={ui.lineWeight === "heavy" ? 1.5 : ui.lineWeight === "medium" ? 1 : 0.75}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                                filter: `drop-shadow(0 0 8px ${hexColor}cc) drop-shadow(0 0 20px ${hexColor}66)`
                            }}
                        >
                            <path d={ui.glyphPath} />
                        </svg>
                    </div>
                </div>

                <div className="space-y-2 pt-2 md:pt-4 text-center sm:text-left">
                    <h1 className="text-7xl md:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] font-serif text-white tracking-tighter leading-[0.85] break-words">
                        {data.name}
                    </h1>
                    <p className="text-2xl md:text-2xl font-serif italic text-white/60">
                        {data.degreesExact} · {data.fraction}
                    </p>
                </div>
            </div>

            <p
                className="text-base md:text-xl font-mono uppercase tracking-[0.25em] text-white border-l-2 pl-4 py-1"
                style={{ borderColor: themeColor }}
            >
                "{ui.badgeLabel}"
            </p>
        </motion.div>
    );
}
