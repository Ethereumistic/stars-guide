"use client";

import { ZODIAC_SIGNS, ElementType } from "@/utils/zodiac";
import { ShootingStars } from "@/components/hero/shooting-stars";
import { StarsBackground } from "@/components/hero/stars-background";
import { motion, Variants } from "motion/react";
import Link from "next/link";
import {
    TbArrowNarrowLeft,
    TbSparkles
} from "react-icons/tb";

const ELEMENT_STYLES: Record<ElementType, {
    primary: string;
    secondary: string;
    glow: string;
    border: string;
    gradient: string;
}> = {
    Fire: {
        primary: "#FF6B35",
        secondary: "#FFB347",
        glow: "rgba(255, 107, 53, 0.4)",
        border: "rgba(255, 107, 53, 0.3)",
        gradient: "linear-gradient(135deg, rgba(255, 107, 53, 0.15) 0%, rgba(255, 179, 71, 0.05) 100%)"
    },
    Earth: {
        primary: "#2D5016",
        secondary: "#6B8E23",
        glow: "rgba(107, 142, 35, 0.4)",
        border: "rgba(107, 142, 35, 0.3)",
        gradient: "linear-gradient(135deg, rgba(107, 142, 35, 0.15) 0%, rgba(45, 80, 22, 0.05) 100%)"
    },
    Air: {
        primary: "#87CEEB",
        secondary: "#B0E0E6",
        glow: "rgba(135, 206, 235, 0.4)",
        border: "rgba(135, 206, 235, 0.3)",
        gradient: "linear-gradient(135deg, rgba(135, 206, 235, 0.15) 0%, rgba(176, 224, 230, 0.05) 100%)"
    },
    Water: {
        primary: "#1E90FF",
        secondary: "#4682B4",
        glow: "rgba(30, 144, 255, 0.4)",
        border: "rgba(30, 144, 255, 0.3)",
        gradient: "linear-gradient(135deg, rgba(30, 144, 255, 0.15) 0%, rgba(70, 130, 180, 0.05) 100%)"
    }
};

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

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

export default function SignsPage2() {
    return (
        <div className="relative min-h-screen w-full overflow-x-hidden ">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Cinzel+Decorative:wght@400;700&display=swap');
                
                .font-celestial {
                    font-family: 'Cormorant Garamond', serif;
                }
                
                .font-ornate {
                    font-family: 'Cinzel Decorative', serif;
                }
            `}</style>

            {/* Background */}
            <div className="fixed inset-0 z-0">
                <StarsBackground className="opacity-60" />
                <ShootingStars />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/90 via-transparent to-[#0a0a0f]/90" />
                {/* Radial gradient overlay for depth */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent" />
            </div>

            <main className="relative z-10 max-w-[1600px] mx-auto px-8 py-24">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-32">
                    <div className="space-y-8">
                        <Link
                            href="/learn2"
                            className="inline-flex items-center gap-3 text-amber-400/60 hover:text-amber-400 transition-colors font-celestial text-sm tracking-[0.3em] uppercase group"
                        >
                            <TbArrowNarrowLeft className="group-hover:-translate-x-1 transition-transform w-5 h-5" />
                            Return to Archive
                        </Link>
                        <div className="relative">
                            <h1 className="text-7xl md:text-8xl font-ornate text-transparent bg-clip-text bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 tracking-tight leading-[0.9]">
                                The Celestial
                            </h1>
                            <h1 className="text-7xl md:text-8xl font-ornate text-transparent bg-clip-text bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 tracking-tight leading-[0.9] mt-2">
                                Zodiac
                            </h1>
                            {/* Decorative line */}
                            <div className="mt-8 flex items-center gap-4">
                                <div className="h-[2px] w-20 bg-gradient-to-r from-amber-400 to-transparent"></div>
                                <TbSparkles className="text-amber-400 w-6 h-6 opacity-60" />
                                <div className="h-[2px] w-20 bg-gradient-to-l from-amber-400 to-transparent"></div>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-md">
                        <p className="text-amber-100/70 font-celestial text-lg leading-relaxed italic">
                            Twelve divine archetypes dance across the heavens, each a living constellation embodying the eternal dance of elements and cosmic forces.
                        </p>
                        <div className="mt-8 flex items-center gap-3">
                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-amber-400/60 rounded-full animate-pulse delay-75"></div>
                            <div className="w-2 h-2 bg-amber-400/30 rounded-full animate-pulse delay-150"></div>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {ZODIAC_SIGNS.map((sign) => (
                        <SignCard key={sign.id} sign={sign} />
                    ))}
                </motion.div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="mt-40 pt-24 border-t border-amber-400/10 text-center"
                >
                    <div className="inline-block relative">
                        <div className="absolute -inset-8 bg-amber-400/5 blur-3xl rounded-full"></div>
                        <p className="relative text-amber-400/50 font-celestial tracking-[0.4em] uppercase text-xs italic">
                            ✦ Ad Astra Per Aspera ✦
                        </p>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}

function SignCard({ sign }: { sign: any }) {
    const Icon = sign.icon;
    const ElementIcon = sign.elementIcon;
    const styles = ELEMENT_STYLES[sign.element as ElementType];

    return (
        <motion.div variants={cardVariants} className="perspective-1000">
            <Link
                href={`/learn2/signs/${sign.id}`}
                className="group relative block h-full"
            >
                {/* Outer ornamental frame */}
                <div className="absolute -inset-4 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id={`frame-gradient-${sign.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={styles.primary} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={styles.secondary} stopOpacity="0.1" />
                            </linearGradient>
                        </defs>
                        {/* Art Nouveau curved frame */}
                        <path
                            d="M 10,2 Q 2,2 2,10 L 2,90 Q 2,98 10,98 L 90,98 Q 98,98 98,90 L 98,10 Q 98,2 90,2 Z"
                            fill="none"
                            stroke={`url(#frame-gradient-${sign.id})`}
                            strokeWidth="0.5"
                            className="animate-pulse"
                        />
                        {/* Corner flourishes */}
                        <circle cx="10" cy="10" r="3" fill={styles.primary} opacity="0.3" />
                        <circle cx="90" cy="10" r="3" fill={styles.primary} opacity="0.3" />
                        <circle cx="10" cy="90" r="3" fill={styles.primary} opacity="0.3" />
                        <circle cx="90" cy="90" r="3" fill={styles.primary} opacity="0.3" />
                    </svg>
                </div>

                {/* Main Card */}
                <div className="relative h-full overflow-hidden rounded-2xl transition-all duration-700 group-hover:scale-[1.02]">
                    {/* Card background with gradient */}
                    <div
                        className="absolute inset-0 backdrop-blur-md"
                        style={{
                            background: `linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)`,
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderImage: `linear-gradient(135deg, ${styles.border}, transparent) 1`
                        }}
                    />

                    {/* Element gradient overlay */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                        style={{ background: styles.gradient }}
                    />

                    {/* Constellation watermark with parallax effect */}
                    <div className="absolute inset-0 overflow-hidden">
                        <img
                            src={sign.constellation}
                            alt=""
                            className="absolute inset-0 w-full h-full object-contain opacity-[0.04] scale-125 group-hover:opacity-[0.12] group-hover:scale-110 transition-all duration-1000 pointer-events-none"
                            style={{
                                filter: `drop-shadow(0 0 20px ${styles.glow})`
                            }}
                        />
                    </div>

                    {/* Radial glow effect */}
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl"
                        style={{ backgroundColor: styles.glow }}
                    />

                    {/* Card content */}
                    <div className="relative p-8 flex flex-col items-center text-center h-full">
                        {/* Top ornamental border */}
                        <div className="w-full flex justify-center mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-[1px]" style={{ background: `linear-gradient(to right, transparent, ${styles.primary})` }}></div>
                                <ElementIcon
                                    className="w-4 h-4 transition-all duration-500 opacity-60 group-hover:opacity-100"
                                    style={{ color: styles.primary }}
                                />
                                <span
                                    className="text-[9px] font-celestial uppercase tracking-[0.3em] opacity-60 group-hover:opacity-100 transition-opacity"
                                    style={{ color: styles.primary }}
                                >
                                    {sign.element}
                                </span>
                                <ElementIcon
                                    className="w-4 h-4 transition-all duration-500 opacity-60 group-hover:opacity-100"
                                    style={{ color: styles.primary }}
                                />
                                <div className="w-8 h-[1px]" style={{ background: `linear-gradient(to left, transparent, ${styles.primary})` }}></div>
                            </div>
                        </div>

                        {/* Sign icon with animated glow */}
                        <div className="relative mb-6">
                            {/* Animated rotating ring */}
                            <div
                                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                                style={{
                                    border: `2px solid ${styles.primary}`,
                                    animation: 'spin 20s linear infinite'
                                }}
                            >
                                <div
                                    className="absolute top-0 left-1/2 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2"
                                    style={{ backgroundColor: styles.primary }}
                                />
                            </div>

                            {/* Icon glow */}
                            <div
                                className="absolute inset-0 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-700"
                                style={{ backgroundColor: styles.glow }}
                            />

                            {/* Main icon */}
                            <Icon
                                className="w-20 h-20 relative z-10 text-amber-100 group-hover:scale-110 transition-transform duration-700"
                                style={{
                                    filter: `drop-shadow(0 0 10px ${styles.glow})`
                                }}
                            />
                        </div>

                        {/* Sign name with decorative elements */}
                        <div className="space-y-3 mb-6">
                            <h2
                                className="text-4xl font-ornate tracking-wide transition-all duration-500"
                                style={{
                                    color: styles.secondary,
                                    textShadow: `0 0 20px ${styles.glow}`
                                }}
                            >
                                {sign.name}
                            </h2>

                            {/* Decorative divider */}
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-3 h-3 rotate-45 border" style={{ borderColor: styles.primary, opacity: 0.3 }}></div>
                                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: styles.primary, opacity: 0.6 }}></div>
                                <div className="w-3 h-3 rotate-45 border" style={{ borderColor: styles.primary, opacity: 0.3 }}></div>
                            </div>

                            {/* Dates */}
                            <p
                                className="text-xs font-celestial uppercase tracking-[0.25em] opacity-70"
                                style={{ color: styles.secondary }}
                            >
                                {sign.dates}
                            </p>
                        </div>

                        {/* Traits description */}
                        <p className="text-sm font-celestial text-amber-100/70 leading-relaxed italic px-2 flex-grow flex items-center">
                            {sign.traits}
                        </p>

                        {/* Bottom decorative footer */}
                        <div className="w-full mt-8 pt-6 border-t border-amber-400/10 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-2 group-hover:translate-y-0">
                            <div className="flex justify-center items-center gap-2">
                                <div className="w-12 h-[1px]" style={{ background: `linear-gradient(to right, transparent, ${styles.primary})` }}></div>
                                <div
                                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                                    style={{ backgroundColor: styles.primary }}
                                />
                                <span className="text-[10px] font-celestial tracking-[0.3em] uppercase" style={{ color: styles.primary }}>
                                    Explore
                                </span>
                                <div
                                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                                    style={{ backgroundColor: styles.primary }}
                                />
                                <div className="w-12 h-[1px]" style={{ background: `linear-gradient(to left, transparent, ${styles.primary})` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hover shadow glow */}
                <div
                    className="absolute inset-0 -z-10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl"
                    style={{ backgroundColor: styles.glow }}
                />
            </Link>

            <style jsx>{`
                @keyframes spin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
                
                .perspective-1000 {
                    perspective: 1000px;
                }
            `}</style>
        </motion.div>
    );
}