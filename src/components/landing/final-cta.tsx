"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GiAstrolabe, GiCursedStar, GiStarsStack } from "react-icons/gi";
import { ArrowRight } from "lucide-react";
import {
    TbArrowRight, TbCheck
} from "react-icons/tb";

const STEPS = [
    {
        number: "01",
        title: "Cast Your Birth Chart",
        description: "Enter your birth details. We calculate your complete chart with astronomical-grade precision using real ephemeris data — not approximations.",
        icon: GiAstrolabe,
        href: "/onboarding",
        color: "var(--sun)",
    },
    {
        number: "02",
        title: "Explore the Sky",
        description: "Dive into the Celestial Archive. Learn your signs, track live planetary transits, read horoscopes written from real astronomical positions.",
        icon: GiStarsStack,
        href: "/learn",
        color: "var(--venus)",
    },
    {
        number: "03",
        title: "Ask the Oracle",
        description: "Your personal AI astrologer that knows your chart, tracks current transits, and remembers every conversation. Ask it anything.",
        icon: GiCursedStar,
        href: "/oracle",
        color: "var(--galactic)",
    },
];

const BENEFITS = [
    "No generic horoscopes — everything is calculated from real astronomical data",
    "AI that actually understands astrology, not just pattern-matching text",
    "Your birth chart becomes the lens for every reading and conversation",
    "Free to start. No credit card required.",
];

export function FinalCTA() {
    return (
        <section className="relative w-full overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12 md:mb-16"
            >
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary/60 block mb-4">
                    How It Works
                </span>
                <h2 className="text-3xl md:text-5xl font-serif text-foreground tracking-tight">
                    Three Steps to <span className="text-primary">Clarity</span>
                </h2>
            </motion.div>

            {/* Steps */}
            <div className="max-w-4xl mx-auto space-y-0 mb-16 md:mb-20">
                {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    return (
                        <motion.div
                            key={step.number}
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.6, delay: i * 0.15 }}
                        >
                            <Link
                                href={step.href}
                                className="group flex items-start gap-6 md:gap-10 py-8 md:py-10 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.01] transition-colors px-2"
                            >
                                {/* Number */}
                                <div className="shrink-0 w-12 md:w-16 flex flex-col items-center">
                                    <span
                                        className="font-mono text-2xl md:text-3xl font-bold transition-colors duration-500"
                                        style={{ color: `${step.color}60` }}
                                    >
                                        {step.number}
                                    </span>
                                </div>

                                {/* Icon */}
                                <div
                                    className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-md flex items-center justify-center border transition-all duration-500 group-hover:scale-110"
                                    style={{
                                        borderColor: `${step.color}20`,
                                        background: `${step.color}08`,
                                    }}
                                >
                                    <Icon className="w-6 h-6" style={{ color: step.color }} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl md:text-2xl font-serif text-white/90 group-hover:text-white transition-colors mb-2">
                                        {step.title}
                                    </h3>
                                    <p className="text-sm text-white/50 font-sans leading-relaxed max-w-lg">
                                        {step.description}
                                    </p>
                                </div>

                                {/* Arrow */}
                                <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-1">
                                    <TbArrowRight className="w-5 h-5" style={{ color: step.color }} />
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
            </div>

            {/* Final CTA Block */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="max-w-3xl mx-auto text-center"
            >
                {/* Benefits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10 text-left">
                    {BENEFITS.map((benefit, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
                            className="flex items-start gap-3"
                        >
                            <TbCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm text-white/50 font-sans">{benefit}</span>
                        </motion.div>
                    ))}
                </div>

                {/* Big CTA */}
                <div className="space-y-4">
                    <Button
                        size="xl"
                        asChild
                        className="group font-serif uppercase tracking-widest text-lg px-12 py-7 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
                    >
                        <Link href="/onboarding" className="flex items-center gap-3">
                            <GiAstrolabe className="size-6 transition-transform group-hover:rotate-180 duration-700" />
                            <span>Cast Your Birth Chart — Free</span>
                            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1 duration-300" />
                        </Link>
                    </Button>
                    <p className="text-xs text-white/30 font-mono">
                        No credit card. No signup required to explore.
                    </p>
                </div>
            </motion.div>
        </section>
    );
}
