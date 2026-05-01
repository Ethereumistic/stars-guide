"use client";

import { compositionalSigns } from "@/astrology/signs";
import {
    ELEMENTS_LEARN,
    ELEMENT_CONTENT,
    ELEMENTAL_MANIFESTATIONS,
    ElementType,
    ModeType,
} from "@/astrology/elements";
import { elementUIConfig } from "@/config/elements-ui";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { motion } from "motion/react";
import { useParams, notFound } from "next/navigation";
import {
    TbSparkles,
    TbTargetArrow,
    TbLockSquare,
    TbArrowsExchange,
} from "react-icons/tb";
import {
    GiMightyForce,
    GiBrokenShield,
    GiSeedling,
} from "react-icons/gi";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { SystemArchiveLinkages } from "@/components/learn/system-archive-linkages";

const MODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    Cardinal: TbTargetArrow,
    Fixed: TbLockSquare,
    Mutable: TbArrowsExchange,
};

// Map each element to its associated modes (in sign order)
const ELEMENT_SIGN_MODES: Record<ElementType, { sign: string; mode: ModeType }[]> = {
    Fire: [
        { sign: "aries", mode: "Cardinal" },
        { sign: "leo", mode: "Fixed" },
        { sign: "sagittarius", mode: "Mutable" },
    ],
    Earth: [
        { sign: "taurus", mode: "Fixed" },
        { sign: "virgo", mode: "Mutable" },
        { sign: "capricorn", mode: "Cardinal" },
    ],
    Air: [
        { sign: "gemini", mode: "Mutable" },
        { sign: "libra", mode: "Cardinal" },
        { sign: "aquarius", mode: "Fixed" },
    ],
    Water: [
        { sign: "cancer", mode: "Cardinal" },
        { sign: "scorpio", mode: "Fixed" },
        { sign: "pisces", mode: "Mutable" },
    ],
};

export default function ElementDetailPage() {
    const params = useParams();
    const elementParam = params.element as string;

    // Normalize: accept "fire", "Fire", etc.
    const elementId = elementParam.charAt(0).toUpperCase() + elementParam.slice(1).toLowerCase();
    const elementType = elementId as ElementType;

    const learnData = ELEMENTS_LEARN[elementType];
    const contentData = ELEMENT_CONTENT[elementType];
    const ui = elementUIConfig[elementType];

    if (!learnData || !contentData || !ui) {
        return notFound();
    }

    const styles = ui.styles;
    const Icon = ui.icon;
    const signModes = ELEMENT_SIGN_MODES[elementType];

    // Collect sign data for the manifestations section
    const signEntries = signModes.map(({ sign, mode }) => {
        const signData = compositionalSigns.find(s => s.id === sign);
        const signUi = zodiacUIConfig[sign];
        const manifestation = ELEMENTAL_MANIFESTATIONS[sign];
        return { sign, mode, signData, signUi, manifestation };
    }).filter(e => e.signData && e.signUi && e.manifestation);

    return (
        <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
            {/* Ambient Glow */}
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
                        { label: "Elements", href: "/learn/elements" },
                    ]}
                    currentPage={elementType.toUpperCase()}
                    currentPageColor={styles.primary}
                    showBorder={false}
                />

                {/* ── Hero Layout ─────────────────────────────────────── */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start mb-48">

                    {/* Left Column: Dossier */}
                    <div className="lg:col-span-5 space-y-12">

                        {/* Title Block */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="space-y-6"
                        >
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 border-b border-white/10 pb-6 sm:pb-8">
                                <div className="relative flex items-center justify-center shrink-0">
                                    <img src={ui.frameUrl} className="w-40 h-40 md:w-40 md:h-40 object-cover" alt="" />
                                    <Icon
                                        className="absolute w-12 h-12 md:w-16 md:h-16"
                                        style={{ color: styles.primary, filter: `drop-shadow(0 0 8px ${styles.glow})` }}
                                    />
                                </div>
                                <div className="space-y-2 pt-2 md:pt-4 text-center sm:text-left">
                                    <h1 className="text-7xl md:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] font-serif text-white tracking-tighter leading-[0.85] break-words">
                                        {elementType}
                                    </h1>
                                    <p className="text-2xl md:text-2xl font-serif italic" style={{ color: styles.primary }}>
                                        {learnData.tagline}
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 gap-px bg-black/50 border border-white/10 rounded-md overflow-hidden">
                            {contentData.keywords.map((kw, i) => (
                                <div key={kw} className="p-3 sm:p-6 flex flex-row items-center justify-between group hover:bg-white/2 transition-colors">
                                    <div className="flex flex-col space-y-1 sm:space-y-2">
                                        <span className="text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">
                                            Keyword {i + 1}
                                        </span>
                                        <p className="text-base sm:text-lg font-serif text-white tracking-tight">{kw}</p>
                                    </div>
                                    <div className="flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity pl-2 sm:pl-4">
                                        <TbSparkles className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Essence / Motivation */}
                        <div className="p-8 border border-white/10 bg-black/50 space-y-6 rounded-md">
                            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                                <Icon className="w-5 h-5 opacity-40" style={{ color: styles.primary }} />
                                <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">Core Motivation</h3>
                            </div>
                            <p className="text-[17px] text-white/80 leading-relaxed font-serif">
                                {learnData.motivation}
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Element Frame Visual */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                        className="lg:col-span-7 relative h-full min-h-[500px] flex items-center justify-center lg:sticky lg:top-32 -translate-y-12"
                    >
                        <div className="relative w-full max-w-[420px] lg:max-w-[600px]">
                            <img
                                src={ui.frameUrl}
                                alt={`${elementType} Element`}
                                className="w-full opacity-95 hover:scale-[1.05] transition-transform duration-700 ease-out"
                                style={{ filter: `drop-shadow(0 0 15px ${styles.glow})` }}
                            />

                            {/* Sign Icons – Center Cluster */}
                            <div className="absolute inset-0 z-20 flex items-center justify-center">
                                <div className="flex items-center gap-3 md:gap-4">
                                    {signModes.map(({ sign }) => {
                                        const signUi = zodiacUIConfig[sign];
                                        if (!signUi) return null;
                                        const SignIcon = signUi.icon;
                                        return (
                                            <div
                                                key={sign}
                                                className="flex items-center justify-center w-10 h-10 md:w-14 md:h-14 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm"
                                                style={{ boxShadow: `0 0 12px ${styles.glow}` }}
                                            >
                                                <SignIcon
                                                    className="w-5 h-5 md:w-7 md:h-7"
                                                    style={{ color: styles.primary, filter: `drop-shadow(0 0 6px ${styles.glow})` }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-6 left-6 font-mono text-[10px] uppercase tracking-widest text-white/30 hidden lg:block">
                            FIG. {["Fire", "Earth", "Air", "Water"].indexOf(elementType) + 1} // {elementType.toUpperCase()}
                        </div>
                        <div
                            className="absolute bottom-6 right-6 font-mono text-[10px] uppercase tracking-[0.3em] hidden lg:block"
                            style={{ color: styles.primary }}
                        >
                            {learnData.tagline.toUpperCase()}
                        </div>
                    </motion.div>
                </section>

                {/* ── Structured Data Grid ─────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-48">

                    {/* Strengths, Struggles & Growth */}
                    <motion.section
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="border border-white/10 bg-black/50 flex flex-col rounded-md overflow-hidden"
                    >
                        <div className="p-8 md:p-12 border-b border-white/10">
                            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-6">Elemental Blueprint</span>
                            <h2 className="text-4xl md:text-6xl font-serif text-white tracking-tight">
                                {elementType}
                            </h2>
                        </div>

                        {/* Strengths & Struggles side by side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px">
                            <div className="p-6 md:p-8 space-y-5">
                                <div className="flex items-center gap-2.5">
                                    <GiMightyForce className="size-5" style={{ color: styles.primary }} />
                                    <span className="font-mono text-white/30 text-[10px] uppercase tracking-[0.3em] mt-0.5">
                                        Strengths
                                    </span>
                                </div>
                                <ul className="text-sm text-white/90 space-y-2">
                                    {learnData.strengths.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: styles.primary }} />
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="p-6 md:p-8 space-y-5">
                                <div className="flex items-center gap-2.5">
                                    <GiBrokenShield className="size-5 text-white/40" />
                                    <span className="font-mono text-white/30 text-[10px] uppercase tracking-[0.3em] mt-0.5">
                                        Struggles
                                    </span>
                                </div>
                                <ul className="text-sm text-white/90 space-y-2">
                                    {learnData.struggles.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Growth Path */}
                        <div className="p-6 md:p-8 border-t border-white/10 space-y-4">
                            <div className="flex items-center gap-2.5">
                                <GiSeedling className="size-5" style={{ color: styles.primary }} />
                                <span className="font-mono text-white/30 text-[10px] uppercase tracking-[0.3em] mt-0.5">
                                    Growth Path
                                </span>
                            </div>
                            <p className="text-[15px] text-white/70 leading-relaxed font-serif">
                                {learnData.growth}
                            </p>
                        </div>
                    </motion.section>

                    {/* Sign Manifestations */}
                    <motion.section
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="border border-white/10 bg-black/50 p-8 md:p-12 rounded-md relative overflow-hidden"
                    >
                        <div className="flex items-center gap-3 mb-10 border-b border-white/10 pb-6">
                            <Icon className="w-6 h-6 opacity-40" style={{ color: styles.primary }} />
                            <h2 className="text-xl md:text-2xl font-serif text-white tracking-wide">
                                {elementType} Expressions
                            </h2>
                        </div>

                        <div className="space-y-8">
                            {signEntries.map(({ sign, mode, signData, signUi, manifestation }) => {
                                if (!signData || !signUi || !manifestation) return null;
                                const SignIcon = signUi.icon;
                                const ModeIcon = MODE_ICONS[mode];
                                return (
                                    <div key={sign} className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <SignIcon className="w-6 h-6" style={{ color: styles.primary, filter: `drop-shadow(0 0 4px ${styles.glow})` }} />
                                                <div>
                                                    <h3 className="text-lg font-serif text-white tracking-tight">{signData.name}</h3>
                                                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/40">{signData.archetypeName}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {ModeIcon && <ModeIcon className="w-3.5 h-3.5 text-white/30" />}
                                                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/30">{mode}</span>
                                            </div>
                                        </div>

                                        <div className="border-l-2 pl-5 py-1" style={{ borderColor: styles.primary }}>
                                            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-1.5">
                                                {manifestation.title}
                                            </p>
                                            <p className="text-sm text-white/70 leading-relaxed italic font-serif">
                                                "{manifestation.insight}"
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Keywords footer */}
                        <div className="flex flex-wrap gap-2 pt-8 mt-8 border-t border-white/10">
                            {contentData.keywords.map(kw => (
                                <span
                                    key={kw}
                                    className="px-3 py-1 bg-white/5 border border-white/10 text-[10px] font-mono uppercase tracking-widest text-white/50 rounded-sm"
                                >
                                    {kw}
                                </span>
                            ))}
                        </div>
                    </motion.section>
                </div>

                {/* Footer Linkages */}
                <SystemArchiveLinkages category="signs" currentId={signEntries[0]?.sign || "aries"} />
            </div>
        </div>
    );
}
