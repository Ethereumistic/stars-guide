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
import { Progress } from "@/components/ui/progress"
import { useOnboardingProgress } from "@/store/use-onboarding-store"
import { useUserStore } from "@/store/use-user-store"
import { AnimatePresence, motion } from "motion/react"
import { useEffect } from "react"

import { useRouter } from "next/navigation"

export default function OnboardingPage() {
    const { step, setStep } = useOnboardingStore()
    const { progress } = useOnboardingProgress()
    const { user, isAuthenticated, isLoading } = useUserStore()
    const router = useRouter()

    // Redirect if already has birth data or skip intro if authenticated
    useEffect(() => {
        if (user?.birthData) {
            router.replace("/dashboard")
        }
    }, [user, router])

    // Prevent flashing content if user is already onboarded
    if (user?.birthData) return null;

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
            default: return <BirthDateStep />
        }
    }

    return (
        <div className="space-y-8 w-full">
            {step > 0 && step < 7 && (
                <div className="space-y-2  max-w-xl mx-auto">
                    <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-widest px-1">
                        <span>Cosmic Journey</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1 bg-primary/10" />
                </div>
            )}

            <div className="min-h-[400px]">
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
