'use client'

import { useUserStore } from "@/store/use-user-store"
import { useRouter } from "next/navigation"
import { useMemo, useEffect } from "react"
import { motion } from "motion/react"
import { compositionalSigns } from "@/astrology/signs"
import { compositionalPlanets } from "@/astrology/planets"
import { zodiacUIConfig } from "@/config/zodiac-ui"
import { planetUIConfig } from "@/config/planet-ui"
import { elementUIConfig } from "@/config/elements-ui"
import { generateSynthesis } from "@/astrology/interpretationEngine"
import { calculateFullChart } from "@/lib/birth-chart/full-chart"
import {
    PlanetGrid,
    NatalChartDualView,
    CircularElementalBalance,
    ChartSummary,
    DashboardV2Skeleton,
} from "@/components/dashboard-v2"
import type { EnrichedPlacement, BirthData } from "@/components/dashboard-v2/types"
import { SUPPLEMENTARY_PLANETS, SUPPLEMENTARY_PLANET_UI } from "@/components/dashboard-v2/types"

export default function DashboardV1Page() {
    const { user, isLoading, isAuthenticated, needsOnboarding } = useUserStore()
    const router = useRouter()

    // Enrich all placements — must be called before any early returns (Rules of Hooks)
    const birthData = user?.birthData as BirthData | undefined

    const enrichedPlacements = useMemo((): EnrichedPlacement[] => {
        if (!birthData) return []

        const placements: EnrichedPlacement[] = []

        // Use stored placements as the base source of truth
        for (const p of birthData.placements) {
            const bodyId = p.body.toLowerCase()

            // Find sign data
            const signData = compositionalSigns.find(s =>
                s.name.toLowerCase() === p.sign.toLowerCase() ||
                s.id === p.sign.toLowerCase()
            )
            if (!signData) continue

            const signUI = zodiacUIConfig[signData.id]
            if (!signUI) continue

            const elementData = elementUIConfig[signData.element]
            if (!elementData) continue

            // Find planet data
            let planetData = compositionalPlanets.find(pl => pl.id === bodyId)
            let planetUI = planetUIConfig[bodyId]
            const bodyLabel = (() => {
                // Check supplementary planets first
                if (SUPPLEMENTARY_PLANETS[bodyId]) {
                    return SUPPLEMENTARY_PLANETS[bodyId].name
                }
                // Check compositional planets
                const found = compositionalPlanets.find(pl => pl.id === bodyId)
                if (found) return found.name
                // Capitalize the body string
                return bodyId.charAt(0).toUpperCase() + bodyId.slice(1)
            })()

            // For "Ascendant", use the special key in interpretation engine
            const synthesisPlanetId = bodyId === "ascendant" ? "rising" : bodyId
            const signId = signData.id

            // Generate synthesis text
            let synthesis = ""
            try {
                synthesis = generateSynthesis(synthesisPlanetId, signId, p.house)
            } catch {
                // Fallback if synthesis engine can't process this combination
                synthesis = `${bodyLabel} in ${signData.name}`
            }

            // Look up dignity and retrograde from chart data if available
            let retrograde = false
            let dignity: string | null = null

            if (birthData.chart?.planets) {
                const chartPlanet = birthData.chart.planets.find(cp => cp.id === bodyId)
                if (chartPlanet) {
                    retrograde = chartPlanet.retrograde
                    dignity = chartPlanet.dignity
                }
            }

            // Handle supplementary planet data (Ascendant, Part of Fortune, etc.)
            const supplementaryData = SUPPLEMENTARY_PLANETS[bodyId]
            const effectivePlanetData = planetData ?? (supplementaryData ? {
                id: supplementaryData.id,
                name: supplementaryData.name,
                domain: supplementaryData.domain,
                psychologicalFunction: '',
                coreDrives: [],
                shadowExpression: '',
                compositionalVerbPhrase: supplementaryData.compositionalVerbPhrase,
            } : undefined)

            // Handle supplementary planet UI (Ascendant)
            const effectivePlanetUI = planetUI ?? (SUPPLEMENTARY_PLANET_UI[bodyId] ? {
                id: bodyId,
                themeColor: SUPPLEMENTARY_PLANET_UI[bodyId].themeColor,
                rulerSymbol: SUPPLEMENTARY_PLANET_UI[bodyId].rulerSymbol,
            } : undefined)

            placements.push({
                bodyId,
                bodyLabel,
                signId,
                signData,
                signUI,
                elementUI: elementData,
                planetData: effectivePlanetData,
                planetUI: effectivePlanetUI,
                houseId: p.house,
                retrograde,
                dignity,
                synthesis,
            })
        }

        return placements
    }, [birthData])

    // Redirect logic — useEffect for side effects, after all hooks
    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated()) {
                router.push("/sign-in")
            } else if (needsOnboarding()) {
                router.push("/onboarding")
            }
        }
    }, [isLoading, isAuthenticated, needsOnboarding, router])

    // Loading state
    if (isLoading || !user) {
        return <DashboardV2Skeleton />
    }

    // If no birth data, show skeleton while redirecting
    if (!birthData) {
        return <DashboardV2Skeleton />
    }

    return (
        <div className="min-h-[calc(100vh-5rem)] w-full py-8 px-4 md:px-8">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* ── Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center space-y-2"
                >
                    <h1 className="font-serif text-4xl md:text-5xl tracking-tight">
                        Your Cosmic Profile
                    </h1>
                    <p className="text-muted-foreground font-sans italic">
                        The stars have aligned to reveal your celestial blueprint
                    </p>
                </motion.div>

                {/* ── Chart Summary (compact Sun+Moon+Rising synthesis) ── */}
                <ChartSummary placements={enrichedPlacements} delay={0.05} />

                {/* ── Planet Grid (all placements) ── */}
                <PlanetGrid placements={enrichedPlacements} baseDelay={0.1} />

                {/* ── Natal Chart Dual View ── */}
                <NatalChartDualView birthData={birthData} delay={0.3} />

                {/* ── Circular Elemental Balance ── */}
                <CircularElementalBalance placements={enrichedPlacements} delay={0.35} />
            </div>
        </div>
    )
}