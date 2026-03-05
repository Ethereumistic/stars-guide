"use client";

import { motion } from "motion/react";
import { ReactNode } from "react";

interface ConstellationGraphicProps {
    constellationUrl: string;
    signName: string;
    elementName: string;
    elementClass: string;
    houseIndex: number;
    signId: string;
    styles: {
        primary: string;
        glow: string;
    };
    size?: "default" | "large";
    bottomRight?: ReactNode;
}

export function ConstellationGraphic({
    constellationUrl,
    signName,
    elementName,
    elementClass,
    houseIndex,
    signId,
    styles,
    size = "default",
    bottomRight,
}: ConstellationGraphicProps) {
    const maxWidth = size === "large" ? "600px" : "500px";
    const minHeight = size === "large" ? "500px" : "400px";

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
            className="lg:col-span-7 relative h-full min-h-[500px] flex items-center justify-center lg:sticky lg:top-32 -translate-y-12"
        >
            <div
                className="relative w-full max-w-[420px] lg:max-w-[maxWidth] aspect-square rounded-full border border-white/10 bg-black/40 flex items-center justify-center p-8 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)]"
                style={{ maxWidth }}
            >
                <div
                    className="absolute inset-0 opacity-40"
                    style={{
                        background: `radial-gradient(circle at center, ${styles.glow} 0%, transparent 65%)`
                    }}
                />

                <div
                    className="absolute inset-0 pointer-events-none opacity-50"
                    style={{
                        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)`,
                        backgroundSize: '3rem 3rem'
                    }}
                />

                <img
                    src={constellationUrl}
                    alt={`${signName} Constellation`}
                    className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] opacity-90 scale-[1.35] hover:scale-[1.45] transition-transform duration-700 ease-out"
                />
            </div>

            <div className="absolute bottom-6 left-6 font-mono text-[10px] uppercase tracking-widest text-white/30 hidden lg:block">
                FIG. {houseIndex + 1} // {signId.toUpperCase()}
            </div>
            <div
                className="absolute bottom-6 right-6 font-mono text-[10px] uppercase tracking-[0.3em] hidden lg:block"
                style={{ color: styles.primary }}
            >
                {elementClass}
            </div>
            {bottomRight && (
                <div className="absolute bottom-4 right-4 font-mono text-[10px] uppercase tracking-[0.3em] hidden lg:block" style={{ color: styles.primary }}>
                    {bottomRight}
                </div>
            )}
        </motion.div>
    );
}
