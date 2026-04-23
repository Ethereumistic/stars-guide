"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
    GiCursedStar,
    GiStarsStack,
    GiAstrolabe,
    GiOrbital,
    GiScrollUnfurled,
    GiCrystalBall,
    GiPaintBrush,
    GiMusicalNotes,
} from "react-icons/gi";
import {
    TbArrowRight, TbBolt, TbBrain
} from "react-icons/tb";

const PILLARS = [
    {
        id: "oracle",
        title: "The Oracle",
        subtitle: "Your Personal AI Astrologer",
        description: "An AI that remembers your story, understands your transits, and responds with genuine astrological wisdom. It knows your birth chart, tracks live planetary positions, and gets smarter with every conversation.",
        icon: GiCursedStar,
        cta: "Ask the Oracle",
        href: "/oracle",
        accentColor: "var(--galactic)",
        capabilities: ["Birth chart awareness", "Transit interpretation", "Conversational memory"],
    },
    {
        id: "horoscopes",
        title: "Horoscopes",
        subtitle: "Written for Your Actual Sky",
        description: "Not recycled newspaper snippets. AI-crafted horoscopes tuned to the real planetary positions of the day — every single one calculated from live ephemeris data, not random generation.",
        icon: GiStarsStack,
        cta: "Read Today's Scope",
        href: "/horoscopes",
        accentColor: "var(--sun)",
        capabilities: ["12 zodiac signs", "Daily, weekly, monthly", "Real astronomical basis"],
    },
    {
        id: "journal",
        title: "The Journal",
        subtitle: "Your Cosmic Diary",
        description: "A living journal that asks about your day, your dreams, your feelings — and feeds that awareness back into your Oracle conversations and personal horoscopes. The more you write, the more personalized everything becomes.",
        icon: GiScrollUnfurled,
        cta: "Coming Soon",
        href: "#",
        accentColor: "var(--venus)",
        capabilities: ["Daily reflection prompts", "Dream logging", "Enriches Oracle & horoscopes"],
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
                {PILLARS.map((pillar, i) => {
                    const Icon = pillar.icon;
                    return (
                        <motion.div
                            key={pillar.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                        >
                            <Link
                                href={pillar.href}
                                className="group relative block h-full border border-white/[0.06] bg-black/30 rounded-md overflow-hidden hover:border-white/10 transition-all duration-500"
                            >
                                {/* Top accent line */}
                                <div
                                    className="absolute top-0 left-0 right-0 h-px opacity-40 group-hover:opacity-80 transition-opacity duration-500"
                                    style={{ background: pillar.accentColor }}
                                />

                                <div className="p-6 md:p-8 flex flex-col h-full">
                                    {/* Icon */}
                                    <div className="flex items-start justify-between mb-6">
                                        <div
                                            className="w-12 h-12 rounded-md flex items-center justify-center border transition-all duration-500 group-hover:scale-110"
                                            style={{
                                                borderColor: `${pillar.accentColor}30`,
                                                background: `${pillar.accentColor}08`,
                                            }}
                                        >
                                            <Icon className="w-6 h-6" style={{ color: pillar.accentColor }} />
                                        </div>
                                        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/15">
                                            {String(i + 1).padStart(2, "0")}
                                        </span>
                                    </div>

                                    <h3 className="text-2xl md:text-3xl font-serif text-white/90 group-hover:text-white transition-colors mb-1">
                                        {pillar.title}
                                    </h3>
                                    <p className="text-xs font-mono uppercase tracking-[0.2em] mb-5" style={{ color: pillar.accentColor, opacity: 0.5 }}>
                                        {pillar.subtitle}
                                    </p>

                                    <p className="text-sm text-white/50 leading-relaxed font-sans flex-1 mb-6">
                                        {pillar.description}
                                    </p>

                                    {/* Capabilities */}
                                    <div className="space-y-2 mb-6">
                                        {pillar.capabilities.map(cap => (
                                            <div key={cap} className="flex items-center gap-2">
                                                <TbBolt className="w-3 h-3 shrink-0" style={{ color: pillar.accentColor, opacity: 0.5 }} />
                                                <span className="text-[11px] text-white/40 font-sans">{cap}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* CTA */}
                                    <div className="flex items-center gap-2 text-sm font-serif group-hover:gap-3 transition-all duration-300" style={{ color: pillar.accentColor }}>
                                        <span>{pillar.cta}</span>
                                        <TbArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
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
