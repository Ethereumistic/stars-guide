"use client";

import { motion, Variants } from "motion/react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PlanetData } from "@/astrology/planets";
import { PlanetUIConfig } from "@/config/planet-ui";
import { useEffect, useState } from "react";

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

interface CompactPlanetCardProps {
    data: PlanetData;
    ui: PlanetUIConfig;
    isActive?: boolean;
    href?: string;
}

export function CompactPlanetCard({ data, ui, isActive = false, href }: CompactPlanetCardProps) {
    const linkHref = href ?? `/learn/planets/${data.id}`;
    const isMobile = useIsMobile();

    const isActiveMobile = isActive && isMobile;

    const glowColor = ui.themeColor;

    const activeClass = isActiveMobile ? "scale-[1.03]" : "";
    const activeOpacity = isActiveMobile ? "opacity-20" : "opacity-0";
    const activePlanet = isActiveMobile ? "opacity-40 scale-100 right-[50%]" : "";
    const activeGlow = isActiveMobile ? "opacity-30" : "opacity-0";
    const activeText = isActiveMobile ? "text-white" : "";
    const activeArchetype = isActiveMobile ? "opacity-100" : "opacity-0";
    const activeRotate = isActiveMobile ? "rotate-1 scale-110" : "";

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

                    {/* Element gradient overlay */}
                    <div
                        className={`absolute inset-0 transition-opacity duration-500 ${activeOpacity} group-hover:opacity-20`}
                        style={{ background: `linear-gradient(135deg, transparent 0%, ${glowColor} 100%)` }}
                    />

                    {/* Planet watermark (Replacing Constellation watermark) */}
                    {ui.imageUrl && (
                        <div className="absolute inset-y-0 right-0 w-1/2 pointer-events-none">
                            <img
                                src={ui.imageUrl}
                                alt={data.name}
                                className={`absolute top-1/2 right-[-20%] -translate-y-1/2 h-full object-contain opacity-20 scale-125 transition-all duration-700 group-hover:opacity-40 group-hover:scale-100 group-hover:right-[40%] ${activePlanet}`}
                                style={{
                                    filter: `drop-shadow(0 0 10px ${glowColor})`
                                }}
                            />
                        </div>
                    )}

                    {/* Radial glow effect */}
                    <div
                        className={`absolute top-1/2 right-0 -translate-y-1/2 w-32 h-32 rounded-full transition-opacity duration-500 blur-2xl ${activeGlow} group-hover:opacity-30`}
                        style={{ backgroundColor: glowColor }}
                    />

                    <CardContent className="relative p-5 h-full flex items-center justify-between z-10">
                        {/* Left section: Text & Details */}
                        <div className="flex flex-col h-full justify-center space-y-2 max-w-[65%]">
                            <div className="flex items-center gap-2 mb-1">
                                <span
                                    className="text-lg md:text-xl font-serif opacity-90 drop-shadow-sm"
                                    style={{ color: glowColor, textShadow: `0 0 10px ${glowColor}` }}
                                >
                                    {ui.rulerSymbol}
                                </span>
                            </div>

                            <h2
                                className={`text-2xl md:text-3xl font-serif tracking-wide transition-colors duration-300 group-hover:text-white ${activeText}`}
                                style={{
                                    color: glowColor, // Starting color matches the glow
                                    textShadow: `0 0 5px ${glowColor}`
                                }}
                            >
                                {data.name}
                            </h2>

                            <p className={`text-xs font-sans text-nowrap text-white/50 uppercase tracking-widest mt-1 transition-opacity duration-500 ${activeArchetype} group-hover:opacity-100 group-hover:text-white/80 line-clamp-2`}>
                                {data.astronomy?.classification || data.domain}
                            </p>
                        </div>

                        {/* Right section: Spacer for consistent height with sign cards */}
                        <div className={`relative flex items-center justify-center w-16 h-16 shrink-0 transition-transform duration-500 ${activeRotate}`} />
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
