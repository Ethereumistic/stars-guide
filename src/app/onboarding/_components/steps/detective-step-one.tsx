"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { Sun, Sunset, Moon, CloudMoon, ChevronRight, ChevronLeft } from "lucide-react"

const timeOfDayOptions = [
    {
        value: "morning",
        label: "Morning",
        timeRange: "6 AM - 12 PM",
        icon: Sun,
        color: "text-primary"
    },
    {
        value: "afternoon",
        label: "Afternoon",
        timeRange: "12 PM - 6 PM",
        icon: Sunset,
        color: "text-fire"
    },
    {
        value: "evening",
        label: "Evening",
        timeRange: "6 PM - 12 AM",
        icon: CloudMoon,
        color: "text-water"
    },
    {
        value: "night",
        label: "Night",
        timeRange: "12 AM - 6 AM",
        icon: Moon,
        color: "text-air"
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
        <div className="max-w-md md:max-w-2xl mx-auto space-y-8">
            <h2 className="text-3xl text-center font-serif">Do you know if you were born in the:</h2>

            <div className="gap-4 grid grid-cols-2 max-w-md mx-auto">
                {timeOfDayOptions.map((option) => (
                    <Button
                        key={option.value}
                        variant="outline"
                        size="lg"
                        onClick={() => handleSelect(option.value)}
                        className={cn(
                            "w-full justify-start gap-4 h-auto py-5 px-6 border transition-all hover:bg-primary/5",
                            timeOfDay === option.value
                                ? "border-primary bg-primary/15 ring-2 ring-primary/60 shadow-[0_0_25px_-5px_oklch(var(--primary)/0.4)] shadow-primary/40 "
                                : "bg-background/40 border-border"
                        )}
                    >
                        <option.icon className={cn(
                            "size-8 transition-transform",
                            option.color,
                            timeOfDay === option.value && "scale-110"
                        )} />
                        <div className="text-left">
                            <p className="font-medium text-lg">{option.label}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest">{option.timeRange}</p>
                        </div>
                    </Button>
                ))}
            </div>

            <div className="flex flex-col gap-4 text-center max-w-md mx-auto">


                <div className="flex justify-between items-center pt-2">
                    <Button variant="outline" size="icon" onClick={prevStep}>
                        <ChevronLeft className="size-5" />
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleUnknown}
                        className={`transition-all ${timeOfDay === 'unknown' ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary' : ''}`}
                    >
                        I have no idea at all
                    </Button>
                    <Button
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
