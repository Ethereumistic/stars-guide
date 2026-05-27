"use client";

import { compositionalPlanets } from "@/astrology/planets";
import { planetUIConfig } from "@/config/planet-ui";
import { motion, Variants } from "motion/react";
import { CompactPlanetCard } from "@/components/horoscopes/compact-planet-card";
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

// Exclude nodes/chiron if they exist, keep only the 10 main bodies
const MAJORS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

const planetList = compositionalPlanets
    .filter(p => MAJORS.includes(p.id))
    .map(data => ({
        data,
        ui: planetUIConfig[data.id] || planetUIConfig['sun']
    }));

export default function PlanetsHubPage() {
    const { activeIndex, containerRef } = useCenterCard(planetList.length);

    return (
        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 py-8  ">

            <div className="relative z-10 w-full mb-16">
                <PageHeader
                    breadcrumbs={[
                        { label: "Home", href: "/" },
                        { label: "Learn", href: "/learn" },
                        { label: "Planets" },
                    ]}
                    title="Celestial"
                    subtitle="Archetypes"
                />

            </div>

            {/* BOLD Asymmetric Layout Grid - Sun & Moon in middle columns */}
            <motion.div
                ref={containerRef}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mx-auto translate-y-0 xl:-translate-y-36"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {planetList.map(({ data, ui }, index) => {
                    // Sun (index 0) → col 2, Moon (index 1) → col 3, Mercury (index 2) → col 1 (new row)
                    const colStartClass =
                        index === 0 ? 'xl:col-start-3' :
                            index === 1 ? 'xl:col-start-4' :
                                index === 2 ? 'xl:col-start-1' : '';

                    return (
                        <div key={data.id} data-card-index={index} className={colStartClass}>
                            <CompactPlanetCard
                                data={data}
                                ui={ui}
                                isActive={index === activeIndex}
                            />
                        </div>
                    );
                })}
            </motion.div>
        </div>
    );
}
