"use client"

import { Button } from "@/components/ui/button"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { Sun, Sunset, Moon, CloudMoon, ChevronRight } from "lucide-react"

const timeOfDayOptions = [
    {
        value: "morning",
        label: "Morning",
        timeRange: "6 AM - 12 PM",
        icon: Sun,
        color: "text-amber-400"
    },
    {
        value: "afternoon",
        label: "Afternoon",
        timeRange: "12 PM - 6 PM",
        icon: Sunset,
        color: "text-orange-400"
    },
    {
        value: "evening",
        label: "Evening",
        timeRange: "6 PM - 12 AM",
        icon: CloudMoon,
        color: "text-indigo-400"
    },
    {
        value: "night",
        label: "Night",
        timeRange: "12 AM - 6 AM",
        icon: Moon,
        color: "text-slate-400"
    },
]

export function DetectiveStepOne() {
    const { timeOfDay, setTimeOfDay, nextStep, prevStep } = useOnboardingStore()

    const handleSelect = (val: any) => {
        setTimeOfDay(val)
    }

    const handleUnknown = () => {
        setTimeOfDay("unknown")
    }

    return (
        <div className="max-w-md mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-serif">Let's play detective! 🔍</h2>
                <p className="text-muted-foreground text-sm">What do you remember about your birth?</p>
            </div>

            <p className="text-muted-foreground text-center text-sm px-4">
                Even a rough estimate helps us narrow down your rising sign.
                Do you know what time of day it was?
            </p>

            <div className="space-y-3">
                {timeOfDayOptions.map((option) => (
                    <Button
                        key={option.value}
                        variant="outline"
                        size="lg"
                        onClick={() => handleSelect(option.value)}
                        className={`w-full justify-start gap-4 h-auto py-5 px-6 border bg-background/40 hover:bg-primary/5 transition-all ${timeOfDay === option.value ? 'border-primary bg-primary/10' : ''}`}
                    >
                        <option.icon className={`size-8 ${option.color}`} />
                        <div className="text-left">
                            <p className="font-medium text-lg">{option.label}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest">{option.timeRange}</p>
                        </div>
                    </Button>
                ))}
            </div>

            <div className="flex flex-col gap-4 text-center">
                <Button
                    variant="ghost"
                    onClick={handleUnknown}
                    className={`w-full h-12 text-muted-foreground ${timeOfDay === 'unknown' ? 'bg-primary/5 text-primary' : ''}`}
                >
                    I have no idea at all
                </Button>

                <div className="flex justify-between items-center pt-2">
                    <Button variant="ghost" onClick={prevStep}>
                        Back
                    </Button>
                    <Button
                        size="lg"
                        className="group"
                        disabled={!timeOfDay}
                        onClick={nextStep}
                    >
                        Continue
                        <ChevronRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
