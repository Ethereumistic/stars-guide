"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { useUserStore } from "@/store/use-user-store"
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

export function RevealStep() {
    const {
        birthTimeKnown,
        timeOfDay,
        calculatedSigns,
        setStep,
        reset
    } = useOnboardingStore()

    const { user, isAuthenticated, isLoading } = useUserStore()
    const isMobile = useIsMobile()
    const CardComponent = isMobile ? RevealCompactSignCard : RevealSignCard
    const [isReady, setIsReady] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const [isSaved, setIsSaved] = React.useState(false)
    const [saveProgress, setSaveProgress] = React.useState(0)
    const [authStatus, setAuthStatus] = React.useState<'loading' | 'authenticated' | 'failed'>('loading')
    const updateBirthData = useMutation(api.users.updateBirthData)
    const router = useRouter()

    // Track auth status — wait for loading to finish, then check auth
    // This handles the OAuth redirect race condition where Convex may briefly
    // return null before the session is fully established
    React.useEffect(() => {
        if (isLoading) return // Still loading, wait

        if (isAuthenticated()) {
            setAuthStatus('authenticated')
        } else {
            // Don't immediately mark as failed — Convex auth may still be settling
            // after an OAuth redirect. Give it a few seconds to stabilize.
            const failTimer = setTimeout(() => {
                // Re-check one more time before declaring failure
                if (isAuthenticated()) {
                    setAuthStatus('authenticated')
                } else {
                    setAuthStatus('failed')
                }
            }, 5000)

            return () => clearTimeout(failTimer)
        }
    }, [isLoading, isAuthenticated])

    // Save birth data to DB once authenticated
    React.useEffect(() => {
        if (authStatus !== 'authenticated') return
        if (!calculatedSigns) return
        if (isSaved || isSaving) return

        // Already has birthData in DB — skip saving
        if (user?.birthData) {
            setIsSaved(true)
            return
        }

        const save = async () => {
            setIsSaving(true)
            try {
                await updateBirthData(calculatedSigns)
                setIsSaved(true)
            } catch (error) {
                console.error("Failed to save birth data:", error)
                // Still show the reveal even if save fails
                setIsSaved(true)
            } finally {
                setIsSaving(false)
            }
        }
        save()
    }, [authStatus, user, calculatedSigns, isSaved, isSaving, updateBirthData])

    // Animate progress bar once authenticated and data is saving/saved
    React.useEffect(() => {
        if (authStatus === 'failed') return
        if (authStatus !== 'authenticated') return

        const interval = setInterval(() => {
            setSaveProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval)
                    return 100
                }
                return prev + 5
            })
        }, 30)

        return () => clearInterval(interval)
    }, [authStatus])

    // Trigger reveal after progress completes
    React.useEffect(() => {
        if (saveProgress >= 100) {
            const timer = setTimeout(() => setIsReady(true), 400)
            return () => clearTimeout(timer)
        }
    }, [saveProgress])

    const handleEnterSanctuary = () => {
        reset()
        router.push("/dashboard")
    }

    // Still waiting for auth to load — show loading spinner
    if (authStatus === 'loading') {
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
                    <h2 className="text-2xl font-serif">Preparing Your Blueprint</h2>
                    <p className="text-sm text-muted-foreground uppercase tracking-[0.2em]">
                        Verifying your account...
                    </p>
                </div>
            </div>
        )
    }

    // Auth failed — show error with back button
    if (authStatus === 'failed') {
        return (
            <div className="text-center space-y-6 py-12">
                <Sparkles className="size-12 text-primary mx-auto" />
                <h2 className="text-2xl font-serif">Something went wrong</h2>
                <p className="text-muted-foreground text-sm">
                    We couldn't verify your account. Please try again.
                </p>
                <Button onClick={() => setStep(8)} variant="outline">
                    Back to sign-up
                </Button>
            </div>
        )
    }

    // Loading state — brief transition animation before reveal
    if (!isReady) {
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
                    <h2 className="text-2xl font-serif">Preparing Your Blueprint</h2>
                    <p className="text-sm text-muted-foreground uppercase tracking-[0.2em]">
                        Saving your cosmic data...
                    </p>
                    <Progress value={saveProgress} className="h-1 bg-primary/10" />
                    <p className="text-xs text-muted-foreground italic">
                        {saveProgress < 50 && "Aligning celestial coordinates..."}
                        {saveProgress >= 50 && saveProgress < 90 && "Charting your stars..."}
                        {saveProgress >= 90 && "Almost ready..."}
                    </p>
                </div>
            </div>
        )
    }

    const signs = calculatedSigns

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center">
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
                <Button size="lg" className="px-12 h-16 text-xl group w-full sm:w-auto font-serif" onClick={handleEnterSanctuary}>
                    Enter the Sanctuary
                    <ArrowRight className="ml-2 size-6 transition-transform group-hover:translate-x-1" />
                </Button>
            </motion.div>
        </div>
    )
}
