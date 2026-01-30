"use client"

import * as React from "react"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { EarlyAccessStep } from "./_components/steps/early-access-step"
import { BirthDateStep } from "./_components/steps/birth-date-step"
import { BirthLocationStep } from "./_components/steps/birth-location-step"
import { TimeCheckStep } from "./_components/steps/time-check-step"
import { BirthTimeStep } from "./_components/steps/birth-time-step"
import { DetectiveStepOne } from "./_components/steps/detective-step-one"
import { DetectiveStepTwo } from "./_components/steps/detective-step-two"
import { CalculationStep } from "./_components/steps/calculation-step"
import { Progress } from "@/components/ui/progress"
import { useOnboardingProgress } from "@/store/use-onboarding-store"
import { AnimatePresence, motion } from "motion/react"

export default function OnboardingPage() {
    const { step } = useOnboardingStore()
    const { progress, totalSteps } = useOnboardingProgress()

    const renderStep = () => {
        switch (step) {
            case 0: return <EarlyAccessStep />
            case 1: return <BirthDateStep />
            case 2: return <BirthLocationStep />
            case 3: return <TimeCheckStep />
            case 4: return <BirthTimeStep />
            case 5: return <DetectiveStepOne />
            case 6: return <DetectiveStepTwo />
            case 7: return <CalculationStep />
            default: return <EarlyAccessStep />
        }
    }

    return (
        <div className="space-y-8 w-full">
            {step > 0 && (
                <div className="space-y-2">
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
