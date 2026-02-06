"use client";

import { ZODIAC_SIGNS, ElementType, ELEMENT_STYLES as GLOBAL_ELEMENT_STYLES } from "@/utils/zodiac";
import { ShootingStars } from "@/components/hero/shooting-stars";
import { StarsBackground } from "@/components/hero/stars-background";
import { motion, Variants } from "motion/react";
import Link from "next/link";
import {
    TbArrowNarrowLeft,
    TbSparkles
} from "react-icons/tb";
import { Button } from "@/components/ui/button";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const ELEMENT_STYLES = GLOBAL_ELEMENT_STYLES;

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const cardVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 40,
        scale: 0.9,
        rotateX: -15
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        rotateX: 0,
        transition: {
            duration: 0.9,
            ease: [0.22, 1, 0.36, 1]
        }
    }
};

export default function SignsPage() {
    return (
        <div className="relative min-h-screen w-full overflow-x-hidden ">





            <main className="relative z-10 max-w-[1600px] mx-auto px-8 py-24">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-32">
                    <div className="space-y-6">
                        <Breadcrumb className="mb-6">
                            <BreadcrumbList className="text-primary/60">
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild className="hover:text-primary transition-colors font-mono text-xs uppercase tracking-widest">
                                        <Link href="/learn">Learn</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="text-primary font-mono text-xs uppercase tracking-widest">Signs</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                        <h1 className="text-5xl md:text-6xl font-serif font-bold text-white tracking-tighter">
                            The Twelve
                            <span className="italic text-primary drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]"> Guardians</span>
                        </h1>
                    </div>

                    <div className="max-w-md">
                        <p className="text-amber-100/70 font-sans text-lg leading-relaxed italic">
                            Twelve divine archetypes dance across the heavens, each a living constellation embodying the eternal dance of elements and cosmic forces.
                        </p>
                        <div className="mt-8 flex items-center gap-3">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse delay-75"></div>
                            <div className="w-2 h-2 bg-primary/30 rounded-full animate-pulse delay-150"></div>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {ZODIAC_SIGNS.map((sign) => (
                        <SignCard key={sign.id} sign={sign} />
                    ))}
                </motion.div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="mt-40 pt-24 border-t border-amber-400/10 text-center"
                >
                    <div className="inline-block relative">
                        <div className="absolute -inset-8 bg-amber-400/5 blur-3xl rounded-full"></div>
                        <p className="relative text-amber-400/50 font-sans tracking-[0.4em] uppercase text-xs italic">
                            ✦ Ad Astra Per Aspera ✦
                        </p>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}

function SignCard({ sign }: { sign: any }) {
    const Icon = sign.icon;
    const ElementIcon = sign.elementIcon;
    const styles = ELEMENT_STYLES[sign.element as ElementType];

    return (
        <motion.div variants={cardVariants} className="perspective-[1000px]">
            <Link
                href={`/learn/signs/${sign.id}`}
                className="group relative block h-full"
            >


                {/* Main Card */}
                <div className="relative h-full overflow-hidden rounded-2xl transition-all duration-700 group-hover:scale-[1.02]">
                    {/* Card background with gradient */}
                    <div
                        className="absolute inset-0  backdrop-blur-[0.5px]"
                        style={{
                            background: `linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)`,
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderImage: `linear-gradient(135deg, ${styles.border}, transparent) 1`
                        }}
                    />

                    {/* Element gradient overlay */}
                    <div
                        className="absolute inset-0 opacity-0  group-hover:opacity-30 transition-opacity duration-700"
                        style={{ background: styles.gradient }}
                    />

                    {/* Constellation watermark (Lower Third) */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden pointer-events-none">
                        <img
                            src={sign.constellation}
                            alt=""
                            className="absolute bottom-[-15%] left-1/2 -translate-x-1/2 w-[130%] h-auto object-contain opacity-50 scale-110 transition-all duration-1000 group-hover:opacity-0 group-hover:scale-100"
                            style={{
                                filter: `drop-shadow(0 0 15px ${styles.glow})`
                            }}
                        />
                    </div>

                    {/* Radial glow effect */}
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-700 blur-3xl"
                        style={{ backgroundColor: styles.glow }}
                    />

                    {/* Card content */}
                    <div className="relative p-8 flex flex-col items-center justify-center text-center h-full min-h-[500px]">

                        <div className="mt-8">
                            {/* Dates (Top Left) */}
                            <div className="absolute top-6 left-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <p
                                    className="text-[10px] font-sans uppercase tracking-[0.2em]"
                                    style={{ color: styles.secondary }}
                                >
                                    {sign.dates}
                                </p>
                            </div>

                            {/* Element Badge (Top Right) */}
                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <div className="flex items-center gap-2">
                                    <ElementIcon
                                        className="w-3.5 h-3.5"
                                        style={{ color: styles.primary }}
                                    />
                                    <span
                                        className="text-[9px] font-sans uppercase tracking-[0.2em]"
                                        style={{ color: styles.secondary }}
                                    >
                                        {sign.element}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Sign icon (Always visible, moves slightly on hover) */}
                        <div className="relative mb-6 flex items-center justify-center w-32 h-32 mx-auto transition-all duration-700 translate-y-4 group-hover:translate-y-0">
                            {/* Element Frame PNG (Appears on Hover) */}
                            <img
                                src={sign.frame}
                                alt=""
                                className="absolute inset-0 w-full h-full object-contain opacity-0 group-hover:opacity-60 group-hover:rotate-36 transition-all duration-[1.5s] ease-out"
                                style={{
                                    filter: `drop-shadow(0 0 15px ${styles.glow})`
                                }}
                            />

                            {/* Icon glow (Appears on Hover) */}
                            <div
                                className="absolute inset-0 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-700"
                                style={{ backgroundColor: styles.glow }}
                            />

                            {/* Main icon (Visible, scales on hover) */}
                            <Icon
                                className="w-16 h-16 relative z-10 text-amber-100 group-hover:text-white group-hover:scale-110 transition-all duration-700"
                                style={{
                                    filter: `drop-shadow(0 0 10px ${styles.glow})`
                                }}
                            />
                        </div>

                        {/* Sign name (Centered but lowered by 15%, moves to top on hover) */}
                        <div className="space-y-3 mb-6 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] -translate-y-[20px] group-hover:translate-y-0">
                            <h2
                                className="text-4xl font-serif tracking-wide transition-all duration-500 group-hover:text-white!"
                                style={{
                                    color: styles.secondary,
                                    textShadow: `0 0 10px ${styles.glow}`
                                }}
                            >
                                {sign.name}
                            </h2>

                            {/* Decorative divider */}
                            {/* <div className="flex items-center justify-center gap-2">
                                <div className="w-3 h-3 rotate-45 border" style={{ borderColor: styles.primary, opacity: 0.3 }}></div>
                                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: styles.primary, opacity: 0.6 }}></div>
                                <div className="w-3 h-3 rotate-45 border" style={{ borderColor: styles.primary, opacity: 0.3 }}></div>
                            </div> */}

                            {/* Dates removed from flow */}
                        </div>

                        {/* Traits description (Appears on Hover) */}
                        <div className="flex-grow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-4 group-hover:translate-y-0">
                            <p className="text-lg font-sans text-amber-100/80 leading-relaxed italic px-2">
                                {sign.traits}
                            </p>
                        </div>

                        {/* Explore Button (Styled Button) */}
                        <div className="mt-8 pt-4 w-full flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                            <Button
                                variant={sign.element.toLowerCase() as any}
                                className="h-11 px-8  border-primary/40 relative group/btn"
                            >
                                <ElementIcon
                                    className="w-4 h-4 transition-transform"
                                    style={{ color: styles.primary }}
                                />
                                <span className="mx-2 ">Explore</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Hover shadow glow */}
                <div
                    className="absolute inset-0 -z-10 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 blur-2xl"
                    style={{ backgroundColor: styles.glow }}
                />
            </Link>
        </motion.div>
    );
}