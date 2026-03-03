"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import { addDays, subDays, parseISO, format, isValid } from "date-fns";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { use } from "react";
import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { ElementType } from "@/astrology/elements";
import { motion } from "motion/react";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { GiFlame, GiStonePile, GiTornado, GiWaveCrest } from "react-icons/gi";
import { TbTriangleSquareCircle, TbCompass, TbBrandTether } from "react-icons/tb";
import { SignTitleBlock, ConstellationGraphic, HoroscopeContentCard } from "@/components/layout/signs";

const HOUSE_NAMES = ["1st House", "2nd House", "3rd House", "4th House", "5th House", "6th House", "7th House", "8th House", "9th House", "10th House", "11th House", "12th House"];

const getElementIcon = (element: ElementType) => {
    switch (element) {
        case "Fire": return GiFlame;
        case "Earth": return GiStonePile;
        case "Air": return GiTornado;
        case "Water": return GiWaveCrest;
    }
    return GiFlame;
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

export default function HoroscopeDatePage({ params }: { params: Promise<{ sign: string, date: string }> }) {
    const { sign, date } = use(params);

    const currentDate = parseISO(date);
    if (!isValid(currentDate)) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="p-8 text-center flex flex-col items-center">
                    <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                    <h2 className="text-xl font-bold">Invalid date format</h2>
                    <p className="text-muted-foreground mt-2">Please use YYYY-MM-DD.</p>
                </div>
            </div>
        );
    }

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const displayDate = date === todayStr ? "TODAY" : date;

    const prevDateStr = format(subDays(currentDate, 1), "yyyy-MM-dd");
    const nextDateStr = format(addDays(currentDate, 1), "yyyy-MM-dd");

    const formattedSign = sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase();

    const data = compositionalSigns.find(s => s.id === sign.toLowerCase());
    const ui = zodiacUIConfig[sign.toLowerCase()];

    const horoscopeData = useQuery(api.horoscopes.getPublished, {
        sign: formattedSign,
        date: date,
    });

    if (!data || !ui) {
        return <div className="p-12 text-center text-white/50">Cannot load sign data.</div>;
    }

    const houseIndex = compositionalSigns.findIndex(s => s.id === sign.toLowerCase());
    const styles = getStyles(ui.elementName);
    const ElementIcon = getElementIcon(ui.elementName);
    const Icon = ui.icon;

    if (horoscopeData === undefined) {
        return (
            <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
                <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 animate-pulse space-y-8">
                    <div className="h-4 w-64 bg-white/5 rounded"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-4 space-y-6">
                            <div className="h-24 w-full bg-white/5 rounded"></div>
                            <div className="w-48 h-48 rounded-full bg-white/5 mx-auto"></div>
                        </div>
                        <div className="lg:col-span-8">
                            <div className="h-80 w-full bg-white/5 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
            <div className="fixed inset-0 z-0 pointer-events-none contain-strict">
                <div
                    className="absolute top-[-10%] left-[0%] w-[140%] h-[140%] opacity-[0.15] mix-blend-screen"
                    style={{
                        background: `radial-gradient(circle at 50% 50%, ${styles.primary} 0%, transparent 60%)`
                    }}
                />
            </div>

            <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-8">
                <PageBreadcrumbs
                    items={[
                        { label: "Home", href: "/" },
                        { label: "Horoscopes", href: "/horoscopes" },
                    ]}
                    currentPage={`${data.name} // ${displayDate}`}
                    currentPageColor={styles.primary}
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

                    {/* Left Column: Title Block + Smaller Constellation */}
                    <div className="lg:col-span-5 flex flex-col">
                        <SignTitleBlock
                            variant="horoscopes"
                            signName={data.name}
                            subtitle={displayDate}
                            motto={data.motto}
                            icon={<Icon className="absolute w-12 h-12 md:w-16 md:h-16 stroke-1" />}
                            elementFrameUrl={ui.elementFrameUrl}
                            borderColor={styles.primary}
                        />

                        {/* Constellation - smaller, under the motto */}
                        <div className="flex-1 flex items-center justify-center mt-6">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                                className="relative w-full max-w-[220px] md:max-w-[300px] lg:max-w-[280px] aspect-square"
                            >
                                <div
                                    className="absolute inset-0 rounded-full border border-white/10 bg-black/40 flex items-center justify-center p-4 overflow-hidden"
                                    style={{ boxShadow: `0_0_40px rgba(0,0,0,0.5)` }}
                                >
                                    <div
                                        className="absolute inset-0 opacity-40"
                                        style={{
                                            background: `radial-gradient(circle at center, ${styles.glow} 0%, transparent 65%)`
                                        }}
                                    />
                                    <div
                                        className="absolute inset-0 pointer-events-none opacity-50"
                                        style={{
                                            backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)`,
                                            backgroundSize: '2rem 2rem'
                                        }}
                                    />
                                    <img
                                        src={ui.constellationUrl}
                                        alt={`${data.name} Constellation`}
                                        className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.15)] opacity-80 scale-125"
                                    />
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Right Column: Horoscope Content Card */}
                    <div className="col-span-6 lg:col-span-7 lg:col-start-8">
                        <HoroscopeContentCard
                            horoscopeData={horoscopeData}
                            date={date}
                            styles={styles}
                        />
                    </div>
                </div>

                {/* Pagination at bottom */}
                <div className="flex flex-row gap-4 justify-between items-center mt-6 pt-6 border-t border-white/10">
                    <Link
                        href={`/horoscopes/${sign}/${prevDateStr}`}
                        className="flex items-center px-5 py-2.5 border border-white/10 bg-black/40 rounded-sm font-mono text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-white hover:bg-white/5 transition-colors group"
                    >
                        <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform opacity-50" />
                        {prevDateStr}
                    </Link>

                    <Link
                        href={`/horoscopes/${sign}/${nextDateStr}`}
                        className="flex items-center px-5 py-2.5 border border-white/10 bg-black/40 rounded-sm font-mono text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-white hover:bg-white/5 transition-colors group"
                    >
                        {nextDateStr}
                        <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform opacity-50" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
