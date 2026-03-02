"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "motion/react"
import { SignData } from "@/astrology/signs"
import { SignUIConfig } from "@/config/zodiac-ui"
import { GiFlame, GiStonePile, GiTornado, GiWaveCrest } from "react-icons/gi"

interface RevealSignCardProps {
    /** Label shown ABOVE the card, e.g. "Sun Sign" */
    label: string
    /** The zodiac sign data */
    data: SignData | undefined
    ui: SignUIConfig | undefined
    /** Delay before the card enters the viewport (stagger) */
    enterDelay?: number
    /** Delay before the "reveal" animation triggers (like hover but automatic) */
    revealDelay?: number
}

const getStyles = (element: "Fire" | "Earth" | "Air" | "Water") => {
    const el = element.toLowerCase();
    return {
        primary: `var(--${el}-primary)`,
        secondary: `var(--${el}-secondary)`,
        glow: `var(--${el}-glow)`,
        border: `var(--${el}-border)`,
        gradient: `var(--${el}-gradient)`
    };
};

const getElementIcon = (element: "Fire" | "Earth" | "Air" | "Water") => {
    switch (element) {
        case "Fire": return GiFlame;
        case "Earth": return GiStonePile;
        case "Air": return GiTornado;
        case "Water": return GiWaveCrest;
    }
};

export function RevealSignCard({
    label,
    data,
    ui,
    enterDelay = 0,
    revealDelay = 1.5,
}: RevealSignCardProps) {
    // State that triggers the "hover-like" reveal animation
    const [isRevealed, setIsRevealed] = useState(false)

    useEffect(() => {
        // Total delay = card enterDelay + extra revealDelay after it appears
        const totalDelay = (enterDelay + revealDelay) * 1000
        const timer = setTimeout(() => setIsRevealed(true), totalDelay)
        return () => clearTimeout(timer)
    }, [enterDelay, revealDelay])

    if (!data || !ui) return null

    const Icon = ui.icon
    const ElementIcon = getElementIcon(ui.elementName)
    const styles = getStyles(ui.elementName)

    return (
        <div className="flex flex-col items-center gap-3">
            {/* ── Label ABOVE the card ── */}
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: enterDelay, ease: [0.22, 1, 0.36, 1] }}
                className="text-[11px] font-serif uppercase tracking-[0.25em] text-primary"
            >
                {label}
            </motion.p>

            {/* ── The card itself ── */}
            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.9, rotateX: -15 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                transition={{ duration: 0.9, delay: enterDelay, ease: [0.22, 1, 0.36, 1] }}
                className="perspective-[1000px] w-full"
            >
                <div className="relative block h-full">
                    <Card
                        className={`relative h-full overflow-hidden rounded-2xl bg-transparent border-0 shadow-none min-h-[460px] transition-all duration-700 ${isRevealed ? "scale-[1.02]" : ""}`}
                    >
                        {/* Card background with gradient border */}
                        <div
                            className="absolute inset-0 backdrop-blur-[0.5px]"
                            style={{
                                background: `linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)`,
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderImage: `linear-gradient(135deg, ${styles.border}, transparent) 1`
                            }}
                        />

                        {/* Element gradient overlay (hidden → visible on reveal) */}
                        <div
                            className={`absolute inset-0 transition-opacity duration-700 ${isRevealed ? "opacity-30" : "opacity-0"}`}
                            style={{ background: styles.gradient }}
                        />

                        {/* Constellation watermark (stays visible, dims slightly on reveal) */}
                        <div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden pointer-events-none">
                            <img
                                src={ui.constellationUrl}
                                alt=""
                                className={`absolute bottom-[5%] left-1/2 -translate-x-1/2 h-auto object-contain transition-all duration-1000 ${isRevealed ? "opacity-20 scale-100" : "opacity-50 scale-105"}`}
                                style={{
                                    filter: `drop-shadow(0 0 15px ${styles.glow})`
                                }}
                            />
                        </div>

                        {/* Radial glow (hidden → visible on reveal) */}
                        <div
                            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full transition-opacity duration-700 blur-3xl ${isRevealed ? "opacity-40" : "opacity-0"}`}
                            style={{ backgroundColor: styles.glow }}
                        />

                        {/* Card content */}
                        <CardContent className="relative p-8 h-full">
                            {/* Archetype Name (Top Left) — hidden → appears on reveal */}
                            <div className={`absolute top-0 left-6 transition-opacity duration-500 z-10 w-24 ${isRevealed ? "opacity-100" : "opacity-0"}`}>
                                <p
                                    className="text-[9px] font-sans uppercase tracking-[0.1em] mt-2 line-clamp-2"
                                    style={{ color: styles.secondary }}
                                >
                                    {data.archetypeName}
                                </p>
                            </div>

                            {/* Element Badge (Top Right) — hidden → appears on reveal */}
                            <div className={`absolute top-0 right-6 transition-opacity duration-500 z-10 ${isRevealed ? "opacity-100" : "opacity-0"}`}>
                                <div className="flex items-center gap-2 mt-2">
                                    <ElementIcon
                                        className="w-3.5 h-3.5"
                                        style={{ color: styles.primary }}
                                    />
                                    <span
                                        className="text-[9px] font-sans uppercase tracking-[0.2em]"
                                        style={{ color: styles.secondary }}
                                    >
                                        {ui.elementName}
                                    </span>
                                </div>
                            </div>

                            {/* Main content wrapper - centered */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pb-38">
                                {/* Sign icon (always visible, moves up on reveal) */}
                                <div className={`relative  flex items-center justify-center w-32 h-32 transition-all duration-700 ${isRevealed ? "translate-y-0" : "translate-y-4"}`}>
                                    {/* Element Frame PNG (hidden → appears + rotates on reveal) */}
                                    <img
                                        src={ui.elementFrameUrl}
                                        alt=""
                                        className={`absolute inset-0 w-full h-full object-contain transition-all duration-[1.5s] ease-out ${isRevealed ? "opacity-60 rotate-36" : "opacity-0 rotate-0"}`}
                                        style={{
                                            filter: `drop-shadow(0 0 15px ${styles.glow})`
                                        }}
                                    />

                                    {/* Icon glow (hidden → appears on reveal) */}
                                    <div
                                        className={`absolute inset-0 rounded-full blur-2xl transition-opacity duration-700 ${isRevealed ? "opacity-30" : "opacity-0"}`}
                                        style={{ backgroundColor: styles.glow }}
                                    />

                                    {/* Main zodiac icon (visible, scales on reveal) */}
                                    <Icon
                                        className={`w-16 h-16 relative z-10 transition-all duration-700 ${isRevealed ? "text-white scale-110" : "text-amber-100"}`}
                                        style={{
                                            filter: `drop-shadow(0 0 10px ${styles.glow})`
                                        }}
                                    />
                                </div>

                                {/* Sign name (moves down on reveal, color → white) */}
                                <div className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${isRevealed ? "translate-y-0" : "-translate-y-[20px]"}`}>
                                    <h2
                                        className="text-4xl font-serif tracking-wide transition-all duration-500"
                                        style={{
                                            color: isRevealed ? '#ffffff' : styles.secondary,
                                            textShadow: `0 0 10px ${styles.glow}`
                                        }}
                                    >
                                        {data.name}
                                    </h2>
                                </div>
                            </div>

                            {/* Traits footer (pinned to bottom, hidden → slides up on reveal) */}
                            <div className={`absolute bottom-0 left-0 right-0 px-6 pb-5 text-center z-10 transition-all duration-700 ${isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                                <p className="text-sm font-sans text-amber-100/70 leading-relaxed italic">
                                    {data.cognitiveInsight}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Hover shadow glow (hidden → appears on reveal) */}
                    <div
                        className={`absolute inset-0 -z-10 rounded-2xl transition-opacity duration-700 blur-2xl ${isRevealed ? "opacity-20" : "opacity-0"}`}
                        style={{ backgroundColor: styles.glow }}
                    />
                </div>
            </motion.div>
        </div>
    )
}
