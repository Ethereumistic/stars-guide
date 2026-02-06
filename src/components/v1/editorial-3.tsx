"use client"

import * as React from "react"
import { motion } from "motion/react"

export function EditorialV3() {
    return (
        <section className="relative min-h-screen text-neutral-200 p-4 md:p-8 flex flex-col font-serif">
            {/* Outer Border Frame */}
            <div className="absolute inset-4 md:inset-8 border border-white/5 pointer-events-none" />

            {/* Main Grid Layout */}
            <div className="relative z-10 flex-grow grid grid-cols-1 md:grid-cols-12 gap-4">

                {/* Left Vertical Section */}
                <div className="hidden md:flex md:col-span-1 border-r border-white/5 flex-col items-center justify-center py-12">
                    <span className="rotate-[-90deg] whitespace-nowrap text-[10px] tracking-[0.8em] font-mono opacity-20 uppercase">
                        Established MMXXVI // Edition Zero
                    </span>
                </div>

                {/* Center Main Feature */}
                <div className="md:col-span-7 flex flex-col justify-end p-8 md:p-16 space-y-12">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="size-16 border border-primary flex items-center justify-center mb-8 rotate-45">
                            <div className="size-8 bg-primary/20 rotate-45" />
                        </div>
                        <h1 className="text-6xl md:text-[10vw] leading-none font-black tracking-tighter uppercase italic">
                            Cosmic<br />
                            <span className="text-primary not-italic">Order.</span>
                        </h1>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="font-sans text-xl opacity-60 max-w-lg leading-relaxed font-light"
                    >
                        Unveiling the mathematical tapestry that orchestrates your journey through time and space.
                    </motion.p>

                    <div className="flex gap-4">
                        <button className="px-10 py-5 bg-primary text-black text-xs font-bold uppercase tracking-[0.3em] hover:bg-white transition-all duration-300">
                            Discover Truth
                        </button>
                    </div>
                </div>

                {/* Right Info Section */}
                <div className="md:col-span-4 flex flex-col justify-between p-8 border-l border-white/5">
                    <div className="space-y-12">
                        <div className="space-y-4">
                            <h3 className="text-primary text-xs uppercase tracking-[0.4em] font-bold">01 // The Chart</h3>
                            <p className="text-sm opacity-40 font-sans leading-relaxed">
                                A definitive map of the celestial body at the exact moment of your arrival.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-primary text-xs uppercase tracking-[0.4em] font-bold">02 // The Transits</h3>
                            <p className="text-sm opacity-40 font-sans leading-relaxed">
                                Understanding current energetic shifts and how they resonate with your core.
                            </p>
                        </div>
                    </div>

                    <div className="mt-12">
                        <div className="p-6 bg-white/5 border border-white/10">
                            <span className="block text-[8px] tracking-widest uppercase opacity-40 mb-4 italic">Next Reading in:</span>
                            <div className="flex justify-between items-baseline font-mono">
                                <span className="text-3xl text-primary font-bold">14:02:55</span>
                                <span className="text-[10px] opacity-30 uppercase">UTC+2</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Absolute Overlays */}
            <div className="absolute top-1/2 right-0 translate-y-[-50%] text-[25vw] font-black text-white/[0.02] pointer-events-none select-none">
                03
            </div>
        </section>
    )
}
