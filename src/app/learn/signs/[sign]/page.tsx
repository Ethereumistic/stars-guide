"use client";

import { ZODIAC_SIGNS, getZodiacSignByName, ElementType } from "@/utils/zodiac";
import { ShootingStars } from "@/components/hero/shooting-stars";
import { StarsBackground } from "@/components/hero/stars-background";
import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { useRef } from "react";
import {
    TbArrowNarrowLeft,
    TbSparkles,
    TbActivity,
    TbFlame,
    TbDroplet,
    TbWind,
    TbMountain,
    TbCompass
} from "react-icons/tb";

const ELEMENT_DATA: Record<ElementType, { icon: any; color: string; desc: string; keywords: string[] }> = {
    Fire: {
        icon: TbFlame,
        color: "text-orange-400",
        desc: "The Fire element represents vital force, inspiration, and the spark of creation. It is the energy that drives us to act and pursue our passions.",
        keywords: ["Dynamic", "Inspiring", "Passionate", "Active"]
    },
    Earth: {
        icon: TbMountain,
        color: "text-emerald-400",
        desc: "The Earth element provides the grounding force and physical manifestation. it is the builder of the zodiac, focused on stability and practical results.",
        keywords: ["Grounded", "Practical", "Resilient", "Physical"]
    },
    Air: {
        icon: TbWind,
        color: "text-sky-300",
        desc: "The Air element governs communication, intellect, and social connection. It is the realm of ideas, theories, and the abstract mind.",
        keywords: ["Intellectual", "Social", "Adaptable", "Communicative"]
    },
    Water: {
        icon: TbDroplet,
        color: "text-cyan-400",
        desc: "The Water element symbolizes the world of emotions, intuition, and the subconscious. It is the fluid energy of feeling and deep memory.",
        keywords: ["Intuitive", "Emotional", "Nurturing", "Deep"]
    }
};

export default function SignDetailPage() {
    const params = useParams();
    const signId = params.sign as string;

    const sign = ZODIAC_SIGNS.find(s => s.id === signId);

    if (!sign) {
        return notFound();
    }

    const element = ELEMENT_DATA[sign.element as ElementType];
    const ElementIcon = element.icon;
    const containerRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const iconY = useTransform(scrollYProgress, [0, 1], [0, -100]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    return (
        <div ref={containerRef} className="relative min-h-[200vh] w-full  text-foreground selection:bg-primary/30 overflow-x-hidden">
            {/* Immersive Background */}
            <div className="fixed inset-0 z-0">
                <StarsBackground className="" />
                <ShootingStars />
                <div className="absolute inset-0 bg-radial-[circle_at_50%_40%] from-primary/5 via-transparent to-background" />

                {/* Large Background Constellation */}
                <motion.div
                    style={{ y: iconY, opacity }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.08] transition-colors pointer-events-none"
                >
                    <img
                        src={sign.constellation}
                        alt={`${sign.name} constellation`}
                        className="w-[120rem] h-[120rem] object-contain "
                    />
                    <div className={`absolute inset-0 blur-[120px] opacity-30 ${element.color.replace('text', 'bg')} rounded-full`} />
                </motion.div>
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 p-8 flex justify-between items-center mix-blend-difference">
                <Link
                    href="/learn2/signs"
                    className="group flex items-center gap-2 text-white/60 hover:text-white transition-colors uppercase font-mono text-[10px] tracking-[0.3em]"
                >
                    <TbArrowNarrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Archive
                </Link>
                <div className="flex items-center gap-2 text-primary">
                    <TbCompass className="w-5 h-5 animate-spin-slow" />
                </div>
            </nav>

            <main className="relative z-10 w-full pt-[35vh]">
                {/* Hero Section */}
                <div className="container mx-auto px-6 mb-64">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col items-center text-center space-y-8"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5, type: "spring" }}
                            className={`w-24 h-24 rounded-full border border-white/10 bg-white/5 flex items-center justify-center backdrop-blur-xl ${element.color}`}
                        >
                            <sign.icon className="w-12 h-12" />
                        </motion.div>

                        <div className="space-y-2">
                            <motion.h1
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-8xl md:text-[12rem] font-serif tracking-tighter text-white leading-none"
                            >
                                {sign.name}
                            </motion.h1>
                            <p className="text-primary font-mono tracking-[0.5em] uppercase text-sm md:text-base">
                                {sign.dates}
                            </p>
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="flex items-center gap-4 text-white/40 uppercase font-mono text-xs tracking-widest"
                        >
                            <span>Modality: Cardinal</span>
                            <span className="text-primary/20">/</span>
                            <span>Element: {sign.element}</span>
                            <span className="text-primary/20">/</span>
                            <span>Ruler: Mars</span>
                        </motion.div>
                    </motion.div>
                </div>

                {/* Content Sections */}
                <div className="max-w-4xl mx-auto px-6 space-y-64 pb-64">
                    {/* The Essence */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className="space-y-8"
                        >
                            <div className="space-y-4">
                                <h2 className="text-4xl font-serif text-white italic">The Essence</h2>
                                <div className="h-px w-24 bg-primary/30" />
                            </div>
                            <p className="text-xl text-muted-foreground leading-relaxed font-sans">
                                {sign.traits} Each soul born under the sign of {sign.name} carries a unique celestial bluepint that dictates their interaction with the physical and spiritual realms.
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-2 gap-4">
                            {element.keywords.map((word, i) => (
                                <motion.div
                                    key={word}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    viewport={{ once: true }}
                                    className="p-6 bg-white/2 border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-colors"
                                >
                                    <TbSparkles className={`w-4 h-4 mb-3 opacity-20 group-hover:opacity-100 transition-opacity ${element.color}`} />
                                    <span className="text-xs uppercase tracking-widest text-white/60 font-mono">{word}</span>
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    {/* Element Deep Dive */}
                    <section className="relative p-12 lg:p-24 rounded-[3rem] overflow-hidden">
                        <div className="absolute inset-0 bg-white/2 border border-white/5 backdrop-blur-3xl -z-10" />
                        <div className={`absolute -top-24 -right-24 w-96 h-96 blur-[120px] opacity-20 ${element.color.replace('text', 'bg')}`} />

                        <div className="relative z-10 flex flex-col md:flex-row gap-16 items-center">
                            <div className={`w-32 h-32 rounded-3xl flex items-center justify-center text-5xl shrink-0 ${element.color} bg-white/5`}>
                                <ElementIcon className="w-16 h-16 animate-pulse" />
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-sm font-mono text-primary uppercase tracking-[0.4em]">Elementary Influence</h3>
                                <h2 className="text-5xl font-serif text-white tracking-tight">The Path of {sign.element}</h2>
                                <p className="text-lg text-muted-foreground/80 leading-relaxed max-w-2xl">
                                    {element.desc}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Stats/Archetype Section */}
                    <section className="space-y-12">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <TbActivity className="text-primary w-8 h-8 opacity-20" />
                            <h2 className="text-4xl font-serif text-white tracking-wide">Cosmic Profile</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { label: "Spirit", value: "Pioneer", desc: "Always seeks the next horizon." },
                                { label: "Shadow", value: "Impatience", desc: "Must learn the art of stillness." },
                                { label: "Power", value: "Regeneration", desc: "Infinite capacity for new beginnings." }
                            ].map((trait, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    className="p-8 border-l border-primary/20 bg-linear-to-b from-primary/5 to-transparent space-y-4"
                                >
                                    <span className="text-[10px] uppercase font-mono text-primary tracking-[0.3em] font-bold">{trait.label}</span>
                                    <h4 className="text-2xl font-serif text-white">{trait.value}</h4>
                                    <p className="text-sm text-muted-foreground">{trait.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Next/Prev Sign Footer */}
                <section className="container mx-auto px-6 py-32 border-t border-white/5">
                    <div className="flex flex-col items-center gap-12 text-center">
                        <TbSparkles className="text-primary/40 w-10 h-10" />
                        <h2 className="text-4xl font-serif text-white italic">Continue your journey</h2>

                        <div className="flex flex-wrap justify-center gap-4">
                            {ZODIAC_SIGNS.filter(s => s.id !== signId).slice(0, 4).map(s => (
                                <Link
                                    key={s.id}
                                    href={`/learn2/signs/${s.id}`}
                                    className="px-6 py-4 rounded-full border border-white/10 bg-white/5 hover:border-primary/50 transition-all duration-500 group"
                                >
                                    <span className="text-sm font-sans text-white/60 group-hover:text-primary transition-colors">{s.name} →</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <style jsx global>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}</style>
        </div>
    );
}
