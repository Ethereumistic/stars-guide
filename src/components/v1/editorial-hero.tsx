"use client"

import * as React from "react"
import { motion } from "motion/react"
import { ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export function EditorialHero() {
    return (
        <section className="relative min-h-screen flex flex-col justify-between  text-white px-6 py-12 md:px-12 md:py-24 overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none" />
            </div>

            {/* Top Bar - Editorial Info */}
            <div className="relative z-10 flex justify-between items-start">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col"
                >
                    <span className="font-mono text-xs tracking-[0.3em] uppercase opacity-50">Volume 01</span>
                    <span className="font-serif text-lg italic">The Celestial Guide</span>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="hidden md:block text-right"
                >
                    <span className="font-serif text-sm italic max-w-[200px] block opacity-60">
                        "As above, so below. Exploring the infinite connection between stars and soul."
                    </span>
                </motion.div>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center grow text-center">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                >
                    <h1 className="font-serif text-[12vw] md:text-[10vw] leading-[0.9] tracking-tighter uppercase font-bold">
                        Stars<span className="text-blue-500 animate-pulse">.</span><br />
                        Guide
                    </h1>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="mt-8 flex flex-col items-center"
                >
                    <p className="font-sans text-lg md:text-xl max-w-xl opacity-70 font-light leading-relaxed">
                        A curated journey through the cosmos, blending precision astronomy with ancient wisdom.
                    </p>

                    <div className="mt-12 flex gap-4">
                        <Button className="rounded-none border border-white bg-white text-black hover:bg-transparent hover:text-white px-10 py-6 text-sm uppercase tracking-widest transition-all duration-500">
                            Begin Journey
                        </Button>
                        <Button variant="outline" className="rounded-none border-white/20 hover:border-white px-10 py-6 text-sm uppercase tracking-widest transition-all duration-500">
                            The Archive
                        </Button>
                    </div>
                </motion.div>
            </div>

            {/* Footer Area */}
            <div className="relative z-10 flex justify-between items-end border-t border-white/10 pt-8">
                <div className="flex gap-12 font-mono text-[10px] tracking-[0.2em] uppercase opacity-40">
                    <div className="flex flex-col gap-1">
                        <span>Ascendant</span>
                        <span className="text-white">Leo 24°</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span>Moon Phase</span>
                        <span className="text-white">Waxing Gibbous</span>
                    </div>
                </div>

                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="flex flex-col items-center gap-2 cursor-pointer"
                >
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-40">Scroll</span>
                    <ArrowDown className="size-4 opacity-40" />
                </motion.div>

                <div className="hidden lg:block font-serif text-[10px] italic opacity-40 max-w-[200px]">
                    Copyright © 2026 Stars.Guide. All rights reserved in all dimensions.
                </div>
            </div>

            {/* Large Decorative Number Background */}
            <div className="absolute bottom-[-10%] right-[-5%] text-[40vw] font-serif font-black text-white/3 leading-none select-none -z-10">
                01
            </div>
        </section>
    )
}
