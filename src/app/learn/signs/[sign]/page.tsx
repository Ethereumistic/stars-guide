"use client";

import { ZODIAC_SIGNS, ElementType, ELEMENT_STYLES, SIGN_EXTENDED_DATA, ELEMENT_CONTENT } from "@/utils/zodiac";
import { ShootingStars } from "@/components/hero/shooting-stars";
import { StarsBackground } from "@/components/hero/stars-background";
import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { useRef } from "react";
import {
    TbSparkles,
    TbActivity,
    TbArrowLeft,
    TbCompass,
    TbMoon,
    TbSun,
    TbTriangleSquareCircle,
    TbIcons
} from "react-icons/tb";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function SignDetailPage() {
    const params = useParams();
    const signId = params.sign as string;

    const sign = ZODIAC_SIGNS.find(s => s.id === signId);
    const extended = SIGN_EXTENDED_DATA[signId];

    if (!sign || !extended) {
        return notFound();
    }

    const element = ELEMENT_CONTENT[sign.element as ElementType];
    const styles = ELEMENT_STYLES[sign.element as ElementType];
    const containerRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

    return (
        <div ref={containerRef} className="relative min-h-[400vh] w-full text-foreground selection:bg-primary/30 overflow-x-hidden">
            {/* Ambient Background Layer */}
            <div className="fixed inset-0 z-0">
                <StarsBackground />
                <ShootingStars />
                <div
                    className="absolute inset-0 opacity-20 transition-colors duration-1000"
                    style={{
                        background: `radial-gradient(circle at 50% 50%, ${styles.glow} 0%, transparent 70%)`
                    }}
                />
            </div>

            <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 md:pt-32 pb-32">
                {/* Breadcrumbs */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <Breadcrumb className="mb-12 md:mb-20">
                        <BreadcrumbList className="text-primary/60">
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild className="hover:text-primary transition-colors font-mono text-[10px] uppercase tracking-[0.2em]">
                                    <Link href="/learn">Archive</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="opacity-20">/</BreadcrumbSeparator>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild className="hover:text-primary transition-colors font-mono text-[10px] uppercase tracking-[0.2em]">
                                    <Link href="/learn/signs">Signs</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="opacity-20">/</BreadcrumbSeparator>
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-primary font-mono text-[10px] uppercase tracking-[0.2em]">{sign.name}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </motion.div>

                {/* Hero Section: Split Layout */}
                <motion.section
                    style={{ opacity: heroOpacity, scale: heroScale }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center mb-64"
                >
                    {/* Left Side: Constellation */}
                    <motion.div
                        initial={{ opacity: 0, x: -100, rotate: -5 }}
                        animate={{ opacity: 1, x: 0, rotate: 0 }}
                        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                        className="relative aspect-square flex items-center justify-center p-8 md:p-16"
                    >
                        <div
                            className="absolute inset-0 blur-[100px] opacity-20 rounded-full"
                            style={{ backgroundColor: styles.glow }}
                        />
                        <img
                            src={sign.constellation}
                            alt={`${sign.name} Constellation`}
                            className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                        />

                        {/* Decorative Rings */}
                        <div className="absolute inset-0 border border-white/5 rounded-full scale-110 pointer-events-none" />
                        <div className="absolute inset-0 border border-white/5 rounded-full scale-125 opacity-50 pointer-events-none" />
                    </motion.div>

                    {/* Right Side: Fundamental Info */}
                    <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                        className="space-y-12"
                    >
                        <div className="space-y-4">
                            <div className="flex items-center gap-6 md:gap-8">
                                <h1 className="text-7xl md:text-9xl font-serif text-white tracking-tighter leading-none">
                                    {sign.name}
                                </h1>
                                <motion.div
                                    className="p-3 md:p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl h-fit"
                                    style={{ color: styles.primary }}
                                >
                                    <sign.icon className="w-10 h-10 md:w-16 md:h-16" />
                                </motion.div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <p className="text-2xl font-serif italic text-primary/80">
                                    {sign.dates}
                                </p>
                                <p className="text-sm font-mono uppercase tracking-[0.3em] text-white/40">
                                    &quot;{extended.motto}&quot;
                                </p>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-8 border-t border-white/10 pt-12">
                            {[
                                { label: "Element", value: sign.element, icon: TbIcons, subValue: "" },
                                { label: "Modality", value: extended.modality, icon: TbTriangleSquareCircle, subValue: "" },
                                { label: "Ruling Planet", value: extended.ruler, icon: TbSparkles, subValue: extended.rulerSymbol },
                                { label: "Celestial House", value: extended.house, icon: TbCompass, subValue: "" },
                            ].map((item, idx) => (
                                <div key={idx} className="space-y-2">
                                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                                        <item.icon className="w-3 h-3" /> {item.label}
                                    </span>
                                    <p className="text-xl font-serif text-white flex items-center gap-3">
                                        {item.value}
                                        {item.subValue && (
                                            <span className="text-2xl opacity-50 font-sans">{item.subValue}</span>
                                        )}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-6">
                            <h3 className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">The Essence</h3>
                            <p className="text-lg text-muted-foreground/90 leading-relaxed font-sans max-w-xl">
                                {extended.essenceFull}
                            </p>
                        </div>
                    </motion.div>
                </motion.section>

                {/* Detailed Sections */}
                <div className="space-y-64 pb-64">
                    {/* Elemental Deep Dive */}
                    <section className="relative p-12 lg:p-24 rounded-[4rem] overflow-hidden">
                        {/* Background Glass and Glow */}
                        <div className="absolute inset-0 bg-white/2 border border-white/5 backdrop-blur-2xl -z-10" />
                        <div
                            className="absolute -top-32 -right-32 w-[600px] h-[600px] blur-[150px] opacity-10"
                            style={{ backgroundColor: styles.glow }}
                        />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <span className="font-mono text-xs uppercase tracking-[0.5em] text-primary/60">Elemental Resonance</span>
                                    <h2 className="text-5xl md:text-7xl font-serif text-white italic">The Path of {sign.element}: {extended.elementalTitle}</h2>
                                </div>
                                <div className="space-y-6">
                                    <p className="text-xl text-muted-foreground/80 leading-relaxed max-w-xl">
                                        {element.desc}
                                    </p>
                                    <div className="space-y-4 max-w-xl border-l-2 border-primary/30 pl-6 py-2">
                                        <p className="text-lg text-primary/80 italic font-serif leading-relaxed">
                                            &quot;{extended.elementalInsight}&quot;
                                        </p>
                                        <div className="space-y-1">
                                            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/40">Eternal Path</span>
                                            <p className="text-sm text-muted-foreground/70 leading-relaxed">
                                                {extended.elementalPath}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-4 pt-4">
                                    {element.keywords.map(word => (
                                        <span key={word} className="px-5 py-2 rounded-full border border-white/10 bg-white/5 text-[10px] font-mono uppercase tracking-widest text-white/60">
                                            {word}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="relative aspect-square flex items-center justify-center overflow-hidden"
                            >
                                <img
                                    src={sign.frame}
                                    className="w-full h-full object-contain opacity-40 animate-spin-slow"
                                    alt=""
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div
                                        className="w-48 h-48 rounded-full blur-[80px] opacity-30"
                                        style={{ backgroundColor: styles.glow }}
                                    />
                                    <TbSparkles className="w-16 h-16 text-white/20 relative z-10" />
                                </div>
                            </motion.div>
                        </div>
                    </section>

                    {/* Cosmic Archetype and Traits */}
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Archetype Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="lg:col-span-2 p-12 rounded-[3rem] bg-white/3 border border-white/5 flex flex-col justify-between"
                        >
                            <div className="space-y-6">
                                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary/60">Manifestation</span>
                                <h2 className="text-6xl font-serif text-white">{extended.archetype}</h2>
                                <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                                    {extended.insight}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mt-16 pt-12 border-t border-white/5">
                                <div className="space-y-2">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Core Desire</span>
                                    <p className="text-lg font-serif text-white">{extended.coreDesire}</p>
                                </div>
                                <div className="space-y-2">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Primary Goal</span>
                                    <p className="text-lg font-serif text-white">{extended.goal}</p>
                                </div>
                                <div className="space-y-2">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Dominant Fear</span>
                                    <p className="text-lg font-serif text-white">{extended.greatestFear}</p>
                                </div>
                                <div className="space-y-2">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Special Talent</span>
                                    <p className="text-lg font-serif text-white">{extended.talent}</p>
                                </div>
                                <div className="space-y-2">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Polarity</span>
                                    <p className="text-lg font-serif text-white">{extended.polarity}</p>
                                </div>
                                <div className="space-y-2">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Celestial Stone</span>
                                    <p className="text-lg font-serif text-white">{extended.stone}</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Personality Traits List */}
                        <div className="space-y-8">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="p-8 rounded-[2rem] bg-linear-to-b from-white/5 to-transparent border-l-2 border-primary/20"
                            >
                                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-6 block">Impact Strategy</span>
                                <p className="text-lg font-serif text-white/80 leading-relaxed">
                                    {extended.strategy}
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                                className="p-8 rounded-[2rem] bg-linear-to-b from-white/2 to-transparent border-l-2 border-white/10"
                            >
                                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 mb-6 block">Intrinsic Weakness</span>
                                <p className="text-lg font-serif text-white/50 leading-relaxed">
                                    {extended.weakness}
                                </p>
                            </motion.div>
                        </div>
                    </section>
                </div>

                {/* Next/Prev Sign Footer */}
                <section className="container mx-auto px-6 pt-32 border-t border-white/5">
                    <div className="flex flex-col items-center gap-12 text-center">
                        <TbSparkles className="text-primary/40 w-8 h-8 md:w-10 md:h-10" />
                        <h2 className="text-4xl md:text-5xl font-serif text-white italic">Continue through the Archive</h2>

                        <div className="flex flex-wrap justify-center gap-4">
                            {ZODIAC_SIGNS.filter(s => s.id !== signId).slice(0, 4).map(s => (
                                <Link
                                    key={s.id}
                                    href={`/learn/signs/${s.id}`}
                                    className="px-6 md:px-8 py-4 md:py-5 rounded-full border border-white/10 bg-white/5 hover:border-primary/50 hover:bg-white/8 transition-all duration-500 group"
                                >
                                    <span className="text-sm font-sans tracking-wide text-white/60 group-hover:text-primary transition-colors">{s.name} →</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            <style jsx global>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 20s linear infinite;
                }
            `}</style>
        </div>
    );
}
