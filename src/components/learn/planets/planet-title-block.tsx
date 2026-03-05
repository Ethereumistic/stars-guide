"use client";

import { motion } from "motion/react";

interface PlanetTitleBlockProps {
    planetName: string;
    classification: string;
    verbPhrase: string;
    glowColor: string;
    rulerSymbol: string;
}

export function PlanetTitleBlock({
    planetName,
    classification,
    verbPhrase,
    glowColor,
    rulerSymbol,
}: PlanetTitleBlockProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="space-y-6"
        >
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 border-b border-white/10 pb-6 sm:pb-8">
                <div className="relative flex items-center justify-center shrink-0 w-40 h-40 md:w-40 md:h-40">
                    <div
                        className="absolute inset-0 opacity-30 mix-blend-screen pointer-events-none"
                        style={{ background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)` }}
                    />
                    <span
                        className="relative z-10 text-6xl md:text-7xl font-serif text-white drop-shadow-xl"
                        style={{ textShadow: `0 0 20px ${glowColor}` }}
                    >
                        {rulerSymbol}
                    </span>
                </div>
                <div className="space-y-2 pt-2 md:pt-4 text-center sm:text-left">
                    <h1 className="text-7xl md:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] font-serif text-white tracking-tighter leading-[0.85] wrap-break-word">
                        {planetName}
                    </h1>
                    <p className="text-2xl md:text-2xl font-serif italic text-white/60">
                        {classification}
                    </p>
                </div>
            </div>

            <p
                className="text-base md:text-xl font-mono uppercase tracking-[0.25em] text-white border-l-2 pl-4 py-1"
                style={{ borderColor: glowColor }}
            >
                "{verbPhrase}"
            </p>
        </motion.div>
    );
}
