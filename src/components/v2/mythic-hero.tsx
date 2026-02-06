"use client"

import * as React from "react"
import { motion, useScroll, useTransform } from "motion/react"
import { Sparkles, Moon, Sun } from "lucide-react"

export function MythicHero() {
    const { scrollY } = useScroll();
    const rotate = useTransform(scrollY, [0, 1000], [0, 90]);
    const scale = useTransform(scrollY, [0, 500], [1, 0.8]);

    return (
        <section className="relative min-h-screen  flex items-center justify-center overflow-hidden font-serif">
            {/* Background Texture & Vignette */}
            <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
                style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/black-paper.pattern")' }}
            />

            {/* Rotating Alchemical Circle */}
            <motion.div
                style={{ rotate, scale }}
                className="absolute size-[800px] border border-primary/20 rounded-full flex items-center justify-center pointer-events-none"
            >
                <div className="absolute size-[750px] border-2 border-primary/10 rounded-full" />
                <div className="absolute size-[600px] border border-primary/30 border-dashed rounded-full" />

                {/* Orbital Symbols */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                    <div
                        key={i}
                        className="absolute h-[380px] w-px bg-linear-to-t from-transparent via-primary/40 to-transparent origin-bottom"
                        style={{ transform: `rotate(${angle}deg)` }}
                    >
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 size-4 border border-primary rotate-45 flex items-center justify-center">
                            <div className="size-1 bg-primary" />
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* Main Content Container */}
            <div className="relative z-10 max-w-4xl px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="flex flex-col items-center"
                >
                    <div className="flex items-center gap-6 mb-8 text-primary opacity-60">
                        <Sun className="size-6" />
                        <div className="h-px w-24 bg-linear-to-r from-transparent via-primary to-transparent" />
                        <Moon className="size-6" />
                    </div>

                    <h1 className="text-6xl md:text-8xl font-medium tracking-[0.2em] text-primary mb-6 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                        AETERNUS
                    </h1>

                    <div className="flex items-center gap-4 mb-12">
                        <motion.div
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="h-px w-12 md:w-20 bg-primary"
                        />
                        <span className="text-primary uppercase tracking-[0.4em] text-xs md:text-sm font-sans">The Wisdom of Stars</span>
                        <motion.div
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="h-px w-12 md:w-20 bg-primary"
                        />
                    </div>

                    <p className="text-[#DCD0C0] text-lg md:text-xl font-light italic leading-loose max-w-2xl mb-16 opacity-80">
                        "Your destiny is not written in stone, but in the shifting light of the celestial spheres. Walk the path of those who look upward."
                    </p>

                    <div className="relative group">
                        <div className="absolute -inset-4 bg-primary opacity-0 blur-xl group-hover:opacity-20 transition-opacity duration-500" />
                        <button className="relative px-12 py-5 border border-primary text-primary uppercase tracking-[0.5em] text-sm hover:bg-primary hover:text-black transition-all duration-700 overflow-hidden group">
                            <span className="relative z-10 flex items-center gap-3">
                                <Sparkles className="size-4" />
                                Manifest Reality
                            </span>
                            {/* Decorative inner corner borders */}
                            <div className="absolute top-1 left-1 size-2 border-t border-l border-primary" />
                            <div className="absolute top-1 right-1 size-2 border-t border-r border-primary" />
                            <div className="absolute bottom-1 left-1 size-2 border-b border-l border-primary" />
                            <div className="absolute bottom-1 right-1 size-2 border-b border-r border-primary" />
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Corner Decorative Elements */}
            <div className="absolute top-10 left-10 text-primary/30 text-xs flex flex-col gap-2">
                <span>PHASE: IV</span>
                <span>ASC: PISCES</span>
            </div>
            <div className="absolute bottom-10 right-10 text-primary/30 text-xs text-right flex flex-col gap-2">
                <span>"IGNIS AURUM PROBAT"</span>
                <span>MXXVI</span>
            </div>

            {/* Constellation SVG Overlay (Static but elegant) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.05]" viewBox="0 0 1000 1000">
                <path d="M100,200 L150,250 L200,220 L250,280 M400,100 L450,150 L420,200 M600,800 L650,850 L700,820 L750,880" fill="none" stroke="#D4AF37" strokeWidth="1" />
                <circle cx="100" cy="200" r="2" fill="#D4AF37" />
                <circle cx="150" cy="250" r="3" fill="#D4AF37" />
                <circle cx="200" cy="220" r="1.5" fill="#D4AF37" />
                <circle cx="250" cy="280" r="2" fill="#D4AF37" />
                <circle cx="420" cy="200" r="4" className="animate-pulse" fill="#D4AF37" />
            </svg>
        </section>
    )
}
