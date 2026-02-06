"use client";

import { ShootingStars } from "@/components/hero/shooting-stars";
import { StarsBackground } from "@/components/hero/stars-background";
import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRef } from "react";

import {
    TbZodiacAries,
    TbHomeSearch,
    TbPlanet,
    TbCompass,
    TbSparkles,
    TbTelescope,
    TbBook
} from "react-icons/tb";

const CATEGORIES = [
    {
        id: "signs",
        title: "Zodiac Signs",
        subtitle: "The Twelve Archetypes",
        description: "Explore the ancient guardians of the ecliptic. Each sign holds a unique frequency that shapes human destiny and character.",
        icon: TbZodiacAries,
        href: "/learn2/signs",
        gradient: "from-primary/30 to-galactic/30",
        // gradient: "from-amber-500/20 via-primary/20 to-galactic/20",
        delay: 0.1,
        status: "Available"
    },
    {
        id: "houses",
        title: "The Houses",
        subtitle: "Sectors of Life",
        description: "From self-image to career, discover how the twelve houses define the specific areas of your life where cosmic energies manifest.",
        icon: TbHomeSearch,
        href: "#",
        gradient: "from-blue-500/10 via-indigo-500/10 to-transparent",
        delay: 0.2,
        status: "Coming Soon"
    },
    {
        id: "planets",
        title: "Planetary Bodies",
        subtitle: "Celestial Actors",
        description: "The Sun, Moon, and planets are the drivers of our inner psyche. Learn their deep mythology and psychological archetypes.",
        icon: TbPlanet,
        href: "#",
        gradient: "from-rose-500/10 via-purple-500/10 to-transparent",
        delay: 0.3,
        status: "Coming Soon"
    },
    {
        id: "aspects",
        title: "Aspects",
        subtitle: "Geometric Wisdom",
        description: "Conjunctions, squares, and trines—the sacred geometry between planets that reveals internal conflicts and natural talents.",
        icon: TbCompass,
        href: "#",
        gradient: "from-emerald-500/10 via-cyan-500/10 to-transparent",
        delay: 0.4,
        status: "Coming Soon"
    }
];

export default function Learn2Page() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

    return (
        <div ref={containerRef} className="relative min-h-screen w-full text-foreground selection:bg-primary/30">
            <main className="relative z-10 container mx-auto px-6 py-24 flex flex-col items-center">
                {/* Hero Section */}
                <motion.div
                    style={{ opacity, scale }}
                    className="max-w-4xl text-center mb-32 space-y-8"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary/60 text-xs tracking-[0.2em] uppercase mb-4"
                    >
                        <TbTelescope className="w-4 h-4" />
                        Cosmic Knowledge Base
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="text-6xl md:text-8xl lg:text-9xl font-serif text-transparent bg-clip-text bg-linear-to-b from-white via-white to-white/20 tracking-tighter leading-none"
                    >
                        Celestial <br />
                        <span className="italic">Archive</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.4 }}
                        className="text-lg md:text-xl text-muted-foreground/80 font-sans max-w-2xl mx-auto leading-relaxed"
                    >
                        Ancient wisdom meets modern discovery. Your gateway to understanding the mathematical harmony of the cosmos and its influence on the human experience.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 1.5, delay: 0.6 }}
                        className="w-32 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent mx-auto mt-12"
                    />
                </motion.div>

                {/* Grid Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 w-full max-w-6xl">
                    {CATEGORIES.map((cat) => (
                        <CategoryCard key={cat.id} {...cat} />
                    ))}
                </div>

                {/* Bottom Decoration */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-48 flex flex-col items-center space-y-12"
                >
                    <div className="flex items-center gap-8">
                        <div className="h-px w-24 bg-linear-to-r from-transparent to-primary/20" />
                        <TbSparkles className="text-primary/40 animate-pulse" />
                        <div className="h-px w-24 bg-linear-to-l from-transparent to-primary/20" />
                    </div>
                    <p className="font-serif italic text-primary/40 tracking-widest text-sm">
                        As above, so below.
                    </p>
                </motion.div>
            </main>
        </div>
    );
}

function CategoryCard({ title, subtitle, description, icon: Icon, href, gradient, delay, status }: any) {
    const isLocked = status === "Coming Soon";

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
        >
            <Link
                href={href}
                className={`group relative block h-full ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <div className="absolute inset-0 bg-linear-to-br from-white/3 to-white/1 rounded-3xl border border-white/10 backdrop-blur-3xl transition-all duration-500 group-hover:border-primary/30 group-hover:bg-white/5" />

                {/* Hover Glow */}
                <div className={`absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-linear-to-br ${gradient} blur-xl -z-10`} />

                <div className="relative p-8 lg:p-12 flex flex-col h-full overflow-hidden">
                    {/* Status Badge */}
                    <div className="flex justify-between items-start mb-8">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isLocked ? 'bg-white/5 text-white/20' : 'bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary/20'}`}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <span className={`text-xs uppercase tracking-[0.2em] font-mono px-3 py-1 rounded-full border ${isLocked ? 'border-white/5 text-white/20' : 'border-primary/20 text-primary'}`}>
                            {status}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h3 className="text-xs uppercase tracking-[0.3em] text-primary/60 font-mono mb-1">
                                {subtitle}
                            </h3>
                            <h2 className="text-3xl md:text-4xl font-serif text-white transition-colors">
                                {title}
                            </h2>
                        </div>

                        <p className="text-muted-foreground leading-relaxed font-sans text-sm md:text-base">
                            {description}
                        </p>
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
                        {!isLocked ? (
                            <span className="text-primary text-sm font-mono flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                                ACCESS READINGS <TbBook className="w-4 h-4" />
                            </span>
                        ) : (
                            <span className="text-white/10 text-sm font-mono uppercase tracking-widest">
                                Encripted Archive
                            </span>
                        )}
                        <Icon className={`w-24 h-24 absolute -bottom-4 -right-4 opacity-5 transition-all duration-700 ${!isLocked ? 'group-hover:opacity-20 group-hover:scale-110 group-hover:rotate-12' : ''}`} />
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
