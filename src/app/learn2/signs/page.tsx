"use client";

import { ZODIAC_SIGNS, ElementType } from "@/utils/zodiac";
import { ShootingStars } from "@/components/hero/shooting-stars";
import { StarsBackground } from "@/components/hero/stars-background";
import { motion } from "motion/react";
import Link from "next/link";
import {
    TbArrowNarrowLeft,
    TbCompass,
    TbSparkles
} from "react-icons/tb";

const ELEMENT_STYLES: Record<ElementType, { glow: string; text: string; bg: string; border: string }> = {
    Fire: {
        glow: "bg-orange-500/20",
        text: "text-orange-500",
        bg: "bg-orange-500/5",
        border: "border-orange-500/20"
    },
    Earth: {
        glow: "bg-emerald-500/20",
        text: "text-emerald-500",
        bg: "bg-emerald-500/5",
        border: "border-emerald-500/20"
    },
    Air: {
        glow: "bg-sky-200/20",
        text: "text-sky-300",
        bg: "bg-sky-400/5",
        border: "border-sky-400/20"
    },
    Water: {
        glow: "bg-blue-500/20",
        text: "text-cyan-500",
        bg: "bg-blue-500/5",
        border: "border-blue-500/20"
    }
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08
        }
    }
};

const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any }
    }
};

export default function SignsPage2() {
    return (
        <div className="relative min-h-screen w-full bg-background overflow-x-hidden selection:bg-primary/30">
            {/* Background */}
            <div className="fixed inset-0 z-0">
                <StarsBackground className="opacity-40" />
                <ShootingStars />
                <div className="absolute inset-0 bg-linear-to-b from-background/80 via-transparent to-background" />
            </div>

            <main className="relative z-10 max-w-7xl mx-auto px-6 py-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-24">
                    <div className="space-y-6">
                        <Link
                            href="/learn2"
                            className="inline-flex items-center gap-2 text-primary/60 hover:text-primary transition-colors font-mono text-xs uppercase tracking-widest group"
                        >
                            <TbArrowNarrowLeft className="group-hover:-translate-x-1 transition-transform" />
                            Return to Archive
                        </Link>
                        <h1 className="text-5xl md:text-7xl font-serif text-white tracking-tighter">
                            The Twelve <br />
                            <span className="italic text-primary/80">Guardians</span>
                        </h1>
                    </div>

                    <div className="max-w-md text-right md:text-left">
                        <p className="text-muted-foreground font-sans leading-relaxed italic">
                            "Across the ecliptic, twelve archetypes hold the keys to the human psyche. Each a unique synthesis of element and modality."
                        </p>
                        <div className="h-px w-24 bg-primary/20 mt-6 ml-auto md:ml-0" />
                    </div>
                </div>

                {/* Grid */}
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {ZODIAC_SIGNS.map((sign) => (
                        <SignCard key={sign.id} sign={sign} />
                    ))}
                </motion.div>

                {/* Footer Insight */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="mt-32 pt-20 border-t border-white/5 text-center"
                >
                    <div className="inline-block relative">
                        <TbSparkles className="text-primary/20 w-12 h-12 absolute -top-8 -left-8 animate-pulse" />
                        <p className="text-primary/40 font-serif tracking-[0.3em] uppercase text-xs">
                            Discover the map written in the stars
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
        <motion.div variants={cardVariants}>
            <Link
                href={`/learn2/signs/${sign.id}`}
                className="group relative block h-full"
            >
                {/* Main Card Shell */}
                <div className="absolute inset-0 bg-white/2 border border-white/10 rounded-2xl backdrop-blur-md transition-all duration-500 group-hover:bg-white/4 group-hover:border-white/20" />

                {/* Element Glow */}
                <div className={`absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${styles.glow} blur-xl -z-10`} />

                <div className="relative p-8 flex flex-col items-center h-full text-center overflow-hidden">
                    {/* Constellation Watermark */}
                    <img
                        src={sign.constellation}
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain opacity-[0.03] scale-150 -rotate-1 group-hover:opacity-[0.1]  group-hover:rotate-0 transition-all duration-1000 pointer-events-none"
                    />

                    {/* Element Label */}
                    <div className="absolute top-6 left-6 flex items-center gap-1.5 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">
                        <ElementIcon className={`w-3 h-3 ${styles.text}`} />
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em]">{sign.element}</span>
                    </div>

                    {/* Sign Icon */}
                    <div className="mt-8 mb-6 relative">
                        <div className={`absolute inset-0 ${styles.glow} blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-700`} />
                        <Icon className="w-16 h-16 text-white group-hover:text-primary transition-colors duration-500 relative z-10" />
                    </div>

                    {/* Name & Dates */}
                    <div className="space-y-1 mb-6">
                        <h2 className="text-2xl font-serif text-white tracking-wide group-hover:tracking-widest transition-all duration-500">
                            {sign.name}
                        </h2>
                        <p className="text-[10px] font-mono text-primary/60 uppercase tracking-[0.2em]">
                            {sign.dates}
                        </p>
                    </div>

                    {/* Traits */}
                    <p className="text-sm text-muted-foreground/80 leading-relaxed line-clamp-2 px-2">
                        {sign.traits}
                    </p>

                    {/* Decorative Bottom */}
                    <div className="mt-8 pt-6 border-t border-white/5 w-full flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-y-2 group-hover:translate-y-0">
                        <span className="text-[10px] font-mono text-primary uppercase tracking-[0.2em]">View Details</span>
                        <TbCompass className="w-4 h-4 text-primary" />
                    </div>

                </div>
            </Link>
        </motion.div>
    );
}
