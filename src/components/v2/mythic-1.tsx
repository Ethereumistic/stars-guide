"use client"

import * as React from "react"
import { motion } from "motion/react"
import { GiCrystalBall, GiStarCycle } from "react-icons/gi"

export function MythicV1() {
    return (
        <section className="relative min-h-screen  text-white flex items-center justify-center p-8 overflow-hidden font-serif">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] opacity-100" />

            {/* Alchemical Circles Layer */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
                    className="absolute size-[900px] border border-primary/10 rounded-full"
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
                    className="absolute size-[850px] border border-primary/20 border-dashed rounded-full"
                />
                <div className="absolute size-[600px] border border-white/5 rounded-full" />
            </div>

            <div className="relative z-10 max-w-4xl w-full text-center space-y-12">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="flex flex-col items-center"
                >
                    <GiStarCycle className="size-16 text-primary mb-12 drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />

                    <div className="relative inline-block mb-6">
                        <h1 className="text-6xl md:text-9xl font-medium tracking-[0.25em] uppercase text-primary">
                            IGNIS
                        </h1>
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-primary scale-x-50" />
                    </div>

                    <h2 className="text-xl md:text-2xl tracking-[0.5em] text-white/40 uppercase mb-12">
                        Ael Eternal Dynamics
                    </h2>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1.5 }}
                    className="text-lg md:text-xl font-light italic text-[#DCD0C0] leading-loose max-w-2xl mx-auto opacity-70"
                >
                    "The stars do not govern our fate, they reflect its unfolding. Discover the language of the cosmos and master your own reality."
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                    className="pt-12"
                >
                    <button className="relative group px-16 py-6 border border-primary text-primary overflow-hidden">
                        <div className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        <span className="relative z-10 text-xs uppercase tracking-[1em] font-bold group-hover:text-black">
                            Forge Destiny
                        </span>

                        {/* Decorative Corners */}
                        <div className="absolute top-0 left-0 size-2 border-t border-l border-primary" />
                        <div className="absolute top-0 right-0 size-2 border-t border-r border-primary" />
                        <div className="absolute bottom-0 left-0 size-2 border-b border-l border-primary" />
                        <div className="absolute bottom-0 right-0 size-2 border-b border-r border-primary" />
                    </button>
                </motion.div>
            </div>

            {/* Floating Symbols */}
            <div className="absolute bottom-12 left-12 flex items-center gap-6">
                <GiCrystalBall className="size-6 text-primary/30" />
                <div className="flex flex-col text-[9px] tracking-[0.3em] uppercase opacity-30">
                    <span>Phase Index</span>
                    <span className="text-white">Septum IV</span>
                </div>
            </div>

            <div className="absolute bottom-12 right-12 text-[9px] tracking-[0.3em] uppercase opacity-30 italic text-right">
                "Non Ducor, Duco" <br />
                <span className="not-italic opacity-10 font-sans">Stars.Guide // Protocol 2.1</span>
            </div>
        </section>
    )
}
