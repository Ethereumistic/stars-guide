"use client";

import { compositionalPlanets, PlanetData } from "@/astrology/planets";
import { planetUIConfig } from "@/config/planet-ui";
import { getPlanetTelemetry, type PlanetTelemetry } from "@/lib/planets/telemetry";
import { compositionalSigns } from "@/astrology/signs";
import { motion } from "motion/react";
import { useParams, notFound } from "next/navigation";
import { useEffect, useState } from "react";
import {
    TbTelescope, TbCompass, TbRulerMeasure,
    TbTemperature, TbMoon, TbClock, TbRefresh, TbActivityHeartbeat, TbFlame,
    TbFingerprint, TbCrown, TbHexagon, TbYinYang
} from "react-icons/tb";
import { SystemArchiveLinkages } from "@/components/learn/system-archive-linkages";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { PlanetTitleBlock } from "@/components/learn/planets/planet-title-block";
import { PlanetSpecsGrid } from "@/components/learn/planets/planet-specs-grid";
import { PlanetEssence } from "@/components/learn/planets/planet-essence";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { GiFlame, GiStonePile, GiTornado, GiWaveCrest } from "react-icons/gi";
import { IconType } from "react-icons";

const getElementIcons = (elementStr: string): IconType[] => {
    return elementStr.split(", ")
        .map(e => e.trim().toLowerCase())
        .map(e => {
            if (e.includes("fire")) return GiFlame;
            if (e.includes("earth")) return GiStonePile;
            if (e.includes("air")) return GiTornado;
            if (e.includes("water")) return GiWaveCrest;
            return null;
        })
        .filter(Boolean) as IconType[];
};

const getSignIcons = (rulesStr: string): IconType[] => {
    return rulesStr.split(", ")
        .map(r => zodiacUIConfig[r.trim().toLowerCase()]?.icon)
        .filter(Boolean) as IconType[];
};

export default function PlanetDetailPage() {
    const params = useParams();
    const planetId = params.planet as string;

    const data = compositionalPlanets.find(p => p.id === planetId);
    const ui = planetUIConfig[planetId];

    const [telemetry, setTelemetry] = useState<PlanetTelemetry | null>(null);

    // Calculate real-time telemetry on the client to avoid hydration mismatch bounds
    useEffect(() => {
        if (!data) return;
        // Interval to update live data if we wanted real-time seconds, 
        // but for now running it once on mount is perfect.
        setTelemetry(getPlanetTelemetry(data.id, new Date()));

        const interval = setInterval(() => {
            setTelemetry(getPlanetTelemetry(data.id, new Date()));
        }, 60000); // refresh every minute

        return () => clearInterval(interval);
    }, [data]);

    if (!data || !ui) {
        return notFound();
    }

    const glowColor = ui.themeColor;

    // Formatting helpers
    const formatDistance = (au: number | null) => {
        if (!au) return "N/A";
        // 1 AU = 149,597,870.7 km
        const km = au * 149597870.7;
        if (km > 1000000) return `${(km / 1000000).toFixed(2)}M km`;
        return `${Math.round(km).toLocaleString()} km`;
    };

    const currentSign = telemetry
        ? compositionalSigns.find(s => s.id === telemetry.signId)
        : null;

    return (
        <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
            {/* Ambient Deep Cosmic Glow Layer */}
            <div className="fixed inset-0 z-0 pointer-events-none contain-strict">
                <div
                    className="absolute top-[-10%] left-[0%] w-[140%] h-[140%] opacity-[0.15] mix-blend-screen"
                    style={{
                        background: `radial-gradient(circle at 50% 50%, ${glowColor} 0%, transparent 60%)`
                    }}
                />
            </div>

            <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
                <PageBreadcrumbs
                    items={[
                        { label: "Home", href: "/" },
                        { label: "Learn", href: "/learn" },
                        { label: "Planets", href: "/learn/planets" },
                    ]}
                    currentPage={`${data.name} ${ui.rulerSymbol}`}
                    currentPageColor={glowColor}
                />

                {/* Magazine-Style Hero */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start mb-48">

                    {/* Left Typography Block */}
                    <div className="lg:col-span-5 space-y-12">
                        <PlanetTitleBlock
                            planetName={data.name}
                            classification={data.astronomy?.classification || 'Celestial Point'}
                            verbPhrase={data.compositionalVerbPhrase}
                            glowColor={glowColor}
                            rulerSymbol={ui.rulerSymbol}
                        />

                        {data.astrology && (
                            <PlanetSpecsGrid
                                specs={[
                                    { label: "Archetype", value: data.astrology.archetype, icon: TbFingerprint },
                                    { label: "Rulership", value: data.astrology.rules, icon: TbCrown, icons: getSignIcons(data.astrology.rules) },
                                    { label: "Element", value: data.astrology.element, icon: TbHexagon, icons: getElementIcons(data.astrology.element) },
                                    { label: "Polarity", value: data.astrology.polarity || "N/A", icon: TbYinYang },
                                ]}
                            />
                        )}

                        <PlanetEssence psychologicalFunction={data.psychologicalFunction || ""} />
                    </div>

                    {/* Right Massive Visual */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                        className="lg:col-span-7 relative h-full min-h-[500px] flex items-center justify-center lg:sticky lg:top-32"
                    >
                        <div
                            className="relative w-full max-w-[420px] lg:max-w-[500px] aspect-square flex items-center justify-center p-8"
                        >
                            <div
                                className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
                                style={{
                                    background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 65%)`
                                }}
                            />

                            <div
                                className="absolute inset-0 pointer-events-none opacity-50"
                                style={{
                                    backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)`,
                                    backgroundSize: '3rem 3rem',
                                    WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 70%)',
                                    maskImage: 'radial-gradient(circle at center, black 40%, transparent 70%)'
                                }}
                            />

                            {ui.imageUrl ? (
                                <img
                                    src={ui.imageUrl}
                                    alt={data.name}
                                    className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] opacity-95 scale-[1.35] hover:scale-[1.45] transition-transform duration-700 ease-out"
                                />
                            ) : (
                                <div className="relative z-10 text-[180px] md:text-[240px] font-serif leading-none opacity-80" style={{ color: glowColor }}>
                                    {ui.rulerSymbol}
                                </div>
                            )}
                        </div>

                        <div className="absolute bottom-6 left-6 font-mono text-[10px] uppercase tracking-widest text-white/30 hidden lg:block">
                            FIG. {compositionalPlanets.findIndex((p) => p.id === planetId) + 1} // {planetId.toUpperCase()}
                        </div>
                        <div
                            className="absolute bottom-6 right-6 font-mono text-[10px] uppercase tracking-[0.3em] hidden lg:block"
                            style={{ color: glowColor }}
                        >
                            {data.astronomy ? "CELESTIAL BODY" : "CELESTIAL POINT"}
                        </div>
                    </motion.div>
                </section>

                {/* Grid Layout for Telemetry and Data */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-48">

                    {/* Live Telemetry Panel */}
                    <motion.section
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="border border-white/5 bg-black/40 p-8 md:p-12 rounded-2xl flex flex-col relative overflow-hidden group"
                    >
                        {/* Glow indicator */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[100px] rounded-full group-hover:bg-white/10 transition-colors" />

                        <div className="flex items-center gap-3 mb-10 border-b border-white/10 pb-6">
                            <TbTelescope className="w-6 h-6 text-white/40" />
                            <h2 className="text-xl md:text-2xl font-serif text-white tracking-wide">Live Telemetry</h2>
                            <div className="ml-auto flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-[10px] font-mono text-green-500 uppercase tracking-widest">Real-time</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 flex-1 content-start">
                            <div className="space-y-2">
                                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 block">Current Zodiac Transit</span>
                                <div className="text-2xl md:text-3xl font-serif text-white/90">
                                    {currentSign ? currentSign.name : "--"}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 block">Ecliptic Vector</span>
                                <div className="text-2xl md:text-3xl font-mono text-white/90">
                                    {telemetry ? `${telemetry.longitude.toFixed(2)}°` : "--"}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 block">Distance from Earth</span>
                                <div className="text-2xl md:text-3xl font-mono text-white/90">
                                    {telemetry ? formatDistance(telemetry.distanceAu) : "--"}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 block">Orbital Status</span>
                                <div className={`text-xl md:text-2xl font-sans tracking-wide ${telemetry && telemetry.retrograde ? 'text-orange-400' : 'text-blue-400'}`}>
                                    {telemetry ? (telemetry.retrograde ? "Retrograde" : "Direct") : "--"}
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    {/* Astronomical Physics */}
                    <motion.section
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="bg-white/2 border border-white/5 p-8 md:p-12 rounded-2xl flex flex-col"
                    >
                        <div className="flex items-center gap-3 mb-10 border-b border-white/10 pb-6">
                            <TbActivityHeartbeat className="w-6 h-6 text-white/40" />
                            <h2 className="text-xl md:text-2xl font-serif text-white tracking-wide">Astronomical Parameters</h2>
                        </div>

                        {data.astronomy ? (
                            <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                                {[
                                    { label: "Diameter", val: data.astronomy.diameter, icon: TbRulerMeasure },
                                    { label: "Mass", val: data.astronomy.mass, icon: TbCompass },
                                    { label: "Orbital Period", val: data.astronomy.orbitalPeriod, icon: TbRefresh },
                                    { label: "Day Length", val: data.astronomy.dayLength || "N/A", icon: TbClock },
                                    { label: "Temperature", val: data.astronomy.temperature, icon: TbTemperature },
                                    { label: "Moons", val: data.astronomy.moons, icon: TbMoon },
                                ].map((stat, i) => (
                                    <div key={i} className="flex gap-4">
                                        <stat.icon className="w-5 h-5 text-white/20 shrink-0" />
                                        <div>
                                            <span className="block text-[10px] font-mono uppercase tracking-widest text-white/30 mb-1">{stat.label}</span>
                                            <span className="block text-sm text-white/80">{stat.val}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-white/40 text-sm font-mono mt-4">Calculated celestial point (No physical mass)</div>
                        )}
                    </motion.section>

                </div>

                {/* Astrological & Psychological Integration */}
                <motion.section
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mb-32 max-w-5xl mx-auto"
                >
                    <div className="border-t border-b border-white/10 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="md:col-span-1 space-y-8 border-r border-white/5 pr-8">
                            <div>
                                <span className="font-mono text-[10px] uppercase tracking-widest text-white/30 block mb-2">Primary Directive</span>
                                <h3 className="text-xl text-white/90 font-serif leading-snug">
                                    "{data.compositionalVerbPhrase}"
                                </h3>
                            </div>

                            <div>
                                <span className="font-mono text-[10px] uppercase tracking-widest text-white/30 block mb-2">Core Drives</span>
                                <ul className="space-y-2">
                                    {data.coreDrives.map(drive => (
                                        <li key={drive} className="text-sm text-white/60 flex items-start gap-2">
                                            <span className="text-white/20 mt-1">►</span>{drive}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-12">
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <TbFlame className="w-5 h-5 text-red-500/50" />
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-red-500/50">Shadow Expression</span>
                                </div>
                                <p className="text-lg text-white/70 font-sans leading-relaxed">
                                    {data.shadowExpression}
                                </p>
                            </div>

                        </div>
                    </div>
                </motion.section>

                {/* Footer Linkages */}
                <SystemArchiveLinkages category="planets" currentId={planetId} />
            </div>
        </div>
    );
}
