'use client'

import { useMemo, useState } from "react"
import { motion } from "motion/react"
import { compositionalSigns } from "@/astrology/signs"
import { ElementType, ELEMENT_CONTENT, ELEMENT_COLORS } from "@/astrology/elements"
import { ElementalTableView, type ElementalTableData } from "./elemental-table-view"
import { ElementalCircleView, type ElementalCircleData } from "./elemental-circle-view"
import { ChartSectionHeader } from "@/components/dashboard/chart-section-header"

interface LegacyPlacement {
    body: string
    sign: string
    house: number
}

interface ElementalBalanceCardProps {
    birthData: {
        placements: LegacyPlacement[]
    }
    delay?: number
}

export function ElementalBalanceCard({ birthData, delay = 0.3 }: ElementalBalanceCardProps) {
    const [visualization, setVisualization] = useState<string>("both")

    const { counts, total, placementsByElement, dominant } = useMemo(() => {
        const counts: Record<ElementType, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 }
        const placementsByElement: Record<ElementType, LegacyPlacement[]> = { Fire: [], Earth: [], Air: [], Water: [] }

        for (const p of birthData.placements) {
            const sign = compositionalSigns.find(s => s.name === p.sign)
            if (!sign) continue
            counts[sign.element]++
            placementsByElement[sign.element].push(p)
        }

        const total = birthData.placements.length
        const dominant = (Object.entries(counts) as [ElementType, number][])
            .sort((a, b) => b[1] - a[1])[0][0]

        return { counts, total, placementsByElement, dominant }
    }, [birthData])

    const elementalData: ElementalTableData & ElementalCircleData = {
        counts,
        total,
        placementsByElement,
        dominant,
    }

    const dominantColor = ELEMENT_COLORS[dominant]

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
        >
            <ChartSectionHeader
                title="Your"
                titleAccent="Elemental Distribution"
                activeVisualization={visualization}
                onVisualizationChange={setVisualization}
            />

            {visualization === "both" ? (
                <div className="grid grid-cols-7 gap-6">
                    <div className="col-span-3">
                        <ElementalTableView data={elementalData} delay={delay} />
                    </div>
                    <div className="col-span-4">
                        <ElementalCircleView data={elementalData} delay={delay} />
                    </div>
                </div>
            ) : visualization === "table" ? (
                <ElementalTableView data={elementalData} delay={delay} />
            ) : (
                <div className="w-full flex justify-center">
                    <ElementalCircleView data={elementalData} delay={delay} />
                </div>
            )}

            {/* ── DOMINANT ELEMENT INSIGHT ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: delay + 0.8 }}
                className="mt-8 max-w-3xl mx-auto"
            >
                <div className="border-t border-white/5 pt-6">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">
                            Dominant Principle
                        </span>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <p className="text-lg md:text-xl font-serif text-white/80 leading-relaxed">
                        <span style={{ color: dominantColor.stroke }}>{dominant}</span> anchors your natal architecture. {ELEMENT_CONTENT[dominant].desc}
                    </p>
                </div>
            </motion.div>
        </motion.div>
    )
}