"use client";

import { motion } from "motion/react";
import { GiStarSwirl } from "react-icons/gi";
import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { StarsBackground } from "@/components/hero/stars-background";
import { ShootingStars } from "@/components/hero/shooting-stars";

const stardustPackages = [
    {
        amount: 10,
        price: "€10",
        discount: null,
        popular: false,
    },
    {
        amount: 50,
        price: "€47",
        discount: "Save 6%",
        popular: false,
    },
    {
        amount: 100,
        price: "€90",
        discount: "Save 10%",
        popular: true,
    },
];

export function StardustPurchase() {
    const [selectedPackage, setSelectedPackage] = useState(1); // Default to 50 pack

    return (
        <section className="w-full max-w-7xl mx-auto mt-24">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch relative">

                {/* Left Column: Explanation */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="relative group p-8 lg:p-10 flex flex-col justify-center bg-background/85 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-xl"
                >
                    <div className="mb-6 flex items-center gap-3">
                        <div className="text-primary drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]">
                            <GiStarSwirl className="w-10 h-10 animate-[spin_60s_linear_infinite]" />
                        </div>
                        <h3 className="text-3xl font-serif font-bold text-white group-hover:text-primary transition-colors">
                            Star Dust
                        </h3>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed mb-6">
                        Star Dust is our cosmic currency. Use it to gain deep insights specifically when you need them, without committing to a full subscription tier.
                    </p>
                    <div className="h-px w-full bg-linear-to-r from-transparent via-white/10 to-transparent my-6" />
                    <ul className="space-y-4">
                        <li className="flex items-start gap-4">
                            <div className="mt-0.5 rounded-full p-1 border border-primary/20 bg-primary/10 text-primary">
                                <Check className="w-3 h-3" />
                            </div>
                            <span className="text-sm tracking-wide text-white/90">Pay-as-you-go oracle queries</span>
                        </li>
                        <li className="flex items-start gap-4">
                            <div className="mt-0.5 rounded-full p-1 border border-primary/20 bg-primary/10 text-primary">
                                <Check className="w-3 h-3" />
                            </div>
                            <span className="text-sm tracking-wide text-white/90">Generate single astral cards</span>
                        </li>
                        <li className="flex items-start gap-4">
                            <div className="mt-0.5 rounded-full p-1 border border-primary/20 bg-primary/10 text-primary">
                                <Check className="w-3 h-3" />
                            </div>
                            <span className="text-sm tracking-wide text-white/90">Unlock specific synastries</span>
                        </li>
                    </ul>
                </motion.div>

                {/* Right Columns: Purchase (Spans 2 columns) */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="lg:col-span-2 relative group p-8 lg:p-10 flex flex-col bg-background/85 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl border border-primary/40 z-10"
                >
                    {/* Outline Glow */}
                    <div
                        className="absolute inset-0 -z-10 rounded-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000 blur-xl"
                        style={{ backgroundColor: "rgba(212, 175, 55, 0.4)" }}
                    />

                    <div className="absolute inset-0 z-0 overflow-hidden rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                        <StarsBackground
                            starDensity={0.0002}
                            allStarsTwinkle={true}
                            twinkleProbability={0.8}
                            minTwinkleSpeed={0.3}
                            maxTwinkleSpeed={1.2}
                        />
                        <ShootingStars
                            minSpeed={15}
                            maxSpeed={35}
                            minDelay={200}
                            maxDelay={400}
                            starColor="#d4af37"
                            trailColor="#8b7355"
                        />
                    </div>

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-serif font-bold text-primary drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                                    Acquire Cosmic Energy
                                </h3>
                                <p className="text-sm text-white/60 mt-1">
                                    Stockpile Star Dust for future revelations.
                                </p>
                            </div>
                            <GiStarSwirl className="text-primary/60 w-6 h-6 animate-pulse" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 flex-1">
                            {stardustPackages.map((pkg, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setSelectedPackage(idx)}
                                    className={`relative cursor-pointer rounded-2xl p-6 border transition-all duration-300 flex flex-col items-center justify-center text-center ${selectedPackage === idx
                                        ? "border-primary bg-primary/10 scale-105 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                                        : "border-white/10 bg-white/5 hover:border-primary/50 hover:bg-white/10"
                                        }`}
                                >
                                    {pkg.popular && (
                                        <div className="absolute -top-3 inset-x-0 mx-auto w-max px-3 py-0.5 rounded-full bg-primary text-[#0A0F1A] text-[10px] font-bold uppercase tracking-wider shadow-md">
                                            Best Value
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mb-2">
                                        <GiStarSwirl className={`w-5 h-5 ${selectedPackage === idx ? "text-primary" : "text-white/50"}`} />
                                        <span className={`text-2xl font-serif font-bold ${selectedPackage === idx ? "text-white" : "text-white/80"}`}>
                                            {pkg.amount}
                                        </span>
                                    </div>
                                    <div className={`text-3xl font-serif tracking-tight ${selectedPackage === idx ? "text-primary" : "text-white"}`}>
                                        {pkg.price}
                                    </div>
                                    {pkg.discount ? (
                                        <div className="mt-2 text-[10px] font-medium text-emerald-400 uppercase tracking-widest">
                                            {pkg.discount}
                                        </div>
                                    ) : (
                                        <div className="mt-2 text-[10px] font-medium text-transparent uppercase tracking-widest select-none">
                                            Placeholder
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button className="relative w-full py-4 px-5 text-center bg-primary text-[#0A0F1A] font-bold rounded-xl hover:bg-primary/90 transition-colors uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                            Purchase {stardustPackages[selectedPackage].amount} Star Dust
                        </button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
