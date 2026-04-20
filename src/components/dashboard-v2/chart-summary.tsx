"use client"

import { motion } from "motion/react"
import { Sparkles } from "lucide-react"
import { EnrichedPlacement } from "./types"

interface ChartSummaryProps {
    placements: EnrichedPlacement[]
    delay?: number
}

export function ChartSummary({ placements, delay = 0 }: ChartSummaryProps) {
    // Extract synthesis text for Sun, Moon, Ascendant
    const sunPlacement = placements.find(p => p.bodyId === "sun")
    const moonPlacement = placements.find(p => p.bodyId === "moon")
    const risingPlacement = placements.find(p => p.bodyId === "ascendant")

    const parts: string[] = []

    if (sunPlacement) {
        parts.push(sunPlacement.synthesis)
    }
    if (moonPlacement) {
        parts.push(moonPlacement.synthesis)
    }
    if (risingPlacement) {
        parts.push(risingPlacement.synthesis)
    }

    const summaryText = parts.join(' ')

    if (!summaryText) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl mx-auto text-center space-y-3"
        >
            <div className="flex items-center justify-center gap-2 text-primary/50">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[9px] font-sans uppercase tracking-[0.2em]">Core Synthesis</span>
            </div>
            <p className="text-sm md:text-base font-serif leading-relaxed text-foreground/70 italic">
                {summaryText}
            </p>
        </motion.div>
    )
}