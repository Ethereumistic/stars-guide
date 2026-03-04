"use client";

import { motion, Variants } from "motion/react";
import Link from "next/link";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { SignData } from "@/astrology/signs";
import { SignUIConfig } from "@/config/zodiac-ui";
import { GiFlame, GiStonePile, GiTornado, GiWaveCrest } from "react-icons/gi";
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

interface CompactSignCardProps {
    data: SignData;
    ui: SignUIConfig;
    isActive?: boolean;
    href?: string;
}

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

export function CompactSignCard({ data, ui, isActive = false, href }: CompactSignCardProps) {
    const Icon = ui.icon;
    const ElementIcon = getElementIcon(ui.elementName);
    const styles = getStyles(ui.elementName);
    const isMobile = useIsMobile();

    const isActiveMobile = isActive && isMobile;
    const linkHref = href ?? `/horoscopes/${data.id}`;

    const activeClass = isActiveMobile ? "scale-[1.03]" : "";
    const activeOpacity = isActiveMobile ? "opacity-20" : "opacity-0";
    const activeConstellation = isActiveMobile ? "opacity-40 scale-100 right-[30%]" : "";
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
                <Card className={`relative h-full overflow-hidden rounded-xl bg-transparent border-0 shadow-none transition-all duration-500 group-hover:scale-[1.03] ${activeClass} min-h-[160px]`}>
                    {/* Card background with gradient */}
                    <div
                        className="absolute inset-0 backdrop-blur-[0.5px]"
                        style={{
                            background: `linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)`,
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderImage: `linear-gradient(135deg, ${styles.border}, transparent) 1`
                        }}
                    />

                    {/* Element gradient overlay */}
                    <div
                        className={`absolute inset-0 transition-opacity duration-500 ${activeOpacity} group-hover:opacity-20`}
                        style={{ background: styles.gradient }}
                    />

                    {/* Constellation watermark */}
                    <div className="absolute inset-y-0 right-0 w-1/2 pointer-events-none">
                        <img
                            src={ui.constellationUrl}
                            alt=""
                            className={`absolute top-1/2 right-[-20%] -translate-y-1/2 h-full object-contain opacity-20 scale-125 transition-all duration-700 group-hover:opacity-40 group-hover:scale-100 group-hover:right-[50%] ${activeConstellation}`}
                            style={{
                                filter: `drop-shadow(0 0 10px ${styles.glow})`
                            }}
                        />
                    </div>

                    {/* Radial glow effect */}
                    <div
                        className={`absolute top-1/2 right-0 -translate-y-1/2 w-32 h-32 rounded-full transition-opacity duration-500 blur-2xl ${activeGlow} group-hover:opacity-30`}
                        style={{ backgroundColor: styles.glow }}
                    />

                    <CardContent className="relative p-5 h-full flex items-center justify-between z-10">
                        {/* Left section: Text & Details */}
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
                                    {data.dates}
                                </span>
                            </div>

                            <h2
                                className={`text-2xl md:text-3xl font-serif tracking-wide transition-colors duration-300 group-hover:text-white ${activeText}`}
                                style={{
                                    color: styles.secondary,
                                    textShadow: `0 0 5px ${styles.glow}`
                                }}
                            >
                                {data.name}
                            </h2>

                            <p className={`text-xs font-sans text-amber-100/60 uppercase tracking-widest mt-1 transition-opacity duration-500 ${activeArchetype} group-hover:opacity-100`}>
                                {data.archetypeName}
                            </p>
                        </div>

                        {/* Right section: Icon */}
                        <div className={`relative flex items-center justify-center w-16 h-16 shrink-0 transition-transform duration-500  group-hover:scale-110 ${activeRotate}`}>
                            <Icon
                                className={`w-12 h-12 text-amber-100 group-hover:text-white transition-colors duration-500 ${activeText}`}
                                style={{
                                    filter: `drop-shadow(0 0 8px ${styles.glow})`
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Hover shadow glow */}
                <div
                    className={`absolute inset-0 -z-10 rounded-xl transition-opacity duration-500 blur-xl ${isActiveMobile ? "opacity-20" : "opacity-0"} group-hover:opacity-20`}
                    style={{ backgroundColor: styles.glow }}
                />
            </Link>
        </motion.div>
    );
}
