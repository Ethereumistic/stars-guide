"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { useUserStore } from "@/store/use-user-store"
import { estimateRisingSign, calculateSunSign, calculateMoonSign, calculateAscendant, localBirthTimeToUTC } from "@/lib/astrology"
import { useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { motion } from "motion/react"
import { Sparkles, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { RevealSignCard } from "@/components/onboarding/reveal-sign-card"
import { compositionalSigns } from "@/astrology/signs"
import { zodiacUIConfig } from "@/config/zodiac-ui"

export function CalculationStep() {
    const {
        birthDate,
        birthLocation,
        birthTime,
        birthTimeKnown,
        timeOfDay,
        detectiveAnswers,
        setCalculatedSigns,
        nextStep,
        reset
    } = useOnboardingStore()

    const { isAuthenticated } = useUserStore()
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
        if (!birthDate || !birthLocation) return null;

        const [hours, minutes] = birthTimeKnown && birthTime
            ? birthTime.split(':').map(Number)
            : [12, 0];

        const birthDateTimeUTC = localBirthTimeToUTC(
            birthDate.year,
            birthDate.month,
            birthDate.day,
            hours,
            minutes,
            birthLocation.lat,
            birthLocation.long
        );

        const sunSignData = calculateSunSign(birthDateTimeUTC);
        const moonSignData = calculateMoonSign(birthDateTimeUTC);

        let risingSignData;
        if (birthTimeKnown && birthTime) {
            risingSignData = calculateAscendant(
                birthDateTimeUTC,
                birthLocation.lat,
                birthLocation.long
            );
        } else {
            risingSignData = estimateRisingSign(sunSignData.id, timeOfDay, detectiveAnswers);
        }

        return {
            sun: sunSignData,
            moon: moonSignData,
            rising: risingSignData
        };
    }, [birthDate, birthTime, birthTimeKnown, birthLocation, timeOfDay, detectiveAnswers]);

    // Save to DB as soon as progress hits 100 (during loading phase)
    React.useEffect(() => {
        if (progress === 100 && signs && !isSaved) {
            const saveData = async () => {
                const sunSign = signs.sun.name
                const moonSign = signs.moon.name
                const risingSign = signs.rising.name

                setCalculatedSigns({ sunSign, moonSign, risingSign })

                if (isAuthenticated()) {
                    if (!birthDate || !birthLocation) return

                    const dateStr = `${birthDate.year}-${birthDate.month.toString().padStart(2, '0')}-${birthDate.day.toString().padStart(2, '0')}`

                    try {
                        await updateBirthData({
                            date: dateStr,
                            time: birthTime || "12:00",
                            location: birthLocation,
                            sunSign,
                            moonSign,
                            risingSign
                        })
                        setIsSaved(true)
                    } catch (error) {
                        console.error("Failed to save birth data:", error)
                    }
                }

                // Show the cards after a brief delay
                const timer = setTimeout(() => setIsCalculating(false), 500)
                return () => clearTimeout(timer)
            }

            if (!isAuthenticated()) {
                // For non-auth users, auto-calculate and skip to email/signup
                setCalculatedSigns({
                    sunSign: signs.sun.name,
                    moonSign: signs.moon.name,
                    risingSign: signs.rising.name
                })
                const timer = setTimeout(() => nextStep(), 800)
                return () => clearTimeout(timer)
            } else {
                saveData()
            }
        }
    }, [progress, signs, isSaved, isAuthenticated, birthDate, birthLocation, birthTime, setCalculatedSigns, updateBirthData, nextStep]);

    const handleEnterSanctuary = () => {
        reset() // Reset onboarding store so step goes back to 1
        router.push("/dashboard")
    }

    // ── Loading state ──────────────────────────────────────────────
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

    // ── Results state ──────────────────────────────────────────────
    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-block"
                >

                </motion.div>
                <h2 className="text-4xl font-serif mb-16">Your Cosmic Blueprint is Ready</h2>
            </div>

            {/* Sign cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-6">
                {signs && (
                    <>
                        {(() => {
                            const sunData = compositionalSigns.find(s => s.name === signs.sun.name);
                            const sunUI = sunData ? zodiacUIConfig[sunData.id] : undefined;
                            return (
                                <RevealSignCard
                                    label="☉ Sun Sign"
                                    data={sunData}
                                    ui={sunUI}
                                    enterDelay={0}
                                    revealDelay={1.6}
                                />
                            );
                        })()}
                        {(() => {
                            const moonData = compositionalSigns.find(s => s.name === signs.moon.name);
                            const moonUI = moonData ? zodiacUIConfig[moonData.id] : undefined;
                            return (
                                <RevealSignCard
                                    label="☽ Moon Sign"
                                    data={moonData}
                                    ui={moonUI}
                                    enterDelay={0.4}
                                    revealDelay={1.6}
                                />
                            );
                        })()}
                        {(() => {
                            const risingData = compositionalSigns.find(s => s.name === signs.rising.name);
                            const risingUI = risingData ? zodiacUIConfig[risingData.id] : undefined;
                            return (
                                <RevealSignCard
                                    label={birthTimeKnown ? "↑ Rising Sign" : "↑ Rising Sign · Detective Match"}
                                    data={risingData}
                                    ui={risingUI}
                                    enterDelay={0.8}
                                    revealDelay={1.6}
                                />
                            );
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
                        and your <span className="text-foreground font-medium">"{signs?.rising.name}"-like</span> personality traits,
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
                className="flex flex-col gap-4 items-center pt-4"
            >
                <Button size="lg" className="px-12 h-16 text-xl group w-full sm:w-auto font-serif " onClick={handleEnterSanctuary}>
                    Enter the Sanctuary
                    <ArrowRight className="ml-2 size-6 transition-transform group-hover:translate-x-1" />
                </Button>
            </motion.div>
        </div>
    )
}

