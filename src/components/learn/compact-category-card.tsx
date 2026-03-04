"use client";

import { motion, Variants, AnimatePresence } from "motion/react";
import Link from "next/link";
import { ComponentType, useMemo, useState } from "react";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import {
    TbZodiacAries, TbZodiacTaurus, TbZodiacGemini, TbZodiacCancer,
    TbZodiacLeo, TbZodiacVirgo, TbZodiacLibra, TbZodiacScorpio,
    TbZodiacSagittarius, TbZodiacCapricorn, TbZodiacAquarius, TbZodiacPisces,
} from "react-icons/tb";

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
        opacity: 1, y: 0, scale: 1,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    }
};

// ─── Zodiac icons array ───
const ZODIAC_ICONS = [
    TbZodiacAries, TbZodiacTaurus, TbZodiacGemini, TbZodiacCancer,
    TbZodiacLeo, TbZodiacVirgo, TbZodiacLibra, TbZodiacScorpio,
    TbZodiacSagittarius, TbZodiacCapricorn, TbZodiacAquarius, TbZodiacPisces,
];

// ─── Planet symbols ───
const PLANET_SYMBOLS = ["☉", "☾", "☿", "♀", "♂", "♃", "♄", "⛢", "♆", "♇"];

// ─── Aspect symbols ───
const ASPECT_SYMBOLS = ["☌", "⚹", "□", "△", "☍", "⊼", "⊻"];

// ─── Color palettes mirroring pricing-data.ts UI values ───
// gray = Free tier, gold = Cosmic Flow, purple = Oracle
const PALETTES = {
    gray: {
        glow: "rgba(71, 85, 105, 0.2)",
        glowStrong: "rgba(71, 85, 105, 0.5)",
        border: "rgba(255, 255, 255, 0.2)",
        accent: "var(--color-white, #ffffff)",
        accentRgb: "255,255,255",
        glare: "rgba(255,255,255,0.06)",
    },
    gold: {
        glow: "rgba(212, 175, 55, 0.4)",
        glowStrong: "rgba(212, 175, 55, 0.6)",
        border: "color-mix(in srgb, var(--primary) 60%, transparent)",
        accent: "var(--primary)",
        accentRgb: "212,175,55",
        glare: "rgba(212, 175, 55, 0.08)",
    },
    purple: {
        glow: "rgba(157, 78, 221, 0.4)",
        glowStrong: "rgba(157, 78, 221, 0.6)",
        border: "color-mix(in srgb, var(--galactic) 60%, transparent)",
        accent: "var(--galactic)",
        accentRgb: "157,78,221",
        glare: "rgba(138, 43, 226, 0.08)",
    }
};

// Map each category to a palette
const CATEGORY_PALETTE: Record<string, keyof typeof PALETTES> = {
    signs: "gold",
    houses: "gray",
    planets: "purple",
    aspects: "gold"
};

interface CategoryCardData {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
    href: string;
    gradient: string;
    status: string;
    element?: "Fire" | "Earth" | "Air" | "Water";
}

interface CompactCategoryCardProps {
    category: CategoryCardData;
}

export function CompactCategoryCard({ category }: CompactCategoryCardProps) {
    const { title, subtitle, icon: Icon, href, status, id } = category;
    const isLocked = status === "Coming Soon";
    const [isHovered, setIsHovered] = useState(false);

    const paletteKey = CATEGORY_PALETTE[id] || "gray";
    const palette = PALETTES[paletteKey];

    const ringItems = useMemo(() => {
        if (id === "signs") return ZODIAC_ICONS.map((ZIcon, i) => ({ type: "icon" as const, Icon: ZIcon, key: i }));
        if (id === "houses") return Array.from({ length: 12 }, (_, i) => ({ type: "number" as const, num: i + 1, key: i }));
        if (id === "planets") return PLANET_SYMBOLS.map((s, i) => ({ type: "symbol" as const, symbol: s, key: i }));
        return ASPECT_SYMBOLS.map((s, i) => ({ type: "symbol" as const, symbol: s, key: i }));
    }, [id]);

    const total = ringItems.length;

    return (
        <motion.div variants={cardVariants} className="w-full">
            <Link
                href={href}
                className={`group relative block ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <Card className="relative overflow-hidden rounded-2xl bg-transparent border-0 shadow-none transition-all duration-500 group-hover:scale-[1.02] aspect-square">
                    {/* Base */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `linear-gradient(160deg, rgba(12,12,20,0.97) 0%, rgba(6,6,12,0.99) 100%)`,
                            border: `1px solid rgba(${palette.accentRgb},0.15)`,
                            borderRadius: "1rem",
                        }}
                    />

                    {/* Diagonal glare sweep (from pricing-card) */}
                    <AnimatePresence>
                        {isHovered && (
                            <motion.div
                                className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <motion.div
                                    className="absolute inset-0 w-[200%] h-[200%]"
                                    initial={{ x: "-50%", y: "-50%" }}
                                    animate={{ x: "50%", y: "50%" }}
                                    transition={{ duration: 1.5, ease: "easeInOut" }}
                                    style={{
                                        background: `linear-gradient(135deg, transparent 0%, transparent 40%, ${palette.glare} 50%, transparent 60%, transparent 100%)`,
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Ornamental ring — centered in card */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        {/* Outer decorative circle */}
                        <div
                            className="absolute w-[90%] h-[90%] rounded-full opacity-10 group-hover:opacity-25 transition-all duration-700"
                            style={{ border: `1px solid ${palette.accent}` }}
                        />
                        <div
                            className="absolute w-[65%] h-[65%] rounded-full opacity-5 group-hover:opacity-15 transition-all duration-700"
                            style={{ border: `1px dashed rgba(${palette.accentRgb},0.5)` }}
                        />

                        {/* Items on the ring */}
                        <div className="relative w-[85%] h-[85%] transition-transform duration-2500 ease-out group-hover:rotate-90">
                            {ringItems.map((item, i) => {
                                const angle = (360 / total) * i - 90;
                                const rad = (angle * Math.PI) / 180;
                                const radius = 46;
                                const x = 50 + radius * Math.cos(rad);
                                const y = 50 + radius * Math.sin(rad);
                                return (
                                    <div
                                        key={item.key}
                                        className="absolute opacity-10 group-hover:opacity-50 transition-opacity duration-700"
                                        style={{
                                            left: `${x}%`,
                                            top: `${y}%`,
                                            transform: "translate(-50%, -50%)",
                                            color: palette.accent,
                                            filter: `drop-shadow(0 0 4px ${palette.glow})`,
                                        }}
                                    >
                                        {item.type === "icon" ? (
                                            <item.Icon className="w-6 h-6 md:w-7 md:h-7 group-hover:-rotate-90 transition-transform duration-2500 ease-out" />
                                        ) : item.type === "number" ? (
                                            <div className="group-hover:-rotate-90 transition-transform duration-2500 ease-out">
                                                <span className="text-base md:text-lg font-serif font-bold">{item.num}</span>
                                            </div>
                                        ) : (
                                            <div className="group-hover:-rotate-90 transition-transform duration-2500 ease-out">
                                                <span className="text-lg md:text-xl font-serif">{item.symbol}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Glow pulse */}
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-700 blur-3xl"
                        style={{ backgroundColor: palette.accent }}
                    />

                    <CardContent className="relative h-full flex flex-col justify-between z-10">
                        {/* Top row: subtitle top-left, icon top-right */}
                        <div className="flex items-start justify-between">
                            {/* <span
                                className="text-[9px] uppercase tracking-[0.3em] opacity-40 group-hover:opacity-80 transition-opacity duration-500"
                                style={{ color: palette.accent }}
                            >
                                {subtitle}
                            </span> */}
                            <Icon
                                className="w-7 h-7 opacity-40   group-hover:opacity-80 transition-all duration-500 group-hover:scale-110 "
                                style={{ color: palette.accent, filter: `drop-shadow(0 0 10px ${palette.glow})` }}
                            />
                        </div>

                        {/* Bottom: title and status */}
                        <div className="flex items-center justify-center h-[100%] -mt-8" >
                            <h2
                                className="text-2xl md:text-3xl font-serif text-center tracking-widest"
                                style={{ color: palette.accent, textShadow: `0 0 25px ${palette.glow}` }}
                            >
                                {title}
                            </h2>
                            {/* {isLocked && (
                                <p className="text-[10px] text-white/25 uppercase tracking-widest mt-2">Coming Soon</p>
                            )} */}
                        </div>
                    </CardContent>
                </Card>

                <div
                    className="absolute inset-0 -z-10 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 blur-2xl"
                    style={{ backgroundColor: palette.accent }}
                />
            </Link>
        </motion.div>
    );
}
