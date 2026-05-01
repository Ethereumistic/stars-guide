"use client";

import { motion, Variants } from "motion/react";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { ModeLearnData } from "@/astrology/elements";
import { TbTargetArrow, TbLockSquare, TbArrowsExchange } from "react-icons/tb";

const cardVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 20,
        scale: 0.9,
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.5,
            ease: "easeOut",
        },
    },
};

const MODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    Cardinal: TbTargetArrow,
    Fixed: TbLockSquare,
    Mutable: TbArrowsExchange,
};

const MODE_COLORS: Record<string, { primary: string; glow: string; gradient: string }> = {
    Cardinal: {
        primary: "#FF6B35",
        glow: "rgba(255, 107, 53, 0.25)",
        gradient: "linear-gradient(135deg, rgba(255, 107, 53, 0.12) 0%, rgba(255, 107, 53, 0.03) 100%)",
    },
    Fixed: {
        primary: "#8BA840",
        glow: "rgba(139, 168, 64, 0.25)",
        gradient: "linear-gradient(135deg, rgba(139, 168, 64, 0.12) 0%, rgba(139, 168, 64, 0.03) 100%)",
    },
    Mutable: {
        primary: "#87CEEB",
        glow: "rgba(135, 206, 235, 0.25)",
        gradient: "linear-gradient(135deg, rgba(135, 206, 235, 0.12) 0%, rgba(135, 206, 235, 0.03) 100%)",
    },
};

interface CompactModeCardProps {
    data: ModeLearnData;
}

export function CompactModeCard({ data }: CompactModeCardProps) {
    const Icon = MODE_ICONS[data.id] || TbTargetArrow;
    const colors = MODE_COLORS[data.id] || MODE_COLORS.Cardinal;

    return (
        <motion.div variants={cardVariants} className="w-full">
            <Card className="group relative h-full overflow-hidden rounded-xl bg-transparent border border-border/30 shadow-none transition-all duration-500 hover:scale-[1.03] min-h-[180px]">
                {/* Background */}
                <div
                    className="absolute inset-0 backdrop-blur-[0.5px] rounded-xl"
                    style={{
                        background: `linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)`,
                    }}
                />

                {/* Gradient overlay */}
                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: colors.gradient }}
                />

                {/* Radial glow */}
                <div
                    className="absolute top-1/2 right-0 -translate-y-1/2 w-32 h-32 rounded-full transition-opacity duration-500 blur-2xl opacity-0 group-hover:opacity-30"
                    style={{ backgroundColor: colors.glow }}
                />

                <CardContent className="relative p-5 h-full flex items-center justify-between z-10">
                    <div className="flex flex-col h-full justify-center space-y-2 max-w-[65%]">
                        <span
                            className="text-[9px] font-sans uppercase tracking-[0.2em] opacity-60"
                            style={{ color: colors.primary }}
                        >
                            {data.tagline}
                        </span>

                        <h2
                            className="text-2xl md:text-3xl font-serif tracking-wide transition-colors duration-300 group-hover:text-white"
                            style={{
                                color: colors.primary,
                                textShadow: `0 0 5px ${colors.glow}`,
                            }}
                        >
                            {data.id}
                        </h2>

                        <p className="text-xs font-sans text-amber-100/60 uppercase tracking-widest mt-1 transition-opacity duration-500 opacity-0 group-hover:opacity-100">
                            {data.signs.join(" · ")}
                        </p>
                    </div>

                    <div className="relative flex items-center justify-center w-16 h-16 shrink-0 transition-transform duration-500 group-hover:scale-110">
                        <div style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }}>
                            <Icon
                                className="w-12 h-12 text-amber-100 group-hover:text-white transition-colors duration-500"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Hover glow */}
            <div
                className="absolute inset-0 -z-10 rounded-xl transition-opacity duration-500 blur-xl opacity-0 group-hover:opacity-20"
                style={{ backgroundColor: colors.glow }}
            />
        </motion.div>
    );
}
