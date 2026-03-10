"use client";

import { motion, AnimatePresence, useInView } from "motion/react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { PricingPlan, IconMap } from "./pricing-data";
import { useState, useRef, useEffect } from "react";
import { StarsBackground } from "@/components/hero/stars-background";
import { ShootingStars } from "@/components/hero/shooting-stars";
import { Button } from "../ui/button";

interface PricingCardProps {
    plan: PricingPlan;
    index: number;
    isYearly: boolean;
}

export function PricingCard({ plan, index, isYearly }: PricingCardProps) {
    const isPopular = plan.tier === "popular";
    const isPremium = plan.tier === "premium";
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

    const Icon = IconMap[plan.icon];
    const ui = plan.ui;

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 + index * 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={`relative group hover:z-50 rounded-3xl h-full flex flex-col ${isPopular ? " z-10" : "z-0"}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Outline Glow - constantly radiating, more intense on hover */}
            <div
                className="absolute inset-0 -z-10 rounded-3xl opacity-15 group-hover:opacity-35 transition-opacity duration-1000 blur-xl group-hover:blur-2xl"
                style={{ backgroundColor: ui.glowColor }}
            />

            {/* Main Card */}
            <div
                className={`relative py-8 px-8  flex flex-col h-full bg-background/85 backdrop-blur-2xl rounded-md z-0 overflow-hidden shadow-2xl transition-transform duration-1000  border ${ui.borderColor}`}
            >

                <div className="absolute  inset-0 z-0 overflow-hidden rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <StarsBackground
                        starDensity={0.0002}
                        allStarsTwinkle={true}
                        twinkleProbability={0.8}
                        minTwinkleSpeed={0.3}
                        maxTwinkleSpeed={1.2}
                    />
                    {isPopular && (
                        <ShootingStars
                            minSpeed={15}
                            maxSpeed={35}
                            minDelay={200}
                            maxDelay={300}
                            starColor="#d4af37"
                            trailColor="#8b7355"
                        />
                    )}
                    {isPremium && (
                        <ShootingStars
                            minSpeed={15}
                            maxSpeed={35}
                            minDelay={200}
                            maxDelay={300}
                            starColor="#9d4edd"
                            trailColor="#9d4edd"
                        />
                    )}

                </div>

                <AnimatePresence>
                    {showGlare && (
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

                {/* Inner subtle glow/backdrop from the previous sign-card-like layer */}
                <div
                    className="absolute inset-0 backdrop-blur-[0.5px] pointer-events-none -z-10"
                    style={{
                        background: `linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.005) 100%)`
                    }}
                />

                <div className="flex-1 z-10 space-y-4">
                    <div className=" flex items-center gap-3">
                        {Icon && (
                            <div className={`${ui.iconColor} ${ui.iconGlowColor} ${ui.iconAnimate} `}>
                                <Icon className="size-10" />
                            </div>
                        )}
                        <h3 className={`text-3xl font-serif text-nowrap font-bold ${ui.titleColorClass}`}>
                            {plan.name}
                        </h3>
                    </div>

                    <div className="my-4 p-2">
                        <div className="flex items-baseline gap-2">
                            <span
                                className={`text-2xl font-serif tracking-tight text-white/40 line-through mr-1 transition-all duration-500 ease-out ${isYearly && plan.price.yearlyMonthly !== plan.price.monthly ? "opacity-100 max-w-20 translate-x-0" : "opacity-0 max-w-0 translate-x-4 overflow-hidden"}`}
                            >
                                {plan.price.monthly}
                            </span>
                            <span className="text-5xl font-serif tracking-tight text-white">
                                {isYearly ? plan.price.yearlyMonthly : plan.price.monthly}
                            </span>
                            {plan.price.monthly !== "€0" && <span className="text-muted-foreground">/{isYearly ? "mo" : "mo"}</span>}
                        </div>
                        <p className="text-sm font-mono text-muted-foreground mt-2">
                            {isYearly ? plan.setup.yearly : plan.setup.monthly}
                        </p>
                    </div>

                    {/* <p className="p-2 text-sm text-white/80 leading-relaxed min-h-[40px]">{plan.description}</p> */}

                    <div className="h-px w-full bg-linear-to-r from-transparent via-white/10 to-transparent my-4" />

                    <ul className="space-y-4 p-2">
                        {plan.features.map((feature, i) => (
                            <li key={i} className={`flex items-start gap-4 ${!feature.included && 'opacity-60'}`}>
                                {feature.included ? (
                                    <div className={`mt-0.5 rounded-full p-1 border ${isPopular ? "border-primary/20 bg-primary/10 text-primary" :
                                        isPremium ? "border-galactic/20 bg-galactic/10 text-galactic" :
                                            "border-white/10 bg-white/5 text-white/80"
                                        }`}>
                                        <Check className="w-3 h-3" />
                                    </div>
                                ) : (
                                    <div className="mt-0.5 rounded-full p-1 text-slate-500/30">
                                        <X className="w-3 h-3" strokeWidth={2.5} />
                                    </div>
                                )}
                                <span className={`text-sm tracking-wide ${feature.included ? 'text-white/90' : 'text-slate-500/50 line-through'}`}>
                                    {feature.text}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-8  z-10 transition-transform duration-300 group-hover:-translate-y-1">
                    <Link href={plan.href} className={`w-full ${ui.buttonGlowColor} relative inline-flex group/btn items-center justify-center p-px mb-2 overflow-hidden text-sm font-medium rounded-xl`}>
                        {isPopular ? (
                            <Button size="xl" variant="default" className="w-full uppercase font-serif font-bold">
                                {plan.cta}
                            </Button>
                        ) : isPremium ? (
                            <Button size="xl" variant="galactic" className="w-full uppercase font-serif font-bold">
                                {plan.cta}
                            </Button>
                        ) : (
                            <Button size="xl" variant="outline" className="w-full uppercase font-serif font-bold hover:text-white">
                                {plan.cta}
                            </Button>
                        )}
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
