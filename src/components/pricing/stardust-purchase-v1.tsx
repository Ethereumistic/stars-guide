"use client";

import { motion, AnimatePresence, useInView } from "motion/react";
import { GiStarSwirl } from "react-icons/gi";
import { Check, Zap } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { StarsBackground } from "@/components/hero/stars-background";
import { ShootingStars } from "@/components/hero/shooting-stars";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "../ui/badge";

const BASE_PRICE_PER_SD = 0.10; // €0.10 per Star Dust

const stardustPackages = [
    {
        amount: 100, // 100 SD at base price
        price: "€10",
        originalPrice: null, // no discount
        discount: null,
        popular: false,
    },
    {
        amount: 222, // 200 SD base + 10% bonus = 222 SD (Save 10%)
        price: "€20",
        originalPrice: "€22.20",
        discount: "Save 10%",
        popular: false,
    },
    {
        amount: 588, // 500 SD base + 15% bonus = 588 SD (Save 15%)
        price: "€50",
        originalPrice: "€58.80",
        discount: "Save 15%",
        popular: true,
    },
    {
        amount: 1250, // 1000 SD base + 20% bonus = 1250 SD (Save 20%)
        price: "€100",
        originalPrice: "€125",
        discount: "Save 20%",
        popular: false,
    },
];

const stardustFeatures = [
    { text: "Pay-as-you-go oracle queries", included: true },
    { text: "Generate single astral cards", included: true },
    { text: "Unlock specific synastries", included: true },
    { text: "Deep single-chart readings", included: true },
    { text: "No subscription required", included: true },
    { text: "Star Dust never expires", included: true },
];

export function StardustPurchaseV1() {
    const [selectedPackage, setSelectedPackage] = useState(2);
    const [glareKey, setGlareKey] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(cardRef, { amount: 0.8, once: false });

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const showGlare = isMobile ? isInView : isHovered;

    const handleSelectPackage = useCallback((idx: number) => {
        setSelectedPackage(idx);
        setGlareKey((prev) => prev + 1);
    }, []);

    return (
        <section className="w-full max-w-7xl mx-auto mt-24">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch relative">

                {/* ═══════════════════════════════════════════════════
                    LEFT COLUMN: Star Dust Card (1:1 PricingCard clone)
                    ═══════════════════════════════════════════════════ */}
                <motion.div
                    ref={cardRef}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="relative group hover:z-50 rounded-3xl h-full flex flex-col z-0"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {/* Outline Glow */}
                    <div
                        className="absolute inset-0 -z-10 rounded-3xl opacity-15 group-hover:opacity-35 transition-opacity duration-1000 blur-xl group-hover:blur-2xl"
                        style={{
                            background: "linear-gradient(135deg, rgba(212,175,55,0.5), rgba(157,78,221,0.5))",
                        }}
                    />

                    {/* Main Card */}
                    <div
                        className="relative py-8 px-8 flex flex-col h-full bg-background/85 backdrop-blur-2xl rounded-md z-0 overflow-hidden shadow-2xl transition-transform duration-1000 border"
                        style={{ borderColor: "rgba(212,175,55,0.3)" }}
                    >
                        {/* Stars on hover */}
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
                                maxDelay={300}
                                starColor="#d4af37"
                                trailColor="#9d4edd"
                            />
                        </div>

                        {/* Glare — primary→galactic gradient, retriggers on selection */}
                        <AnimatePresence mode="wait">
                            {(showGlare || glareKey > 0) && (
                                <motion.div
                                    key={`glare-${glareKey}-${showGlare}`}
                                    className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <motion.div
                                        className="absolute inset-0 w-[200%] h-[200%]"
                                        initial={{ x: "-50%", y: "-50%" }}
                                        animate={{ x: "50%", y: "50%" }}
                                        transition={{ duration: 1.5, ease: "easeInOut" }}
                                        style={{
                                            background: `linear-gradient(135deg, transparent 0%, transparent 35%, rgba(212,175,55,0.08) 42%, rgba(184,127,138,0.12) 50%, rgba(157,78,221,0.08) 58%, transparent 65%, transparent 100%)`,
                                        }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Inner subtle glow */}
                        <div
                            className="absolute inset-0 backdrop-blur-[0.5px] pointer-events-none -z-10"
                            style={{
                                background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.005) 100%)",
                            }}
                        />

                        {/* ─── Card Content ─── */}
                        <div className="flex-1 z-10 space-y-4">

                            {/* Icon + Gradient Title */}
                            <div className="flex items-center gap-3">
                                <div className="drop-shadow-[0_0_15px_rgba(212,175,55,0.6)] group-hover:rotate-[360deg] group-hover:scale-120 transition-all duration-[2000ms]">
                                    <GiStarSwirl className="size-10 text-primary" />
                                </div>
                                <h3
                                    className="text-3xl font-serif bg-linear-to-r from-primary to-galactic text-nowrap font-bold bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]"

                                >
                                    Star Dust
                                </h3>
                            </div>

                            {/* Price Section — Selected plan only, animated */}
                            <div className="my-4 p-2">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={selectedPackage}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                        className="flex items-center gap-4"
                                    >
                                        <div className="flex items-baseline">
                                            <span className="text-5xl font-serif tracking-tight text-white">
                                                {stardustPackages[selectedPackage].price}
                                            </span>
                                        </div>

                                        <p className="text-xl font-mono text-muted-foreground mt-2">
                                            =
                                        </p>

                                        <div className="flex items-center gap-2 mt-3">
                                            <GiStarSwirl className="size-6 text-primary drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
                                            <span
                                                className="text-5xl font-serif font-bold bg-clip-text text-transparent"
                                                style={{
                                                    backgroundImage: "linear-gradient(135deg, #d4af37, #9d4edd)",
                                                }}
                                            >
                                                {stardustPackages[selectedPackage].amount}
                                            </span>
                                        </div>

                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Divider */}
                            <div className="h-px w-full bg-linear-to-r from-transparent via-white/10 to-transparent my-4" />

                            {/* 6 Features */}
                            <ul className="space-y-4 p-2">
                                {stardustFeatures.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-4">
                                        <div
                                            className="mt-0.5 rounded-full p-1 border"
                                            style={{
                                                borderColor: "rgba(212,175,55,0.2)",
                                                background: "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(157,78,221,0.05))",
                                            }}
                                        >
                                            <Check className="w-3 h-3 text-primary" />
                                        </div>
                                        <span className="text-sm tracking-wide text-white/90">
                                            {feature.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* CTA Button */}
                        <div className="mt-8 z-10 transition-transform duration-300 group-hover:-translate-y-1">
                            <Link
                                href="/checkout/stardust"
                                className="w-full hover:drop-shadow-[0_0_8px_var(--color-primary)] relative inline-flex group/btn items-center justify-center p-px mb-2 overflow-hidden text-sm font-medium rounded-xl"
                            >
                                <Button
                                    variant="galactic"
                                    size="xl"
                                    className="w-full bg-gradient-to-r from-primary/20 to-galactic/20 uppercase font-serif font-bold text-white gap-4"

                                >
                                    <div className="flex text-lg items-center ">
                                        Buy
                                    </div>
                                    <div className="drop-shadow-[0_0_15px_var(--color-primary)] group-hover:scale-120 transition-all duration-[2000ms]">
                                        <GiStarSwirl className="size-7 text-primary" />
                                    </div>
                                    <div className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-galactic">
                                        {stardustPackages[selectedPackage].amount}
                                    </div>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </motion.div>

                {/* ═══════════════════════════════════════════════════
                    RIGHT COLUMNS: Original Purchase Area (Spans 2 columns)
                    ═══════════════════════════════════════════════════ */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="lg:col-span-2 relative group p-8 lg:p-10 flex flex-col rounded-md overflow-hidden shadow-2xl z-10"
                    style={{
                        background: "linear-gradient(160deg, rgba(10,15,26,0.92) 0%, rgba(18,10,30,0.95) 100%)",
                    }}
                >
                    {/* Subtle aurora glow */}
                    <div
                        className="absolute inset-0 -z-10 rounded-md opacity-[0.015] group-hover:opacity-[0.025] transition-opacity duration-1000 blur-xl"
                        style={{
                            background: "conic-gradient(from 0deg, #d4af37, #9d4edd, #d4af37, #9d4edd)",
                        }}
                    />

                    {/* Border gradient — toned down */}
                    <div
                        className="absolute inset-0 rounded-md pointer-events-none"
                        style={{
                            padding: "1px",
                            background: "linear-gradient(135deg, rgba(212,175,55,0.3), rgba(157,78,221,0.15), rgba(212,175,55,0.1))",
                            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                            maskComposite: "exclude",
                            WebkitMaskComposite: "xor",
                        }}
                    />

                    {/* Stars on hover */}
                    <div className="absolute inset-0 z-0 overflow-hidden rounded-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                        <StarsBackground
                            starDensity={0.00025}
                            allStarsTwinkle={true}
                            twinkleProbability={0.9}
                            minTwinkleSpeed={0.3}
                            maxTwinkleSpeed={1.0}
                        />
                        <ShootingStars
                            minSpeed={12}
                            maxSpeed={30}
                            minDelay={300}
                            maxDelay={600}
                            starColor="#d4af37"
                            trailColor="#9d4edd"
                        />
                    </div>

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="mb-8">
                            <div className="flex flex-row items-center gap-2">
                                <div className="text-2xl font-serif font-bold text-white flex items-center gap-2">
                                    Choose
                                    <div className="drop-shadow-[0_0_15px_rgba(212,175,55,0.6)] group-hover:scale-120 transition-all duration-[2000ms]">
                                        <GiStarSwirl className="size-7 text-primary" />
                                    </div>
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-galactic">Star Dust</span>
                                    Amount
                                </div>
                            </div>
                            <p className="text-sm text-white/55 mt-1.5 font-sans">
                                Star Dust cosmic energy. Oracle questions, astral card generation, synastry unlocks — no subscription required. Just pure celestial insight on demand.
                            </p>
                        </div>

                        {/* 4 packages in a 2x2 grid on medium, 4 columns on large */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-8 flex-1">
                            {stardustPackages.map((pkg, idx) => {
                                const isSelected = selectedPackage === idx;

                                return (
                                    <motion.div
                                        key={idx}
                                        whileHover={{ scale: 1.05, y: -4 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => handleSelectPackage(idx)}
                                        className={`relative cursor-pointer rounded-xl transition-all duration-500 flex flex-col items-center text-center ${isSelected ? "z-10" : "z-0"}`}
                                    >
                                        {/* ── Card body ── */}
                                        <div
                                            className={`relative w-full rounded-xl px-5 pt-6 flex flex-col items-center flex-1 transition-all duration-500 border ${isSelected
                                                ? "bg-gradient-to-b from-primary/[0.08] via-galactic/[0.03] to-transparent border-primary/30"
                                                : "bg-white/[0.03] border-white/[0.07] hover:border-white/15 hover:bg-white/[0.06]"
                                                }`}
                                        >
                                            {/* ── Popular badge ── */}
                                            {pkg.popular && (
                                                <Badge
                                                    className="absolute -top-3 inset-x-0 mx-auto w-max px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-lg bg-gradient-to-r from-primary to-galactic text-background"
                                                >
                                                    Best Value
                                                </Badge>
                                            )}

                                            {/* ── StarSwirl icon with radial glow ── */}
                                            <div className="relative mb-3 mt-1">
                                                {isSelected && (
                                                    <div className="absolute inset-0 rounded-full blur-lg opacity-50"
                                                        style={{ background: "radial-gradient(circle, var(--color-primary), transparent 70%)" }}
                                                    />
                                                )}
                                                <motion.div
                                                    animate={isSelected ? { scale: [1, 1.15, 1], rotate: [0, 10, -10, 0] } : {}}
                                                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                                >
                                                    <GiStarSwirl className={`size-8 transition-colors duration-300 ${isSelected ? "text-primary drop-shadow-[0_0_12px_var(--color-primary)]" : "text-white/30"}`} />
                                                </motion.div>
                                            </div>

                                            {/* ── SD Amount ── */}
                                            <div className="flex items-baseline gap-1 mb-0.5">
                                                <span className={`text-3xl font-serif font-bold transition-colors duration-300 ${isSelected ? "text-white" : "text-white/70"}`}>
                                                    {pkg.amount}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-white/35 font-mono uppercase tracking-[0.15em] mb-3">Star Dust</span>

                                            {/* ── Divider ── */}
                                            <div className={`w-full h-px mb-3 transition-all duration-500 ${isSelected ? "bg-gradient-to-r from-transparent via-primary/30 to-transparent" : "bg-white/[0.06]"}`} />

                                            {/* ── Price block ── */}
                                            {/* Strikethrough above for discounted */}
                                            {pkg.originalPrice && (
                                                <div className="text-xs font-mono text-white/30 line-through mb-1">
                                                    {pkg.originalPrice}
                                                </div>
                                            )}

                                            {/* Actual price */}
                                            <div
                                                className={`text-4xl font-serif tracking-tight transition-all duration-300 ${isSelected
                                                    ? "bg-clip-text text-transparent bg-gradient-to-b from-primary to-galactic drop-shadow-[0_0_20px_var(--color-primary)]"
                                                    : "text-white/90"
                                                    }`}
                                            >
                                                {pkg.price}
                                            </div>

                                            {/* ── Discount pill badge ── */}
                                            {pkg.discount ? (
                                                <div className={`mt-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-300 ${isSelected
                                                    ? "bg-gradient-to-r from-primary/20 to-galactic/20 border border-primary/30 text-primary"
                                                    : "bg-white/[0.05] border border-white/10 text-white/40"
                                                    }`}>
                                                    {pkg.discount}
                                                </div>
                                            ) : (
                                                <div className="mt-3 px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-[0.12em] text-white/15 select-none">
                                                    &nbsp;
                                                </div>
                                            )}


                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Purchase button */}
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className="relative w-full py-4 px-5 text-center font-bold rounded-md uppercase tracking-widest text-xs overflow-hidden cursor-pointer bg-gradient-to-r from-primary via-primary to-galactic text-background shadow-[0_0_30px_rgba(212,175,55,0.3),0_0_60px_rgba(157,78,221,0.15)]"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                <Zap className="w-4 h-4" />
                                Purchase {stardustPackages[selectedPackage].amount} Star Dust
                            </span>
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
