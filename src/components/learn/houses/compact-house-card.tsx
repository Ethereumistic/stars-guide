"use client";

import { motion, Variants } from "motion/react";
import Link from "next/link";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { HouseData } from "@/astrology/houses";
import { HouseUIConfig } from "@/config/house-ui";
import { useEffect, useState } from "react";

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
            ease: "easeOut"
        }
    }
};

interface CompactHouseCardProps {
    data: HouseData;
    ui: HouseUIConfig;
    isActive?: boolean;
    href?: string;
}

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    return isMobile;
}

export function CompactHouseCard({ data, ui, isActive = false, href }: CompactHouseCardProps) {
    const isMobile = useIsMobile();

    const isActiveMobile = isActive && isMobile;
    const linkHref = href ?? `/learn/houses/${data.id}`;

    const activeClass = isActiveMobile ? "scale-[1.03]" : "";
    const activeOpacity = isActiveMobile ? "opacity-20" : "opacity-0";
    const activeGlow = isActiveMobile ? "opacity-30" : "opacity-0";
    const activeText = isActiveMobile ? "text-white" : "";
    const activeArchetype = isActiveMobile ? "opacity-100" : "opacity-0";
    const activeRotate = isActiveMobile ? "rotate-1 scale-110" : "";

    // Derive a subtle gradient from the theme color for the element-style overlay
    const overlayGradient = `linear-gradient(135deg, ${ui.themeColor}33 0%, ${ui.themeColor}08 100%)`;
    const glowColor = ui.themeColor;

    return (
        <motion.div variants={cardVariants} className="w-full">
            <Link
                href={linkHref}
                className="group relative block h-full"
            >
                <Card className={`relative h-full overflow-hidden rounded-xl bg-transparent border border-border/30 shadow-none transition-all duration-500 group-hover:scale-[1.03] ${activeClass} min-h-[160px]`}>
                    {/* Card background with gradient */}
                    <div
                        className="absolute inset-0 backdrop-blur-[0.5px] rounded-xl"
                        style={{
                            background: `linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)`
                        }}
                    />

                    {/* Theme color gradient overlay */}
                    <div
                        className={`absolute inset-0 transition-opacity duration-500 ${activeOpacity} group-hover:opacity-20`}
                        style={{ background: overlayGradient }}
                    />

                    {/* Roman numeral watermark */}
                    <div className="absolute inset-y-0 right-0 w-1/2 pointer-events-none overflow-hidden">
                        <span
                            className={`absolute top-1/2 right-[-10%] -translate-y-1/2 font-serif text-[7rem] leading-none select-none opacity-[0.07] scale-125 transition-all duration-700 group-hover:opacity-[0.15] group-hover:scale-100 group-hover:right-[5%] ${isActiveMobile ? "opacity-[0.15] scale-100 right-[5%]" : ""}`}
                            style={{ color: glowColor }}
                        >
                            {data.romanNumeral}
                        </span>
                    </div>

                    {/* Radial glow effect */}
                    <div
                        className={`absolute top-1/2 right-0 -translate-y-1/2 w-32 h-32 rounded-full transition-opacity duration-500 blur-2xl ${activeGlow} group-hover:opacity-30`}
                        style={{ backgroundColor: glowColor }}
                    />

                    <CardContent className="relative p-5 h-full flex items-center justify-between z-10">
                        {/* Left section: Text & Details */}
                        <div className="flex flex-col h-full justify-center space-y-2 max-w-[65%]">
                            <div className="flex items-center gap-2 mb-1">
                                {/* Angularity badge */}
                                <span
                                    className="text-[9px] font-sans uppercase tracking-[0.2em] opacity-80"
                                    style={{ color: glowColor }}
                                >
                                    {data.angularity} · {data.naturalSign}
                                </span>
                            </div>

                            <h2
                                className={`text-2xl md:text-3xl font-serif tracking-wide transition-colors duration-300 group-hover:text-white ${activeText}`}
                                style={{
                                    color: "rgb(254 243 199)", // amber-100 equivalent
                                    textShadow: `0 0 5px ${glowColor}55`
                                }}
                            >
                                {data.name}
                            </h2>

                            <p className={`text-xs font-sans text-nowrap text-amber-100/60 uppercase tracking-widest mt-1 transition-opacity duration-500 ${activeArchetype} group-hover:opacity-100`}>
                                {data.primaryArena}
                            </p>
                        </div>

                        {/* Right section: Number + Keyword */}
                        <div className={`relative flex flex-col items-center justify-center w-16 h-16 shrink-0 transition-transform duration-500 group-hover:scale-110 ${activeRotate}`}>
                            {/* Keyword */}
                            <span
                                className={`text-[9px] font-sans uppercase tracking-widest text-amber-100/50 transition-colors duration-500 group-hover:text-white/70 ${activeText ? "text-white/70" : ""}`}
                            >
                                {data.keyword}
                            </span>
                            {/* House number */}
                            <span
                                className={`text-3xl font-serif leading-tight transition-colors duration-500 group-hover:text-white ${activeText}`}
                                style={{
                                    color: glowColor,
                                    filter: `drop-shadow(0 0 8px ${glowColor}88)`
                                }}
                            >
                                {data.id}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Hover shadow glow */}
                <div
                    className={`absolute inset-0 -z-10 rounded-xl transition-opacity duration-500 blur-xl ${isActiveMobile ? "opacity-20" : "opacity-0"} group-hover:opacity-20`}
                    style={{ backgroundColor: glowColor }}
                />
            </Link>
        </motion.div>
    );
}