"use client"

import * as React from "react"
import { motion } from "motion/react"
import { ChevronRight } from "lucide-react"

export function EditorialV1() {
    return (
        <section className="relative min-h-screen text-white overflow-hidden flex flex-col font-serif">
            {/* Background Layer */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-1/3 h-2/3 bg-blue-500/5 blur-[150px]" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-grow grid grid-cols-12 gap-0">
                {/* Left Column - Large Image/Empty Space with floating text */}
                <div className="col-span-12 lg:col-span-7 flex items-end p-8 md:p-16 border-r border-white/5">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                        className="max-w-md"
                    >
                        <span className="text-[10px] uppercase tracking-[0.6em] text-primary mb-4 block">The Beginning</span>
                        <p className="text-xl md:text-2xl font-light leading-relaxed italic opacity-80">
                            "We are all in the gutter, but some of us are looking at the stars."
                        </p>
                    </motion.div>
                </div>

                {/* Right Column - Typography & CTA */}
                <div className="col-span-12 lg:col-span-5 flex flex-col justify-center p-8 md:p-16 space-y-12">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                    >
                        <h1 className="text-[15vw] lg:text-[7vw] leading-[0.85] font-black uppercase tracking-tighter">
                            Astra<br />
                            <span className="text-primary italic">Natura.</span>
                        </h1>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.6 }}
                        className="space-y-8"
                    >
                        <p className="font-sans text-sm md:text-base opacity-50 max-w-sm leading-loose tracking-wide">
                            Meticulously crafted insights for the modern seeker. We bridge the gap between ancient observation and contemporary precision.
                        </p>

                        <div className="group relative inline-block">
                            <button className="relative z-10 bg-white text-black px-12 py-5 text-xs uppercase tracking-[0.3em] font-bold hover:bg-primary transition-colors duration-500 flex items-center gap-4">
                                Enter Void <ChevronRight className="size-4" />
                            </button>
                            <div className="absolute -inset-2 border border-white/10 group-hover:border-primary/50 transition-colors duration-500" />
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Footer / Meta Data */}
            <div className="relative z-10 p-8 border-t border-white/5 flex flex-wrap justify-between items-center bg-black/40 backdrop-blur-xl">
                <div className="flex gap-16 font-mono text-[9px] tracking-[0.4em] uppercase opacity-40">
                    <div className="flex flex-col gap-1">
                        <span>Coord</span>
                        <span className="text-white">44.001 N</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span>Epoch</span>
                        <span className="text-white">J2000.0</span>
                    </div>
                </div>
                <div className="text-[9px] tracking-[0.2em] font-sans opacity-30 mt-4 md:mt-0 uppercase">
                    Stars Guide Selection // 2026 Edition
                </div>
            </div>
        </section>
    )
}
