"use client";

import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { planetUIConfig } from "@/config/planet-ui";
import { ELEMENT_CONTENT, ElementType, ELEMENTAL_MANIFESTATIONS } from "@/astrology/elements";
import { elementUIConfig } from "@/config/elements-ui";
import { motion } from "motion/react";
import { useParams, notFound } from "next/navigation";
import {
    TbSparkles,
    TbCompass,
    TbTriangleSquareCircle
} from "react-icons/tb";
import {
    GiChessKnight,
    GiMightyForce,
    GiBrokenShield,
    GiArcheryTarget,
    GiSpectre,
    GiBurningPassion
} from "react-icons/gi";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { SignTitleBlock, SignSpecsGrid, SignEssence, ConstellationGraphic } from "@/components/learn/signs";
import { SystemArchiveLinkages } from "@/components/learn/system-archive-linkages";

const HOUSE_NAMES = ["1st House", "2nd House", "3rd House", "4th House", "5th House", "6th House", "7th House", "8th House", "9th House", "10th House", "11th House", "12th House"];


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
    const element = ELEMENT_CONTENT[data.element];
    const elementUi = elementUIConfig[data.element];
    const manifestation = ELEMENTAL_MANIFESTATIONS[signId];
    const styles = elementUi.styles;

    const Icon = ui.icon;
    const ElementIcon = elementUi.icon;

    return (
        <div className="relative min-h-screen w-full text-foreground  overflow-x-hidden">
            {/* Ambient Base Layer - Replace heavy blurs with simple massive CSS radials centered around the viewport */}
            <div className="fixed inset-0 z-0 pointer-events-none contain-strict">
                <div
                    className="absolute top-[-10%] left-[0%] w-[140%] h-[140%] opacity-[0.15] mix-blend-screen"
                    style={{
                        background: `radial-gradient(circle at 50% 50%, ${styles.primary} 0%, transparent 60%)`
                    }}
                />
            </div>

            <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
                <PageBreadcrumbs
                    items={[
                        { label: "Home", href: "/" },
                        { label: "Learn", href: "/learn" },
                        { label: "Signs", href: "/learn/signs" },
                    ]}
                    currentPage={`${data.name} // ${data.modality.toUpperCase()}`}
                    currentPageColor={styles.primary}
                    showBorder={false}
                />

                {/* Hero Layout */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start mb-48">

                    {/* Left Column: Dossier Display */}
                    <div className="lg:col-span-5 space-y-12">
                        {/* Title Block */}
                        <SignTitleBlock
                            variant="learn"
                            signName={data.name}
                            subtitle={data.dates}
                            motto={data.motto}
                            icon={<Icon className="absolute w-12 h-12 md:w-16 md:h-16 stroke-1" />}
                            elementFrameUrl={elementUi.frameUrl}
                            borderColor={styles.primary}
                        />

                        {/* Specs Grid */}
                        <SignSpecsGrid
                            specs={[
                                { label: "Element", value: data.element, icon: ElementIcon, subValue: "" },
                                { label: "Modality", value: data.modality, icon: TbTriangleSquareCircle, subValue: "" },
                                { label: "Ruler", value: data.ruler.charAt(0).toUpperCase() + data.ruler.slice(1), icon: TbSparkles, subValue: planetUi?.rulerSymbol || "" },
                                { label: "House", value: HOUSE_NAMES[houseIndex] || "", icon: TbCompass, subValue: "" },
                            ]}
                        />

                        {/* The Essence */}
                        <SignEssence essence={data.essenceFull} />
                    </div>

                    {/* Right Column: High Performance Constellation Framing */}
                    <ConstellationGraphic
                        constellationUrl={ui.constellationUrl}
                        signName={data.name}
                        elementName={data.element}
                        elementClass={`${data.element} Class`}
                        houseIndex={houseIndex}
                        signId={data.id}
                        styles={styles}
                        size="large"
                    />
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
                                    <span className="font-mono text-[10px] uppercase tracking-[0.4em]">The Path of {data.element}</span>

                                </div>

                                {/* Header block */}
                                <div className="flex items-center justify-between gap-6 border-b border-white/10 pb-6">
                                    <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight">
                                        {manifestation.title}
                                    </h2>

                                    <div className="relative flex items-center justify-center shrink-0">
                                        <img src={elementUi.frameUrl} className="w-20 h-20 md:w-28 md:h-28 object-cover" alt="" />
                                        <ElementIcon
                                            className="absolute size-8 md:size-10 drop-shadow-lg opacity-90"
                                            style={{ color: styles.primary }}
                                        />
                                    </div>
                                </div>

                                <blockquote className="border-l-2 pl-6 py-2" style={{ borderColor: styles.primary }}>
                                    <p className="text-xl text-white/90 italic font-serif leading-relaxed">
                                        "{manifestation.insight}"
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
                                            {manifestation.path}
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
                    </div>

                </div>

                {/* Footer Linkages */}
                <SystemArchiveLinkages category="signs" currentId={signId} />
            </div>
        </div>
    );
}