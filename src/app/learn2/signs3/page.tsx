"use client";

import { useState } from "react";
import { ZODIAC_SIGNS, ElementType } from "@/utils/zodiac";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
    TbArrowNarrowRight,
    TbCirclesRelation,
    TbSearch
} from "react-icons/tb";

// --- Color System (Thematic) ---
const THEME = {
    Fire: "from-orange-500 to-red-600",
    Earth: "from-emerald-500 to-stone-600",
    Air: "from-sky-400 to-indigo-500",
    Water: "from-blue-500 to-violet-600",
};

const TEXTURE_URL = "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E";

export default function SignsPage3() {
    const [filter, setFilter] = useState<ElementType | "All">("All");

    const filteredSigns = filter === "All"
        ? ZODIAC_SIGNS
        : ZODIAC_SIGNS.filter(s => s.element === filter);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-stone-200 font-sans selection:bg-white selection:text-black relative overflow-x-hidden">
            {/* Ambient Noise Texture */}
            <div className="fixed inset-0 pointer-events-none z-50 opacity-20 mix-blend-overlay" style={{ backgroundImage: `url(${TEXTURE_URL})` }} />

            {/* Background Ambient Glows */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-white/5 blur-[120px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 mix-blend-soft-light" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none translate-x-1/2 translate-y-1/2 mix-blend-soft-light" />

            <main className="relative z-10 max-w-[1400px] mx-auto px-6 py-24">

                {/* -- Header Section -- */}
                <header className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-12 border-b border-white/10 pb-12">
                    <div>
                        <div className="flex items-center gap-3 text-white/40 mb-6 font-mono text-xs tracking-widest uppercase">
                            <span className="w-2 h-2 bg-white/40 rounded-full animate-pulse" />
                            System: Tropical Zodiac
                        </div>
                        <h1 className="text-6xl md:text-8xl font-serif tracking-tighter text-transparent bg-clip-text bg-linear-to-b from-white to-white/40">
                            The Archive
                        </h1>
                    </div>

                    <div className="flex flex-col items-end gap-6">
                        <p className="text-right text-stone-400 max-w-sm text-sm leading-relaxed font-mono">
                            Directory of the twelve ecliptic sectors. <br />
                            Select a frequency to filter archetypes.
                        </p>

                        {/* Filter Tabs */}
                        <div className="flex flex-wrap justify-end gap-2">
                            {["All", "Fire", "Earth", "Air", "Water"].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f as ElementType | "All")}
                                    className={`
                                        px-4 py-2 text-xs font-mono uppercase tracking-widest border transition-all duration-300
                                        ${filter === f
                                            ? "bg-white text-black border-white"
                                            : "bg-transparent text-white/40 border-white/10 hover:border-white/40 hover:text-white"
                                        }
                                    `}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                {/* -- Grid Section -- */}
                <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-white/10 border border-white/10"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredSigns.map((sign, index) => (
                            <ArchiveCard key={sign.id} sign={sign} index={index} />
                        ))}
                    </AnimatePresence>
                </motion.div>

                {/* -- Footer -- */}
                <footer className="mt-24 text-center font-mono text-xs text-white/20 uppercase tracking-widest">
                    End of Ledger // {filteredSigns.length} Entries Found
                </footer>

            </main>
        </div>
    );
}

function ArchiveCard({ sign, index }: { sign: any, index: number }) {
    const Icon = sign.icon;
    const ElementIcon = sign.elementIcon;
    const gradient = THEME[sign.element as ElementType];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="group relative h-[420px] bg-[#0c0c0c] overflow-hidden hover:z-20 border border-transparent hover:border-white/20 transition-colors"
        >
            <Link href={`/learn/signs/${sign.id}`} className="block h-full w-full relative">

                {/* 1. Background Constellation (Large & Architectural) */}
                <div className="absolute top-0 right-0 w-[180%] h-[180%] -translate-y-1/4 translate-x-1/4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none grayscale">
                    <img src={sign.constellation} alt="" className="w-full h-full object-contain rotate-12 group-hover:rotate-6 transition-transform duration-1000 ease-out" />
                </div>

                {/* 2. Top Bar: Index & Date */}
                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10">
                    <span className="font-mono text-xs text-white/30 group-hover:text-white transition-colors">
                        {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <div className="flex flex-col items-end">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                            {sign.dates}
                        </span>
                        {/* Hover Element Badge */}
                        <div className={`
                            mt-2 px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest bg-linear-to-r ${gradient} text-white
                            opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300
                        `}>
                            {sign.element}
                        </div>
                    </div>
                </div>

                {/* 3. Central Visual (Icon) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative">
                        {/* Glowing backdrop circle */}
                        <div className={`
                            absolute inset-0 bg-linear-to-tr ${gradient} blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-700 rounded-full scale-150
                        `} />
                        <Icon className="w-24 h-24 text-stone-700 group-hover:text-stone-100 transition-colors duration-500 ease-out relative z-10" strokeWidth={1} />
                    </div>
                </div>

                {/* 4. Bottom Info Area */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10 bg-linear-to-t from-[#0c0c0c] to-transparent">
                    <div className="flex items-end justify-between">
                        <div>
                            <h2 className="text-3xl font-serif text-white tracking-tight mb-2 group-hover:translate-x-1 transition-transform duration-300">
                                {sign.name}
                            </h2>
                            <div className="h-px w-0 bg-white group-hover:w-full transition-all duration-500 ease-out mb-3 opacity-50" />
                            <p className="text-sm text-stone-400 font-medium leading-relaxed max-w-[90%] opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 delay-75">
                                {sign.traits}
                            </p>
                        </div>

                        {/* Action Icon */}
                        <div className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">
                            <TbArrowNarrowRight className="w-4 h-4 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                        </div>
                    </div>
                </div>

                {/* 5. Decorative Corners */}
                <div className="absolute top-4 left-4 w-2 h-2 border-t border-l border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-4 right-4 w-2 h-2 border-b border-r border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            </Link>
        </motion.div>
    );
}