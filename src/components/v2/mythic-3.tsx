"use client"

import * as React from "react"
import { motion } from "motion/react"
import { Sparkles } from "lucide-react"

export function MythicV3() {
    return (
        <section className="relative min-h-screen  text-zinc-100 flex items-center justify-center p-6 overflow-hidden font-serif">
            {/* Ornate Inner Frame */}
            <div className="absolute inset-6 border-[20px] border-zinc-900 pointer-events-none" />
            <div className="absolute inset-10 border border-primary/20 pointer-events-none" />

            {/* Corner Ornaments */}
            <div className="absolute top-12 left-12 size-12 border-t-2 border-l-2 border-primary" />
            <div className="absolute top-12 right-12 size-12 border-t-2 border-r-2 border-primary" />
            <div className="absolute bottom-12 left-12 size-12 border-b-2 border-l-2 border-primary" />
            <div className="absolute bottom-12 right-12 size-12 border-b-2 border-r-2 border-primary" />

            <div className="relative z-10 max-w-2xl w-full flex flex-col items-center text-center space-y-12 py-24">

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.2 }}
                >
                    <Sparkles className="size-12 text-primary mb-8" />
                    <span className="block text-[10px] tracking-[0.8em] uppercase text-primary/60 mb-6">Arcana // First House</span>
                    <h1 className="text-6xl md:text-8xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-b from-primary to-primary/40">
                        LUMINA
                    </h1>
                </motion.div>

                <div className="w-16 h-px bg-primary/40" />

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-xl md:text-2xl font-light italic text-zinc-400 leading-relaxed font-serif"
                >
                    "A single spark in the infinite dark defines the path of the soul. Journey inward to find the stars that guide you home."
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="flex flex-col items-center gap-8"
                >
                    <button className="px-16 py-5 bg-transparent border border-primary text-primary text-xs uppercase tracking-[0.6em] font-bold hover:bg-primary/5 transition-all duration-500 shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                        Manifest Vision
                    </button>

                    <div className="flex gap-12 font-mono text-[8px] tracking-widest uppercase opacity-30">
                        <div className="flex flex-col gap-1">
                            <span>Jupiter</span>
                            <span className="text-primary italic">In Alignment</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span>Saturn</span>
                            <span className="text-primary italic">Retrogression</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Decorative Symbols along sides */}
            <div className="hidden lg:flex absolute left-20 top-1/2 -translate-y-1/2 flex-col gap-16 text-primary/20 text-xl font-bold">
                <span>α</span>
                <span>Ω</span>
                <span>Δ</span>
                <span>Φ</span>
            </div>
            <div className="hidden lg:flex absolute right-20 top-1/2 -translate-y-1/2 flex-col gap-16 text-primary/20 text-xl font-bold">
                <span>☽</span>
                <span>☉</span>
                <span>↑</span>
                <span>ψ</span>
            </div>
        </section>
    )
}
