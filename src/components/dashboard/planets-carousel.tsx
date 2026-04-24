"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "motion/react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { compositionalSigns } from "@/astrology/signs"
import { zodiacUIConfig } from "@/config/zodiac-ui"
import { planetUIConfig } from "@/config/planet-ui"
import { PlanetSignCard } from "./planet-sign-card"
import type { LegacyPlacement } from "@/lib/birth-chart/types"
import useEmblaCarousel from "embla-carousel-react"

interface PlanetsCarouselProps {
    placements: LegacyPlacement[]
    delay?: number
}

/** Map the display body name back to a planet id for the interpretation engine. */
function getPlanetId(bodyName: string): string {
    if (bodyName === "Ascendant") return "rising"
    return bodyName.toLowerCase().replace(/\s+/g, "_")
}

/** Traditional astrological ordering */
const PLANET_ORDER: Record<string, number> = {
    Sun: 0,
    Moon: 1,
    Mercury: 2,
    Venus: 3,
    Mars: 4,
    Jupiter: 5,
    Saturn: 6,
    Uranus: 7,
    Neptune: 8,
    Pluto: 9,
    Chiron: 10,
    "North Node": 11,
    "South Node": 12,
    "Part Of Fortune": 13,
    Ascendant: 14,
}

export function PlanetsCarousel({ placements, delay = 0 }: PlanetsCarouselProps) {
    /* ── Embla ── */
    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: "start",
        slidesToScroll: 1,
        containScroll: "trimSnaps",
    })
    const [canScrollPrev, setCanScrollPrev] = useState(false)
    const [canScrollNext, setCanScrollNext] = useState(false)

    const onSelect = useCallback(() => {
        if (!emblaApi) return
        setCanScrollPrev(emblaApi.canScrollPrev())
        setCanScrollNext(emblaApi.canScrollNext())
    }, [emblaApi])

    useEffect(() => {
        if (!emblaApi) return
        onSelect()
        emblaApi.on("select", onSelect)
        emblaApi.on("reInit", onSelect)
        return () => {
            emblaApi.off("select", onSelect)
        }
    }, [emblaApi, onSelect])

    /* ── Prepare sorted card data ── */
    const cardData = useMemo(() => {
        const sorted = [...placements].sort(
            (a, b) => (PLANET_ORDER[a.body] ?? 99) - (PLANET_ORDER[b.body] ?? 99),
        )

        return sorted
            .map((p, i) => {
                const planetId = getPlanetId(p.body)
                const signData =
                    compositionalSigns.find((s) => s.name === p.sign) ??
                    compositionalSigns.find((s) => s.id === p.sign?.toLowerCase())
                const signUI = signData ? zodiacUIConfig[signData.id] : undefined
                const planetUi = planetUIConfig[planetId]

                return {
                    key: `${p.body}-${p.sign}`,
                    planetId,
                    planetName: p.body,
                    planetSymbol: planetUi?.rulerSymbol ?? "⚝",
                    planetColor: planetUi?.themeColor ?? "var(--primary)",
                    house: p.house,
                    signData: signData ?? null,
                    signUI: signUI ?? null,
                    planetUi: planetUi ?? null,
                }
            })
            .filter((d) => d.signData && d.signUI)
    }, [placements])

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
        >
            {/* Section header */}
            <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/30">
                    Planetary Placements
                </span>
            </div>

            {/* ── Carousel (all breakpoints) ── */}
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex gap-4" style={{ touchAction: "pan-y" }}>
                    {cardData.map((d) => (
                        <div
                            key={d.key}
                            className="flex-none min-w-0
                                w-[80%]     /* mobile  — 1 card + peek */
                                sm:w-[48%]  /* tablet  — 2 cards + peek */
                                md:w-[31%]  /* desktop — 3 cards + peek */
                            "
                        >
                            <PlanetSignCard
                                planetName={d.planetName}
                                planetSymbol={d.planetSymbol}
                                planetColor={d.planetColor}
                                planetId={d.planetId}
                                data={d.signData!}
                                ui={d.signUI!}
                                house={d.house}
                                delay={0}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Chevron nav — bottom right */}
            <div className="flex justify-end items-center gap-2 mt-4">
                <button
                    onClick={() => emblaApi?.scrollPrev()}
                    disabled={!canScrollPrev}
                    className={`
                        flex items-center justify-center size-8 rounded-full border transition-all duration-200
                        ${
                            canScrollPrev
                                ? "border-white/20 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/30"
                                : "border-white/5 bg-white/2 text-white/15 cursor-not-allowed"
                        }
                    `}
                    aria-label="Previous placement"
                >
                    <ChevronLeft className="size-4" />
                </button>
                <button
                    onClick={() => emblaApi?.scrollNext()}
                    disabled={!canScrollNext}
                    className={`
                        flex items-center justify-center size-8 rounded-full border transition-all duration-200
                        ${
                            canScrollNext
                                ? "border-white/20 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/30"
                                : "border-white/5 bg-white/2 text-white/15 cursor-not-allowed"
                        }
                    `}
                    aria-label="Next placement"
                >
                    <ChevronRight className="size-4" />
                </button>
            </div>
        </motion.div>
    )
}