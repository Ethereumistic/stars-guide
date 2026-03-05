"use client";

import { compositionalHouses } from "@/astrology/houses";
import { houseUIConfig } from "@/config/house-ui";
import { motion, Variants } from "motion/react";
import { CompactHouseCard } from "@/components/learn/houses/compact-house-card";
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

        let ticking = false;

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
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    updateActiveCard();
                });
                ticking = true;
            }
        };

        updateActiveCard();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [itemCount]);

    return { activeIndex, containerRef };
}

const mergedHouses = compositionalHouses.map(data => ({
    data,
    ui: houseUIConfig[data.id] || houseUIConfig[1] // Fallback just in case
}));

export default function HousesPage() {
    const [activeTab, setActiveTab] = useState<string>("all");

    const filteredHouses = activeTab === "all"
        ? mergedHouses
        : mergedHouses.filter(house => house.data.angularity.toLowerCase() === activeTab);

    const { activeIndex, containerRef } = useCenterCard(filteredHouses.length);

    return (
        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
            <PageHeader
                breadcrumbs={[
                    { label: "Home", href: "/" },
                    { label: "Learn", href: "/learn" },
                    { label: "Houses" },
                ]}
                title="The Twelve"
                subtitle="Houses"
                activeFilter={activeTab}
                onFilterChange={setActiveTab}

            />

            {/* Grid */}
            <motion.div
                ref={containerRef}
                key={activeTab}
                className={`grid gap-4 md:gap-6 mx-auto ${filteredHouses.length === 1
                    ? 'grid-cols-1 max-w-sm'
                    : filteredHouses.length === 2
                        ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl'
                        : filteredHouses.length === 3
                            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl'
                            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    }`}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {filteredHouses.map(({ data, ui }, index) => (
                    <div key={data.id} data-card-index={index}>
                        <CompactHouseCard
                            data={data}
                            ui={ui}
                            isActive={index === activeIndex}
                            href={`/learn/houses/${data.id}`}
                        />
                    </div>
                ))}
            </motion.div>
        </div>
    );
}