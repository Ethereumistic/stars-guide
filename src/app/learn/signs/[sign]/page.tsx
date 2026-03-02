"use client";

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
import {
    GiFlame,
    GiStonePile,
    GiTornado,
    GiWaveCrest,
    GiArcheryTarget,
    GiSpectre,
    GiBurningPassion,
    GiChessKnight,
    GiMightyForce,
    GiBrokenShield
} from "react-icons/gi";

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
        <div className="relative min-h-screen w-full text-foreground  overflow-x-hidden">
            {/* Ambient Base Layer - Replace heavy blurs with simple massive CSS radials centered around the viewport */}
            <div className="fixed inset-0 z-0 pointer-events-none contain-strict">
                {/* <StarsBackground />
                <ShootingStars /> */}
                <div
                    className="absolute top-[-10%] left-[0%] w-[140%] h-[140%] opacity-[0.15] mix-blend-screen"
                    style={{
                        background: `radial-gradient(circle at 50% 50%, ${styles.primary} 0%, transparent 60%)`
                    }}
                />
            </div>

            <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
                {/* Navigation Breadcrumbs */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <Breadcrumb className="mb-12 md:mb-16 border-b border-white/10 pb-6">
                        <BreadcrumbList className="text-white/40">
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild className="hover:text-white transition-colors font-mono text-[10px] uppercase tracking-[0.2em]">
                                    <Link href="/learn">Archive</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="opacity-20">/</BreadcrumbSeparator>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild className="hover:text-white transition-colors font-mono text-[10px] uppercase tracking-[0.2em]">
                                    <Link href="/learn/signs">Signs</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="opacity-20">/</BreadcrumbSeparator>
                            <BreadcrumbItem>
                                <BreadcrumbPage className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: styles.primary }}>
                                    {data.name} // {data.modality.toUpperCase()}
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </motion.div>

                {/* Hero Layout */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start mb-48">

                    {/* Left Column: Dossier Display */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="lg:col-span-5 space-y-12"
                    >
                        {/* Title Block - REARRANGED */}
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row items-start gap-6 border-b border-white/10 pb-8">
                                <div className="relative flex items-center justify-center shrink-0">
                                    <img src={ui.elementFrameUrl} className="w-32 h-32 md:w-40 md:h-40 object-cover" alt="" />
                                    <Icon className="absolute w-12 h-12 md:w-16 md:h-16 stroke-1" />
                                </div>
                                <div className="space-y-2 pt-2 md:pt-4">
                                    <h1 className="text-6xl md:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] font-serif text-white tracking-tighter leading-[0.85] break-words">
                                        {data.name}
                                    </h1>
                                    <p className="text-xl md:text-2xl font-serif italic text-white/60">
                                        {data.dates}
                                    </p>
                                </div>
                            </div>

                            <p className="text-xs md:text-xl font-mono uppercase tracking-[0.25em] text-white border-l-2 pl-4 py-1" style={{ borderColor: styles.primary }}>
                                "{data.motto}"
                            </p>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 gap-px bg-black/50 border border-white/10 rounded-md overflow-hidden">
                            {[
                                { label: "Element", value: ui.elementName, icon: ElementIcon, subValue: "" },
                                { label: "Modality", value: data.modality, icon: TbTriangleSquareCircle, subValue: "" },
                                { label: "Ruler", value: data.ruler.charAt(0).toUpperCase() + data.ruler.slice(1), icon: TbSparkles, subValue: planetUi?.rulerSymbol || "" },
                                { label: "House", value: HOUSE_NAMES[houseIndex] || "", icon: TbCompass, subValue: "" },
                            ].map((item, idx) => (
                                <div key={idx} className=" p-6 flex flex-row items-center justify-between group hover:bg-white/2 transition-colors">

                                    {/* Text Content: Label and Value Stacked */}
                                    <div className="flex flex-col space-y-2">
                                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">
                                            {item.label}
                                        </span>
                                        <p className="text-2xl font-serif text-white tracking-tight">
                                            {item.value}
                                        </p>
                                    </div>

                                    {/* Visual Indicator: Big Icon or Ruler Symbol */}
                                    <div className="flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity pl-4">
                                        {item.label === "Ruler" && item.subValue ? (
                                            <span className="text-4xl md:text-5xl font-sans leading-none">
                                                {item.subValue}
                                            </span>
                                        ) : (
                                            <item.icon className="w-8 h-8 md:w-10 md:h-10" />
                                        )}
                                    </div>

                                </div>
                            ))}
                        </div>

                        {/* The Essence */}
                        <div className="p-8 border border-white/10 bg-black/50 space-y-6 rounded-md">
                            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                                <TbAtom className="text-white/40 w-5 h-5" />
                                <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">Core Essence File</h3>
                            </div>
                            <p className="text-[17px] text-white/80 leading-relaxed font-serif">
                                {data.essenceFull}
                            </p>
                        </div>
                    </motion.div>

                    {/* Right Column: High Performance Constellation Framing */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                        className="lg:col-span-7 relative h-full min-h-[500px] flex items-center justify-center lg:sticky lg:top-32 -translate-y-12"
                    >
                        {/* Circular framing */}
                        <div className="relative w-full max-w-[420px] lg:max-w-[600px] aspect-square rounded-full border border-white/10 bg-black/40 flex items-center justify-center p-8 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)]">

                            {/* Controlled inner glow */}
                            <div
                                className="absolute inset-0 opacity-40"
                                style={{
                                    background: `radial-gradient(circle at center, ${styles.glow} 0%, transparent 65%)`
                                }}
                            />

                            {/* Grid overlay */}
                            <div className="absolute inset-0 pointer-events-none opacity-50" style={{
                                backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)`,
                                backgroundSize: '3rem 3rem'
                            }} />

                            <img
                                src={ui.constellationUrl}
                                alt={`${data.name} Constellation`}
                                className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] opacity-90 scale-[1.35] hover:scale-[1.45] transition-transform duration-700 ease-out"
                            />
                        </div>

                        {/* Data points on diagram (Moved outside the circle) */}
                        <div className="absolute bottom-6 left-6 font-mono text-[10px] uppercase tracking-widest text-white/30 hidden lg:block">
                            FIG. {houseIndex + 1} // {data.id.toUpperCase()}
                        </div>
                        <div className="absolute bottom-6 right-6 font-mono text-[10px] uppercase tracking-[0.3em] hidden lg:block" style={{ color: styles.primary }}>
                            {ui.elementName} Class
                        </div>
                    </motion.div>
                </section>

                {/* Structured Data Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-48">

                    {/* Archetypal Analysis */}
                    <motion.section
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="border border-white/10 bg-black/50 flex flex-col rounded-md overflow-hidden"
                    >
                        <div className="p-8 md:p-12 border-b border-white/10">
                            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-6">Cognitive Archetype</span>
                            <h2 className="text-4xl md:text-6xl font-serif text-white tracking-tight mb-8">
                                {data.archetypeName}
                            </h2>
                            <p className="text-lg text-white/70 leading-relaxed font-serif">
                                {data.cognitiveInsight}
                            </p>
                        </div>

                        {/* Top 4 Stats */}
                        <div className="grid grid-cols-2 border-b border-white/10">
                            {[
                                { title: "Primary Goal", val: data.goal, icon: GiArcheryTarget },
                                { title: "Dominant Fear", val: data.greatestFear, icon: GiSpectre },
                                { title: "Core Desire", val: data.coreDesire, icon: GiBurningPassion },
                                { title: "Impact Strategy", val: data.coreStrategy, icon: GiChessKnight }
                            ].map((spec, i) => (
                                <div
                                    key={i}
                                    className={`p-6 space-y-3 border-white/10 ${i % 2 === 0 ? 'border-r' : ''
                                        } ${i < 2 ? 'border-b' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <spec.icon className="size-5 text-white/40" />
                                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 block mt-0.5">
                                            {spec.title}
                                        </span>
                                    </div>
                                    <span className="text-sm md:text-base text-white/90 block pr-2">
                                        {spec.val}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Strengths & Weaknesses */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px ">
                            <div className=" p-6 md:p-8 space-y-5">
                                <div className="flex items-center gap-2.5">
                                    <GiMightyForce className="size-5" />
                                    <span className="font-mono text-white/30 text-[10px] uppercase tracking-[0.3em] mt-0.5">
                                        Strengths
                                    </span>
                                </div>
                                <ul className="text-sm text-white/90 space-y-2 list-disc list-inside">
                                    {data.strengths.map((s, i) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className=" p-6 md:p-8 space-y-5">
                                <div className="flex items-center gap-2.5 text">
                                    <GiBrokenShield className="size-5" />
                                    <span className="font-mono text-white/30 text-[10px] uppercase tracking-[0.3em] mt-0.5">
                                        Weaknesses
                                    </span>
                                </div>
                                <ul className="text-sm text-white/90 space-y-2 list-disc list-inside">
                                    {data.weaknesses.map((w, i) => (
                                        <li key={i}>{w}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.section>

                    <div className="flex flex-col gap-8">
                        {/* Elemental Physics */}
                        <motion.section
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className="border border-white/10 bg-black/50 p-8 md:p-12 h-full flex flex-col justify-center relative overflow-hidden rounded-md"
                        >



                            <div className="relative z-10 space-y-8">

                                <div className="flex items-center gap-4 text-white/40 mb-2">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.4em]">The Path of {ui.elementName}</span>

                                </div>

                                {/* Header block */}
                                <div className="flex items-center justify-between gap-6 border-b border-white/10 pb-6">
                                    <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight">
                                        {data.elementalTitle}
                                    </h2>

                                    <div className="relative flex items-center justify-center shrink-0">
                                        <img src={ui.elementFrameUrl} className="w-20 h-20 md:w-28 md:h-28 object-cover" alt="" />
                                        <ElementIcon
                                            className="absolute size-8 md:size-10 drop-shadow-lg opacity-90"
                                            style={{ color: styles.primary }}
                                        />
                                    </div>
                                </div>

                                <blockquote className="border-l-2 pl-6 py-2" style={{ borderColor: styles.primary }}>
                                    <p className="text-xl text-white/90 italic font-serif leading-relaxed">
                                        "{data.elementalInsight}"
                                    </p>
                                </blockquote>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 block">Foundational Axiom</span>
                                        <p className="text-sm text-white/60 font-sans mt-0">
                                            {element.desc}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 block">Eternal Path</span>
                                        <p className="text-sm text-white/60 font-sans mt-0">
                                            {data.elementalPath}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-2">
                                    {element.keywords.map(kw => (
                                        <span key={kw} className="px-3 py-1 bg-white/5 border border-white/10 text-[10px] font-mono uppercase tracking-widest text-white/50 rounded-sm">
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </motion.section>

                        {/* Tactical Vector (Traits) */}
                        {/* <motion.section
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-px  border border-white/10 rounded-md overflow-hidden"
                        >
                            <div className="bg-black/50 p-8 space-y-4">
                                <span className="font-mono text-[10px] uppercase tracking-[0.4em]" style={{ color: styles.primary }}>Impact Strategy</span>
                                <p className="text-sm text-white/80 leading-relaxed">
                                    {data.coreStrategy}
                                </p>
                            </div>
                            <div className="bg-black/50 p-8 space-y-4">
                                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">Inherent Flaw</span>
                                <ul className="text-sm text-white/60 space-y-2 list-disc list-inside">
                                    {data.weaknesses.map((w, i) => (
                                        <li key={i}>{w}</li>
                                    ))}
                                </ul>
                            </div>
                        </motion.section> */}
                    </div>

                </div>

                {/* Footer Linkages */}
                <section className="border-t border-white/10 pt-24 pb-12 flex flex-col items-center">
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/30 block mb-12">System Archive Linkages</span>
                    <div className="flex flex-wrap justify-center gap-px bg-white/10 border border-white/10 p-px rounded-md overflow-hidden">
                        {compositionalSigns.filter(s => s.id !== signId).slice(0, 4).map(s => (
                            <Link
                                key={s.id}
                                href={`/learn/signs/${s.id}`}
                                className="bg-black px-6 md:px-10 py-5 hover:bg-white/3 transition-colors group flex items-center gap-4"
                            >
                                <span className="text-xs font-mono uppercase tracking-[0.2em] text-white/50 group-hover:text-white transition-colors">{s.name}</span>
                                <TbArrowLeft className="w-4 h-4 text-white/20 group-hover:text-white transition-colors rotate-180" />
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}