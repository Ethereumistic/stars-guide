"use client"

import { useState } from "react"
import { motion } from "motion/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, RotateCw } from "lucide-react"
import { EnrichedPlacement } from "./types"
import { elementUIConfig } from "@/config/elements-ui"

interface PlanetSignCardProps {
    placement: EnrichedPlacement
    /** Whether this is one of the "Big Three" luminaries/angles */
    featured?: boolean
    /** Stagger delay for entrance animation */
    delay?: number
}

export function PlanetSignCard({ placement, featured = false, delay = 0 }: PlanetSignCardProps) {
    const [isFlipped, setIsFlipped] = useState(false)
    const router = useRouter()

    const {
        bodyId,
        bodyLabel,
        signData,
        signUI,
        elementUI,
        planetData,
        planetUI,
        houseId,
        retrograde,
        dignity,
        synthesis,
    } = placement

    const ElementIcon = elementUI.icon
    const SignIcon = signUI.icon
    const styles = elementUI.styles

    // Planet-specific color for the back face
    const planetColor = planetUI?.themeColor ?? "var(--foreground)"
    const planetImage = planetUI?.imageUrl
    const planetImageScale = planetUI?.imageScale ?? 1
    const planetSymbol = planetUI?.rulerSymbol ?? "•"

    // Card height varies: featured cards are larger
    const cardHeight = featured ? "h-[380px] sm:h-[420px]" : "h-[300px] sm:h-[340px]"

    // Dignity badge colors
    const dignityConfig: Record<string, { label: string; color: string }> = {
        domicile: { label: "Domicile", color: "text-emerald-400" },
        exaltation: { label: "Exalted", color: "text-amber-400" },
        detriment: { label: "Detriment", color: "text-red-400" },
        fall: { label: "Fall", color: "text-rose-400" },
        peregrine: { label: "", color: "" },
    }

    const dignityInfo = dignity ? dignityConfig[dignity] : null

    return (
        <div className="flex flex-col items-center gap-2">
            {/* ── Label above the card ── */}
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
                className="text-[10px] font-serif uppercase tracking-[0.25em] text-primary/70"
            >
                {signData.element} · House {houseId}
                {retrograde && <span className="ml-1 text-amber-400">℞</span>}
            </motion.p>

            {/* ── The flip card ── */}
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
                className="perspective-[1000px] w-full"
            >
                <div className={`relative w-full ${cardHeight} transition-all duration-500 hover:scale-[1.01]`}>
                    <motion.div
                        className="w-full h-full relative"
                        style={{ transformStyle: "preserve-3d" }}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 22 }}
                    >
                        {/* ════════════════ FRONT FACE (SIGN SIDE) ════════════════ */}
                        <div
                            className={`absolute inset-0 w-full h-full ${isFlipped ? 'pointer-events-none' : ''}`}
                            style={{ backfaceVisibility: "hidden" }}
                        >
                            <div
                                onClick={() => setIsFlipped(true)}
                                className="group relative block w-full h-full cursor-pointer"
                            >
                                <Card className="relative h-full overflow-hidden rounded-xl bg-transparent border-0 shadow-none">
                                    {/* Card background */}
                                    <div
                                        className="absolute inset-0 backdrop-blur-[0.5px] rounded-xl"
                                        style={{
                                            background: `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)`,
                                            borderWidth: '1px',
                                            borderStyle: 'solid',
                                            borderImage: `linear-gradient(135deg, ${styles.border}, transparent) 1`
                                        }}
                                    />

                                    {/* Element gradient overlay (subtle always, brighter on hover) */}
                                    <div
                                        className="absolute inset-0 opacity-15 group-hover:opacity-30 transition-opacity duration-700 rounded-xl"
                                        style={{ background: styles.gradient }}
                                    />

                                    {/* Constellation watermark */}
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden pointer-events-none">
                                        <img
                                            src={signUI.constellationUrl}
                                            alt=""
                                            className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 h-auto object-contain opacity-30 group-hover:opacity-10 transition-opacity duration-700"
                                            style={{
                                                filter: `drop-shadow(0 0 12px ${styles.glow})`
                                            }}
                                        />
                                    </div>

                                    {/* Radial glow */}
                                    <div
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-700 blur-3xl"
                                        style={{ backgroundColor: styles.glow }}
                                    />

                                    <CardContent className="relative p-4 sm:p-5 h-full flex flex-col items-center justify-center text-center">
                                        {/* Top row: Planet symbol badge (left) + Element badge (right) */}
                                        <div className="absolute top-3 left-3 sm:left-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                            <span
                                                className="text-xs font-mono"
                                                style={{ color: planetColor }}
                                            >
                                                {planetSymbol}
                                            </span>
                                            <span
                                                className="text-[9px] font-sans uppercase tracking-[0.15em]"
                                                style={{ color: styles.secondary }}
                                            >
                                                {bodyLabel}
                                            </span>
                                        </div>
                                        <div className="absolute top-3 right-3 sm:right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                            <ElementIcon
                                                className="w-3 h-3"
                                                style={{ color: styles.primary }}
                                            />
                                            <span
                                                className="text-[9px] font-sans uppercase tracking-[0.15em]"
                                                style={{ color: styles.secondary }}
                                            >
                                                {signData.element}
                                            </span>
                                        </div>

                                        {/* Sign icon */}
                                        <div className="relative mb-3 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 transition-all duration-500 group-hover:scale-110">
                                            {/* Element frame (hover) */}
                                            <img
                                                src={elementUI.frameUrl}
                                                alt=""
                                                className="absolute inset-0 w-full h-full object-contain opacity-0 group-hover:opacity-50 transition-all duration-[1.2s] ease-out"
                                                style={{
                                                    filter: `drop-shadow(0 0 12px ${styles.glow})`
                                                }}
                                            />
                                            {/* Icon glow */}
                                            <div
                                                className="absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-25 transition-opacity duration-700"
                                                style={{ backgroundColor: styles.glow }}
                                            />
                                            <SignIcon
                                                className="w-10 h-10 sm:w-12 sm:h-12 relative z-10 text-amber-100 group-hover:text-white transition-colors duration-500"
                                                style={{
                                                    filter: `drop-shadow(0 0 8px ${styles.glow})`
                                                }}
                                            />
                                        </div>

                                        {/* Sign name */}
                                        <h2
                                            className="text-xl sm:text-2xl font-serif tracking-wide transition-all duration-500 group-hover:text-white!"
                                            style={{
                                                color: styles.secondary,
                                                textShadow: `0 0 8px ${styles.glow}`
                                            }}
                                        >
                                            {signData.name}
                                        </h2>

                                        {/* Archetype (visible on hover) */}
                                        <p
                                            className="text-[9px] sm:text-[10px] font-sans uppercase tracking-[0.12em] mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                            style={{ color: styles.secondary }}
                                        >
                                            {signData.archetypeName}
                                        </p>

                                        {/* Flip button */}
                                        <div className="mt-3 opacity-0 group-hover:opacity-100 transition-all duration-500">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-3 text-[10px] tracking-widest uppercase"
                                                style={{ color: styles.primary, borderColor: `${styles.primary}40` }}
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    setIsFlipped(true)
                                                }}
                                            >
                                                <RotateCw className="w-3 h-3 mr-1" />
                                                Flip
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Hover shadow glow */}
                                <div
                                    className="absolute inset-0 -z-10 rounded-xl opacity-0 group-hover:opacity-15 transition-opacity duration-700 blur-2xl"
                                    style={{ backgroundColor: styles.glow }}
                                />
                            </div>
                        </div>

                        {/* ════════════════ BACK FACE (PLANET SIDE) ════════════════ */}
                        <div
                            className={`absolute inset-0 w-full h-full ${!isFlipped ? 'pointer-events-none' : ''}`}
                            style={{
                                backfaceVisibility: "hidden",
                                transform: "rotateY(180deg)"
                            }}
                        >
                            <Card
                                className="relative h-full overflow-hidden rounded-xl bg-transparent border-0 shadow-none cursor-pointer"
                                onClick={() => setIsFlipped(false)}
                            >
                                {/* Back card background */}
                                <div
                                    className="absolute inset-0 backdrop-blur-[0.5px] rounded-xl"
                                    style={{
                                        background: `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)`,
                                        borderWidth: '1px',
                                        borderStyle: 'solid',
                                        borderImage: `linear-gradient(135deg, ${styles.border}, transparent) 1`
                                    }}
                                />

                                {/* Subtle planet color overlay */}
                                <div
                                    className="absolute inset-0 opacity-10 rounded-xl"
                                    style={{
                                        background: `radial-gradient(circle at 50% 30%, ${planetColor}, transparent 60%)`
                                    }}
                                />

                                <CardContent className="relative p-4 sm:p-5 h-full flex flex-col items-center text-center">
                                    {/* Back button */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 left-2 z-20 p-1 h-7 w-7"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setIsFlipped(false)
                                        }}
                                        aria-label="Flip back"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>

                                    {/* Dignity badge (top right) */}
                                    {dignityInfo && dignityInfo.label && (
                                        <div className="absolute top-2 right-2 z-10">
                                            <span className={`text-[9px] font-sans uppercase tracking-[0.15em] font-semibold ${dignityInfo.color}`}>
                                                {dignityInfo.label}
                                            </span>
                                        </div>
                                    )}

                                    {/* Planet image or symbol */}
                                    <div className="flex flex-col items-center mt-4 mb-2">
                                        {planetImage ? (
                                            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                                                {/* Planet glow */}
                                                <div
                                                    className="absolute inset-0 rounded-full blur-xl opacity-20"
                                                    style={{ backgroundColor: planetColor }}
                                                />
                                                <img
                                                    src={planetImage}
                                                    alt={bodyLabel}
                                                    className="relative z-10 object-contain"
                                                    style={{
                                                        transform: `scale(${planetImageScale})`,
                                                        filter: `drop-shadow(0 0 8px ${planetColor})`
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full"
                                                style={{ backgroundColor: `${planetColor}15` }}
                                            >
                                                <span
                                                    className="text-2xl font-serif"
                                                    style={{ color: planetColor }}
                                                >
                                                    {planetSymbol}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Title: Planet in Sign */}
                                    <h3 className="text-base sm:text-lg font-serif text-white tracking-wide">
                                        {bodyLabel} in {signData.name}
                                    </h3>

                                    {/* Domain subtitle (for planets) */}
                                    {planetData && (
                                        <p className="text-[9px] sm:text-[10px] font-sans uppercase tracking-[0.12em] text-white/50 mt-0.5">
                                            {planetData.domain}
                                        </p>
                                    )}

                                    {/* Synthesis text */}
                                    <div className="flex-1 w-full flex flex-col justify-center items-center mt-2">
                                        <p className="text-xs sm:text-sm text-white/80 italic leading-relaxed font-serif line-clamp-4 px-1">
                                            &ldquo;{synthesis}&rdquo;
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-2 w-full flex justify-center gap-2 z-20 relative">
                                        {planetData && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-3 text-[10px] tracking-widest uppercase"
                                                style={{ color: styles.primary, borderColor: `${styles.primary}40` }}
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    router.push(`/learn/planets/${bodyId}`)
                                                }}
                                            >
                                                Learn More
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-3 text-[10px] tracking-widest uppercase"
                                            style={{ color: styles.primary, borderColor: `${styles.primary}40` }}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                router.push(`/learn/signs/${signData.id}`)
                                            }}
                                        >
                                            {signData.name}
                                        </Button>
                                    </div>

                                    {/* Faded background constellation */}
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-full overflow-hidden pointer-events-none -z-10 flex items-center justify-center">
                                        <img
                                            src={signUI.constellationUrl}
                                            alt=""
                                            className="h-auto object-contain opacity-[0.03] scale-[1.5]"
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