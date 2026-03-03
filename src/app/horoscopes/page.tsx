"use client";

import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { motion, Variants } from "motion/react";
import { CompactSignCard } from "@/components/horoscopes/compact-sign-card";
import { PageHeader } from "@/components/layout/page-header";
import { useState } from "react";

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    }
};

const mergedSigns = compositionalSigns.map(data => ({
    data,
    ui: zodiacUIConfig[data.id] || zodiacUIConfig['aries'] // Fallback just in case
}));

export default function HoroscopesHubPage() {
    const [activeTab, setActiveTab] = useState<string>("all");

    const filteredSigns = activeTab === "all"
        ? mergedSigns
        : mergedSigns.filter(sign => sign.ui.elementName.toLowerCase() === activeTab);

    return (
        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
            <PageHeader
                breadcrumbs={[
                    { label: "Home", href: "/" },
                    { label: "Horoscopes" },
                ]}
                title="Daily"
                subtitle="Horoscopes"
                activeFilter={activeTab}
                onFilterChange={setActiveTab}
                className="mb-12 lg:mb-16 gap-8"
            />

            {/* Grid */}
            <motion.div
                key={activeTab} // Added key to trigger re-animation on filter change
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mx-auto mb-20"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {filteredSigns.map(({ data, ui }) => (
                    <CompactSignCard key={data.id} data={data} ui={ui} />
                ))}
            </motion.div>

        </div>
    );
}
