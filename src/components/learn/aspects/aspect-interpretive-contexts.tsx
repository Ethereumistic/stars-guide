"use client";

import { motion } from "motion/react";
import { TbStar, TbSparkles, TbUsers } from "react-icons/tb";
import { AspectData } from "@/astrology/aspects";
import { AspectUIConfig } from "@/config/aspects-ui";

interface AspectInterpretiveContextsProps {
    data: AspectData;
    ui: AspectUIConfig;
}

export function AspectInterpretiveContexts({ data, ui }: AspectInterpretiveContextsProps) {
    const hexColor = ui.hexFallback;

    const contexts = [
        {
            icon: TbStar,
            title: "Natal Chart",
            body: data.inNatalChart,
            bordered: true,
        },
        {
            icon: TbSparkles,
            title: "Transit",
            body: data.inTransit,
            bordered: true,
        },
        {
            icon: TbUsers,
            title: "Synastry",
            body: data.inSynastry,
            bordered: false,
        },
    ];

    return (
        <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="border border-white/10 bg-black/50 p-8 md:p-10 flex flex-col justify-center relative overflow-hidden rounded-md"
        >
            <div className="relative z-10 space-y-8">
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block">
                    Interpretive Contexts
                </span>

                {contexts.map(({ icon: Icon, title, body, bordered }) => (
                    <div
                        key={title}
                        className={bordered ? "border-b border-white/10 pb-6" : ""}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <Icon className="size-4" style={{ color: hexColor }} />
                            <h3 className="text-xl md:text-2xl font-serif text-white tracking-tight">
                                {title}
                            </h3>
                        </div>
                        <p className="text-sm text-white/60 font-sans leading-relaxed">
                            {body}
                        </p>
                    </div>
                ))}
            </div>
        </motion.section>
    );
}
