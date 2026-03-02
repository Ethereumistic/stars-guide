"use client";

import React from "react";
import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { planetUIConfig } from "@/config/planet-ui";
import { ELEMENT_CONTENT, ElementType } from "@/astrology/elements";
import { ShootingStars } from "@/components/hero/shooting-stars";
import { StarsBackground } from "@/components/hero/stars-background";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import {
    TbSparkles,
    TbActivity,
    TbArrowLeft,
    TbCompass,
    TbTriangleSquareCircle,
    TbIcons,
    TbAtom
} from "react-icons/tb";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { GiFlame, GiStonePile, GiTornado, GiWaveCrest } from "react-icons/gi";

const HOUSE_NAMES = ["1st House", "2nd House", "3rd House", "4th House", "5th House", "6th House", "7th House", "8th House", "9th House", "10th House", "11th House", "12th House"];

const getElementIcon = (element: ElementType) => {
    switch (element) {
        case "Fire": return GiFlame;
        case "Earth": return GiStonePile;
        case "Air": return GiTornado;
        case "Water": return GiWaveCrest;
    }
};

const getStyles = (element: "Fire" | "Earth" | "Air" | "Water") => {
    const el = element.toLowerCase();
    return {
        primary: `var(--${el}-primary)`,
        secondary: `var(--${el}-secondary)`,
        glow: `var(--${el}-glow)`,
        border: `var(--${el}-border)`,
        gradient: `var(--${el}-gradient)`
    };
};

export default function SignDetailPage() {
    const params = useParams();
    const signId = params.sign as string;

    const data = compositionalSigns.find(s => s.id === signId);
    const ui = zodiacUIConfig[signId];

    if (!data || !ui) {
        return notFound();
    }

    const houseIndex = compositionalSigns.findIndex(s => s.id === signId);
    const planetUi = planetUIConfig[data.ruler];
    const element = ELEMENT_CONTENT[ui.elementName as ElementType];
    const styles = getStyles(ui.elementName);

    const Icon = ui.icon;
    const ElementIcon = getElementIcon(ui.elementName);

    return (
        <div className="relative min-h-screen w-full text-foreground overflow-x-hidden bg-background selection:bg-white/20">
            {/* Ambient Base Layer */}
            <div className="fixed inset-0 z-0 pointer-events-none contain-strict">
                <StarsBackground />
                <ShootingStars />
                <div
                    className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[120vw] h-[120vh] opacity-10 mix-blend-screen pointer-events-none blur-3xl"
                    style={{
                        background: `radial-gradient(circle at center, ${styles.primary} 0%, transparent 60%)`
                    }}
                />
            </div>

            <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12 pt-8 pb-32">
                {/* Navigation Breadcrumbs */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="flex justify-center"
                >
                    <Breadcrumb className="mb-12 md:mb-20">
                        <BreadcrumbList className="text-white/40 flex items-center space-x-2">
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild className="hover:text-white transition-colors font-mono text-[10px] uppercase tracking-[0.2em]">
                                    <Link href="/learn">Archive</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="opacity-20 mx-2">/</BreadcrumbSeparator>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild className="hover:text-white transition-colors font-mono text-[10px] uppercase tracking-[0.2em]">
                                    <Link href="/learn/signs">Signs</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="opacity-20 mx-2">/</BreadcrumbSeparator>
                            <BreadcrumbItem>
                                <BreadcrumbPage className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: styles.primary }}>
                                    {data.name} // {data.modality.toUpperCase()}
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </motion.div>

                {/* Hero Layout */}
                <section className="flex flex-col-reverse lg:grid lg:grid-cols-12 gap-16 lg:gap-24 items-center mb-32">

                    {/* Left Column: Dossier Display */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="lg:col-span-7 space-y-16 w-full"
                    >
                        {/* Title Block */}
                        <div className="text-center lg:text-left space-y-8">
                            <div className="space-y-4">
                                <h1 className="text-7xl md:text-9xl xl:text-[10rem] font-serif text-white tracking-tighter leading-none flex flex-col md:flex-row items-center lg:items-end gap-6 justify-center lg:justify-start">
                                    {data.name}
                                    <Icon className="w-16 h-16 md:w-24 md:h-24 stroke-1 opacity-80" style={{ color: styles.primary }} />
                                </h1>
                                <p className="text-2xl md:text-3xl font-serif italic text-white/60 pt-4">
                                    {data.dates}
                                </p>
                            </div>

                            <div className="flex items-center justify-center lg:justify-start gap-4">
                                <div className="h-px w-12 bg-white/20" />
                                <p className="text-xs md:text-sm font-mono uppercase tracking-[0.25em]" style={{ color: styles.primary }}>
                                    "{data.motto}"
                                </p>
                                <div className="h-px w-12 bg-white/20" />
                            </div>
                        </div>

                        {/* Props Array: Elegant separation */}
                        <div className="py-8 border-y border-white/10 flex flex-wrap justify-center lg:justify-between items-center gap-8 md:gap-12">
                            {[
                                { label: "Element", value: ui.elementName, subValue: "" },
                                { label: "Modality", value: data.modality, subValue: "" },
                                { label: "Ruler", value: data.ruler.charAt(0).toUpperCase() + data.ruler.slice(1), subValue: planetUi?.rulerSymbol || "" },
                                { label: "House", value: HOUSE_NAMES[houseIndex] || "", subValue: "" },
                            ].map((item, idx, arr) => (
                                <React.Fragment key={idx}>
                                    <div className="flex flex-col items-center space-y-3">
                                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">{item.label}</span>
                                        <p className="text-2xl font-serif text-white tracking-tight flex items-baseline gap-2">
                                            {item.value}
                                            {item.subValue && <span className="text-lg opacity-40 font-sans">{item.subValue}</span>}
                                        </p>
                                    </div>
                                    {idx !== arr.length - 1 && (
                                        <div className="hidden md:block w-1.5 h-1.5 rotate-45 border border-white/20" />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </motion.div>

                    {/* Right Column: Tarot Arch Structure (Art Nouveau style) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                        className="lg:col-span-5 w-full flex justify-center"
                    >
                        {/* Tarot Card Container */}
                        <div className="relative w-full max-w-sm aspect-2/3 p-3 flex flex-col group">
                            {/* Glow */}
                            <div
                                className="absolute inset-0 opacity-20 transition-opacity duration-1000 group-hover:opacity-40 blur-2xl rounded-t-[1000px] rounded-b-2xl"
                                style={{ background: styles.glow }}
                            />

                            {/* Outer Decorative Line */}
                            <div className="absolute inset-0 rounded-t-[1000px] rounded-b-2xl border flex items-center justify-center border-white/20 backdrop-blur-sm bg-black/40 overflow-hidden"
                                style={{
                                    boxShadow: `inset 0 0 40px rgba(0,0,0,0.8), 0 0 20px ${styles.glow}20`
                                }}>

                                {/* Inner intricate border */}
                                <div className="absolute inset-[12px] border border-white/10 outline-1 outline-offset-[6px] outline-white/5 rounded-t-[990px] rounded-b-lg flex flex-col items-center justify-center overflow-hidden">
                                    {/* Delicate mesh background */}
                                    <div className="absolute inset-0 opacity-[0.03]" style={{
                                        backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%, #fff), linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%, #fff)`,
                                        backgroundSize: `4px 4px`,
                                        backgroundPosition: `0 0, 2px 2px`
                                    }} />

                                    <img
                                        src={ui.constellationUrl}
                                        alt={`${data.name} Constellation`}
                                        className="relative z-10 w-3/4 object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] opacity-80"
                                    />

                                    {/* Card Footer typography inside arch */}
                                    <div className="absolute bottom-6 w-full px-8 flex justify-between items-center z-20">
                                        <div className="font-mono text-[9px] uppercase tracking-widest text-white/30">
                                            FIG. {houseIndex + 1}
                                        </div>
                                        <div className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: styles.primary }}>
                                            {ui.elementName}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* The Essence (Large Quote style) */}
                <motion.section
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="py-16 md:py-24 max-w-4xl mx-auto text-center space-y-12 mb-16 relative"
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10rem] font-serif leading-none h-24 text-white/5 pointer-events-none select-none">"</div>
                    <div className="flex items-center justify-center gap-4">
                        <TbAtom className="text-white/40 w-5 h-5" />
                        <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">Core Essence File</h3>
                    </div>
                    <p className="text-2xl md:text-4xl text-white/90 leading-snug font-serif italic text-pretty">
                        {data.essenceFull}
                    </p>
                    <div className="w-24 h-px bg-white/20 mx-auto" />
                </motion.section>

                {/* Archetypal Deep Dive */}
                <div className="space-y-32 mb-48">

                    {/* Archetypal Overview */}
                    <motion.section
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="relative p-8 md:p-16 border border-white/10 overflow-hidden flex flex-col md:flex-row items-center gap-12 lg:gap-24"
                    >
                        {/* Ethereal background accent */}
                        <div className="absolute top-0 right-0 bottom-0 w-1/2 opacity-5 pointer-events-none mix-blend-screen"
                            style={{ background: `radial-gradient(ellipse right, ${styles.primary} 0%, transparent 70%)` }} />

                        <div className="flex-1 space-y-6 z-10">
                            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block">Cognitive Archetype</span>
                            <h2 className="text-4xl md:text-6xl font-serif text-white tracking-tight">
                                {data.archetypeName}
                            </h2>
                            <p className="text-lg md:text-xl text-white/70 leading-relaxed font-serif">
                                {data.cognitiveInsight}
                            </p>
                        </div>

                        {/* Core Data points styled as elegant specs instead of boxes */}
                        <div className="flex-none max-w-sm w-full space-y-8 z-10 relative">
                            {/* Line decoration */}
                            <div className="absolute -left-6 top-0 bottom-0 w-px bg-white/10 hidden md:block" />

                            {[
                                { title: "Primary Goal", val: data.goal },
                                { title: "Dominant Fear", val: data.greatestFear },
                                { title: "Core Desire", val: data.coreDesire }
                            ].map((spec, i) => (
                                <div key={i} className="space-y-2">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 block">
                                        {spec.title}
                                    </span>
                                    <span className="text-xl font-serif text-white">
                                        {spec.val}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.section>

                    {/* Strengths & Weaknesses (Editorial Side-by-Side) */}
                    <motion.section
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 relative"
                    >
                        {/* Center divider on desktop */}
                        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px bg-linear-to-b from-transparent via-white/10 to-transparent -translate-x-1/2" />

                        {/* Strengths */}
                        <div className="space-y-10 group">
                            <div className="flex items-center gap-6">
                                <h3 className="font-serif italic text-3xl md:text-4xl text-white">Strengths</h3>
                                <div className="h-px flex-1 bg-linear-to-r from-white/20 to-transparent" />
                            </div>
                            <ul className="space-y-6">
                                {data.strengths.map((s, i) => (
                                    <li key={i} className="flex items-start gap-5">
                                        <div className="mt-1.5 p-1 rounded-full border border-white/20 opacity-60 text-[8px] flex items-center justify-center shrink-0">
                                            <TbSparkles className="w-3 h-3 text-white" />
                                        </div>
                                        <span className="text-white/80 font-serif text-xl leading-relaxed">{s}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Weaknesses */}
                        <div className="space-y-10 group">
                            <div className="flex items-center gap-6 flex-row-reverse md:flex-row">
                                <h3 className="font-serif italic text-3xl md:text-4xl text-white/70">Weaknesses</h3>
                                <div className="h-px flex-1 bg-linear-to-l md:bg-linear-to-r from-white/20 md:from-white/10 md:to-transparent to-transparent" />
                            </div>
                            <ul className="space-y-6">
                                {data.weaknesses.map((w, i) => (
                                    <li key={i} className="flex items-start gap-5 flex-row-reverse md:flex-row text-right md:text-left">
                                        <div className="mt-1.5 p-1 rounded-full border border-white/10 opacity-30 text-[8px] flex items-center justify-center shrink-0">
                                            <div className="w-2 h-2 rounded-full bg-white/20" />
                                        </div>
                                        <span className="text-white/60 font-serif text-xl leading-relaxed">{w}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </motion.section>

                    {/* Elemental Physics (Full width immersion) */}
                    <motion.section
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="relative overflow-hidden border border-white/10 p-8 md:p-16 lg:p-24 rounded-3xl"
                    >
                        {/* Large Abstract Background Graphic */}
                        <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-screen flex items-center justify-center">
                            <img src={ui.elementFrameUrl} className="w-full h-full object-cover grayscale opacity-50 blur-sm" alt="" />
                        </div>

                        <div className="relative z-10 max-w-4xl mx-auto space-y-12 text-center md:text-left flex flex-col items-center md:items-start">
                            <div className="flex flex-col items-center md:items-start space-y-4">
                                <div className="flex items-center gap-4 text-white/40 mb-2">
                                    <ElementIcon className="w-5 h-5" />
                                    <span className="font-mono text-[10px] uppercase tracking-[0.4em]">Elemental Resonance</span>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-serif text-white">
                                    The Path of {ui.elementName}
                                </h2>
                            </div>

                            <blockquote className="border-l border-r md:border-r-0 px-8 py-2 md:pl-8 md:pr-0 border-white/20" style={{ borderColor: styles.primary }}>
                                <p className="text-2xl text-white/90 italic font-serif leading-relaxed text-center md:text-left">
                                    "{data.elementalInsight}"
                                </p>
                            </blockquote>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 text-left w-full">
                                <div className="space-y-4">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 block">Foundational Axiom</span>
                                    <p className="text-base text-white/70 font-sans leading-relaxed">
                                        {element.desc}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 block">Eternal Path</span>
                                    <p className="text-base text-white/70 font-sans leading-relaxed">
                                        {data.elementalPath}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-center md:justify-start gap-3 w-full">
                                {element.keywords.map(kw => (
                                    <span key={kw} className="px-4 py-2 rounded-full border border-white/10 text-[10px] font-mono uppercase tracking-widest text-white/50 bg-white/2">
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.section>

                    {/* Tactical Vector (Traits) Box replacement (Subtle Centered) */}
                    <motion.section
                        initial={{ opacity: 0, scale: 0.98 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="py-12 border-y border-white/10 text-center max-w-3xl mx-auto space-y-6"
                    >
                        <span className="font-mono text-[10px] uppercase tracking-[0.4em]" style={{ color: styles.primary }}>Impact Strategy</span>
                        <p className="text-xl md:text-2xl text-white/80 leading-relaxed font-serif">
                            {data.coreStrategy}
                        </p>
                    </motion.section>
                </div>

                {/* Footer Linkages */}
                <section className="pt-24 pb-12 flex flex-col items-center">
                    <div className="flex items-center gap-4 mb-16 w-full max-w-2xl">
                        <div className="h-px flex-1 bg-linear-to-r from-transparent to-white/20" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/30 whitespace-nowrap">System Archive Linkages</span>
                        <div className="h-px flex-1 bg-linear-to-l from-transparent to-white/20" />
                    </div>

                    <div className="flex flex-wrap justify-center gap-6">
                        {compositionalSigns.filter(s => s.id !== signId).slice(0, 4).map(s => (
                            <Link
                                key={s.id}
                                href={`/learn/signs/${s.id}`}
                                className="group flex flex-col items-center gap-4"
                            >
                                <div className="w-16 h-16 rounded-full border border-white/10 bg-black flex items-center justify-center group-hover:border-white/30 transition-all duration-500 overflow-hidden relative">
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-white/20" />
                                    <TbArrowLeft className="w-5 h-5 text-white/40 group-hover:text-white transition-colors rotate-180 relative z-10" />
                                </div>
                                <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 group-hover:text-white transition-colors">{s.name}</span>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
