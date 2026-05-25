"use client"

import { useState, memo, useMemo } from "react"
import { motion } from "motion/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SignData } from "@/astrology/signs"
import { SignUIConfig } from "@/config/zodiac-ui"
import { elementUIConfig } from "@/config/elements-ui"
import { generateSynthesis } from "@/astrology/interpretationEngine"
import { ChevronLeft } from "lucide-react"
import { ArtNouveauBorder } from "@/components/ui/art-nouveau-border"

interface PlanetSignCardProps {
    planetName: string
    planetSymbol: string
    planetColor: string
    planetId: string
    planetImageUrl?: string
    planetImageScale?: number
    data: SignData
    ui: SignUIConfig
    house?: number
    delay?: number
}

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'] as const

function toRoman(n: number): string {
    return ROMAN[Math.max(0, Math.min(n - 1, 11))] ?? String(n)
}

export const PlanetSignCard = memo(function PlanetSignCard({
    planetName,
    planetSymbol,
    planetColor,
    planetId,
    planetImageUrl,
    planetImageScale = 1,
    data,
    ui,
    house,
    delay = 0,
}: PlanetSignCardProps) {
    const [isFlipped, setIsFlipped] = useState(false)
    const router = useRouter()

    const elementUi = elementUIConfig[data.element]
    const Icon = ui.icon
    const ElementIcon = elementUi.icon
    const styles = elementUi.styles
    const hasPlanetImage = !!planetImageUrl

    const synthesis = useMemo(
        () => generateSynthesis(planetId, data.id, house),
        [planetId, data.id, house],
    )

    return (
        <div className="flex flex-col items-center gap-3">
            {/* ── Entrance + Flip ── */}
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay, ease: "easeOut" }}
                className="w-full"
                style={{ perspective: "1000px" }}
            >
                <div className="relative w-full h-[500px] sm:h-[550px]">
                    <motion.div
                        className="w-full h-full relative"
                        style={{ transformStyle: "preserve-3d" }}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                    >
                        {/* ── FRONT ── */}
                        <div
                            className={`absolute inset-0 w-full h-full ${isFlipped ? "pointer-events-none" : ""}`}
                            style={{ backfaceVisibility: "hidden" }}
                        >
                            <div
                                onClick={() => setIsFlipped(true)}
                                className="group relative block w-full h-full cursor-pointer"
                            >
                                <ArtNouveauBorder
                                    color={styles.secondary}
                                    animateOnHover
                                    className="h-full overflow-hidden rounded-2xl"
                                >
                                <Card className="relative h-full overflow-hidden rounded-2xl border-0 shadow-none select-none bg-white/[0.02]">
                                    {/* Element tint on hover */}
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                                        style={{ background: styles.gradient }}
                                    />

                                    <CardContent className="relative p-8 h-full">
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 gap-y-3">

                                            {/* ── TOP: Sign icon + title ── */}
                                            <div className="flex flex-col items-center">
                                                <div className="relative flex items-center justify-center w-[11rem] h-[11rem] mb-1">
                                                    {/* Element frame */}
                                                    <img
                                                        src={elementUi.frameUrl}
                                                        alt=""
                                                        className="absolute inset-0 w-full h-full object-contain opacity-0 group-hover:opacity-60 group-hover:rotate-36 transition-all duration-[1.5s] ease-out"
                                                    />

                                                    {/* 👈 Glow circle behind sign */}
                                                    <div
                                                        className="absolute inset-0 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-700"
                                                        style={{ backgroundColor: styles.glow }}
                                                    />

                                                    <Icon className="w-28 h-28 relative z-10 text-amber-100 group-hover:text-white transition-colors duration-700" />
                                                </div>

                                                <h2
                                                    className="text-4xl font-serif tracking-wide transition-all duration-500 group-hover:-translate-y-2 group-hover:text-white"
                                                    style={{ color: styles.secondary }}
                                                >
                                                    {data.name}
                                                </h2>
                                            </div>

                                            {/* ── MIDDLE: House numeral → motto ── */}
                                            <div className="relative flex items-center justify-center min-h-10 w-full">
                                                {house && (
                                                    <span
                                                        className="absolute text-2xl font-serif opacity-30 group-hover:opacity-0 transition-opacity duration-500"
                                                        style={{ color: styles.secondary }}
                                                    >
                                                        {toRoman(house)}
                                                    </span>
                                                )}
                                                <p className="absolute text-sm font-serif italic leading-relaxed text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 px-4 max-w-[85%]">
                                                    &ldquo;{data.motto}&rdquo;
                                                </p>
                                            </div>

                                            {/* ── BOTTOM: Planet name + image ── */}
                                            <div className="flex flex-col items-center">
                                                <h2
                                                    className="text-4xl font-serif tracking-wide transition-all duration-500 group-hover:translate-y-2 group-hover:text-white"
                                                    style={{ color: planetColor }}
                                                >
                                                    {planetName}
                                                </h2>

                                                <div className="relative flex items-center justify-center w-[11rem] h-[11rem] mt-1">
                                                    {hasPlanetImage ? (
                                                        <img
                                                            src={planetImageUrl}
                                                            alt={planetName}
                                                            className="w-28 h-28 relative z-10 object-contain transition-transform duration-700"
                                                            style={{ transform: `scale(${planetImageScale})` }}
                                                        />
                                                    ) : (
                                                        <span
                                                            className="text-5xl relative z-10 transition-colors duration-700"
                                                            style={{ color: planetColor }}
                                                        >
                                                            {planetSymbol}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                </ArtNouveauBorder>
                            </div>
                        </div>

                        {/* ── BACK ── */}
                        <div
                            className={`absolute inset-0 w-full h-full ${!isFlipped ? "pointer-events-none" : ""}`}
                            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                        >
                            <Card
                                className="relative h-full overflow-hidden rounded-2xl bg-white/[0.02] border-0 shadow-none cursor-pointer select-none"
                                onClick={() => setIsFlipped(false)}
                            >
                                <div
                                    className="absolute inset-0 opacity-[0.08]"
                                    style={{ background: styles.gradient }}
                                />

                                <CardContent className="relative p-6 sm:p-8 h-full flex flex-col items-center text-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-4 left-4 z-20 p-2"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setIsFlipped(false)
                                        }}
                                        aria-label="Flip back"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>

                                    <div className="flex flex-col items-center justify-center mt-2 mb-6">
                                        {hasPlanetImage ? (
                                            <img
                                                src={planetImageUrl}
                                                alt={planetName}
                                                className="w-10 h-10 opacity-70 mb-2 object-contain"
                                                style={{ transform: `scale(${planetImageScale})` }}
                                            />
                                        ) : (
                                            <Icon
                                                className="w-10 h-10 opacity-70 mb-2"
                                                style={{ color: styles.primary }}
                                            />
                                        )}
                                        <h3 className="text-xl font-serif text-white tracking-wider">
                                            {planetName} in {data.name}
                                        </h3>
                                    </div>

                                    <div className="flex-1 w-full flex flex-col justify-center items-center">
                                        <p className="text-lg text-white/95 italic leading-relaxed font-serif px-2">
                                            &ldquo;{synthesis}&rdquo;
                                        </p>
                                    </div>

                                    <div className="mt-8 pt-4 w-full flex justify-center z-20 relative">
                                        <Button
                                            variant={data.element.toLowerCase() as any}
                                            className="h-11 px-8 border-primary/40 cursor-pointer"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                router.push(`/learn/signs/${data.id}`)
                                            }}
                                        >
                                            <ElementIcon
                                                className="w-4 h-4"
                                                style={{ color: styles.primary }}
                                            />
                                            <span className="mx-2 text-xs sm:text-sm tracking-widest uppercase">
                                                Learn More
                                            </span>
                                        </Button>
                                    </div>

                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-full overflow-hidden pointer-events-none -z-10 flex items-center justify-center">
                                        <img
                                            src={ui.constellationUrl}
                                            alt=""
                                            className="h-auto object-contain opacity-[0.04] scale-[1.5]"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    )
})
