"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { addDays, subDays, parseISO, format, isValid } from "date-fns";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { use } from "react";
import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { ElementType } from "@/astrology/elements";
import { motion } from "motion/react";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { GiFlame, GiStonePile, GiTornado, GiWaveCrest } from "react-icons/gi";
import { TbTriangleSquareCircle, TbCompass, TbBrandTether, TbSparkles } from "react-icons/tb";
import { SignTitleBlock, ConstellationGraphic, HoroscopeContentCard, SignSpecsGrid } from "@/components/layout/signs";
import { planetUIConfig, PlanetUIConfig } from "@/config/planet-ui";

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

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const currentDateNormalized = new Date(currentDate);
    currentDateNormalized.setHours(0, 0, 0, 0);
    const diffDays = Math.round((currentDateNormalized.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    const prevTargetDate = subDays(currentDate, 1);
    const nextTargetDate = addDays(currentDate, 1);
    const prevDistance = Math.round((prevTargetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
    const nextDistance = Math.round((nextTargetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    const getVariant = (distance: number) => {
        if (distance === 0) return "outline";
        if (Math.abs(distance) === 1) return "default";
        return "galactic";
    };

    const getButtonText = (targetDateStr: string, isPrev: boolean) => {
        if (targetDateStr === todayStr) {
            return "TODAY";
        }
        if (diffDays === 0) {
            return isPrev ? "PREVIOUS" : "NEXT";
        }
        return null;
    };

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
    const planetUi = planetUIConfig[data.ruler];
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

                    {/* Left Column: Title Block + Horoscope */}
                    <div className="lg:col-span-5 flex flex-col space-y-12">
                        <SignTitleBlock
                            variant="horoscopes"
                            signName={data.name}
                            subtitle={displayDate}
                            motto={data.motto}
                            icon={<Icon className="absolute w-12 h-12 md:w-16 md:h-16 stroke-1" />}
                            elementFrameUrl={ui.elementFrameUrl}
                            borderColor={styles.primary}
                        />

                        {/* Horoscope Content - now above specs on mobile */}
                        <div className="lg:hidden">
                            <HoroscopeContentCard
                                horoscopeData={horoscopeData}
                                date={date}
                                styles={styles}
                            />
                        </div>

                        {/* Specs Grid */}
                        <SignSpecsGrid
                            specs={[
                                { label: "Element", value: ui.elementName, icon: ElementIcon, subValue: "" },
                                { label: "Modality", value: data.modality, icon: TbTriangleSquareCircle, subValue: "" },
                                { label: "Ruler", value: data.ruler.charAt(0).toUpperCase() + data.ruler.slice(1), icon: TbSparkles, subValue: planetUi?.rulerSymbol || "" },
                                { label: "House", value: HOUSE_NAMES[houseIndex] || "", icon: TbCompass, subValue: "" },
                            ]}
                        />
                    </div>

                    {/* Right Column: Horoscope Content Card - desktop only */}
                    <div className="hidden lg:block col-span-6 lg:col-span-7 lg:col-start-8">
                        <HoroscopeContentCard
                            horoscopeData={horoscopeData}
                            date={date}
                            styles={styles}
                        />
                    </div>
                </div>

                {/* Pagination at bottom */}
                <div className="flex flex-row gap-4 justify-between items-center mt-6">
                    <Button
                        variant={getVariant(prevDistance) as "outline" | "default" | "galactic"}
                        className="font-serif"
                        asChild
                    >
                        <Link
                            href={`/horoscopes/${sign}/${prevDateStr}`}
                            className="flex items-center"
                        >
                            <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform opacity-50" />
                            {getButtonText(prevDateStr, true) || prevDateStr}
                        </Link>
                    </Button>

                    <Button
                        variant={getVariant(nextDistance) as "outline" | "default" | "galactic"}
                        className="font-serif"
                        asChild
                    >
                        <Link
                            href={`/horoscopes/${sign}/${nextDateStr}`}
                            className="flex items-center"
                        >
                            {getButtonText(nextDateStr, false) || nextDateStr}
                            <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform opacity-50" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
