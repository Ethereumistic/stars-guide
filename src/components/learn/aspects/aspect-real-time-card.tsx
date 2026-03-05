"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { TbClock, TbTelescope } from "react-icons/tb";
import { AspectData } from "@/astrology/aspects";
import { AspectUIConfig } from "@/config/aspects-ui";
import { getActiveAspects, ActiveAspect } from "@/lib/aspects";
import { planetUIConfig } from "@/config/planet-ui";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";

interface AspectRealTimeCardProps {
    data: AspectData;
    ui: AspectUIConfig;
}

export function AspectRealTimeCard({ data, ui }: AspectRealTimeCardProps) {
    const hexColor = ui.hexFallback;
    const [activeAspects, setActiveAspects] = useState<ActiveAspect[]>([]);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    useEffect(() => {
        const updateAspects = () => {
            const now = new Date();
            setCurrentTime(now);
            const aspects = getActiveAspects(now, data.id);
            setActiveAspects(aspects);
        };

        updateAspects();
        const interval = setInterval(updateAspects, 60000); // update every minute

        return () => clearInterval(interval);
    }, [data.id]);

    if (!currentTime) return null;

    return (
        <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="border border-white/10 bg-black/50 flex flex-col rounded-md overflow-hidden"
        >
            <div className="p-8 md:p-12 border-b border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <TbTelescope className="size-4 text-white/40" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">
                            Live Astronomy Engine
                        </span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight">
                        Real-Time {data.name}s
                    </h2>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-sm bg-white/5 w-fit">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-white/70">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            <div className="p-6 md:p-8 bg-white/2">
                {activeAspects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                        <TbClock className="size-8 text-white/20" />
                        <p className="text-white/50 font-serif text-lg">
                            No exact {data.name.toLowerCase()}s currently active within a tight orb.
                        </p>
                    </div>
                ) : (
                    <Carousel
                        opts={{
                            align: activeAspects.length < 3 ? "center" : "start",
                        }}
                        className="w-full relative px-10 md:px-12"
                    >
                        <CarouselContent className={activeAspects.length < 3 ? "justify-center" : ""}>
                            {activeAspects.map((aspect, i) => {
                                const p1UI = planetUIConfig[aspect.planet1.id];
                                const p2UI = planetUIConfig[aspect.planet2.id];

                                return (
                                    <CarouselItem key={i} className="md:basis-1/2 xl:basis-1/3">
                                        <div
                                            className="p-5 border border-white/10 rounded-xl bg-black/60 relative overflow-hidden group hover:border-white/30 transition-all duration-500 hover:scale-[1.02] h-full"
                                        >
                                            {/* Background gradients */}
                                            <div
                                                className="absolute inset-0 backdrop-blur-[0.5px] rounded-xl"
                                                style={{
                                                    background: `linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.0) 100%)`
                                                }}
                                            />
                                            <div
                                                className="absolute inset-0 transition-opacity duration-500 opacity-0 group-hover:opacity-10"
                                                style={{ background: `linear-gradient(135deg, transparent 0%, ${hexColor} 100%)` }}
                                            />

                                            {/* Planet 1 Watermark */}
                                            {p1UI && (
                                                <div className="absolute inset-y-0 left-0 w-1/2 pointer-events-none overflow-hidden rounded-l-xl">
                                                    <img
                                                        src={p1UI.imageUrl}
                                                        alt={aspect.planet1.name}
                                                        className="absolute top-1/2 left-[-30%] -translate-y-1/2 h-[140%] object-contain opacity-10 group-hover:opacity-30 group-hover:left-[-20%] transition-all duration-700 blur-[1px] group-hover:blur-none"
                                                        style={{ filter: `drop-shadow(0 0 10px ${p1UI.themeColor})` }}
                                                    />
                                                </div>
                                            )}

                                            {/* Planet 2 Watermark */}
                                            {p2UI && (
                                                <div className="absolute inset-y-0 right-0 w-1/2 pointer-events-none overflow-hidden rounded-r-xl">
                                                    <img
                                                        src={p2UI.imageUrl}
                                                        alt={aspect.planet2.name}
                                                        className="absolute top-1/2 right-[-30%] -translate-y-1/2 h-[140%] object-contain opacity-10 group-hover:opacity-30 group-hover:right-[-20%] transition-all duration-700 blur-[1px] group-hover:blur-none"
                                                        style={{ filter: `drop-shadow(0 0 10px ${p2UI.themeColor})` }}
                                                    />
                                                </div>
                                            )}

                                            {/* Top colored rim */}
                                            <div
                                                className="absolute inset-x-0 top-0 h-[2px] opacity-30 transition-opacity group-hover:opacity-100"
                                                style={{ backgroundColor: hexColor }}
                                            />

                                            <div className="relative z-10 flex flex-col h-full">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex flex-col items-center flex-1">
                                                        <span
                                                            className="text-lg md:text-xl font-serif text-white tracking-wide transition-colors z-10"
                                                            style={{ textShadow: p1UI ? `0 0 10px ${p1UI.themeColor}80` : undefined }}
                                                        >
                                                            {aspect.planet1.name}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-col items-center justify-center px-4">
                                                        <span
                                                            className="text-3xl font-serif"
                                                            style={{
                                                                color: hexColor,
                                                                textShadow: `0 0 15px ${hexColor}80`
                                                            }}
                                                        >
                                                            {aspect.aspect.symbol}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-col items-center flex-1">
                                                        <span
                                                            className="text-lg md:text-xl font-serif text-white tracking-wide transition-colors z-10"
                                                            style={{ textShadow: p2UI ? `0 0 10px ${p2UI.themeColor}80` : undefined }}
                                                        >
                                                            {aspect.planet2.name}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mb-4 flex justify-center mt-auto">
                                                    <span
                                                        className="font-mono text-[10px] uppercase px-3 py-1.5 rounded-full border bg-black/40 backdrop-blur-md"
                                                        style={{
                                                            borderColor: aspect.applying ? `${hexColor}50` : 'rgba(255,255,255,0.1)',
                                                            color: aspect.applying ? hexColor : 'rgba(255,255,255,0.5)',
                                                            boxShadow: aspect.applying ? `0 0 10px ${hexColor}20` : 'none',
                                                        }}
                                                    >
                                                        {aspect.applying ? "Applying" : "Separating"}
                                                    </span>
                                                </div>

                                                <div className="space-y-2.5 font-mono text-xs text-white/40 bg-black/40 backdrop-blur-md p-3 rounded-md border border-white/5 pb-3">
                                                    <div className="flex justify-between items-center">
                                                        <span>Current</span>
                                                        <span className="text-white/80">{aspect.currentAngle.toFixed(2)}°</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span>Exact</span>
                                                        <span className="text-white/60">{aspect.exactAngle}°</span>
                                                    </div>
                                                    <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-2">
                                                        <span className={aspect.orb < 1 ? "text-white/80" : ""}>Orb</span>
                                                        <span className={aspect.orb < 1 ? "text-white font-bold" : ""}>
                                                            {aspect.orb.toFixed(2)}°
                                                            {aspect.orb < 1 ? " (Tight)" : ""}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CarouselItem>
                                );
                            })}
                        </CarouselContent>
                        <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2" />
                        <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2" />
                    </Carousel>
                )}
            </div>
        </motion.section>
    );
}
