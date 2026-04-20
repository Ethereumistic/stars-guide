"use client"

import { motion } from "motion/react"
import { EnrichedPlacement, LUMINARIES, PERSONAL_PLANETS, SOCIAL_PLANETS, TRANSPERSONAL_PLANETS, CHART_POINTS } from "./types"
import { PlanetSignCard } from "./planet-sign-card"

interface PlanetGridProps {
    placements: EnrichedPlacement[]
    baseDelay?: number
}

/** Section label rendered between groups */
function SectionLabel({ children, delay }: { children: React.ReactNode; delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
            className="pt-4"
        >
            <h3 className="text-[10px] font-serif uppercase tracking-[0.3em] text-primary/40 text-center">
                {children}
            </h3>
        </motion.div>
    )
}

/** Filter placements by a list of body IDs, preserving order */
function filterByBodies(placements: EnrichedPlacement[], bodyIds: string[]): EnrichedPlacement[] {
    return bodyIds
        .map(id => placements.find(p => p.bodyId === id))
        .filter((p): p is EnrichedPlacement => p !== undefined)
}

export function PlanetGrid({ placements, baseDelay = 0 }: PlanetGridProps) {
    const luminaries = filterByBodies(placements, LUMINARIES)
    const personal = filterByBodies(placements, PERSONAL_PLANETS)
    const social = filterByBodies(placements, SOCIAL_PLANETS)
    const transpersonal = filterByBodies(placements, TRANSPERSONAL_PLANETS)
    const chartPoints = filterByBodies(placements, CHART_POINTS)

    // Also handle Ascendant — add to luminaries if present
    const ascendant = placements.find(p => p.bodyId === "ascendant")
    const featuredPlanets = [...luminaries, ...(ascendant ? [ascendant] : [])]

    let staggerIndex = 0
    const nextDelay = () => baseDelay + staggerIndex++ * 0.05

    return (
        <div className="space-y-8">
            {/* ── Featured Row: Sun, Moon, Ascendant ── */}
            {featuredPlanets.length > 0 && (
                <div>
                    <SectionLabel delay={nextDelay()}>The Luminaries &amp; Ascendant</SectionLabel>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-3">
                        {featuredPlanets.map((p) => (
                            <PlanetSignCard
                                key={p.bodyId}
                                placement={p}
                                featured
                                delay={nextDelay()}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Personal Planets: Mercury, Venus, Mars ── */}
            {personal.length > 0 && (
                <div>
                    <SectionLabel delay={nextDelay()}>Personal Planets</SectionLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-3">
                        {personal.map((p) => (
                            <PlanetSignCard
                                key={p.bodyId}
                                placement={p}
                                delay={nextDelay()}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Social Planets: Jupiter, Saturn ── */}
            {social.length > 0 && (
                <div>
                    <SectionLabel delay={nextDelay()}>Social Planets</SectionLabel>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3">
                        {social.map((p) => (
                            <PlanetSignCard
                                key={p.bodyId}
                                placement={p}
                                delay={nextDelay()}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Transpersonal Planets: Uranus, Neptune, Pluto ── */}
            {transpersonal.length > 0 && (
                <div>
                    <SectionLabel delay={nextDelay()}>Transpersonal Planets</SectionLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-3">
                        {transpersonal.map((p) => (
                            <PlanetSignCard
                                key={p.bodyId}
                                placement={p}
                                delay={nextDelay()}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Chart Points: Chiron, Nodes, Part of Fortune ── */}
            {chartPoints.length > 0 && (
                <div>
                    <SectionLabel delay={nextDelay()}>Chart Points</SectionLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-3">
                        {chartPoints.map((p) => (
                            <PlanetSignCard
                                key={p.bodyId}
                                placement={p}
                                delay={nextDelay()}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}