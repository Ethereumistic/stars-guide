"use client";

import { compositionalSigns, SignData } from "@/astrology/signs";
import { compositionalPlanets, PlanetData } from "@/astrology/planets";
import { compositionalAspects, AspectData } from "@/astrology/aspects";
import { compositionalHouses, HouseData } from "@/astrology/houses";
import { zodiacUIConfig, SignUIConfig } from "@/config/zodiac-ui";
import { planetUIConfig, PlanetUIConfig } from "@/config/planet-ui";
import { aspectUIConfig, AspectUIConfig } from "@/config/aspects-ui";
import { houseUIConfig, HouseUIConfig } from "@/config/house-ui";
import { CompactSignCard } from "@/components/learn/signs/compact-sign-card";
import { CompactPlanetCard } from "@/components/horoscopes/compact-planet-card";
import { CompactAspectCard } from "@/components/learn/aspects/compact-aspect-card";
import { CompactHouseCard } from "@/components/learn/houses/compact-house-card";
import { CompactElementCard } from "@/components/learn/elements/compact-element-card";
import { ELEMENTS_LEARN, ElementType } from "@/astrology/elements";
import { motion } from "motion/react";

export type ArchiveCategory = "signs" | "planets" | "aspects" | "houses" | "elements";

interface SystemArchiveLinkagesProps {
    /** Which category this archive belongs to */
    category: ArchiveCategory;
    /** The id of the current item to exclude from the list */
    currentId: string | number;
    /** How many cards to show (default: 6) */
    count?: number;
    /** Show a top border line (default: true) */
    showBorder?: boolean;
}

const MAJOR_PLANETS = [
    "sun", "moon", "mercury", "venus", "mars",
    "jupiter", "saturn", "uranus", "neptune", "pluto",
];

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.06,
        },
    },
};

export function SystemArchiveLinkages({
    category,
    currentId,
    count = 6,
    showBorder = true,
}: SystemArchiveLinkagesProps) {
    return (
        <section className={`${showBorder ? "border-t border-white/10" : ""} pt-24 pb-12 flex flex-col items-center`}>
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/30 block mb-12">
                System Archive Linkages
            </span>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-3xl"
            >
                {category === "signs" && renderSignCards(currentId as string, count)}
                {category === "planets" && renderPlanetCards(currentId as string, count)}
                {category === "aspects" && renderAspectCards(currentId as string, count)}
                {category === "houses" && renderHouseCards(Number(currentId), count)}
                {category === "elements" && renderElementCards(currentId as string, count)}
            </motion.div>
        </section>
    );
}

// ─── Sign Cards ────────────────────────────────────────────────────────────────

function renderSignCards(currentId: string, count: number) {
    return compositionalSigns
        .filter(s => s.id !== currentId)
        .slice(0, count)
        .map(s => {
            const ui = zodiacUIConfig[s.id];
            if (!ui) return null;
            return (
                <CompactSignCard
                    key={s.id}
                    data={s}
                    ui={ui}
                    href={`/learn/signs/${s.id}`}
                />
            );
        });
}

// ─── Planet Cards ──────────────────────────────────────────────────────────────

function renderPlanetCards(currentId: string, count: number) {
    return compositionalPlanets
        .filter(p => MAJOR_PLANETS.includes(p.id))
        .filter(p => p.id !== currentId)
        .slice(0, count)
        .map(p => {
            const ui = planetUIConfig[p.id];
            if (!ui) return null;
            return (
                <CompactPlanetCard
                    key={p.id}
                    data={p}
                    ui={ui}
                    href={`/learn/planets/${p.id}`}
                />
            );
        });
}

// ─── Aspect Cards ──────────────────────────────────────────────────────────────

function renderAspectCards(currentId: string, count: number) {
    return compositionalAspects
        .filter(a => a.id !== currentId)
        .slice(0, count)
        .map(a => {
            const ui = aspectUIConfig[a.id];
            if (!ui) return null;
            return (
                <CompactAspectCard
                    key={a.id}
                    data={a}
                    ui={ui}
                    href={`/learn/aspects/${a.id}`}
                />
            );
        });
}

// ─── House Cards ───────────────────────────────────────────────────────────────

function renderHouseCards(currentId: number, count: number) {
    return compositionalHouses
        .filter(h => h.id !== currentId)
        .slice(0, count)
        .map(h => {
            const ui = houseUIConfig[h.id];
            if (!ui) return null;
            return (
                <CompactHouseCard
                    key={h.id}
                    data={h}
                    ui={ui}
                    href={`/learn/houses/${h.id}`}
                />
            );
        });
}

// ─── Element Cards ──────────────────────────────────────────────────────────────

const ELEMENT_ORDER: ElementType[] = ["Fire", "Earth", "Air", "Water"];

function renderElementCards(currentId: string, count: number) {
    return ELEMENT_ORDER
        .filter(e => e !== currentId)
        .slice(0, count)
        .map(e => {
            const data = ELEMENTS_LEARN[e];
            if (!data) return null;
            return (
                <CompactElementCard
                    key={e}
                    data={data}
                    href={`/learn/elements/${e.toLowerCase()}`}
                />
            );
        });
}
