"use client"

import { Button } from "@/components/ui/button"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { Clock, HelpCircle, ChevronLeft } from "lucide-react"

export function TimeCheckStep() {
    const { setBirthTimeKnown, setStep, prevStep } = useOnboardingStore()

    const handleKnownTime = () => {
        setBirthTimeKnown(true)
        setStep(4)
    }

    const handleUnknownTime = () => {
        setBirthTimeKnown(false)
        setStep(5)
    }

    return (
        <div className="max-w-md mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-serif">Do you know your exact birth time?</h2>
            </div>


            <div className="grid grid-cols-2 gap-4">
                <Button
                    size="lg"
                    variant="outline"
                    onClick={handleKnownTime}
                    className="h-32 flex flex-col gap-3 bg-background/40 hover:bg-primary/5 transition-all"
                >
                    <Clock className="size-8 text-primary" />
                    <div className="space-y-1 text-center">
                        <span className="text-lg font-medium block">Yes, I know it</span>
                        {/* <span className="text-xs text-muted-foreground uppercase tracking-widest">Exact birth certificate time</span> */}
                    </div>
                </Button>

                <Button
                    size="lg"
                    variant="outline"
                    onClick={handleUnknownTime}
                    className="h-32 flex flex-col gap-3 bg-background/40 hover:bg-primary/5 transition-all"
                >
                    <HelpCircle className="size-8 text-muted-foreground" />
                    <div className="space-y-1 text-center">
                        <span className="text-lg font-medium block">I'm not sure</span>
                        {/* <span className="text-xs text-muted-foreground uppercase tracking-widest">We'll help you estimate it</span> */}
                    </div>
                </Button>
            </div>

            <div className="flex justify-start pt-4">
                <Button size="icon" variant="outline" onClick={prevStep}>
                    <ChevronLeft className="size-5" />
                </Button>
            </div>
        </div>
    )
}
