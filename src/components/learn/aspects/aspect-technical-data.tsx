"use client";

import { motion } from "motion/react";
import { AspectData } from "@/astrology/aspects";
import { AspectUIConfig } from "@/config/aspects-ui";

interface AspectTechnicalDataProps {
    data: AspectData;
    ui: AspectUIConfig;
}

export function AspectTechnicalData({ data, ui }: AspectTechnicalDataProps) {
    const hexColor = ui.hexFallback;

    const stats = [
        { label: "Orb Standard", value: `${data.orb.standard}°` },
        { label: "Orb w/ Luminary", value: `${data.orb.withLuminary}°` },
        { label: "Tight Orb", value: `${data.orb.tight}°` },
        { label: "Compatible Elements", value: data.compatibleElements ? "Yes" : "No" },
        { label: "Shared Modality", value: data.sharedModality ? "Yes" : "No" },
        {
            label: "Signs Apart",
            value: data.signsApart !== null ? `${data.signsApart}` : "Non-integer",
        },
    ];

    return (
        <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="border border-white/10 bg-black/50 p-8 rounded-md"
        >
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-6">
                Technical Data
            </span>

            <div className="grid grid-cols-2 gap-4 mb-6">
                {stats.map((item) => (
                    <div key={item.label} className="space-y-1">
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30 block">
                            {item.label}
                        </span>
                        <span className="text-base font-serif text-white/80">
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                {data.coreKeywords.map((kw) => (
                    <span
                        key={kw}
                        className="px-3 py-1 border text-[10px] font-mono uppercase tracking-widest text-white/50 rounded-sm"
                        style={{
                            borderColor: `${hexColor}40`,
                            backgroundColor: `${hexColor}10`,
                        }}
                    >
                        {kw}
                    </span>
                ))}
            </div>
        </motion.section>
    );
}
