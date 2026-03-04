"use client";

import { motion, Variants } from "motion/react";
import Link from "next/link";
import { ComponentType } from "react";
import { GiFlame, GiStonePile, GiTornado, GiWaveCrest } from "react-icons/gi";
import {
    Card,
    CardContent,
} from "@/components/ui/card";

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
            ease: [0.22, 1, 0.36, 1]
        }
    }
};

interface CategoryCardData {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
    href: string;
    gradient: string;
    status: string;
    element?: "Fire" | "Earth" | "Air" | "Water";
}

interface CompactCategoryCardProps {
    category: CategoryCardData;
}

const CATEGORY_ELEMENTS: Record<string, "Fire" | "Earth" | "Air" | "Water"> = {
    signs: "Fire",
    houses: "Earth",
    planets: "Water",
    aspects: "Air"
};

const getStyles = (element: "Fire" | "Earth" | "Air" | "Water") => {
    const el = element.toLowerCase();
    return {
        primary: `var(--${el}-primary)`,
        secondary: `var(--${el}-secondary)`,
        glow: `var(--${el}-glow)`,
        border: `var(--${el}-border)`,
        gradient: `var(--${el}-gradient)`
    };
};

const getElementIcon = (element: "Fire" | "Earth" | "Air" | "Water") => {
    switch (element) {
        case "Fire": return GiFlame;
        case "Earth": return GiStonePile;
        case "Air": return GiTornado;
        case "Water": return GiWaveCrest;
    }
};

const CONSTELLATION_URLS: Record<string, string> = {
    signs: "https://cdn.jsdelivr.net/gh/Ethereumistic/stars-guide-assets/signs/constellations/aries.svg",
    houses: "https://cdn.jsdelivr.net/gh/Ethereumistic/stars-guide-assets/signs/constellations/taurus.svg",
    planets: "https://cdn.jsdelivr.net/gh/Ethereumistic/stars-guide-assets/signs/constellations/cancer.svg",
    aspects: "https://cdn.jsdelivr.net/gh/Ethereumistic/stars-guide-assets/signs/constellations/gemini.svg"
};

export function CompactCategoryCard({ category }: CompactCategoryCardProps) {
    const { title, subtitle, icon: Icon, href, status, id } = category;
    const isLocked = status === "Coming Soon";
    const element = category.element || CATEGORY_ELEMENTS[id] || "Fire";
    const styles = getStyles(element);
    const ElementIcon = getElementIcon(element);
    const constellationUrl = CONSTELLATION_URLS[id];

    return (
        <motion.div variants={cardVariants} className="w-full">
            <Link
                href={href}
                className={`group relative block h-full ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <Card className="relative h-full overflow-hidden rounded-xl bg-transparent border-0 shadow-none transition-all duration-500 group-hover:scale-[1.03] min-h-[200px]">
                    <div
                        className="absolute inset-0 backdrop-blur-[0.5px]"
                        style={{
                            background: `linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)`,
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderImage: `linear-gradient(135deg, ${styles.border}, transparent) 1`
                        }}
                    />

                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                        style={{ background: styles.gradient }}
                    />

                    <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden pointer-events-none">
                        <img
                            src={constellationUrl}
                            alt=""
                            className="absolute top-1/2 right-[-20%] -translate-y-1/2 h-full object-contain opacity-15 scale-125 transition-all duration-700 group-hover:opacity-30 group-hover:scale-100 group-hover:right-0"
                            style={{
                                filter: `drop-shadow(0 0 10px ${styles.glow})`
                            }}
                        />
                    </div>

                    <div
                        className="absolute top-1/2 right-0 -translate-y-1/2 w-32 h-32 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-2xl"
                        style={{ backgroundColor: styles.glow }}
                    />

                    <CardContent className="relative p-5 h-full flex items-center justify-between z-10">
                        <div className="flex flex-col h-full justify-center space-y-2 max-w-[65%]">
                            <div className="flex items-center gap-2 mb-1">
                                <ElementIcon
                                    className="w-3.5 h-3.5"
                                    style={{ color: styles.primary }}
                                />
                                <span
                                    className="text-[9px] font-sans uppercase tracking-[0.2em] opacity-80"
                                    style={{ color: styles.secondary }}
                                >
                                    {subtitle}
                                </span>
                            </div>

                            <h2
                                className="text-2xl md:text-3xl font-serif tracking-wide transition-colors duration-300 group-hover:text-white"
                                style={{
                                    color: styles.secondary,
                                    textShadow: `0 0 5px ${styles.glow}`
                                }}
                            >
                                {title}
                            </h2>

                            {isLocked && (
                                <p className="text-[10px] font-sans text-white/40 uppercase tracking-widest mt-1">
                                    Coming Soon
                                </p>
                            )}
                        </div>

                        <div className="relative flex items-center justify-center w-16 h-16 shrink-0 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                            <div style={{ filter: isLocked ? 'none' : `drop-shadow(0 0 8px ${styles.glow})` }}>
                                <Icon
                                    className={`w-12 h-12 transition-colors duration-500 ${isLocked ? 'text-white/20' : 'text-amber-100 group-hover:text-white'}`}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div
                    className="absolute inset-0 -z-10 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl"
                    style={{ backgroundColor: styles.glow }}
                />
            </Link>
        </motion.div>
    );
}
