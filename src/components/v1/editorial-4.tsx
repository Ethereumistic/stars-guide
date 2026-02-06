"use client"

import * as React from "react"
import { motion } from "motion/react"
import { ArrowRight, Sparkles } from "lucide-react"

export function EditorialV4() {
    return (
        <section className="relative min-h-screen  text-white flex flex-col items-center justify-center p-8 overflow-hidden font-serif">
            {/* Central Glowing Orb (Subtle) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Decorative Floating Circles */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 z-0 opacity-10"
            >
                <div className="absolute top-10 left-10 size-[30vw] border border-white rounded-full translate-x-[-20%] translate-y-[-20%]" />
                <div className="absolute bottom-10 right-10 size-[40vw] border border-primary rounded-full translate-x-[20%] translate-y-[20%]" />
            </motion.div>

            {/* Main Content Box */}
            <div className="relative z-10 max-w-5xl w-full flex flex-col items-center text-center space-y-16">

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5 }}
                    className="space-y-6"
                >
                    <div className="flex justify-center items-center gap-4 mb-8">
                        <div className="h-px w-12 bg-primary/40" />
                        <Sparkles className="size-5 text-primary" />
                        <div className="h-px w-12 bg-primary/40" />
                    </div>

                    <h1 className="text-6xl md:text-[12vw] font-bold leading-[0.8] tracking-[-0.05em] uppercase">
                        Beyond <br />
                        The <span className="italic font-light italic-serif">Seen.</span>
                    </h1>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="flex flex-col items-center space-y-12"
                >
                    <p className="max-w-xl text-lg md:text-2xl font-light opacity-50 italic">
                        A sophisticated mapping of human resonance within the infinite mechanics of the universe.
                    </p>

                    <div className="flex flex-wrap justify-center gap-8">
                        <button className="group flex items-center gap-4 text-xs tracking-[0.5em] uppercase font-bold py-4 px-12 border border-white/20 hover:border-primary hover:text-primary transition-all duration-700">
                            Seek Guidance
                            <ArrowRight className="size-4 group-hover:translate-x-2 transition-transform" />
                        </button>
                        <button className="text-xs tracking-[0.5em] uppercase opacity-30 hover:opacity-100 transition-opacity flex items-center gap-3">
                            View Methodology
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Corner Details */}
            <div className="absolute top-12 left-12 flex flex-col gap-1 text-[10px] tracking-widest font-mono opacity-20 uppercase">
                <span>Aesthetica Vol. 04</span>
                <span className="text-primary italic">Editorial Selection</span>
            </div>

            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
                <div className="h-16 w-px bg-white/10" />
                <span className="text-[10px] tracking-[0.5em] uppercase opacity-40">The Origin</span>
            </div>
        </section>
    )
}
