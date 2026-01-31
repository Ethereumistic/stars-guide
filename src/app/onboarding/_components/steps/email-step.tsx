"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { motion } from "motion/react"
import { Mail, ArrowRight, ChevronLeft } from "lucide-react"

export function EmailStep() {
    const { email, setEmail, nextStep, prevStep } = useOnboardingStore()
    const [localEmail, setLocalEmail] = React.useState(email || "")

    const handleNext = () => {
        if (localEmail && localEmail.includes("@")) {
            setEmail(localEmail)
            nextStep()
        }
    }

    return (
        <div className="max-w-md mx-auto space-y-8">
            <div className="text-center space-y-2">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-block p-2 mb-4"
                >
                    <div className="p-2 bg-primary/20 rounded-full inline-block">
                        <Mail className="size-6 text-primary" />
                    </div>
                </motion.div>
                <h2 className="text-3xl font-serif">Where should we send your chart?</h2>
                <p className="text-muted-foreground text-sm">
                    Enter your email to save your progress and receive your personalized natal report.
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Input
                        type="email"
                        placeholder="your@email.com"
                        value={localEmail}
                        onChange={(e) => setLocalEmail(e.target.value)}
                        className="h-12 bg-background/40 backdrop-blur-md text-lg text-center"
                        onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    />
                </div>

                <div className="flex flex-col gap-3 pt-4">
                    <Button
                        size="lg"
                        className="h-14 text-lg w-full group"
                        onClick={handleNext}
                        disabled={!localEmail || !localEmail.includes("@")}
                    >
                        Continue
                        <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={prevStep}
                    >
                        <ChevronLeft className="mr-2 size-4" />
                        Back to chart
                    </Button>
                </div>
            </div>

            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest px-8 leading-relaxed">
                By continuing, you agree to receive cosmic updates.
                {/* Note: In production we'll add Resend with Convex here */}
            </p>
        </div>
    )
}
