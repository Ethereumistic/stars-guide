"use client";

import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { motion, Variants } from "motion/react";
import { CompactSignCard } from "@/components/horoscopes/compact-sign-card";
import { PageHeader } from "@/components/layout/page-header";
import { useState, useRef, useEffect } from "react";

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

function useCenterCard(itemCount: number) {
    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateActiveCard = () => {
            const cards = container.querySelectorAll('[data-card-index]');
            const viewportCenter = window.innerHeight / 2;

            let closestIndex = -1;
            let closestDistance = Infinity;

            cards.forEach((card) => {
                const rect = (card as HTMLElement).getBoundingClientRect();
                const cardCenter = rect.top + rect.height / 2;
                const distance = Math.abs(cardCenter - viewportCenter);

                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestIndex = parseInt((card as HTMLElement).dataset.cardIndex || '-1', 10);
                }
            });

            setActiveIndex(closestIndex);
        };

        updateActiveCard();
        window.addEventListener('scroll', updateActiveCard, { passive: true });
        window.addEventListener('resize', updateActiveCard);

        return () => {
            window.removeEventListener('scroll', updateActiveCard);
            window.removeEventListener('resize', updateActiveCard);
        };
    }, [itemCount]);

    return { activeIndex, containerRef };
}

const mergedSigns = compositionalSigns.map(data => ({
    data,
    ui: zodiacUIConfig[data.id] || zodiacUIConfig['aries'] // Fallback just in case
}));

export default function SignsPage() {
    const [activeTab, setActiveTab] = useState<string>("all");

    const filteredSigns = activeTab === "all"
        ? mergedSigns
        : mergedSigns.filter(sign => sign.ui.elementName.toLowerCase() === activeTab);

    const { activeIndex, containerRef } = useCenterCard(filteredSigns.length);

    return (
        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
            <PageHeader
                breadcrumbs={[
                    { label: "Home", href: "/" },
                    { label: "Learn", href: "/learn" },
                    { label: "Signs" },
                ]}
                title="The Twelve"
                subtitle="Guardians"
                activeFilter={activeTab}
                onFilterChange={setActiveTab}
            />

            {/* Grid */}
            <motion.div
                ref={containerRef}
                key={activeTab}
                className={`grid gap-4 md:gap-6 mx-auto  ${filteredSigns.length === 1
                        ? 'grid-cols-1 max-w-sm'
                        : filteredSigns.length === 2
                            ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl'
                            : filteredSigns.length === 3
                                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl'
                                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    }`}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {filteredSigns.map(({ data, ui }, index) => (
                    <div key={data.id} data-card-index={index}>
                        <CompactSignCard
                            data={data}
                            ui={ui}
                            isActive={index === activeIndex}
                            href={`/learn/signs/${data.id}`}
                        />
                    </div>
                ))}
            </motion.div>

        </div>
    );
}

