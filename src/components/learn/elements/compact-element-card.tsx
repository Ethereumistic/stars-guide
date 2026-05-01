"use client";

import { motion, Variants } from "motion/react";
import Link from "next/link";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { ElementLearnData } from "@/astrology/elements";
import { elementUIConfig } from "@/config/elements-ui";

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

interface CompactElementCardProps {
    data: ElementLearnData;
    isActive?: boolean;
    href?: string;
}

export function CompactElementCard({ data, isActive = false, href }: CompactElementCardProps) {
    const ui = elementUIConfig[data.id as keyof typeof elementUIConfig];
    const Icon = ui.icon;
    const styles = ui.styles;

    return (
        <motion.div variants={cardVariants} className="w-full">
            <Link
                href={href ?? `/learn/elements/${data.id.toLowerCase()}`}
                className="group relative block h-full"
            >
                <Card className="relative h-full overflow-hidden rounded-xl bg-transparent border border-border/30 shadow-none transition-all duration-500 group-hover:scale-[1.03] min-h-[180px]">
                    {/* Card background */}
                    <div
                        className="absolute inset-0 backdrop-blur-[0.5px] rounded-xl"
                        style={{
                            background: `linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)`,
                        }}
                    />

                    {/* Element gradient overlay */}
                    <div
                        className={`absolute inset-0 transition-opacity duration-500 ${isActive ? "opacity-20" : "opacity-0"} group-hover:opacity-20`}
                        style={{ background: styles.gradient }}
                    />

                    {/* Radial glow */}
                    <div
                        className="absolute top-1/2 right-0 -translate-y-1/2 w-32 h-32 rounded-full transition-opacity duration-500 blur-2xl opacity-0 group-hover:opacity-30"
                        style={{ backgroundColor: styles.glow }}
                    />

                    <CardContent className="relative p-5 h-full flex items-center justify-between z-10">
                        {/* Left: text */}
                        <div className="flex flex-col h-full justify-center space-y-2 max-w-[65%]">
                            <span
                                className="text-[9px] font-sans uppercase tracking-[0.2em] opacity-60"
                                style={{ color: styles.secondary }}
                            >
                                {data.tagline}
                            </span>

                            <h2
                                className="text-2xl md:text-3xl font-serif tracking-wide transition-colors duration-300 group-hover:text-white"
                                style={{
                                    color: styles.primary,
                                    textShadow: `0 0 5px ${styles.glow}`,
                                }}
                            >
                                {data.id}
                            </h2>

                            <p className="text-xs font-sans text-amber-100/60 uppercase tracking-widest mt-1 transition-opacity duration-500 opacity-0 group-hover:opacity-100">
                                {data.signs.join(" · ")}
                            </p>
                        </div>

                        {/* Right: icon */}
                        <div className="relative flex items-center justify-center w-16 h-16 shrink-0 transition-all duration-500 group-hover:scale-125 group-hover:-translate-x-2">
                            <Icon
                                className="w-12 h-12 text-amber-100 group-hover:text-white transition-colors duration-500"
                                style={{
                                    filter: `drop-shadow(0 0 8px ${styles.glow})`,
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Hover shadow glow */}
                <div
                    className="absolute inset-0 -z-10 rounded-xl transition-opacity duration-500 blur-xl opacity-0 group-hover:opacity-20"
                    style={{ backgroundColor: styles.glow }}
                />
            </Link>
        </motion.div>
    );
}
