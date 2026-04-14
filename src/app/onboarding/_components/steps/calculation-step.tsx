"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { useUserStore } from "@/store/use-user-store"
import { buildStoredBirthData } from "@/lib/birth-chart/storage"
import { useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { motion } from "motion/react"
import { Sparkles, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { RevealSignCard } from "@/components/onboarding/reveal-sign-card"
import { RevealCompactSignCard } from "@/components/onboarding/reveal-compact-sign-card"
import { compositionalSigns } from "@/astrology/signs"
import { zodiacUIConfig } from "@/config/zodiac-ui"

function useIsMobile() {
    const [isMobile, setIsMobile] = React.useState(false)
    React.useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768)
        check()
        window.addEventListener("resize", check)
        return () => window.removeEventListener("resize", check)
    }, [])
    return isMobile
}

export function CalculationStep() {
    const {
        birthDate,
        birthLocation,
        birthTime,
        birthTimeKnown,
        timeOfDay,
        setCalculatedSigns,
        nextStep,
        reset
    } = useOnboardingStore()

    const { isAuthenticated } = useUserStore()
    const isMobile = useIsMobile()
    const CardComponent = isMobile ? RevealCompactSignCard : RevealSignCard
    const [progress, setProgress] = React.useState(0)
    const [isCalculating, setIsCalculating] = React.useState(true)
    const [isSaved, setIsSaved] = React.useState(false)
    const updateBirthData = useMutation(api.users.updateBirthData)
    const router = useRouter()

    React.useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval)
                    return 100
                }
                return prev + 2
            })
        }, 50)
        return () => clearInterval(interval)
    }, [])

    const signs = React.useMemo(() => {
        if (!birthDate || !birthLocation) return null

        const date = `${birthDate.year}-${birthDate.month.toString().padStart(2, "0")}-${birthDate.day.toString().padStart(2, "0")}`
        const time = birthTimeKnown && birthTime ? birthTime : "12:00"

        return buildStoredBirthData({
            date,
            time,
            location: birthLocation,
        })
    }, [birthDate, birthLocation, birthTime, birthTimeKnown])

    React.useEffect(() => {
        if (progress === 100 && signs && !isSaved) {
            const saveData = async () => {
                setCalculatedSigns(signs)

                if (isAuthenticated()) {
                    try {
                        await updateBirthData(signs)
                        setIsSaved(true)
                    } catch (error) {
                        console.error("Failed to save birth data:", error)
                    }
                }

                const timer = setTimeout(() => setIsCalculating(false), 500)
                return () => clearTimeout(timer)
            }

            if (!isAuthenticated()) {
                setCalculatedSigns(signs)
                const timer = setTimeout(() => nextStep(), 800)
                return () => clearTimeout(timer)
            }

            saveData()
        }
    }, [progress, signs, isSaved, isAuthenticated, setCalculatedSigns, updateBirthData, nextStep])

    const handleEnterSanctuary = () => {
        reset()
        router.push("/dashboard")
    }

    if (isCalculating) {
        return (
            <div className="text-center space-y-8 py-12">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="inline-block"
                >
                    <Sparkles className="size-16 text-primary animate-pulse" />
                </motion.div>

                <div className="space-y-4 max-w-xs mx-auto">
                    <h2 className="text-2xl font-serif">Aligning the Stars</h2>
                    <p className="text-sm text-muted-foreground uppercase tracking-[0.2em]">Calculating planetary positions...</p>
                    <Progress value={progress} className="h-1 bg-primary/10" />
                    <p className="text-xs text-muted-foreground italic">
                        {progress < 30 && "Gathering celestial coordinates..."}
                        {progress >= 30 && progress < 60 && "Mapping planetary transits..."}
                        {progress >= 60 && progress < 90 && "Calculating house cusps..."}
                        {progress >= 90 && "Finalizing cosmic blueprint..."}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-block"
                >

                </motion.div>
                <h2 className="text-2xl md:text-4xl font-serif mb-6 md:mb-16">Your Cosmic Blueprint is Ready</h2>
            </div>

            <div className={`grid gap-3 md:gap-6 my-3 md:my-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
                {signs && (
                    <>
                        {(() => {
                            const sunPlacement = signs.placements.find((p) => p.body === "Sun")
                            const sunData = compositionalSigns.find(s => s.name === sunPlacement?.sign)
                            const sunUI = sunData ? zodiacUIConfig[sunData.id] : undefined
                            return (
                                <CardComponent
                                    label="☉ Sun Sign"
                                    data={sunData}
                                    ui={sunUI}
                                    enterDelay={0}
                                    revealDelay={1.6}
                                />
                            )
                        })()}
                        {(() => {
                            const moonPlacement = signs.placements.find((p) => p.body === "Moon")
                            const moonData = compositionalSigns.find(s => s.name === moonPlacement?.sign)
                            const moonUI = moonData ? zodiacUIConfig[moonData.id] : undefined
                            return (
                                <CardComponent
                                    label="☽ Moon Sign"
                                    data={moonData}
                                    ui={moonUI}
                                    enterDelay={0.4}
                                    revealDelay={1.6}
                                />
                            )
                        })()}
                        {(() => {
                            const risingPlacement = signs.placements.find((p) => p.body === "Ascendant")
                            const risingData = compositionalSigns.find(s => s.name === risingPlacement?.sign)
                            const risingUI = risingData ? zodiacUIConfig[risingData.id] : undefined
                            return (
                                <CardComponent
                                    label={birthTimeKnown ? "↑ Rising Sign" : "↑ Rising Sign · Detective Match"}
                                    data={risingData}
                                    ui={risingUI}
                                    enterDelay={0.8}
                                    revealDelay={1.6}
                                />
                            )
                        })()}
                    </>
                )}
            </div>

            {!birthTimeKnown && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3.6 }}
                    className="p-5 border bg-primary/5 rounded-xl space-y-3"
                >
                    <div className="flex items-center gap-2 text-primary">
                        <Sparkles className="size-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Detective's Report</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Based on your born-at-<span className="text-foreground font-medium">{timeOfDay}</span> window
                        and your <span className="text-foreground font-medium">"{signs?.placements.find((p) => p.body === "Ascendant")?.sign}"-like</span> personality traits,
                        this rising sign is our strongest candidate.
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 italic">
                        Note: Finding your exact birth time will reveal your precise houses and degrees.
                    </p>
                </motion.div>
            )}

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3.8 }}
                className="flex flex-col gap-4 items-center pt-4 pb-8 md:pb-0"
            >
                <Button size="lg" className="px-12 h-16 text-xl group w-full sm:w-auto font-serif " onClick={handleEnterSanctuary}>
                    Enter the Sanctuary
                    <ArrowRight className="ml-2 size-6 transition-transform group-hover:translate-x-1" />
                </Button>
            </motion.div>
        </div>
    )
}
