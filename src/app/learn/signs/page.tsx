"use client";

import { ZODIAC_SIGNS, ELEMENTS, ElementType } from "@/utils/zodiac";
import { ShootingStars } from "@/components/hero/shooting-stars";
import { StarsBackground } from "@/components/hero/stars-background";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "motion/react";
import Link from "next/link";
import { TbArrowLeft } from "react-icons/tb";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.5, ease: "circOut" }
    }
} as const;

const getElementColors = (element: ElementType) => {
    switch (element) {
        case "Fire": return "fire/20 border-orange-500/30 text-orange-400";
        case "Earth": return "earth/20 border-emerald-500/30 text-emerald-400";
        case "Air": return "air/20 border-sky-300/30 text-sky-200";
        case "Water": return "water/20 border-blue-500/30 text-cyan-300";
        default: return "from-primary/10 to-primary/20 border-primary/20 text-primary";
    }
};

export default function SignsPage() {
    return (
        <div className="relative min-h-screen w-full bg-background overflow-x-hidden flex flex-col items-center py-16 px-4 md:px-8">
            {/* Background Elements */}
            <StarsBackground className="z-0" />
            <ShootingStars className="z-0" />

            {/* Texture Overlay */}
            <div className="absolute inset-0 z-1 pointer-events-none opacity-[0.02]" />

            <div className="relative z-10 max-w-7xl w-full">
                <Link
                    href="/learn"
                    className="inline-flex items-center gap-2 text-primary/60 hover:text-primary transition-colors mb-12 font-sans text-sm group"
                >
                    <TbArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                    Back to Archive
                </Link>

                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl md:text-6xl font-serif text-primary tracking-widest uppercase">
                        The Twelve Guardians
                    </h1>
                    <p className="text-base md:text-lg text-muted-foreground font-sans max-w-2xl mx-auto italic">
                        "Each soul is born under the watch of a celestial archetype. Discover the traits and elements that shape your spirit."
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <div className="h-px w-12 bg-primary/20" />
                        <div className="text-primary/40">✧</div>
                        <div className="h-px w-12 bg-primary/20" />
                    </div>
                </div>

                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {ZODIAC_SIGNS.map((sign) => {
                        const Icon = sign.icon;
                        const ElementIcon = sign.elementIcon;
                        const elementColors = getElementColors(sign.element);

                        return (
                            <motion.div key={sign.id} variants={itemVariants}>
                                <Card className={`h-full bg-${elementColors} backdrop-blur-xl border border-solid overflow-hidden group hover:shadow-[0_0_30px_-5px_oklch(var(--primary)/0.2)] transition-all duration-500`}>
                                    <CardContent className="p-0 flex flex-col h-full">
                                        {/* Header Section */}
                                        <div className="relative p-6 flex flex-col items-center text-center space-y-2 border-b border-primary/10">
                                            <div className="absolute top-4 right-4 text-[0.65rem] uppercase tracking-widest font-sans font-bold text-primary/30 flex items-center gap-1.5">
                                                <ElementIcon size={12} />
                                                {sign.element}
                                            </div>

                                            <div className="relative">
                                                <div className="absolute inset-0 blur-2xl bg-primary/10 rounded-full scale-150 group-hover:bg-primary/20 transition-colors" />
                                                <Icon className="relative z-10 text-primary group-hover:scale-110 transition-transform duration-500" size={64} />
                                            </div>

                                            <div className="space-y-1">
                                                <h2 className="text-2xl font-serif text-primary tracking-wide">{sign.name}</h2>
                                                <p className="text-xs uppercase tracking-[0.2em] text-primary/60 font-medium">
                                                    {sign.dates}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Content Section */}
                                        <div className="p-6 grow flex flex-col justify-between space-y-6">
                                            <div className="space-y-4">
                                                <p className="text-sm text-foreground/80 leading-relaxed font-sans min-h-[3rem]">
                                                    {sign.traits}
                                                </p>
                                            </div>

                                        </div>

                                        {/* Decorative Bottom Bar */}
                                        <div className={`h-1 w-full bg-linear-to-r from-transparent via-primary/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700`} />
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Footer Decoration */}
                <div className="mt-24 text-center opacity-40">
                    <p className="font-serif italic text-sm text-primary">Discover the stars within.</p>
                </div>
            </div>
        </div>
    );
}
