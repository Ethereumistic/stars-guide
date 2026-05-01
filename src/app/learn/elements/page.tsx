"use client";

import { motion, Variants } from "motion/react";
import { PageHeader } from "@/components/layout/page-header";
import { CompactElementCard, CompactModeCard, CompactPolarityCard } from "@/components/learn/elements";
import { ELEMENTS_LEARN, MODES_LEARN, POLARITY_LEARN, ElementType, ModeType, PolarityType } from "@/astrology/elements";

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};

const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" },
    },
};

const ELEMENT_ORDER: ElementType[] = ["Fire", "Earth", "Air", "Water"];
const MODE_ORDER: ModeType[] = ["Cardinal", "Fixed", "Mutable"];
const POLARITY_ORDER: PolarityType[] = ["Yang", "Yin"];

export default function ElementsPage() {
    return (
        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
            <PageHeader
                breadcrumbs={[
                    { label: "Home", href: "/" },
                    { label: "Learn", href: "/learn" },
                    { label: "Elements" },
                ]}
                title="Elements"
                subtitle="Modes & Polarity"
                showElementFilter={false}
            />

            {/* ── Elements ─────────────────────────────────────────── */}
            <motion.section
                variants={sectionVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                className="mb-20"
            >
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {ELEMENT_ORDER.map((id) => (
                        <CompactElementCard
                            key={id}
                            data={ELEMENTS_LEARN[id]}
                            href={`/learn/elements/${id.toLowerCase()}`}
                        />
                    ))}
                </motion.div>
            </motion.section>

            {/* ── Modes ─────────────────────────────────────────────── */}
            <motion.section
                variants={sectionVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                className="mb-20"
            >
                <div className="mb-8">
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-3">
                        Modalities
                    </span>
                    <h2 className="text-3xl md:text-4xl font-serif text-white tracking-tight">
                        Cardinal · Fixed · Mutable
                    </h2>
                </div>

                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-60px" }}
                >
                    {MODE_ORDER.map((id) => (
                        <CompactModeCard
                            key={id}
                            data={MODES_LEARN[id]}
                        />
                    ))}
                </motion.div>
            </motion.section>

            {/* ── Polarity ──────────────────────────────────────────── */}
            <motion.section
                variants={sectionVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
            >
                <div className="mb-8">
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-3">
                        Polarity
                    </span>
                    <h2 className="text-3xl md:text-4xl font-serif text-white tracking-tight">
                        Yang · Yin
                    </h2>
                </div>

                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-w-3xl"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-60px" }}
                >
                    {POLARITY_ORDER.map((id) => (
                        <CompactPolarityCard
                            key={id}
                            data={POLARITY_LEARN[id]}
                        />
                    ))}
                </motion.div>
            </motion.section>
        </div>
    );
}
