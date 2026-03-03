"use client";

import { ReactNode } from "react";
import { motion } from "motion/react";

type SignTitleBlockVariant = "learn" | "horoscopes";

interface SignTitleBlockProps {
    variant: SignTitleBlockVariant;
    signName: string;
    subtitle: string;
    motto: string;
    icon: ReactNode;
    elementFrameUrl: string;
    borderColor: string;
}

export function SignTitleBlock({
    variant,
    signName,
    subtitle,
    motto,
    icon,
    elementFrameUrl,
    borderColor,
}: SignTitleBlockProps) {
    const subtitlePrefix = variant === "horoscopes" ? "Forecast // " : "";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="space-y-6"
        >
            <div className="flex flex-col sm:flex-row items-start gap-6 border-b border-white/10 pb-8">
                <div className="relative flex items-center justify-center shrink-0">
                    <img src={elementFrameUrl} className="w-32 h-32 md:w-40 md:h-40 object-cover" alt="" />
                    {icon}
                </div>
                <div className="space-y-2 pt-2 md:pt-4">
                    <h1 className="text-6xl md:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] font-serif text-white tracking-tighter leading-[0.85] break-words">
                        {signName}
                    </h1>
                    <p className="text-xl md:text-2xl font-serif italic text-white/60">
                        {subtitlePrefix}{subtitle}
                    </p>
                </div>
            </div>

            <p
                className="text-xs md:text-xl font-mono uppercase tracking-[0.25em] text-white border-l-2 pl-4 py-1"
                style={{ borderColor }}
            >
                "{motto}"
            </p>
        </motion.div>
    );
}
