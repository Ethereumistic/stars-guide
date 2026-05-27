"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { MapPin, ChevronRight, Info, ChevronLeft } from "lucide-react"

import { LocationAutocomplete } from "@/components/onboarding/location-autocomplete"

export function BirthLocationStep() {
    const { birthLocation, setBirthLocation, nextStep, prevStep } = useOnboardingStore()

    const handleContinue = () => {
        if (birthLocation) {
            nextStep()
        }
    }

    return (
        <div className="max-w-md mx-auto space-y-8">
            <h2 className="text-4xl text-center font-serif tracking-tight">Where were you born?</h2>

            <div className="space-y-6">
                <LocationAutocomplete
                    value={birthLocation}
                    onValueChange={setBirthLocation}
                    placeholder="Search for your birth city..."
                />

                {/* <div className="p-4 border bg-primary/5 rounded-md flex gap-3 text-sm text-muted-foreground italic leading-relaxed">
                    <Info className="size-5 shrink-0 text-primary/50 mt-0.5" />
                    <p>
                        Precise coordinates are used to determine which planetary sphere
                        was rising over the horizon at your exact moment of birth.
                    </p>
                </div> */}
            </div>

            <div className="flex justify-between items-center pt-4">
                <Button size="icon" variant="outline" onClick={prevStep}>
                    <ChevronLeft className="size-5" />
                </Button>
                <Button
                    className="group"
                    disabled={!birthLocation}
                    onClick={handleContinue}
                >
                    Continue
                    <ChevronRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                </Button>
            </div>
        </div>
    )
}
