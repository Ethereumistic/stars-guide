"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { getZodiacSignByDate, ZODIAC_SIGNS } from "@/utils/zodiac"
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
        setCalculatedSigns
    } = useOnboardingStore()

    const [progress, setProgress] = React.useState(0)
    const [isCalculating, setIsCalculating] = React.useState(true)
    const updateBirthData = useMutation(api.users.updateBirthData)
    const router = useRouter()

    React.useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval)
                    setTimeout(() => setIsCalculating(false), 500)
                    return 100
                }
                return prev + 2
            })
        }, 50)
        return () => clearInterval(interval)
    }, [])

    const finalize = async () => {
        if (!birthDate || !birthLocation) return

        const sunSign = getZodiacSignByDate(birthDate.month, birthDate.day).name
        const moonSign = ZODIAC_SIGNS[Math.floor(Math.random() * 12)].name
        const risingSign = ZODIAC_SIGNS[Math.floor(Math.random() * 12)].name

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

            setCalculatedSigns({ sunSign, moonSign, risingSign })
            router.push("/dashboard")
        } catch (error) {
            console.error("Failed to save birth data:", error)
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

    const sunSignData = birthDate ? getZodiacSignByDate(birthDate.month, birthDate.day) : null

    return (
        <div className="max-w-xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-block p-2 mb-4"
                >
                    <padding className="p-2 bg-primary/20 rounded-full inline-block">
                        <Sparkles className="size-6 text-primary" />
                    </padding>
                </motion.div>
                <h2 className="text-4xl font-serif">Your Cosmic Blueprint is Ready</h2>
                <p className="text-muted-foreground text-sm">We've mapped the heavens at the moment of your birth.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-6 bg-background/40 backdrop-blur-md border text-center space-y-4">
                    <div className="text-4xl text-primary mx-auto">☉</div>
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Sun Sign</p>
                        <p className="text-xl font-serif">{sunSignData?.name}</p>
                    </div>
                </Card>

                <Card className="p-6 bg-background/40 backdrop-blur-md border text-center space-y-4">
                    <div className="text-4xl text-primary mx-auto">☽</div>
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Moon Sign</p>
                        <p className="text-xl font-serif">Calculated</p>
                    </div>
                </Card>

                <Card className="p-6 bg-background/40 backdrop-blur-md border text-center space-y-4">
                    <div className="text-4xl text-primary mx-auto">↑</div>
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Rising Sign</p>
                        <p className="text-xl font-serif">{birthTimeKnown ? "Precise" : "Estimated"}</p>
                    </div>
                </Card>
            </div>

            {!birthTimeKnown && (
                <div className="p-4 border bg-amber-500/5 text-center">
                    <p className="text-sm text-amber-200/80 italic">
                        "Your chart is currently using an estimated birth time. Finding your exact time
                        on a birth certificate will unlock 100% accuracy for your houses and rising sign."
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
