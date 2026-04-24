'use client'

import { useUserStore } from "@/store/use-user-store"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { motion } from "motion/react"
import { compositionalSigns } from "@/astrology/signs"
import { zodiacUIConfig } from "@/config/zodiac-ui"
import {
    SignCardV2,
    ElementalSpiderChart,
    InterpretationCard,
    DashboardSkeleton,
    NatalChart,
    PlanetsCarousel
} from "@/components/dashboard"

const getSignData = (name: string | undefined) =>
    compositionalSigns.find(s => s.name === name)

const getUIConfig = (id: string | undefined) =>
    id ? zodiacUIConfig[id] : undefined

export default function DashboardPage() {
    const { user, isLoading, isAuthenticated, needsOnboarding } = useUserStore()
    const router = useRouter()

    // Redirect logic
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
        return <DashboardSkeleton />
    }

    const birthData = user.birthData

    // If no birth data, redirect to onboarding
    if (!birthData) {
        return <DashboardSkeleton />
    }

    // Get zodiac sign details
    const sunPlacement = birthData.placements?.find(p => p.body === "Sun")
    const moonPlacement = birthData.placements?.find(p => p.body === "Moon")
    const risingPlacement = birthData.placements?.find(p => p.body === "Ascendant")

    const sunData = getSignData(sunPlacement?.sign)
    const sunUI = getUIConfig(sunData?.id)

    const moonData = getSignData(moonPlacement?.sign)
    const moonUI = getUIConfig(moonData?.id)

    const risingData = getSignData(risingPlacement?.sign)
    const risingUI = getUIConfig(risingData?.id)

    return (
        <div className="min-h-[calc(100vh-5rem)] w-full">
            <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32 space-y-8">
                {/* Natal Chart (Birth Chart) — 1st */}
                <NatalChart birthData={birthData} />

                {/* Elemental Spider Chart — 2nd */}
                <ElementalSpiderChart
                    birthData={birthData}
                    delay={0.1}
                />

                {/* Header */}
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

                {/* Main Signs Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SignCardV2
                        label="☉ Sun Sign"
                        data={sunData}
                        ui={sunUI}
                        delay={0.2}
                    />
                    <SignCardV2
                        label="☽ Moon Sign"
                        data={moonData}
                        ui={moonUI}
                        delay={0.25}
                    />
                    <SignCardV2
                        label="↑ Rising Sign"
                        data={risingData}
                        ui={risingUI}
                        delay={0.3}
                    />
                </div>

                {/* Planetary Placements Carousel */}
                {birthData.placements && birthData.placements.length > 0 && (
                    <PlanetsCarousel
                        placements={birthData.placements}
                        delay={0.35}
                    />
                )}

                {/* Synthesis Interpretation */}
                <InterpretationCard
                    sunSignName={sunData?.id}
                    delay={0.4}
                />
            </div>
        </div>
    )
}