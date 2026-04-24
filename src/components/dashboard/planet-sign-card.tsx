"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SignData } from "@/astrology/signs"
import { SignUIConfig } from "@/config/zodiac-ui"
import { elementUIConfig } from "@/config/elements-ui"
import { generateSynthesis } from "@/astrology/interpretationEngine"
import { ChevronLeft } from "lucide-react"

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

export function PlanetSignCard({
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

    return (
        <div className="flex flex-col items-center gap-3">
            {/* ── The card — with flip animations ── */}
            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.9, rotateX: -15 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
                className="perspective-[1000px] w-full"
            >
                {/* 3D container */}
                <div className="relative w-full h-[500px] sm:h-[550px] transition-all duration-700 hover:scale-[1.02]">
                    <motion.div
                        className="w-full h-full relative"
                        style={{ transformStyle: "preserve-3d" }}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.7, type: "spring", stiffness: 260, damping: 20 }}
                    >
                        {/* ── FRONT FACE ── */}
                        <div
                            className={`absolute inset-0 w-full h-full ${isFlipped ? 'pointer-events-none' : ''}`}
                            style={{ backfaceVisibility: "hidden" }}
                        >
                            <div
                                onClick={() => setIsFlipped(true)}
                                className="group relative block w-full h-full cursor-pointer"
                            >
                                <Card className="relative h-full overflow-hidden rounded-2xl bg-transparent border-0 shadow-none">
                                    {/* Card background with gradient */}
                                    <div
                                        className="absolute inset-0 backdrop-blur-[0.5px]"
                                        style={{
                                            background: `linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)`,
                                            borderWidth: '1px',
                                            borderStyle: 'solid',
                                            borderImage: `linear-gradient(135deg, ${styles.border}, transparent) 1`
                                        }}
                                    />

                                    {/* Element gradient overlay */}
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-700"
                                        style={{ background: styles.gradient }}
                                    />

                                    {/* Radial glow effect */}
                                    <div
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-700 blur-3xl"
                                        style={{ backgroundColor: styles.glow }}
                                    />

                                    {/* Card content */}
                                    <CardContent className="relative p-8 h-full">


                                        {/* ── Symmetric layout: Sign top, Planet bottom ── */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 gap-y-3">

                                            {/* ── TOP: Sign icon + title ── */}
                                            <div className="flex flex-col items-center transition-transform duration-500 ease-in-out group-hover:-translate-y-4">
                                                {/* Sign icon with element frame on hover */}
                                                <div className="relative flex items-center justify-center w-[11rem] h-[11rem] mb-1 group-hover:mb-0 transition-all duration-500">
                                                    {/* Element Frame (appears on hover) */}
                                                    <img
                                                        src={elementUi.frameUrl}
                                                        alt=""
                                                        className="absolute inset-0 w-full h-full object-contain opacity-0 group-hover:opacity-60 group-hover:rotate-36 transition-all duration-[1.5s] ease-out"
                                                        style={{
                                                            filter: `drop-shadow(0 0 15px ${styles.glow})`
                                                        }}
                                                    />

                                                    {/* Icon glow (appears on hover) */}
                                                    <div
                                                        className="absolute inset-0 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-700"
                                                        style={{ backgroundColor: styles.glow }}
                                                    />

                                                    {/* Sign icon */}
                                                    <Icon
                                                        className="w-28 h-28 relative z-10 text-amber-100 group-hover:text-white transition-all duration-700"
                                                        style={{
                                                            filter: `drop-shadow(0 0 10px ${styles.glow})`
                                                        }}
                                                    />
                                                </div>

                                                {/* Sign name — crossfade to white on hover */}
                                                <div className="relative h-12">
                                                    <h2
                                                        className="text-4xl font-serif tracking-wide transition-opacity duration-500"
                                                        style={{
                                                            color: styles.secondary,
                                                            textShadow: `0 0 10px ${styles.glow}`
                                                        }}
                                                    >
                                                        {data.name}
                                                    </h2>
                                                    <h2 className="absolute inset-0 text-4xl font-serif tracking-wide text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                                        {data.name}
                                                    </h2>
                                                </div>
                                            </div>

                                            {/* ── MIDDLE: House numeral → motto on hover ── */}
                                            <div className="relative flex items-center justify-center min-h-10 w-full">
                                                {/* House Roman numeral — fades out on hover */}
                                                {house && (
                                                    <span
                                                        className="absolute text-2xl font-serif opacity-35 group-hover:opacity-0 transition-opacity duration-500"
                                                        style={{ color: styles.secondary }}
                                                    >
                                                        {toRoman(house)}
                                                    </span>
                                                )}
                                                {/* Motto — scales in + fades in on hover */}
                                                <p className="absolute text-sm font-serif italic leading-relaxed text-white opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 px-4 max-w-[85%]">
                                                    &ldquo;{data.motto}&rdquo;
                                                </p>
                                            </div>

                                            {/* ── BOTTOM: Planet name + image (mirrored) ── */}
                                            <div className="flex flex-col items-center transition-transform duration-500 ease-in-out group-hover:translate-y-4">
                                                {/* Planet name — crossfade to white on hover */}
                                                <div className="relative h-12 mb-1 group-hover:mb-0 transition-all duration-500">
                                                    <h2
                                                        className="text-4xl font-serif tracking-wide transition-opacity duration-500"
                                                        style={{ color: planetColor }}
                                                    >
                                                        {planetName}
                                                    </h2>
                                                    <h2 className="absolute inset-0 text-4xl font-serif tracking-wide text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                                        {planetName}
                                                    </h2>
                                                </div>

                                                {/* Planet image with glow */}
                                                <div className="relative flex items-center justify-center w-[11rem] h-[11rem]">
                                                    {/* Planet glow (appears on hover) */}
                                                    <div
                                                        className="absolute inset-0 rounded-full blur-2xl opacity-0 group-hover:opacity-12 transition-opacity duration-700"
                                                        style={{ backgroundColor: planetColor }}
                                                    />

                                                    {hasPlanetImage ? (
                                                        <img
                                                            src={planetImageUrl}
                                                            alt={planetName}
                                                            className="w-28 h-28 relative z-10 object-contain transition-all duration-700"
                                                            style={{
                                                                filter: `drop-shadow(0 0 10px ${styles.glow})`,
                                                                transform: `scale(${planetImageScale})`,
                                                            }}
                                                        />
                                                    ) : (
                                                        <span
                                                            className="text-5xl relative z-10 transition-all duration-700"
                                                            style={{
                                                                color: planetColor,
                                                                filter: `drop-shadow(0 0 10px ${planetColor})`
                                                            }}
                                                        >
                                                            {planetSymbol}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Hover shadow glow */}
                                <div
                                    className="absolute inset-0 -z-10 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 blur-2xl"
                                    style={{ backgroundColor: styles.glow }}
                                />
                            </div>
                        </div>

                        {/* ── BACK FACE ── */}
                        <div
                            className={`absolute inset-0 w-full h-full ${!isFlipped ? 'pointer-events-none' : ''}`}
                            style={{
                                backfaceVisibility: "hidden",
                                transform: "rotateY(180deg)"
                            }}
                        >
                            <Card
                                className="relative h-full overflow-hidden rounded-2xl bg-transparent border-0 shadow-none transition-all duration-700 cursor-pointer"
                                onClick={() => setIsFlipped(false)}
                            >
                                {/* Back card background */}
                                <div
                                    className="absolute inset-0 backdrop-blur-[0.5px]"
                                    style={{
                                        background: `linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)`,
                                        borderWidth: '1px',
                                        borderStyle: 'solid',
                                        borderImage: `linear-gradient(135deg, ${styles.border}, transparent) 1`
                                    }}
                                />

                                {/* Subtle glow overlay */}
                                <div
                                    className="absolute inset-0 opacity-[0.15]"
                                    style={{ background: styles.gradient }}
                                />

                                <CardContent className="relative p-6 sm:p-8 h-full flex flex-col items-center text-center">
                                    {/* Back Button */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-4 left-4 z-20 p-2"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsFlipped(false);
                                        }}
                                        aria-label="Flip back"
                                        title="Flip back"
                                    >
                                        <ChevronLeft className="w-4 h-4 transition-transform" />
                                    </Button>

                                    {/* Small Sign Icon + Label */}
                                    <div className="flex flex-col items-center justify-center mt-2 mb-6">
                                        {hasPlanetImage ? (
                                            <img
                                                src={planetImageUrl}
                                                alt={planetName}
                                                className="w-10 h-10 opacity-70 mb-2 object-contain"
                                                style={{
                                                    filter: `drop-shadow(0 0 10px ${styles.glow})`,
                                                    transform: `scale(${planetImageScale})`,
                                                }}
                                            />
                                        ) : (
                                            <Icon
                                                className="w-10 h-10 opacity-70 mb-2"
                                                style={{ color: styles.primary, filter: `drop-shadow(0 0 10px ${styles.glow})` }}
                                            />
                                        )}
                                        <h3 className="text-xl font-serif text-white tracking-wider">
                                            {planetName} in {data.name}
                                        </h3>
                                    </div>

                                    <div className="flex-1 w-full flex flex-col justify-center items-center">
                                        <div className="w-full text-center">
                                            <p className="text-lg text-white/95 italic leading-relaxed font-serif px-2">
                                                &ldquo;{generateSynthesis(planetId, data.id, house)}&rdquo;
                                            </p>
                                        </div>
                                    </div>

                                    {/* Learn More Button */}
                                    <div className="mt-8 pt-4 w-full flex justify-center z-20 relative">
                                        <Button
                                            variant={data.element.toLowerCase() as any}
                                            className="h-11 px-8 border-primary/40 relative group/btn cursor-pointer"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                router.push(`/learn/signs/${data.id}`);
                                            }}
                                        >
                                            <ElementIcon
                                                className="w-4 h-4 transition-transform"
                                                style={{ color: styles.primary }}
                                            />
                                            <span className="mx-2 text-xs sm:text-sm tracking-widest uppercase">Learn More</span>
                                        </Button>
                                    </div>

                                    {/* Faded background constellation on back face */}
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-full overflow-hidden pointer-events-none -z-10 flex items-center justify-center">
                                        <img
                                            src={ui.constellationUrl}
                                            alt=""
                                            className="h-auto object-contain opacity-[0.05] scale-[1.5]"
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
}