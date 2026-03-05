"use client";

import { motion } from "motion/react";

interface HouseTitleBlockProps {
    houseName: string;       // e.g. "First House"
    romanNumeral: string;    // e.g. "I"
    motto: string;           // e.g. "I am."
    archetypeName: string;   // e.g. "The House of Self"
    borderColor: string;     // CSS color string from houseUIConfig.themeColor
}

export function HouseTitleBlock({
    houseName,
    romanNumeral,
    motto,
    archetypeName,
    borderColor,
}: HouseTitleBlockProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="space-y-6"
        >
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 border-b border-white/10 pb-6 sm:pb-8">
                {/* Roman numeral frame — mirrors the element frame + icon block */}
                <div className="relative flex items-center justify-center shrink-0 w-40 h-40">
                    {/* Outer ring */}
                    <div
                        className="absolute inset-0 rounded-full border opacity-20"
                        style={{ borderColor }}
                    />
                    {/* Inner glow disc */}
                    <div
                        className="absolute inset-4 rounded-full blur-xl opacity-15"
                        style={{ backgroundColor: borderColor }}
                    />
                    {/* Roman numeral */}
                    <span
                        className="relative z-10 font-serif text-[4.5rem] leading-none select-none"
                        style={{
                            color: borderColor,
                            filter: `drop-shadow(0 0 12px ${borderColor}88)`
                        }}
                    >
                        {romanNumeral}
                    </span>
                </div>

                <div className="space-y-2 pt-2 md:pt-4 text-center sm:text-left">
                    <h1 className="text-7xl text-nowrap md:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] font-serif text-white tracking-tighter leading-[0.85] break-words">
                        {houseName}
                    </h1>
                    <p className="text-2xl md:text-2xl font-serif italic text-white/60">
                        {archetypeName}
                    </p>
                </div>
            </div>

            <p
                className="text-base md:text-xl font-mono uppercase tracking-[0.25em] text-white border-l-2 pl-4 py-1"
                style={{ borderColor }}
            >
                "{motto}"
            </p>
        </motion.div>
    );
}