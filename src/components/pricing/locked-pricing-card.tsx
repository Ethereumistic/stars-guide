"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { StarsBackground } from "@/components/hero/stars-background";
import { ShootingStars } from "@/components/hero/shooting-stars";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPlanByTier, IconMap } from "./pricing-data";

interface LockedPricingCardProps {
    requiredTier: "popular" | "premium";
}

export function LockedPricingCard({ requiredTier }: LockedPricingCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isYearly, setIsYearly] = useState(false);

    const plan = getPlanByTier(requiredTier);
    if (!plan) return null;

    const Icon = IconMap[plan.icon];
    const { ui } = plan;
    const isPopular = requiredTier === "popular";
    const billingValue = isYearly ? "yearly" : "monthly";

    return (
        <div
            className="relative group rounded-md min-h-134 flex flex-col items-center justify-center p-6 overflow-hidden border"
            style={{ borderColor: isPopular ? "rgba(212, 175, 55, 0.6)" : "rgba(138, 43, 226, 0.6)" }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className="absolute inset-0 -z-10 rounded-md opacity-15 group-hover:opacity-35 transition-opacity duration-1000 blur-xl group-hover:blur-2xl"
                style={{ backgroundColor: ui.glowColor }}
            />

            <div className="absolute inset-0 z-0 overflow-hidden rounded-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
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
                    starColor={ui.starColor}
                    trailColor={ui.trailColor}
                />
            </div>

            <AnimatePresence>
                {isHovered && (
                    <motion.div
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
                                background: `linear-gradient(135deg, transparent 0%, transparent 40%, ${ui.diagonalGlareColor} 50%, transparent 60%, transparent 100%)`,
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute inset-0 backdrop-blur-[0.5px] pointer-events-none -z-10" />

            <div className="relative z-10 flex flex-col items-center text-center w-full max-w-sm space-y-5">
                {/* Tabs on top, centered, smaller */}
                <Tabs
                    value={billingValue}
                    onValueChange={(value) => setIsYearly(value === "yearly")}
                    className="w-auto"
                >
                    <TabsList className="">
                        <TabsTrigger
                            value="monthly"
                            className="relative w-20 text-center px-2 py-1.5 text-xs font-medium data-[state=active]:text-white text-white/60 hover:text-white  data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                        >
                            Monthly
                        </TabsTrigger>
                        <TabsTrigger
                            value="yearly"
                            className="relative w-20 text-center px-2 py-1.5 text-xs font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                        >
                            Yearly
                            <span className={`absolute -top-2 -right-1 ${isPopular ? "bg-primary" : "bg-galactic text-white"} text-[#0A0F1A] text-[9px] font-bold px-1.5 py-0.5 rounded-full rotate-3 shadow-md`}>
                                -44%
                            </span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Icon and title - stacked on mobile, row on desktop */}
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                    <div className={`${ui.iconColor} ${ui.iconGlowColor} ${ui.iconAnimate}`}>
                        <Icon className="size-10 sm:size-14" />
                    </div>
                    <h3 className={`text-3xl sm:text-4xl font-serif font-bold ${ui.titleColorClass}`}>
                        {plan.name}
                    </h3>
                </div>

                {/* <p className="text-sm text-white/80 leading-relaxed">{plan.description}</p> */}

                {/* Price and billing info on single row */}
                <div className="flex flex-col items-center gap-1 mb-1">
                    <div className="flex items-center justify-center gap-2">
                        <span
                            className={`text-2xl font-serif tracking-tight text-white/40 line-through mr-1 transition-all duration-500 ease-out ${isYearly ? "opacity-100 max-w-20 translate-x-0" : "opacity-0 max-w-0 translate-x-4 overflow-hidden"}`}
                        >
                            {plan.price.monthly}
                        </span>
                        <span className="text-5xl font-serif tracking-tight text-white">
                            {isYearly ? plan.price.yearlyMonthly : plan.price.monthly}
                        </span>
                        <span className="text-muted-foreground">/mo</span>
                    </div>
                    <p className="text-sm font-mono text-muted-foreground">
                        {isYearly ? plan.setup.yearly : plan.setup.monthly}
                    </p>
                </div>

                <div className="h-px w-full bg-linear-to-r from-transparent via-white/10 to-transparent my-1" />

                <ul className="space-y-3 p-2 w-full max-w-xs">
                    {plan.features.map((feature, i) => (
                        <li key={i} className={`flex items-start gap-3 ${!feature.included && "opacity-60"}`}>
                            {feature.included ? (
                                <div className={`mt-0.5 rounded-full p-1 border ${isPopular ? "border-primary/20 bg-primary/10 text-primary" : "border-galactic/20 bg-galactic/10 text-galactic"}`}>
                                    <Check className="w-3 h-3" />
                                </div>
                            ) : (
                                <div className="mt-0.5 rounded-full p-1 text-slate-500/30">
                                    <X className="w-3 h-3" strokeWidth={2.5} />
                                </div>
                            )}
                            <span className={`text-sm tracking-wide ${feature.included ? "text-white/90" : "text-slate-500/50 line-through"}`}>
                                {feature.text}
                            </span>
                        </li>
                    ))}
                </ul>

                <div className="mt-8 z-10 transition-transform duration-300 group-hover:-translate-y-1">
                    <Link href={plan.href} className={`w-full ${ui.buttonGlowColor} transition-all duration-300 relative inline-flex group/btn items-center justify-center p-px mb-2 overflow-hidden text-sm font-medium rounded-xl`}>
                        {isPopular ? (
                            <Button size="xl" variant="default" className="w-full uppercase font-serif font-bold">
                                {plan.cta}
                            </Button>
                        ) : (
                            <Button size="xl" variant="galactic" className="w-full uppercase font-serif font-bold">
                                {plan.cta}
                            </Button>
                        )}
                    </Link>
                </div>
            </div>
        </div>
    );
}
