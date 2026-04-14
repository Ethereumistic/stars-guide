"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "motion/react"
import { SignData } from "@/astrology/signs"
import { SignUIConfig } from "@/config/zodiac-ui"
import { elementUIConfig } from "@/config/elements-ui"

interface RevealCompactSignCardProps {
    /** Label shown ABOVE the card, e.g. "☉ Sun Sign" */
    label: string
    /** The zodiac sign data */
    data: SignData | undefined
    ui: SignUIConfig | undefined
    /** Delay before the card enters the viewport (stagger) */
    enterDelay?: number
    /** Delay before the "reveal" animation triggers */
    revealDelay?: number
}

export function RevealCompactSignCard({
    label,
    data,
    ui,
    enterDelay = 0,
    revealDelay = 1.5,
}: RevealCompactSignCardProps) {
    const [isRevealed, setIsRevealed] = useState(false)

    useEffect(() => {
        const totalDelay = (enterDelay + revealDelay) * 1000
        const timer = setTimeout(() => setIsRevealed(true), totalDelay)
        return () => clearTimeout(timer)
    }, [enterDelay, revealDelay])

    if (!data || !ui) return null

    const elementUi = elementUIConfig[data.element]
    const Icon = ui.icon
    const ElementIcon = elementUi.icon
    const styles = elementUi.styles

    return (
        <div className="flex flex-col items-center gap-2">
            {/* Label above the card */}
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: enterDelay, ease: [0.22, 1, 0.36, 1] }}
                className="text-[11px] font-serif uppercase tracking-[0.25em] text-primary"
            >
                {label}
            </motion.p>

            {/* The compact card */}
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, delay: enterDelay, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
            >
                <div className="relative block h-full">
                    <Card
                        className={`relative h-full overflow-hidden rounded-xl bg-transparent border border-border/30 shadow-none transition-all duration-700 ${isRevealed ? "scale-[1.02] border-border/50" : ""}`}
                    >
                        {/* Card background with gradient */}
                        <div
                            className="absolute inset-0 backdrop-blur-[0.5px] rounded-xl"
                            style={{
                                background: `linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)`
                            }}
                        />

                        {/* Element gradient overlay (hidden → visible on reveal) */}
                        <div
                            className={`absolute inset-0 transition-opacity duration-700 ${isRevealed ? "opacity-25" : "opacity-0"}`}
                            style={{ background: styles.gradient }}
                        />

                        {/* Constellation watermark */}
                        <div className="absolute inset-y-0 right-0 w-1/2 pointer-events-none overflow-hidden">
                            <img
                                src={ui.constellationUrl}
                                alt=""
                                className={`absolute top-1/2 right-[-20%] -translate-y-1/2 h-full object-contain transition-all duration-1000 ${isRevealed ? "opacity-40 scale-100 right-[30%]" : "opacity-15 scale-125"}`}
                                style={{
                                    filter: `drop-shadow(0 0 10px ${styles.glow})`
                                }}
                            />
                        </div>

                        {/* Radial glow (hidden → visible on reveal) */}
                        <div
                            className={`absolute top-1/2 right-0 -translate-y-1/2 w-32 h-32 rounded-full transition-opacity duration-700 blur-2xl ${isRevealed ? "opacity-30" : "opacity-0"}`}
                            style={{ backgroundColor: styles.glow }}
                        />

                        <CardContent className="relative p-5 h-full flex items-center justify-between z-10">
                            {/* Left section: Text & Details */}
                            <div className="flex flex-col h-full justify-center space-y-1.5 max-w-[65%]">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <ElementIcon
                                        className="w-3.5 h-3.5"
                                        style={{ color: styles.primary }}
                                    />
                                    <span
                                        className="text-[9px] font-sans uppercase tracking-[0.2em] transition-opacity duration-500"
                                        style={{ color: styles.secondary, opacity: isRevealed ? 0.8 : 0.5 }}
                                    >
                                        {data.element}
                                    </span>
                                </div>

                                <h2
                                    className="text-2xl font-serif tracking-wide transition-all duration-500"
                                    style={{
                                        color: isRevealed ? '#ffffff' : styles.secondary,
                                        textShadow: `0 0 ${isRevealed ? '10px' : '5px'} ${styles.glow}`
                                    }}
                                >
                                    {data.name}
                                </h2>

                                <p
                                    className={`text-xs font-sans uppercase tracking-widest transition-opacity duration-500 ${isRevealed ? "opacity-100" : "opacity-0"}`}
                                    style={{ color: styles.secondary }}
                                >
                                    {data.archetypeName}
                                </p>
                            </div>

                            {/* Right section: Icon */}
                            <div className={`relative flex items-center justify-center w-16 h-16 shrink-0 transition-all duration-700 ${isRevealed ? "scale-110" : ""}`}>
                                {/* Element frame glow (hidden → appears on reveal) */}
                                <div
                                    className={`absolute inset-0 rounded-full blur-xl transition-opacity duration-700 ${isRevealed ? "opacity-30" : "opacity-0"}`}
                                    style={{ backgroundColor: styles.glow }}
                                />

                                <Icon
                                    className={`w-12 h-12 relative z-10 transition-all duration-500 ${isRevealed ? "text-white" : "text-amber-100"}`}
                                    style={{
                                        filter: `drop-shadow(0 0 ${isRevealed ? '12px' : '6px'} ${styles.glow})`
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Shadow glow (hidden → appears on reveal) */}
                    <div
                        className={`absolute inset-0 -z-10 rounded-xl transition-opacity duration-700 blur-xl ${isRevealed ? "opacity-20" : "opacity-0"}`}
                        style={{ backgroundColor: styles.glow }}
                    />
                </div>
            </motion.div>
        </div>
    )
}
