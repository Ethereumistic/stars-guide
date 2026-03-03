"use client";

import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { PricingPlan } from "./pricing-data";
import { useState } from "react";
import { StarsBackground } from "@/components/hero/stars-background";
import { ShootingStars } from "@/components/hero/shooting-stars";
import { GiPolarStar, GiBeveledStar, GiCursedStar, GiStarSwirl } from "react-icons/gi";
import { Button } from "../ui/button";

const IconMap: Record<string, React.ElementType> = {
    GiPolarStar,
    GiBeveledStar,
    GiCursedStar,
    GiStarSwirl,
};

interface PricingCardProps {
    plan: PricingPlan;
    index: number;
    isYearly: boolean;
}

export function PricingCard({ plan, index, isYearly }: PricingCardProps) {
    const isPopular = plan.role === "popular";
    const isPremium = plan.role === "premium";
    const [isHovered, setIsHovered] = useState(false);

    let glowColor = "rgba(71, 85, 105, 0.2)"; // base slate glow
    let borderColorClass = "border-white/20"; // base border
    let diagonalGlareColor = "rgba(255,255,255,0.06)";
    let titleColorClass = "text-white group-hover:text-slate-200 transition-colors";
    let iconGlowColor = "drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all duration-300";
    let buttonGlowColor = "hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] transition-all duration-300";
    let iconColor = "text-white";
    let iconAnimate = "group-hover:scale-110";

    if (isPopular) {
        glowColor = "rgba(212, 175, 55, 0.4)"; // primary/gold glow
        borderColorClass = "border-primary/60";
        diagonalGlareColor = "rgba(212, 175, 55, 0.08)";
        titleColorClass = "text-primary drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]";
        iconGlowColor = "drop-shadow-[0_0_15px_rgba(212,175,55,0.6)] transition-all duration-300";
        buttonGlowColor = "hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.3)] transition-all duration-300";
        iconColor = "text-primary";
        iconAnimate = "group-hover:rotate-45 group-hover:scale-115 transition-all duration-1500"

    } else if (isPremium) {
        glowColor = "rgba(138, 43, 226, 0.4)"; // galactic/violet glow
        borderColorClass = "border-galactic/60";
        diagonalGlareColor = "rgba(138, 43, 226, 0.08)";
        titleColorClass = "text-galactic drop-shadow-[0_0_15px_rgba(157,78,221,0.3)] group-hover:brightness-125 transition-all";
        iconGlowColor = "drop-shadow-[0_0_15px_rgba(157,78,221,0.6)] transition-all duration-300";
        buttonGlowColor = "hover:drop-shadow-[0_0_15px_rgba(138,43,226,0.6)] transition-all duration-300";
        iconColor = "text-galactic";
        iconAnimate = "group-hover:rotate-360 group-hover:scale-120 transition-all duration-2000"
    }

    const Icon = IconMap[plan.icon];

    return (
        <motion.div
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
                style={{ backgroundColor: glowColor }}
            />

            {/* Main Card */}
            <div
                className={`relative py-8 px-8  flex flex-col h-full bg-background/85 backdrop-blur-2xl rounded-3xl z-0 overflow-hidden shadow-2xl transition-transform duration-1000  border ${borderColorClass}`}
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
                                    background: `linear-gradient(135deg, transparent 0%, transparent 40%, ${diagonalGlareColor} 50%, transparent 60%, transparent 100%)`,
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
                            <div className={`${iconColor} ${iconGlowColor} ${iconAnimate} `}>
                                <Icon className="size-10" />
                            </div>
                        )}
                        <h3 className={`text-3xl font-serif text-nowrap font-bold ${titleColorClass}`}>
                            {plan.name}
                        </h3>
                    </div>

                    <div className="my-6 p-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-serif tracking-tight text-white">
                                {isYearly ? plan.price.yearly : plan.price.monthly}
                            </span>
                            {plan.price.monthly !== "€0" && <span className="text-muted-foreground">/{isYearly ? "yr" : "mo"}</span>}
                        </div>
                        <p className="text-sm font-mono text-muted-foreground mt-2">
                            {isYearly ? plan.setup.yearly : plan.setup.monthly}
                        </p>
                    </div>

                    <p className="p-2 text-sm text-white/80 leading-relaxed min-h-[40px]">{plan.description}</p>

                    <div className="h-px w-full bg-linear-to-r from-transparent via-white/10 to-transparent my-8" />

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

                <div className="mt-12  z-10 transition-transform duration-300 group-hover:-translate-y-1">
                    <Link href={plan.href} className={`w-full ${buttonGlowColor} relative inline-flex group/btn items-center justify-center p-px mb-2 overflow-hidden text-sm font-medium rounded-xl`}>
                        {isPopular ? (
                            <Button size="xl" variant="default" className="w-full uppercase font-serif font-bold ">
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
