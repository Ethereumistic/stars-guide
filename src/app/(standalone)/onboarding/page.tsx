"use client"

import * as React from "react"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { BirthDateStep } from "./_components/steps/birth-date-step"
import { BirthLocationStep } from "./_components/steps/birth-location-step"
import { TimeCheckStep } from "./_components/steps/time-check-step"
import { BirthTimeStep } from "./_components/steps/birth-time-step"
import { DetectiveStepOne } from "./_components/steps/detective-step-one"
import { DetectiveStepTwo } from "./_components/steps/detective-step-two"
import { CalculationStep } from "./_components/steps/calculation-step"
import { EmailStep } from "./_components/steps/email-step"
import { PasswordStep } from "./_components/steps/password-step"
import { RevealStep } from "./_components/steps/reveal-step"
import { Progress } from "@/components/ui/progress"
import { useOnboardingProgress } from "@/store/use-onboarding-store"
import { useUserStore } from "@/store/use-user-store"
import { AnimatePresence, motion } from "motion/react"
import { useEffect } from "react"

import { useRouter } from "next/navigation"

export default function OnboardingPage() {
    const { step, setStep, authMethod, calculatedSigns } = useOnboardingStore()
    const { progress } = useOnboardingProgress()
    const { user, isAuthenticated, isLoading } = useUserStore()
    const router = useRouter()

    // Handle OAuth return: if user is authenticated and step is 8 with authMethod='oauth',
    // advance to step 10 (RevealStep). This handles the edge case where the persisted
    // step didn't get saved as 10 before the OAuth redirect occurred.
    useEffect(() => {
        if (!isLoading && isAuthenticated() && step === 8 && authMethod === 'oauth' && calculatedSigns) {
            setStep(10)
        }
    }, [isLoading, isAuthenticated, step, authMethod, calculatedSigns, setStep])

    // Redirect if already has birth data (but NOT while on step 7 or 10 — calculation/results)
    // Step 7 saves birthData to DB during loading, but we still need to show the cards
    // Step 10 is the reveal animation that must not be interrupted
    // Also don't redirect while auth is still loading (OAuth return race condition)
    useEffect(() => {
        if (isLoading) return
        if (user?.birthData && step !== 7 && step !== 10) {
            router.replace("/dashboard")
        }
    }, [user, router, step, isLoading])

    // Prevent flashing content if user is already onboarded (but not on step 7 or 10)
    // Also don't hide while auth is still loading
    if (!isLoading && user?.birthData && step !== 7 && step !== 10) return null;

    const renderStep = () => {
        switch (step) {
            case 1: return <BirthDateStep />
            case 2: return <BirthLocationStep />
            case 3: return <TimeCheckStep />
            case 4: return <BirthTimeStep />
            case 5: return <DetectiveStepOne />
            case 6: return <DetectiveStepTwo />
            case 7: return <CalculationStep />
            case 8: return <EmailStep />
            case 9: return <PasswordStep />
            case 10: return <RevealStep />
            default: return <BirthDateStep />
        }
    }

    return (
        <div className="w-full flex flex-col items-center gap-6">
            {step > 0 && step < 7 && (
                <div className="space-y-2 max-w-xl w-full mx-auto">
                    <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-widest px-1">
                        <span>Cosmic Journey</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1 bg-primary/10" />
                </div>
            )}

            <div className="w-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        {renderStep()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}
