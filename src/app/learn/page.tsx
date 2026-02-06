"use client";

import { ShootingStars } from "@/components/hero/shooting-stars";
import { StarsBackground } from "@/components/hero/stars-background";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "motion/react";
import Link from "next/link";
import { TbZodiacAries, TbHomeSearch, TbPlanet, TbCompass } from "react-icons/tb";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, ease: "circOut" }
    }
} as const;

export default function LearnPage() {
    return (
        <div className="relative min-h-screen w-full bg-background overflow-hidden flex flex-col items-center py-20 px-4">
            {/* Background Elements */}
            <StarsBackground className="z-0" />
            <ShootingStars className="z-0" />

            {/* Texture Overlay */}
            <div className="absolute inset-0 z-1 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

            <motion.div
                className="relative z-10 max-w-6xl w-full"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                <motion.div className="text-center mb-16 space-y-4" variants={itemVariants}>
                    <h1 className="text-5xl md:text-7xl font-serif text-primary tracking-wider">
                        Celestial Archive
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground font-sans max-w-2xl mx-auto italic">
                        "The map is written above. Navigate your fate through the ancient wisdom of the stars."
                    </p>
                    <div className="w-24 h-px bg-primary/30 mx-auto mt-8" />
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <motion.div variants={itemVariants}>
                        <Link href="/learn/signs" className="group block h-full">
                            <Card className="h-full bg-card/40 backdrop-blur-xl border-primary/20 group-hover:border-primary/50 transition-all duration-500 overflow-hidden relative shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
                                <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
                                <div className="absolute top-0 right-0 p-4 text-primary/10 group-hover:text-primary/30 transition-colors">
                                    <TbZodiacAries size={120} />
                                </div>
                                <CardHeader>
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                        <TbZodiacAries className="text-primary" size={24} />
                                    </div>
                                    <CardTitle className="text-2xl font-serif text-primary tracking-wide">Zodiac Signs</CardTitle>
                                    <CardDescription className="text-muted-foreground font-sans leading-relaxed">
                                        Explore the twelve archetypes of the zodiac and their cosmic influence.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <span className="text-sm font-sans text-primary/60 group-hover:text-primary transition-colors flex items-center gap-2">
                                        Enter Library →
                                    </span>
                                </CardContent>
                            </Card>
                        </Link>
                    </motion.div>

                    {/* Placeholder: Houses */}
                    <motion.div variants={itemVariants} className="opacity-60 cursor-not-allowed">
                        <Card className="h-full bg-card/20 backdrop-blur-sm border-primary/10 overflow-hidden relative grayscale">
                            <div className="absolute top-0 right-0 p-4 text-primary/5">
                                <TbHomeSearch size={120} />
                            </div>
                            <CardHeader>
                                <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                                    <TbHomeSearch className="text-primary/40" size={24} />
                                </div>
                                <CardTitle className="text-2xl font-serif text-primary/40 tracking-wide">The Houses</CardTitle>
                                <CardDescription className="text-muted-foreground/40 font-sans leading-relaxed">
                                    The twelve sectors of life where planetary energies manifest.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <span className="text-xs font-sans text-primary/30 italic">Coming Soon</span>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Placeholder: Planets */}
                    <motion.div variants={itemVariants} className="opacity-60 cursor-not-allowed">
                        <Card className="h-full bg-card/20 backdrop-blur-sm border-primary/10 overflow-hidden relative grayscale">
                            <div className="absolute top-0 right-0 p-4 text-primary/5">
                                <TbPlanet size={120} />
                            </div>
                            <CardHeader>
                                <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                                    <TbPlanet className="text-primary/40" size={24} />
                                </div>
                                <CardTitle className="text-2xl font-serif text-primary/40 tracking-wide">Planetary Bodies</CardTitle>
                                <CardDescription className="text-muted-foreground/40 font-sans leading-relaxed">
                                    The celestial actors and the specific energies they represent.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <span className="text-xs font-sans text-primary/30 italic">Coming Soon</span>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Placeholder: Aspects */}
                    <motion.div variants={itemVariants} className="opacity-60 cursor-not-allowed">
                        <Card className="h-full bg-card/20 backdrop-blur-sm border-primary/10 overflow-hidden relative grayscale">
                            <div className="absolute top-0 right-0 p-4 text-primary/5">
                                <TbCompass size={120} />
                            </div>
                            <CardHeader>
                                <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                                    <TbCompass className="text-primary/40" size={24} />
                                </div>
                                <CardTitle className="text-2xl font-serif text-primary/40 tracking-wide">Aspects</CardTitle>
                                <CardDescription className="text-muted-foreground/40 font-sans leading-relaxed">
                                    The geometric relationships between planets and their meanings.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <span className="text-xs font-sans text-primary/30 italic">Coming Soon</span>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Decorative Element */}
                <motion.div className="mt-32 flex flex-col items-center" variants={itemVariants}>
                    <div className="w-px h-24 bg-linear-to-b from-primary/30 to-transparent mb-8" />
                    <div className="flex gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="w-2 h-2 rounded-full bg-primary/20" />
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
