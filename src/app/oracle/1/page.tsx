"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Menu, MessageSquare, PlusCircle, Sparkles, ChevronRight, Hash, Star } from "lucide-react";
import { StarsBackground } from "@/components/hero/stars-background";
import { ShootingStars } from "@/components/hero/shooting-stars";
import { GiPolarStar, GiStarSwirl, GiCursedStar } from "react-icons/gi";

const categories = ["SELF", "LOVE", "WORK", "SOCIAL", "DESTINY", "SPIRITUALITY"];
const templateQuestions: Record<string, string[]> = {
    SELF: ["AM I BEING TRUE TO MYSELF?", "HOW DO I MAKE GOOD CHOICES?", "WILL I EVER UNDERSTAND MY LIFE?"],
    LOVE: ["HOW DO I STOP THINKING ABOUT THEM?", "WHO AM I REALLY LOOKING FOR?", "WHAT IS MY TYPE?", "WHO AM I IN RELATIONSHIPS?"],
    WORK: ["AM I ON THE RIGHT CAREER PATH?", "HOW TO FIND MORE FULFILLMENT AT WORK?", "WHEN WILL MY EFFORTS BE RECOGNIZED?"],
    SOCIAL: ["HOW DO I LEARN TO BE MORE TRUSTING?", "WHY DO I FEEL MISUNDERSTOOD?", "HOW CAN I ATTRACT BETTER FRIENDS?"],
    DESTINY: ["AM I IN CONTROL OF MY DESTINY?", "WHAT IS MY KARMIC LESSON?", "WHERE IS MY LIFE HEADING?"],
    SPIRITUALITY: ["SHOULD I TRY MEDITATION?", "HOW CAN I CONNECT WITH MY SPIRIT GUIDES?", "WHAT IS BLOCKING MY INTUITION?"]
};

// The Oracle Layout Variant 1: Maximalist Galactic Oracle
export default function OracleVariant1() {
    const [activeTab, setActiveTab] = useState("LOVE");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [input, setInput] = useState("");

    return (
        <div className="flex h-[calc(100dvh-80px)] w-full bg-background overflow-hidden relative font-sans text-white selection:bg-galactic/50">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 opacity-40">
                <StarsBackground starDensity={0.0003} />
            </div>
            <div className="absolute inset-0 z-0 pointer-events-none">
                <ShootingStars starColor="#9d4edd" trailColor="#9d4edd" minSpeed={15} maxSpeed={30} minDelay={100} maxDelay={300} />
            </div>

            {/* Extremely intense ambient glow behind the main section */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-galactic/30 rounded-full blur-[150px] pointer-events-none opacity-50 z-0" />

            {/* Application Shell */}
            <div className="relative z-10 flex w-full h-full p-4 gap-4 max-w-[100rem] mx-auto">

                {/* Sidebar */}
                <AnimatePresence initial={false}>
                    {sidebarOpen && (
                        <motion.div
                            initial={{ width: 0, opacity: 0, filter: "blur(10px)" }}
                            animate={{ width: 340, opacity: 1, filter: "blur(0px)" }}
                            exit={{ width: 0, opacity: 0, filter: "blur(10px)" }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full relative z-20"
                        >
                            <div className="h-full w-[340px] flex flex-col bg-background/60 backdrop-blur-3xl rounded-[2rem] border border-galactic/30 shadow-[0_0_40px_rgba(157,78,221,0.15)] overflow-hidden">

                                {/* Inner glow line */}
                                <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-galactic to-transparent opacity-50" />

                                <div className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex items-center justify-center p-2 rounded-xl bg-galactic/20 border border-galactic/40 text-galactic shadow-[0_0_15px_rgba(157,78,221,0.3)]">
                                            <GiCursedStar className="w-5 h-5 drop-shadow-[0_0_8px_rgba(157,78,221,0.8)] animate-[spin_10s_linear_infinite]" />
                                        </div>
                                        <h2 className="text-xl font-serif font-bold tracking-wider uppercase text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Oracle</h2>
                                    </div>
                                    <button
                                        onClick={() => setSidebarOpen(false)}
                                        className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                    >
                                        <Menu className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="px-5 pb-4">
                                    <button className="flex w-full items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-medium text-sm text-white/90 group relative overflow-hidden">
                                        <div className="absolute inset-0 bg-linear-to-r from-galactic/0 via-galactic/20 to-galactic/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                        <PlusCircle className="w-4 h-4 text-galactic" />
                                        New Divination
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-8 scrollbar-thin scrollbar-thumb-white/10 cursor-pointer">

                                    {/* History Section */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold tracking-[0.2em] text-white/40 uppercase pl-2 flex items-center gap-2">
                                            <MessageSquare className="w-3 h-3" /> Past Whispers
                                        </h3>
                                        <div className="space-y-1">
                                            {["What is the meaning behind the eclipse?", "Why do I feel a pull to the ocean?", "Are my actions aligned?"].map((h, i) => (
                                                <div key={i} className="px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 truncate transition-colors cursor-pointer flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-galactic/50" />
                                                    {h}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Categories Matrix */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold tracking-[0.2em] text-white/40 uppercase pl-2 flex items-center gap-2">
                                            <Hash className="w-3 h-3" /> Realms of Inquiry
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map((c) => (
                                                <button
                                                    key={c}
                                                    onClick={() => setActiveTab(c)}
                                                    className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold tracking-wider rounded-lg border transition-all duration-300 ${activeTab === c ? "bg-galactic/20 border-galactic/60 text-white shadow-[0_0_15px_rgba(157,78,221,0.3)]" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}`}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>

                                        <AnimatePresence mode="popLayout">
                                            <motion.div
                                                key={activeTab}
                                                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                                                transition={{ duration: 0.3 }}
                                                className="space-y-2 pt-2"
                                            >
                                                {templateQuestions[activeTab]?.map((q, i) => (
                                                    <motion.button
                                                        key={q}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05 } }}
                                                        className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-galactic/10 hover:border-galactic/30 transition-all group flex items-start gap-3"
                                                    >
                                                        <Sparkles className="w-4 h-4 mt-0.5 text-white/30 group-hover:text-galactic shrink-0 transition-colors" />
                                                        <span className="text-xs font-medium leading-relaxed text-white/80 group-hover:text-white transition-colors">{q}</span>
                                                    </motion.button>
                                                ))}
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col h-full bg-background/40 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden transition-all duration-500 z-10">

                    {!sidebarOpen && (
                        <div className="absolute top-6 left-6 z-50">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-3 text-white/50 hover:text-white bg-background/80 backdrop-blur-xl border border-white/10 hover:border-galactic/50 rounded-full shadow-lg transition-all"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* Chat Header / Greeting */}
                    <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto p-8 pt-24 space-y-12">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="flex flex-col items-center justify-center text-center space-y-6 mt-10 md:mt-24"
                        >
                            <div className="w-24 h-24 rounded-full bg-galactic/10 flex items-center justify-center border border-galactic/20 relative">
                                <div className="absolute inset-0 rounded-full border border-galactic/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50" />
                                <GiCursedStar className="w-12 h-12 text-galactic" />
                            </div>
                            <div className="space-y-4 max-w-xl">
                                <h1 className="text-4xl md:text-5xl font-serif font-bold bg-clip-text text-transparent bg-linear-to-br from-white via-white/80 to-galactic/50 pb-2">
                                    The Oracle Awaits
                                </h1>
                                <p className="text-white/60 text-lg sm:text-xl font-serif italic">
                                    What truth do you seek from the stars today?
                                </p>
                            </div>
                        </motion.div>

                        {/* Example Chat Flow Message */}
                        <div className="space-y-8 pb-32">
                            {/* User Message */}
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="flex justify-end">
                                <div className="max-w-[80%] bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl rounded-tr-sm border border-white/5 text-sm md:text-base">
                                    WHAT IS MY TYPE?
                                </div>
                            </motion.div>

                            {/* Oracle Message */}
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }} className="flex justify-start">
                                <div className="max-w-[85%] space-y-4">
                                    <div className="flex items-center gap-3 ml-2">
                                        <div className="w-8 h-8 rounded-full bg-galactic/20 border border-galactic/30 flex items-center justify-center shadow-[0_0_10px_rgba(157,78,221,0.2)]">
                                            <GiCursedStar className="w-4 h-4 text-galactic" />
                                        </div>
                                        <span className="text-xs font-bold tracking-widest uppercase text-galactic">Oracle</span>
                                    </div>
                                    <div className="bg-background/80 backdrop-blur-md px-6 py-5 rounded-3xl rounded-tl-sm border border-galactic/20 shadow-[0_0_30px_rgba(157,78,221,0.05)] text-sm md:text-base leading-relaxed text-white/90">
                                        Peering into the celestial alignments of your natal chart, I see strong placements that draw you toward powerful dynamics.
                                        <br /><br />
                                        Before we delve deeper: <span className="text-galactic font-medium italic">Based on your signs, you tend to be the dominant one in relationships, right?</span>
                                    </div>

                                    {/* Bonus Context Options (Injected by Oracle) */}
                                    <div className="flex flex-wrap gap-3 pl-2 pt-2">
                                        {["YES, ALWAYS", "NOT REALLY, NO", "I'M NOT SURE"].map(opt => (
                                            <button key={opt} className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-galactic/10 border border-white/10 hover:border-galactic/40 text-[11px] sm:text-xs font-bold tracking-widest text-white/70 hover:text-white transition-all shadow-sm hover:shadow-[0_0_15px_rgba(157,78,221,0.2)] flex items-center gap-2">
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-linear-to-t from-background via-background/90 to-transparent pointer-events-none">
                        <div className="max-w-4xl mx-auto relative pointer-events-auto">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-linear-to-r from-galactic/20 via-primary/10 to-galactic/20 rounded-[2rem] blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                                <div className="relative flex items-center bg-background/80 backdrop-blur-2xl border border-white/10 focus-within:border-galactic/50 rounded-[2rem] p-2 shadow-xl transition-all h-16">
                                    <button className="p-3 text-white/40 hover:text-white transition-colors">
                                        <Star className="w-5 h-5" />
                                    </button>
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        placeholder="Ask the cosmos..."
                                        className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/30 text-base font-sans px-2"
                                    />
                                    <button className={`p-3 rounded-full flex items-center justify-center transition-all ${input.length > 0 ? "bg-galactic text-white shadow-[0_0_15px_rgba(157,78,221,0.5)]" : "bg-white/10 text-white/30"}`}>
                                        <Send className="w-4 h-4 ml-0.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="text-center mt-3">
                                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">The Oracle interprets the universe. Use your own intuition.</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
