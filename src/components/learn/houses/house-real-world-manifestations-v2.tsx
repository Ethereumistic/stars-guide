"use client";

import { motion } from "motion/react";
import { GiMightyForce } from "react-icons/gi";

interface HouseRealWorldManifestationsV2Props {
    archetypeName: string;
    primaryArena: string;
    realWorldManifestations: string[];
    compositionalPrepositionalPhrase: string;
    developmentalTheme: string;
    angularity: string;
    themeColor?: string;
    borderColor?: string;
}

export function HouseRealWorldManifestationsV2({
    archetypeName,
    primaryArena,
    realWorldManifestations,
    compositionalPrepositionalPhrase,
    developmentalTheme,
    angularity,
    themeColor = "#ffffff",
    borderColor = "#ffffff",
}: HouseRealWorldManifestationsV2Props) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="lg:col-span-2 border border-white/10 bg-black/50 rounded-md overflow-hidden"
        >
            <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Left Column - Primary Domain */}
                <div className="p-8 md:p-12 border-b lg:border-b-0 lg:border-r border-white/10">
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-6">
                        Primary Domain
                    </span>
                    <h2 className="text-4xl md:text-6xl font-serif text-white tracking-tight mb-8">
                        {archetypeName}
                    </h2>
                    <p className="text-lg text-white/70 leading-relaxed font-serif">
                        {primaryArena}
                    </p>
                </div>

                {/* Right Column - Rest of content */}
                <div className="p-6 md:p-8 space-y-6">
                    <blockquote
                        className="border-l-2 pl-6 py-2 border-white/20"
                    >
                        <p className="text-xl text-white/90 italic font-serif leading-relaxed">
                            "{compositionalPrepositionalPhrase}"
                        </p>
                    </blockquote>

                    <div className="space-y-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 block">
                            Developmental Path
                        </span>
                        <p className="text-sm text-white/60 font-sans mt-0">
                            {developmentalTheme}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                        {["Angular", "Succedent", "Cadent"].map(type => (
                            <span
                                key={type}
                                className="px-3 py-1 border text-[10px] font-mono uppercase tracking-widest rounded-sm transition-colors"
                                style={
                                    type === angularity
                                        ? {
                                            backgroundColor: `${themeColor}22`,
                                            borderColor: `${themeColor}66`,
                                            color: themeColor,
                                        }
                                        : {
                                            backgroundColor: "rgba(255,255,255,0.03)",
                                            borderColor: "rgba(255,255,255,0.10)",
                                            color: "rgba(255,255,255,0.30)",
                                        }
                                }
                            >
                                {type}
                            </span>
                        ))}
                    </div>

                    <div className="flex items-center gap-2.5 pt-4 border-t border-white/10">
                        <GiMightyForce className="size-5" />
                        <span className="font-mono text-white/30 text-[10px] uppercase tracking-[0.3em] mt-0.5">
                            Real-World Manifestations
                        </span>
                    </div>
                    <ul className="text-sm text-white/90 space-y-2 list-disc list-inside">
                        {realWorldManifestations.map((m, i) => (
                            <li key={i}>{m}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </motion.section>
    );
}
