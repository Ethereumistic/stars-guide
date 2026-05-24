"use client";

import { motion, Variants } from "motion/react";
import { CompactCategoryCard } from "@/components/learn/compact-category-card";
import { PageHeader } from "@/components/layout/page-header";

import {
    TbZodiacAries,
    TbHomeSearch,
    TbPlanet,
    TbCompass,
    TbFlame,
} from "react-icons/tb";

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

const CATEGORIES = [
    {
        id: "signs",
        title: "Zodiac Signs",
        subtitle: "The Twelve Archetypes",
        description: "Explore the ancient guardians of the ecliptic. Each sign holds a unique frequency that shapes human destiny and character.",
        icon: TbZodiacAries,
        href: "/learn/signs",
        gradient: "from-primary/30 to-galactic/30",
        status: "Available"
    },
    {
        id: "houses",
        title: "The Houses",
        subtitle: "Sectors of Life",
        description: "From self-image to career, discover how the twelve houses define the specific areas of your life where cosmic energies manifest.",
        icon: TbHomeSearch,
        href: "/learn/houses",
        gradient: "from-blue-500/10 via-indigo-500/10 to-transparent",
        status: "Available"
    },
    {
        id: "planets",
        title: "Planetary Bodies",
        subtitle: "Celestial Actors",
        description: "The Sun, Moon, and planets are the drivers of our inner psyche. Learn their deep mythology and psychological archetypes.",
        icon: TbPlanet,
        href: "/learn/planets",
        gradient: "from-rose-500/10 via-purple-500/10 to-transparent",
        status: "Available"
    },
    {
        id: "aspects",
        title: "Aspects",
        subtitle: "Geometric Wisdom",
        description: "Conjunctions, squares, and trines—the sacred geometry between planets that reveals internal conflicts and natural talents.",
        icon: TbCompass,
        href: "/learn/aspects",
        gradient: "from-emerald-500/10 via-cyan-500/10 to-transparent",
        status: "Available"
    },
    {
        id: "elements",
        title: "Elements",
        subtitle: "Modes & Polarity",
        description: "Fire, Earth, Air, Water — the primal forces that shape every sign's temperament. Explore the four elements, three modalities, and the Yang-Yin polarity that underpins the entire zodiac.",
        icon: TbFlame,
        href: "/learn/elements",
        gradient: "from-orange-500/10 via-amber-500/10 to-transparent",
        status: "Available"
    }
];

export default function LearnPage() {
    return (
        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
            <PageHeader
                breadcrumbs={[
                    { label: "Home", href: "/" },
                    { label: "Learn" },
                ]}
                title="Celestial"
                subtitle="Archive"
                showElementFilter={false}
                className="mb-12 lg:mb-16 gap-8"
            />

            <motion.div
                className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mx-auto"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {CATEGORIES.map((category) => (
                    <CompactCategoryCard key={category.id} category={category} />
                ))}
            </motion.div>
        </div>
    );
}
