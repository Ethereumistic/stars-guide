"use client";

import { compositionalHouses } from "@/astrology/houses";
import { houseUIConfig } from "@/config/house-ui";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { motion } from "motion/react";
import { useParams, notFound } from "next/navigation";
import {
    TbCompass,
    TbStar,
    TbWorld,
    TbLayersSubtract,
} from "react-icons/tb";
import { SystemArchiveLinkages } from "@/components/learn/system-archive-linkages";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import {
    HouseTitleBlock,
    HouseSpecsGrid,
    HouseEssence,
    HouseGraphic,
    HouseRealWorldManifestationsV1,
    HouseRealWorldManifestationsV2,
} from "@/components/learn/houses";

export default function HouseDetailPage() {
    const params = useParams();
    const houseParam = params.house as string;

    // Accept either numeric id ("1") or ordinal ("first-house")
    const houseId = parseInt(houseParam, 10);
    const data = compositionalHouses.find(h => h.id === houseId);
    const ui = houseUIConfig[houseId];

    if (!data || !ui) {
        return notFound();
    }

    const themeColor = ui.themeColor;
    const styles = {
        primary: themeColor,
        glow: themeColor,
    };

    return (
        <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
            {/* Ambient Base Layer */}
            <div className="fixed inset-0 z-0 pointer-events-none contain-strict">
                <div
                    className="absolute top-[-10%] left-[0%] w-[140%] h-[140%] opacity-[0.12] mix-blend-screen"
                    style={{
                        background: `radial-gradient(circle at 50% 50%, ${themeColor} 0%, transparent 60%)`
                    }}
                />
            </div>

            <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
                <PageBreadcrumbs
                    items={[
                        { label: "Home", href: "/" },
                        { label: "Learn", href: "/learn" },
                        { label: "Houses", href: "/learn/houses" },
                    ]}
                    currentPage={`${data.name} // ${data.angularity.toUpperCase()}`}
                    currentPageColor={themeColor}
                    showBorder={false}
                />

                {/* Hero Layout — mirrors sign page 1:1 */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start mb-48">

                    {/* Left Column: Dossier */}
                    <div className="lg:col-span-5 space-y-12">

                        {/* Title Block */}
                        <HouseTitleBlock
                            houseName={data.name}
                            romanNumeral={data.romanNumeral}
                            motto={data.motto}
                            archetypeName={data.archetypeName}
                            borderColor={themeColor}
                        />

                        {/* Specs Grid */}
                        <HouseSpecsGrid
                            specs={[
                                {
                                    label: "Natural Sign",
                                    value: data.naturalSign,
                                    icon: zodiacUIConfig[data.naturalSignId]?.icon || TbStar,
                                    subValue: "",
                                },
                                {
                                    label: "Angularity",
                                    value: data.angularity,
                                    icon: TbCompass,
                                    subValue: "",
                                },
                                {
                                    label: "Keyword",
                                    value: data.keyword,
                                    icon: TbLayersSubtract,
                                    subValue: data.romanNumeral,
                                    houseIcon: data.houseIcon,
                                },
                                {
                                    label: "House Number",
                                    value: `${data.id} of 12`,
                                    icon: TbWorld,
                                    subValue: "",
                                },
                            ]}
                        />

                        {/* Developmental Theme / Essence */}
                        <HouseEssence theme={data.developmentalTheme} />
                    </div>

                    {/* Right Column: House Wheel Graphic */}
                    <HouseGraphic
                        houseId={data.id}
                        romanNumeral={data.romanNumeral}
                        houseName={data.name}
                        keyword={data.keyword}
                        angularity={data.angularity}
                        styles={styles}
                        size="large"
                    />
                </section>

                {/* Structured Data Grid */}
                <div className="grid grid-cols-2 gap-8 mb-48">

                    {/* Real-World Manifestations */}
                    <HouseRealWorldManifestationsV1
                        archetypeName={data.archetypeName}
                        primaryArena={data.primaryArena}
                        realWorldManifestations={data.realWorldManifestations}
                        compositionalPrepositionalPhrase={data.compositionalPrepositionalPhrase}
                        developmentalTheme={data.developmentalTheme}
                        angularity={data.angularity}
                        themeColor={themeColor}
                        borderColor={themeColor}
                    />
                </div>

                <SystemArchiveLinkages category="houses" currentId={data.id} />
            </div>
        </div>
    );
}