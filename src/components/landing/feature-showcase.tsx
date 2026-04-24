"use client";

import { motion, AnimatePresence, useInView } from "motion/react";
import Link from "next/link";
import {
    GiCursedStar,
    GiStarsStack,
    GiScrollUnfurled,
    GiAstrolabe,
    GiOrbital,
    GiCrystalBall,
    GiPaintBrush,
    GiMusicalNotes,
} from "react-icons/gi";
import {
    TbArrowRight, TbBolt, TbBrain
} from "react-icons/tb";
import { Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { StarsBackground } from "@/components/hero/stars-background";
import { ShootingStars } from "@/components/hero/shooting-stars";
import { Button } from "@/components/ui/button";

const PILLARS = [
    {
        id: "horoscopes",
        title: "Horoscopes",
        subtitle: "Written for Your Actual Sky",
        description: "Not recycled newspaper snippets. AI-crafted horoscopes tuned to the real planetary positions of the day — every single one calculated from live ephemeris data, not random generation.",
        icon: GiStarsStack,
        cta: "Read Today's Scope",
        href: "/horoscopes",
        capabilities: ["12 zodiac signs", "Daily, weekly, monthly", "Real astronomical basis"],
        ui: {
            glowColor: "rgba(212, 175, 55, 0.4)",
            borderColor: "border-primary/20",
            diagonalGlareColor: "rgba(212, 175, 55, 0.08)",
            titleColorClass: "text-primary drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]",
            iconColor: "text-primary",
            iconGlowColor: "drop-shadow-[0_0_15px_rgba(212,175,55,0.6)]",
            iconAnimate: "group-hover:rotate-45 group-hover:scale-115 transition-all duration-1500",
            buttonVariant: "default" as const,
            checkBorder: "border-primary/20 bg-primary/10 text-primary",
            starColor: "#d4af37",
            trailColor: "#8b7355",
            showShootingStars: false,
        },
    },
    {
        id: "oracle",
        title: "The Oracle",
        subtitle: "Your Personal AI Astrologer",
        description: "An AI that remembers your story, understands your transits, and responds with genuine astrological wisdom. It knows your birth chart, tracks live planetary positions, and gets smarter with every conversation.",
        icon: GiCursedStar,
        cta: "Ask the Oracle",
        href: "/oracle",
        capabilities: ["Birth chart awareness", "Transit interpretation", "Conversational memory"],
        ui: {
            glowColor: "rgba(138, 43, 226, 0.4)",
            borderColor: "border-galactic/60",
            diagonalGlareColor: "rgba(138, 43, 226, 0.08)",
            titleColorClass: "text-galactic drop-shadow-[0_0_15px_rgba(157,78,221,0.3)]",
            iconColor: "text-galactic",
            iconGlowColor: "drop-shadow-[0_0_15px_rgba(157,78,221,0.6)]",
            iconAnimate: "group-hover:rotate-[720deg] group-hover:scale-120 transition-all duration-[2000ms]",
            buttonVariant: "galactic" as const,
            checkBorder: "border-galactic/20 bg-galactic/10 text-galactic",
            starColor: "#9d4edd",
            trailColor: "#9d4edd",
            showShootingStars: true,
        },
    },
    {
        id: "journal",
        title: "The Journal",
        subtitle: "Your Cosmic Diary",
        description: "A living journal that asks about your day, your dreams, your feelings — and feeds that awareness back into your Oracle conversations and personal horoscopes. The more you write, the more personalized everything becomes.",
        icon: GiScrollUnfurled,
        cta: "Coming Soon",
        href: "#",
        capabilities: ["Daily reflection prompts", "Dream logging", "Enriches Oracle & horoscopes"],
        ui: {
            glowColor: "rgba(71, 85, 105, 0.2)",
            borderColor: "border-white/20",
            diagonalGlareColor: "rgba(255,255,255,0.06)",
            titleColorClass: "text-white",
            iconColor: "text-white",
            iconGlowColor: "drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]",
            iconAnimate: "group-hover:scale-110",
            buttonVariant: "outline" as const,
            checkBorder: "border-white/10 bg-white/5 text-white/80",
            starColor: "#ffffff",
            trailColor: "#ffffff",
            showShootingStars: false,
        },
    },
];

const SATELLITES = [
    {
        id: "chart",
        title: "Birth Chart",
        icon: GiScrollUnfurled,
        href: "/onboarding",
        color: "var(--mars)",
        desc: "Your cosmic blueprint at first breath",
    },
    {
        id: "archive",
        title: "Celestial Archive",
        icon: GiAstrolabe,
        href: "/learn",
        color: "var(--venus)",
        desc: "Signs, planets, houses, aspects decoded",
    },
    {
        id: "readings",
        title: "Deep Readings",
        icon: GiCrystalBall,
        href: "/readings",
        color: "var(--neptune)",
        desc: "Transit analysis & progressed charts",
    },
    {
        id: "engine",
        title: "Astronomical Engine",
        icon: GiOrbital,
        href: "/learn/planets",
        color: "var(--uranus)",
        desc: "Live telemetry from real ephemeris data",
    },
    {
        id: "images",
        title: "Celestial Art",
        icon: GiPaintBrush,
        href: "#",
        color: "var(--jupiter)",
        desc: "Dixit-inspired archetypal card art",
    },
    {
        id: "beats",
        title: "Binaural Beats",
        icon: GiMusicalNotes,
        href: "#",
        color: "var(--moon)",
        desc: "Frequencies tuned to signs & transits",
    },
];

function PillarCard({ pillar, index }: { pillar: typeof PILLARS[number]; index: number }) {
    const [isHovered, setIsHovered] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(cardRef, { amount: 0.8, once: false });
    const Icon = pillar.icon;
    const ui = pillar.ui;

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const showGlare = isMobile ? isInView : isHovered;

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, delay: 0.2 + index * 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative group hover:z-50 rounded-3xl h-full flex flex-col"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Outline Glow */}
            <div
                className="absolute inset-0 -z-10 rounded-3xl opacity-15 group-hover:opacity-35 transition-opacity duration-1000 blur-xl group-hover:blur-2xl"
                style={{ backgroundColor: ui.glowColor }}
            />

            {/* Main Card */}
            <div className={`relative py-8 px-8 flex flex-col h-full bg-background/85 backdrop-blur-2xl rounded-3xl z-0 overflow-hidden shadow-2xl transition-transform duration-1000 border ${ui.borderColor}`}>

                <div className="absolute inset-0 z-0 overflow-hidden rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <StarsBackground
                        starDensity={0.0002}
                        allStarsTwinkle={true}
                        twinkleProbability={0.8}
                        minTwinkleSpeed={0.3}
                        maxTwinkleSpeed={1.2}
                    />
                    {ui.showShootingStars && (
                        <ShootingStars
                            minSpeed={15}
                            maxSpeed={35}
                            minDelay={200}
                            maxDelay={300}
                            starColor={ui.starColor}
                            trailColor={ui.trailColor}
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

                {/* Inner subtle glow */}
                <div
                    className="absolute inset-0 backdrop-blur-[0.5px] pointer-events-none -z-10"
                    style={{
                        background: `linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.005) 100%)`
                    }}
                />

                <div className="flex-1 z-10 space-y-4">
                    {/* Icon + Title */}
                    <div className="flex items-center gap-3">
                        <div className={`${ui.iconColor} ${ui.iconGlowColor} ${ui.iconAnimate}`}>
                            <Icon className="size-10" />
                        </div>
                        <h3 className={`text-3xl font-serif font-bold text-nowrap ${ui.titleColorClass}`}>
                            {pillar.title}
                        </h3>
                    </div>

                    {/* Subtitle */}
                    <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground/70">
                        {pillar.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-sm text-white/60 leading-relaxed font-sans">
                        {pillar.description}
                    </p>

                    <div className="h-px w-full bg-linear-to-r from-transparent via-white/10 to-transparent my-4" />

                    {/* Capabilities */}
                    <ul className="space-y-4">
                        {pillar.capabilities.map(cap => (
                            <li key={cap} className="flex items-start gap-4">
                                <div className={`mt-0.5 rounded-full p-1 border ${ui.checkBorder}`}>
                                    <Check className="w-3 h-3" />
                                </div>
                                <span className="text-sm tracking-wide text-white/90">
                                    {cap}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* CTA Button */}
                <div className="mt-8 z-10 transition-transform duration-300 group-hover:-translate-y-1">
                    <Link href={pillar.href} className="w-full">
                        <Button
                            size="xl"
                            variant={ui.buttonVariant}
                            className="w-full uppercase font-serif font-bold hover:text-white"
                        >
                            {pillar.cta}
                        </Button>
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}

export function FeatureShowcase() {
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
                    Three Pillars
                </span>
                <h2 className="text-3xl md:text-5xl font-serif text-foreground tracking-tight">
                    Your Cosmic <span className="text-primary">Operating System</span>
                </h2>
                <p className="text-muted-foreground/70 font-sans mt-3 max-w-lg mx-auto text-sm md:text-base">
                    Three interconnected experiences. One learns who you are, one translates the sky, one remembers everything.
                </p>
            </motion.div>

            {/* 3 Pillars */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 max-w-6xl mx-auto mb-16 md:mb-20">
                {PILLARS.map((pillar, i) => (
                    <PillarCard key={pillar.id} pillar={pillar} index={i} />
                ))}
            </div>

            {/* Satellite Features */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            >
                <div className="text-center mb-8">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/20">
                        & the constellation of tools that powers it all
                    </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 max-w-5xl mx-auto">
                    {SATELLITES.map((sat, i) => {
                        const Icon = sat.icon;
                        return (
                            <motion.div
                                key={sat.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: i * 0.06 }}
                            >
                                <Link
                                    href={sat.href}
                                    className="group block border border-white/[0.04] rounded-md p-4 md:p-5 hover:border-white/[0.08] hover:bg-white/[0.02] transition-all duration-500 text-center"
                                >
                                    <div
                                        className="w-9 h-9 rounded-md flex items-center justify-center mx-auto mb-3 border transition-transform duration-500 group-hover:scale-110"
                                        style={{
                                            borderColor: `${sat.color}15`,
                                            background: `${sat.color}06`,
                                        }}
                                    >
                                        <Icon className="w-4.5 h-4.5" style={{ color: sat.color, opacity: 0.7 }} />
                                    </div>
                                    <h4 className="text-xs font-serif text-white/70 group-hover:text-white/90 transition-colors mb-1">
                                        {sat.title}
                                    </h4>
                                    <p className="text-[10px] text-white/30 font-sans leading-snug hidden md:block">
                                        {sat.desc}
                                    </p>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        </section>
    );
}