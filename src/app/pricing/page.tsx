"use client";

import { motion } from "motion/react";
import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { TbSparkles } from "react-icons/tb";
import { PricingCard } from "@/components/pricing/pricing-card";
import { plans } from "@/components/pricing/pricing-data";
import { StardustPurchase } from "@/components/pricing/stardust-purchase";

export default function PricingPage() {
    const [isYearly, setIsYearly] = useState(false);

    return (
        <div className="relative min-h-screen w-full text-foreground selection:bg-primary/30">
            <main className="relative z-10 container mx-auto px-6 py-36 flex flex-col items-center">
                {/* Hero Section */}
                <motion.div
                    className="max-w-4xl text-center mb-16 space-y-8"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/40 backdrop-blur-sm px-4 py-2 text-sm text-muted-foreground">
                            <Sparkles className="size-4 text-primary" />
                            <span className="font-sans italic">The Digital Sanctuary</span>
                        </div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="text-5xl sm:text-6xl lg:text-7xl font-serif leading-none font-bold tracking-tight"
                    >
                        Align Your <br />
                        <span className="italic text-primary drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">Cosmic Trajectory</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.4 }}
                        className="text-lg md:text-xl text-muted-foreground/80 font-sans max-w-2xl mx-auto leading-relaxed"
                    >
                        &quot;Unlock your astrological potential with our tailored plans.&quot;
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 1.5, delay: 0.6 }}
                        className="w-32 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent mx-auto"
                    />
                </motion.div>

                {/* Monthly / Yearly Toggle */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="flex justify-center mb-16 relative z-10"
                >
                    <div className="relative flex items-center p-1 bg-white/5 border border-white/10 rounded-full shadow-lg backdrop-blur-sm">
                        <button
                            onClick={() => setIsYearly(false)}
                            className={`relative w-32 text-center z-10 px-4 py-2.5 text-sm font-medium transition-colors ${!isYearly ? "text-white" : "text-white/60 hover:text-white"}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsYearly(true)}
                            className={`relative w-32 text-center z-10 px-4 py-2.5 text-sm font-medium transition-colors ${isYearly ? "text-white" : "text-white/60 hover:text-white"}`}
                        >
                            Yearly
                            {/* Saving Badge */}
                            <span className="absolute -top-3 -right-2 bg-primary text-[#0A0F1A] text-[10px] font-bold px-2 py-0.5 rounded-full rotate-3 shadow-md">
                                Save 20%
                            </span>
                        </button>
                        {/* Active Pill Selector */}
                        <div
                            className={`absolute top-1 bottom-1 w-32 bg-white/10 border border-white/10 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${isYearly ? "translate-x-32" : "translate-x-0"}`}
                        />
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch w-full max-w-7xl mx-auto">
                    {plans.map((plan, i) => (
                        <div
                            key={plan.name}
                            className={`relative w-full h-full hover:z-50 [transition:z-index_0ms_linear_1000ms] hover:[transition:z-index_0ms_linear_0ms] ${i === 1 ? 'lg:-translate-y-4 z-10' : 'z-0'}`}
                        >
                            <PricingCard plan={plan} index={i} isYearly={isYearly} />
                        </div>
                    ))}
                </div>

                <StardustPurchase />

                {/* Bottom Decoration */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-32 flex flex-col items-center space-y-12"
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
