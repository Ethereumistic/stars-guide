"use client"

import * as React from "react"
import { motion } from "motion/react"
import { Compass } from "lucide-react"

export function MythicV2() {
    const points = [...Array(12)].map((_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1
    }));

    return (
        <section className="relative min-h-screen  text-white flex items-center p-8 md:p-24 overflow-hidden font-serif">
            {/* Star Grid Background */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, #D4AF37 0.5px, transparent 0.5px)', backgroundSize: '60px 60px' }}
            />

            <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">

                <div className="space-y-12 order-2 lg:order-1">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1 }}
                    >
                        <div className="flex items-center gap-4 text-primary text-xs uppercase tracking-[0.5em] mb-8">
                            <Compass className="size-4" />
                            Celestial Navigation System
                        </div>
                        <h1 className="text-7xl md:text-9xl font-medium leading-[0.8] tracking-tighter uppercase">
                            Map <br />
                            The <span className="text-primary italic">Unseen.</span>
                        </h1>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="max-w-md text-white/50 text-lg leading-relaxed font-sans"
                    >
                        We provide the instruments to measure the subtle forces that shape your journey. Precision astrology for the modern traveler.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 }}
                        className="flex gap-8"
                    >
                        <button className="bg-white text-black px-12 py-5 font-bold uppercase tracking-widest text-xs hover:bg-primary transition-colors">
                            Locate Position
                        </button>
                    </motion.div>
                </div>

                {/* Constellation Visualizer */}
                <div className="relative order-1 lg:order-2 flex items-center justify-center">
                    <div className="relative size-64 md:size-96 border border-white/10 rounded-full flex items-center justify-center">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-4 border border-primary/20 rounded-full border-dashed"
                        />

                        {/* Random Star Points and connecting lines */}
                        <svg className="absolute inset-0 w-full h-full opacity-60" viewBox="0 0 100 100">
                            <polyline
                                points={points.map(p => `${p.x},${p.y}`).join(' ')}
                                fill="none"
                                stroke="#D4AF37"
                                strokeWidth="0.1"
                                strokeDasharray="1 1"
                            />
                            {points.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r={p.size / 10} fill="#D4AF37" className="animate-pulse" />
                            ))}
                        </svg>

                        <div className="relative p-8 bg-black/80 backdrop-blur-md rounded-full border border-white/5 flex flex-col items-center">
                            <span className="text-[10px] tracking-[0.4em] uppercase opacity-40 mb-2">Transit</span>
                            <span className="text-xl text-primary font-bold">L-404</span>
                        </div>
                    </div>
                </div>

            </div>

            <div className="absolute top-12 right-12 text-[10px] opacity-20 uppercase tracking-[0.5em] font-mono [writing-mode:vertical-rl]">
                Coordinate Lock // Verified
            </div>
        </section>
    )
}
