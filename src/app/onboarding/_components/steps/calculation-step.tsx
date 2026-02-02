"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { useUserStore } from "@/store/use-user-store"
import { ZODIAC_SIGNS, estimateRisingSign } from "@/utils/zodiac"
import { calculateSunSign, calculateMoonSign, calculateAscendant, localBirthTimeToUTC } from "@/lib/astrology"
import { useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { motion } from "motion/react"
import { Sparkles, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

export function CalculationStep() {
    const {
        birthDate,
        birthLocation,
        birthTime,
        birthTimeKnown,
        timeOfDay,
        detectiveAnswers,
        setCalculatedSigns,
        nextStep
    } = useOnboardingStore()

    const { isAuthenticated } = useUserStore()
    const [progress, setProgress] = React.useState(0)
    const [isCalculating, setIsCalculating] = React.useState(true)
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

        // Parse birth time (default to noon if unknown for Sun/Moon calculations)
        const [hours, minutes] = birthTimeKnown && birthTime
            ? birthTime.split(':').map(Number)
            : [12, 0];

        // Convert LOCAL birth time to UTC using the birth location's timezone
        // This is crucial for accurate calculations - birth times are recorded in local time!
        const birthDateTimeUTC = localBirthTimeToUTC(
            birthDate.year,
            birthDate.month,
            birthDate.day,
            hours,
            minutes,
            birthLocation.lat,
            birthLocation.long
        );

        // Calculate Sun sign using astronomy-engine (accurate ecliptic longitude)
        const sunSignData = calculateSunSign(birthDateTimeUTC);

        // Calculate Moon sign using astronomy-engine (accurate, requires date/time)
        const moonSignData = calculateMoonSign(birthDateTimeUTC);

        // Calculate Rising sign
        let risingSignData;
        if (birthTimeKnown && birthTime) {
            // Precise Ascendant calculation using astronomy-engine
            risingSignData = calculateAscendant(
                birthDateTimeUTC,
                birthLocation.lat,
                birthLocation.long
            );
        } else {
            // Fallback to estimation for unknown birth time
            risingSignData = estimateRisingSign(sunSignData.id, timeOfDay, detectiveAnswers);
        }

        return {
            sun: sunSignData,
            moon: moonSignData,
            rising: risingSignData
        };
    }, [birthDate, birthTime, birthTimeKnown, birthLocation, timeOfDay, detectiveAnswers]);

    // Handle the transition after animation
    React.useEffect(() => {
        if (progress === 100) {
            if (!isAuthenticated()) {
                // For non-auth users, auto-calculate and skip to email/signup
                if (signs) {
                    setCalculatedSigns({
                        sunSign: signs.sun.name,
                        moonSign: signs.moon.name,
                        risingSign: signs.rising.name
                    });
                    const timer = setTimeout(() => nextStep(), 800);
                    return () => clearTimeout(timer);
                }
            } else {
                // For auth users, show results
                const timer = setTimeout(() => setIsCalculating(false), 500);
                return () => clearTimeout(timer);
            }
        }
    }, [progress, isAuthenticated, nextStep, signs, setCalculatedSigns]);

    const finalize = async () => {
        if (!birthDate || !birthLocation || !signs) return

        const sunSign = signs.sun.name
        const moonSign = signs.moon.name
        const risingSign = signs.rising.name

        setCalculatedSigns({ sunSign, moonSign, risingSign })

        if (isAuthenticated()) {
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
                router.push("/dashboard")
            } catch (error) {
                console.error("Failed to save birth data:", error)
            }
        } else {
            nextStep()
        }
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
        <div className="max-w-xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-block p-2 mb-4"
                >
                    <div className="p-2 bg-primary/20 rounded-full inline-block">
                        <Sparkles className="size-6 text-primary" />
                    </div>
                </motion.div>
                <h2 className="text-4xl font-serif">Your Cosmic Blueprint is Ready</h2>
                <p className="text-muted-foreground text-sm">We've mapped the heavens at the moment of your birth.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-6 bg-background/40 backdrop-blur-md border text-center space-y-4 hover:border-primary/50 transition-colors">
                    <div className="text-4xl text-primary mx-auto">☉</div>
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Sun Sign</p>
                        <p className="text-xl font-serif">{signs?.sun.name}</p>
                    </div>
                </Card>

                <Card className="p-6 bg-background/40 backdrop-blur-md border text-center space-y-4 hover:border-primary/50 transition-colors">
                    <div className="text-4xl text-primary mx-auto">☽</div>
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Moon Sign</p>
                        <p className="text-xl font-serif">{signs?.moon.name}</p>
                    </div>
                </Card>

                <Card className="p-6 backdrop-blur-md border text-center space-y-4 border-primary/40 bg-primary/5">
                    <div className="text-4xl text-primary mx-auto">↑</div>
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Rising Sign</p>
                        <p className="text-xl font-serif">{signs?.rising.name}</p>
                        <p className="text-[10px] text-primary/60 uppercase">{birthTimeKnown ? "Precise" : "Detective Match"}</p>
                    </div>
                </Card>
            </div>

            {!birthTimeKnown && (
                <div className="p-5 border bg-primary/5 rounded-xl space-y-3">
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
                </div>
            )}

            <div className="flex flex-col gap-4 items-center pt-4">
                <Button size="lg" className="px-12 h-16 text-xl group w-full sm:w-auto" onClick={finalize}>
                    Enter the Sanctuary
                    <ArrowRight className="ml-2 size-6 transition-transform group-hover:translate-x-1" />
                </Button>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Welcome home to the stars.</p>
            </div>
        </div>
    )
}

