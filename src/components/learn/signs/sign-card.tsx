"use client";

import { motion, Variants } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { SignData } from "@/astrology/signs";
import { SignUIConfig } from "@/config/zodiac-ui";
import { GiFlame, GiStonePile, GiTornado, GiWaveCrest } from "react-icons/gi";

const cardVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 40,
        scale: 0.9,
        rotateX: -15
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        rotateX: 0,
        transition: {
            duration: 0.9,
            ease: [0.22, 1, 0.36, 1]
        }
    }
};

interface SignCardProps {
    data: SignData;
    ui: SignUIConfig;
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

export function SignCard({ data, ui }: SignCardProps) {
    const Icon = ui.icon;
    const ElementIcon = getElementIcon(ui.elementName);
    const styles = getStyles(ui.elementName);

    return (
        <motion.div variants={cardVariants} className="perspective-[1000px] w-[350px]">
            <Link
                href={`/learn/signs/${data.id}`}
                className="group relative block h-full"
            >
                <Card className="relative h-full overflow-hidden rounded-2xl bg-transparent border-0 shadow-none transition-all duration-700 group-hover:scale-[1.02] min-h-[500px]">
                    {/* Card background with gradient */}
                    <div
                        className="absolute inset-0 backdrop-blur-[0.5px]"
                        style={{
                            background: `linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)`,
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderImage: `linear-gradient(135deg, ${styles.border}, transparent) 1`
                        }}
                    />

                    {/* Element gradient overlay */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-700"
                        style={{ background: styles.gradient }}
                    />

                    {/* Constellation watermark (Lower Third) */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden pointer-events-none">
                        <img
                            src={ui.constellationUrl}
                            alt=""
                            className="absolute bottom-[-15%] left-1/2 -translate-x-1/2  h-auto object-contain opacity-50 scale-105 transition-all duration-1000 group-hover:opacity-0 group-hover:scale-100"
                            style={{
                                filter: `drop-shadow(0 0 15px ${styles.glow})`
                            }}
                        />
                    </div>

                    {/* Radial glow effect */}
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-700 blur-3xl"
                        style={{ backgroundColor: styles.glow }}
                    />

                    {/* Card content using shadcn CardContent */}
                    <CardContent className="relative p-8 h-full">
                        {/* Archetype (Top Left) */}
                        <div className="absolute top-0 left-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 w-24">
                            <p
                                className="text-[9px] font-sans uppercase tracking-[0.1em] mt-2 line-clamp-2"
                                style={{ color: styles.secondary }}
                            >
                                {data.archetypeName}
                            </p>
                        </div>

                        {/* Element Badge (Top Right) */}
                        <div className="absolute top-0 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10">
                            <div className="flex items-center gap-2 mt-2">
                                <ElementIcon
                                    className="w-3.5 h-3.5"
                                    style={{ color: styles.primary }}
                                />
                                <span
                                    className="text-[9px] font-sans uppercase tracking-[0.2em]"
                                    style={{ color: styles.secondary }}
                                >
                                    {ui.elementName}
                                </span>
                            </div>
                        </div>

                        {/* Main content wrapper - centered */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                            {/* Sign icon (Always visible, moves slightly on hover) */}
                            <div className="relative mb-6 flex items-center justify-center w-32 h-32 transition-all duration-700 translate-y-4 group-hover:translate-y-0">
                                {/* Element Frame PNG (Appears on Hover) */}
                                <img
                                    src={ui.elementFrameUrl}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-contain opacity-0 group-hover:opacity-60 group-hover:rotate-36 transition-all duration-[1.5s] ease-out"
                                    style={{
                                        filter: `drop-shadow(0 0 15px ${styles.glow})`
                                    }}
                                />

                                {/* Icon glow (Appears on Hover) */}
                                <div
                                    className="absolute inset-0 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-700"
                                    style={{ backgroundColor: styles.glow }}
                                />

                                {/* Main icon (Visible, scales on hover) */}
                                <Icon
                                    className="w-16 h-16 relative z-10 text-amber-100 group-hover:text-white group-hover:scale-110 transition-all duration-700"
                                    style={{
                                        filter: `drop-shadow(0 0 10px ${styles.glow})`
                                    }}
                                />
                            </div>

                            {/* Sign name */}
                            <div className="space-y-3 mb-2 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] -translate-y-[20px] group-hover:translate-y-0">
                                <h2
                                    className="text-4xl font-serif tracking-wide transition-all duration-500 group-hover:text-white!"
                                    style={{
                                        color: styles.secondary,
                                        textShadow: `0 0 10px ${styles.glow}`
                                    }}
                                >
                                    {data.name}
                                </h2>
                            </div>

                            {/* Core Strategy and Elemental Truth (Appears on Hover) */}
                            <div className="flex-1 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-4 group-hover:translate-y-0 max-w-3xs">
                                <p className="text-xs font-sans text-amber-100/90 leading-relaxed italic mb-2 line-clamp-3">
                                    "{data.coreStrategy}"
                                </p>
                                <p className="text-[10px] font-sans text-amber-100/60 leading-relaxed uppercase tracking-wider line-clamp-2">
                                    {data.elementalTruth}
                                </p>
                            </div>

                            {/* Explore Button (Styled Button) */}
                            <div className="mt-8 pt-4 w-full flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                                <Button
                                    variant={ui.elementName.toLowerCase() as any}
                                    className="h-11 px-8 border-primary/40 relative group/btn"
                                >
                                    <ElementIcon
                                        className="w-4 h-4 transition-transform"
                                        style={{ color: styles.primary }}
                                    />
                                    <span className="mx-2">Explore</span>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Hover shadow glow */}
                <div
                    className="absolute inset-0 -z-10 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 blur-2xl"
                    style={{ backgroundColor: styles.glow }}
                />
            </Link>
        </motion.div>
    );
}