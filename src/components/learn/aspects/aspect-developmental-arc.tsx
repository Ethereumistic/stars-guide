"use client";

import { motion } from "motion/react";
import { TbHeart, TbBolt } from "react-icons/tb";
import { AspectData } from "@/astrology/aspects";
import { AspectUIConfig } from "@/config/aspects-ui";
import { AspectRealTimeCard } from "./aspect-real-time-card";

interface AspectDevelopmentalArcProps {
    data: AspectData;
    ui: AspectUIConfig;
}

export function AspectDevelopmentalArc({ data, ui }: AspectDevelopmentalArcProps) {
    const hexColor = ui.hexFallback;

    return (
        <>
            <motion.section
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="border border-white/10 bg-black/50 flex flex-col rounded-md overflow-hidden"
            >
                <div className="p-8 md:p-12 border-b border-white/10">
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-6">
                        Developmental Arc
                    </span>
                    <h2 className="text-4xl md:text-6xl font-serif text-white tracking-tight mb-8">
                        {data.coreKeywords[0]}
                    </h2>
                    <p className="text-lg text-white/70 leading-relaxed font-serif">
                        {data.developmentalTheme}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-6 md:p-8 space-y-8 border-b md:border-b-0 md:border-r border-white/10">
                        <div className="space-y-5">
                            <div className="flex items-center gap-2.5">
                                <TbHeart className="size-5 text-white/40" />
                                <span className="font-mono text-white/30 text-[10px] uppercase tracking-[0.3em] mt-0.5">
                                    Well-Integrated
                                </span>
                            </div>
                            <p className="text-sm text-white/80 leading-relaxed font-serif">
                                {data.expressionEasy}
                            </p>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 space-y-8">
                        <div className="space-y-5">
                            <div className="flex items-center gap-2.5">
                                <TbBolt className="size-5 text-white/40" />
                                <span className="font-mono text-white/30 text-[10px] uppercase tracking-[0.3em] mt-0.5">
                                    Unresolved
                                </span>
                            </div>
                            <p className="text-sm text-white/80 leading-relaxed font-serif">
                                {data.expressionChallenged}
                            </p>
                        </div>
                    </div>
                </div>
            </motion.section>

        </>
    );
}
