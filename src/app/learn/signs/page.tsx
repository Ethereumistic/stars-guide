"use client";

import { ZODIAC_SIGNS } from "@/utils/zodiac";
import { motion, Variants } from "motion/react";
import Link from "next/link";
import {
    TbSparkles,
} from "react-icons/tb";
import { GiWaterfall, GiTornado, GiFlame, GiStonePile } from "react-icons/gi";
import { SignCard } from "@/components/learn/signs/sign-card";
import { Button } from "@/components/ui/button";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { useState } from "react";

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

export default function SignsPage() {
    const [activeTab, setActiveTab] = useState<string>("all");

    const filteredSigns = activeTab === "all"
        ? ZODIAC_SIGNS
        : ZODIAC_SIGNS.filter(sign => sign.element.toLowerCase() === activeTab);

    return (
        <div className="relative z-10 max-w-[1600px] mx-auto px-8">
            <Breadcrumb className="mb-8">
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

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between  mb-16">
                <div className="">
                    <h1 className="text-5xl md:text-6xl font-serif font-bold text-white tracking-tighter">
                        The Twelve
                        <span className="italic text-primary drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]"> Guardians</span>
                    </h1>
                </div>

                <div className="flex flex-col gap-4">
                    <span className="text-base uppercase font-mono text-primary/60 tracking-[0.3em] font-bold">Filter by Element</span>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-fit rounded-md">
                        <TabsList className="bg-white/5 border border-white/10 p-1  h-auto gap-2">
                            <TabsTrigger value="all" className="rounded-md px-4 py-2 hover:bg-white/5  data-[state=active]:text-primary transition-all duration-300">
                                <span className="font-mono text-xs uppercase tracking-wider">All</span>
                            </TabsTrigger>
                            <TabsTrigger value="fire" className="rounded-md px-4 py-2 hover:bg-white/5  transition-all duration-300">
                                <GiFlame className="size-4 mr-2 text-fire" />
                                <span className="font-mono text-xs uppercase tracking-wider">Fire</span>
                            </TabsTrigger>
                            <TabsTrigger value="earth" className="rounded-md px-4 py-2 hover:bg-white/5 transition-all duration-300">
                                <GiStonePile className="size-4 mr-2 text-earth" />
                                <span className="font-mono text-xs uppercase tracking-wider">Earth</span>
                            </TabsTrigger>
                            <TabsTrigger value="air" className="rounded-md px-4 py-2 hover:bg-white/5 transition-all duration-300">
                                <GiTornado className="size-4 mr-2 text-air" />
                                <span className="font-mono text-xs uppercase tracking-wider">Air</span>
                            </TabsTrigger>
                            <TabsTrigger value="water" className="rounded-md px-4 py-2 hover:bg-white/5  transition-all duration-300">
                                <GiWaterfall className="size-4 mr-2 text-water" />
                                <span className="font-mono text-xs uppercase tracking-wider">Water</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* Grid */}
            <motion.div
                key={activeTab} // Added key to trigger re-animation on filter change
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mx-auto"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {filteredSigns.map((sign) => (
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
        </div>
    );
}

