"use client";

import { motion } from "motion/react";
import { GiStarSwirl } from "react-icons/gi";
import { Check, Gem, Rocket } from "lucide-react";
import { useState } from "react";
import { StarsBackground } from "@/components/hero/stars-background";
import { ShootingStars } from "@/components/hero/shooting-stars";

const stardustPackages = [
    {
        amount: 100,
        price: "€10",
        perSD: "€0.10",
        discount: null,
        popular: false,
        fill: 25,
    },
    {
        amount: 225,
        price: "€20",
        perSD: "€0.089",
        discount: "11% off",
        popular: false,
        fill: 45,
    },
    {
        amount: 550,
        price: "€50",
        perSD: "€0.091",
        discount: "9% off",
        popular: true,
        fill: 70,
    },
    {
        amount: 1150,
        price: "€100",
        perSD: "€0.087",
        discount: "13% off",
        popular: false,
        fill: 100,
    },
];

export function StardustPurchaseV5() {
    const [selectedPackage, setSelectedPackage] = useState(2);

    return (
        <section className="w-full max-w-7xl mx-auto mt-24">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch relative">

                {/* Left Column: Explanation */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="relative group p-8 lg:p-10 flex flex-col justify-center rounded-3xl overflow-hidden"
                    style={{
                        background: "linear-gradient(180deg, rgba(10,15,26,0.95) 0%, rgba(12,8,22,0.95) 100%)",
                        border: "1px solid rgba(255,255,255,0.06)",
                    }}
                >
                    {/* Top gradient accent bar */}
                    <div
                        className="absolute top-0 left-0 w-full h-1 rounded-t-3xl"
                        style={{
                            background: "linear-gradient(90deg, #9d4edd, #d4af37, #9d4edd)",
                        }}
                    />

                    {/* Mesh gradient background */}
                    <div
                        className="absolute inset-0 pointer-events-none opacity-30"
                        style={{
                            background: "radial-gradient(ellipse at 20% 80%, rgba(212,175,55,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(157,78,221,0.06) 0%, transparent 60%)",
                        }}
                    />

                    <div className="relative z-10">
                        {/* Title row */}
                        <div className="flex items-start gap-4 mb-6">
                            <div
                                className="p-3 rounded-2xl shrink-0"
                                style={{
                                    background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(157,78,221,0.08))",
                                    border: "1px solid rgba(212,175,55,0.15)",
                                    boxShadow: "0 0 20px rgba(212,175,55,0.08)",
                                }}
                            >
                                <GiStarSwirl
                                    className="w-8 h-8 text-primary"
                                    style={{
                                        filter: "drop-shadow(0 0 8px rgba(212,175,55,0.5))",
                                    }}
                                />
                            </div>
                            <div>
                                <h3
                                    className="text-2xl font-serif font-bold bg-clip-text text-transparent leading-tight"
                                    style={{
                                        backgroundImage: "linear-gradient(135deg, #ffffff 0%, #d4af37 70%, #9d4edd 100%)",
                                    }}
                                >
                                    Star Dust
                                </h3>
                                <p className="text-[11px] uppercase tracking-[0.15em] font-mono text-white/35 mt-1">
                                    Cosmic Currency
                                </p>
                            </div>
                        </div>

                        <p className="text-white/55 text-[13px] leading-relaxed mb-6 font-sans">
                            Pay-as-you-go cosmic energy. Oracle questions, astral card generation, synastry unlocks — no subscription required. Just pure celestial insight on demand.
                        </p>

                        <div
                            className="h-px w-full my-5"
                            style={{
                                background: "linear-gradient(90deg, rgba(212,175,55,0.2), rgba(157,78,221,0.2), transparent)",
                            }}
                        />

                        <ul className="space-y-3.5">
                            {[
                                { text: "Pay-as-you-go oracle queries", icon: "🔮" },
                                { text: "Generate single astral cards", icon: "✨" },
                                { text: "Unlock specific synastries", icon: "🌙" },
                            ].map((item, i) => (
                                <motion.li
                                    key={i}
                                    initial={{ opacity: 0, x: -15 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
                                    className="flex items-center gap-3"
                                >
                                    <span className="text-sm">{item.icon}</span>
                                    <span className="text-[13px] tracking-wide text-white/85 font-sans">{item.text}</span>
                                </motion.li>
                            ))}
                        </ul>

                        {/* Mini value prop */}
                        <div
                            className="mt-8 flex items-center gap-3 p-3 rounded-xl"
                            style={{
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.04)",
                            }}
                        >
                            <Gem className="w-4 h-4 text-galactic/60 shrink-0" />
                            <span className="text-[11px] text-white/45 font-sans">
                                Never expires. Use whenever the stars align.
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Right Columns: Purchase Area (Spans 2 columns) */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.15 }}
                    className="lg:col-span-2 relative group p-8 lg:p-10 flex flex-col rounded-3xl overflow-hidden shadow-2xl z-10"
                    style={{
                        background: "linear-gradient(160deg, rgba(10,15,26,0.95) 0%, rgba(12,8,22,0.95) 100%)",
                        border: "1px solid rgba(212,175,55,0.12)",
                    }}
                >
                    {/* Top gradient accent bar */}
                    <div
                        className="absolute top-0 left-0 w-full h-1 rounded-t-3xl"
                        style={{
                            background: "linear-gradient(90deg, #d4af37, #9d4edd, #d4af37)",
                        }}
                    />

                    {/* Ambient glow */}
                    <div
                        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[120px] pointer-events-none opacity-15 group-hover:opacity-25 transition-opacity duration-1500"
                        style={{
                            background: "linear-gradient(180deg, rgba(212,175,55,0.4), rgba(157,78,221,0.3))",
                        }}
                    />

                    {/* Stars */}
                    <div className="absolute inset-0 z-0 overflow-hidden rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                        <StarsBackground
                            starDensity={0.00018}
                            allStarsTwinkle={true}
                            twinkleProbability={0.85}
                            minTwinkleSpeed={0.3}
                            maxTwinkleSpeed={1.0}
                        />
                        <ShootingStars
                            minSpeed={12}
                            maxSpeed={28}
                            minDelay={300}
                            maxDelay={700}
                            starColor="#d4af37"
                            trailColor="#9d4edd"
                        />
                    </div>

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-serif font-bold text-white">
                                    Power Up Your Cosmos
                                </h3>
                                <p className="text-sm text-white/45 mt-1 font-sans">
                                    Larger bundles unlock greater cosmic potential.
                                </p>
                            </div>
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <Rocket
                                    className="w-6 h-6"
                                    style={{
                                        color: "#d4af37",
                                        filter: "drop-shadow(0 0 8px rgba(212,175,55,0.4))",
                                    }}
                                />
                            </motion.div>
                        </div>

                        {/* Packages as tall vertical cards  */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 flex-1">
                            {stardustPackages.map((pkg, idx) => {
                                const isSelected = selectedPackage === idx;

                                return (
                                    <motion.div
                                        key={idx}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => setSelectedPackage(idx)}
                                        className="relative cursor-pointer rounded-2xl transition-all duration-300 flex flex-col overflow-hidden"
                                        style={{
                                            border: isSelected
                                                ? "1px solid transparent"
                                                : "1px solid rgba(255,255,255,0.06)",
                                            background: isSelected
                                                ? "linear-gradient(rgba(10,15,26,0.95), rgba(10,15,26,0.95)) padding-box, linear-gradient(160deg, #d4af37, #9d4edd, #d4af37) border-box"
                                                : "rgba(255,255,255,0.02)",
                                        }}
                                    >
                                        {/* Energy fill bar - visual representation of value */}
                                        <div
                                            className="absolute bottom-0 left-0 w-full transition-all duration-700 pointer-events-none"
                                            style={{
                                                height: `${pkg.fill}%`,
                                                background: isSelected
                                                    ? `linear-gradient(180deg, transparent 0%, rgba(212,175,55,0.04) 40%, rgba(157,78,221,0.06) 100%)`
                                                    : `linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.01) 100%)`,
                                            }}
                                        />

                                        {pkg.popular && (
                                            <div
                                                className="w-full py-1 text-center text-[9px] font-bold uppercase tracking-wider text-[#0A0F1A]"
                                                style={{
                                                    background: "linear-gradient(90deg, #d4af37, #e8c84a, #9d4edd)",
                                                }}
                                            >
                                                Most Popular
                                            </div>
                                        )}

                                        <div className="relative z-10 p-5 flex flex-col items-center justify-center text-center flex-1">
                                            {/* Amount */}
                                            <div className="mb-2">
                                                <span className={`text-3xl font-serif font-bold ${isSelected ? "text-white" : "text-white/65"}`}>
                                                    {pkg.amount}
                                                </span>
                                            </div>

                                            <div
                                                className="text-[10px] uppercase tracking-wider font-mono mb-3"
                                                style={{
                                                    color: isSelected ? "#d4af37" : "rgba(255,255,255,0.3)",
                                                }}
                                            >
                                                Star Dust
                                            </div>

                                            {/* Divider */}
                                            <div
                                                className="h-px w-8 mb-3"
                                                style={{
                                                    background: isSelected
                                                        ? "linear-gradient(90deg, #d4af37, #9d4edd)"
                                                        : "rgba(255,255,255,0.08)",
                                                }}
                                            />

                                            {/* Price */}
                                            <div
                                                className={`text-2xl font-serif font-bold mb-1 ${isSelected ? "" : "text-white/80"}`}
                                                style={
                                                    isSelected
                                                        ? {
                                                            backgroundImage: "linear-gradient(135deg, #d4af37, #9d4edd)",
                                                            WebkitBackgroundClip: "text",
                                                            WebkitTextFillColor: "transparent",
                                                        }
                                                        : {}
                                                }
                                            >
                                                {pkg.price}
                                            </div>

                                            <div className="text-[10px] text-white/30 font-mono mb-2">{pkg.perSD}/SD</div>

                                            {/* Discount */}
                                            {pkg.discount ? (
                                                <div
                                                    className="mt-auto px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                                                    style={{
                                                        background: "rgba(16,185,129,0.1)",
                                                        color: "#10b981",
                                                        border: "1px solid rgba(16,185,129,0.15)",
                                                    }}
                                                >
                                                    {pkg.discount}
                                                </div>
                                            ) : (
                                                <div className="mt-auto text-[9px] text-transparent select-none">—</div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* CTA button */}
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className="relative w-full py-4 px-5 text-center font-bold rounded-xl uppercase tracking-widest text-xs overflow-hidden cursor-pointer group/btn"
                            style={{
                                background: "linear-gradient(90deg, #d4af37 0%, #b8962e 35%, #8b5cf6 65%, #9d4edd 100%)",
                                color: "#0A0F1A",
                                boxShadow: "0 0 20px rgba(212,175,55,0.2), 0 0 40px rgba(157,78,221,0.1), 0 4px 20px rgba(0,0,0,0.4)",
                            }}
                        >
                            {/* Shimmer sweep */}
                            <motion.div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                                    width: "120%",
                                }}
                                animate={{
                                    x: ["-120%", "120%"],
                                }}
                                transition={{
                                    duration: 2.5,
                                    repeat: Infinity,
                                    repeatDelay: 3,
                                    ease: "easeInOut",
                                }}
                            />
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                <GiStarSwirl className="w-4 h-4" />
                                Purchase {stardustPackages[selectedPackage].amount} Star Dust — {stardustPackages[selectedPackage].price}
                            </span>
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
