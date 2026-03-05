'use client'

import { Card, CardContent } from "@/components/ui/card"
import { motion } from "motion/react"
import { SignData } from "@/astrology/signs"
import { SignUIConfig } from "@/config/zodiac-ui"
import { elementUIConfig } from "@/config/elements-ui"

interface SignCardProps {
    /** Label shown ABOVE the card, e.g. "☉ Sun Sign" */
    label: string
    /** The zodiac sign data */
    data: SignData | undefined
    ui: SignUIConfig | undefined
    /** Stagger delay for entrance animation */
    delay?: number
}

export function SignCard({ label, data, ui, delay = 0 }: SignCardProps) {
    if (!data || !ui) return null

    const elementUi = elementUIConfig[data.element]
    const Icon = ui.icon
    const ElementIcon = elementUi.icon
    const styles = elementUi.styles

    return (
        <div className="flex flex-col items-center gap-3">
            {/* ── Label ABOVE the card ── */}
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
                className="text-[11px] font-serif uppercase tracking-[0.25em] text-primary"
            >
                {label}
            </motion.p>

            {/* ── The card (rendered in final/revealed state) ── */}
            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.9, rotateX: -15 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
                className="perspective-[1000px] w-full"
            >
                <div className="relative block h-full">
                    <Card className="relative h-full overflow-hidden rounded-2xl bg-transparent border-0 shadow-none min-h-[460px] scale-[1.02]">
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

                        {/* Element gradient overlay (revealed) */}
                        <div
                            className="absolute inset-0 opacity-30"
                            style={{ background: styles.gradient }}
                        />

                        {/* Constellation watermark (dimmed — revealed state) */}
                        <div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden pointer-events-none">
                            <img
                                src={ui.constellationUrl}
                                alt=""
                                className="absolute bottom-[-16%] left-1/2 -translate-x-1/2 h-auto object-contain opacity-20 scale-100"
                                style={{
                                    filter: `drop-shadow(0 0 15px ${styles.glow})`
                                }}
                            />
                        </div>

                        {/* Radial glow (revealed) */}
                        <div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-40 blur-3xl"
                            style={{ backgroundColor: styles.glow }}
                        />

                        {/* Card content */}
                        <CardContent className="relative p-8 h-full">
                            {/* Archetype Name (Top Left) */}
                            <div className="absolute top-0 left-6 z-10 w-24">
                                <p
                                    className="text-[9px] font-sans uppercase tracking-[0.1em] mt-2 line-clamp-2"
                                    style={{ color: styles.secondary }}
                                >
                                    {data.archetypeName}
                                </p>
                            </div>

                            {/* Element Badge (Top Right) */}
                            <div className="absolute top-0 right-6 z-10">
                                <div className="flex items-center gap-2 mt-2">
                                    <ElementIcon
                                        className="w-3.5 h-3.5"
                                        style={{ color: styles.primary }}
                                    />
                                    <span
                                        className="text-[9px] font-sans uppercase tracking-[0.2em]"
                                        style={{ color: styles.secondary }}
                                    >
                                        {data.element}
                                    </span>
                                </div>
                            </div>

                            {/* Main content wrapper - centered */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pb-38">
                                {/* Sign icon with frame (revealed state) */}
                                <div className="relative flex items-center justify-center w-32 h-32">
                                    {/* Element Frame PNG (revealed — rotated) */}
                                    <img
                                        src={elementUi.frameUrl}
                                        alt=""
                                        className="absolute inset-0 w-full h-full object-contain opacity-60 rotate-36"
                                        style={{
                                            filter: `drop-shadow(0 0 15px ${styles.glow})`
                                        }}
                                    />

                                    {/* Icon glow */}
                                    <div
                                        className="absolute inset-0 rounded-full blur-2xl opacity-30"
                                        style={{ backgroundColor: styles.glow }}
                                    />

                                    {/* Main zodiac icon */}
                                    <Icon
                                        className="w-16 h-16 relative z-10 text-white scale-110"
                                        style={{
                                            filter: `drop-shadow(0 0 10px ${styles.glow})`
                                        }}
                                    />
                                </div>

                                {/* Sign name (white — revealed state) */}
                                <div>
                                    <h2
                                        className="text-4xl font-serif tracking-wide text-white"
                                        style={{
                                            textShadow: `0 0 10px ${styles.glow}`
                                        }}
                                    >
                                        {data.name}
                                    </h2>
                                </div>
                            </div>

                            {/* Traits footer (pinned to bottom — revealed state) */}
                            <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 text-center z-10">
                                <p className="text-sm font-sans text-amber-100/70 leading-relaxed italic">
                                    {data.coreStrategy}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Shadow glow */}
                    <div
                        className="absolute inset-0 -z-10 rounded-2xl opacity-20 blur-2xl"
                        style={{ backgroundColor: styles.glow }}
                    />
                </div>
            </motion.div>
        </div>
    )
}
